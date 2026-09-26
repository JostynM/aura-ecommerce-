from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.email_outbox import EmailOutbox
from app.services.email_service import (
    send_order_delivered_email,
    send_order_shipped_email,
    send_payment_approved_email,
    send_payment_refunded_email,
)


MAX_EMAIL_ATTEMPTS = 5
PROCESSING_TIMEOUT_MINUTES = 10
RETRY_DELAYS_MINUTES = (1, 5, 15, 60, 180)


# ==========================================
# AGREGAR CORREO A LA COLA
# ==========================================

def enqueue_email(
    db: Session,
    event_key: str,
    email_type: str,
    recipient_email: str,
    payload: dict[str, Any],
) -> bool:
    """
    Registra un correo pendiente dentro de la misma
    transacción que esté utilizando el pedido.

    No hace commit aquí. El endpoint que modifica el
    pedido será quien haga el commit de toda la
    transacción.
    """

    statement = (
        pg_insert(EmailOutbox)
        .values(
            event_key=event_key,
            email_type=email_type,
            recipient_email=recipient_email,
            payload=payload,
            status="pending",
            attempts=0,
        )
        .on_conflict_do_nothing(
            index_elements=["event_key"]
        )
    )

    result = db.execute(statement)

    return bool(result.rowcount)


# ==========================================
# PAGO APROBADO
# ==========================================

def enqueue_payment_approved_email(
    db: Session,
    order_id: int,
    recipient_email: str,
    first_name: str,
    order_number: str,
    total: str,
    account_url: str,
) -> bool:
    return enqueue_email(
        db=db,
        event_key=f"payment_approved:{order_id}",
        email_type="payment_approved",
        recipient_email=recipient_email,
        payload={
            "first_name": first_name,
            "order_number": order_number,
            "total": total,
            "account_url": account_url,
        },
    )


# ==========================================
# REEMBOLSO CONFIRMADO
# ==========================================

def enqueue_payment_refunded_email(
    db: Session,
    order_id: int,
    recipient_email: str,
    first_name: str,
    order_number: str,
    total: str,
    account_url: str,
) -> bool:
    return enqueue_email(
        db=db,
        event_key=f"payment_refunded:{order_id}",
        email_type="payment_refunded",
        recipient_email=recipient_email,
        payload={
            "first_name": first_name,
            "order_number": order_number,
            "total": total,
            "account_url": account_url,
        },
    )


# ==========================================
# PEDIDO DESPACHADO
# ==========================================

def enqueue_order_shipped_email(
    db: Session,
    order_id: int,
    recipient_email: str,
    first_name: str,
    order_number: str,
    account_url: str,
) -> bool:
    return enqueue_email(
        db=db,
        event_key=f"order_shipped:{order_id}",
        email_type="order_shipped",
        recipient_email=recipient_email,
        payload={
            "first_name": first_name,
            "order_number": order_number,
            "account_url": account_url,
        },
    )


# ==========================================
# PEDIDO ENTREGADO
# ==========================================

def enqueue_order_delivered_email(
    db: Session,
    order_id: int,
    recipient_email: str,
    first_name: str,
    order_number: str,
    account_url: str,
) -> bool:
    return enqueue_email(
        db=db,
        event_key=f"order_delivered:{order_id}",
        email_type="order_delivered",
        recipient_email=recipient_email,
        payload={
            "first_name": first_name,
            "order_number": order_number,
            "account_url": account_url,
        },
    )


# ==========================================
# EXTRAER ID DEVUELTO POR RESEND
# ==========================================

def _get_provider_message_id(response: Any) -> str | None:
    if isinstance(response, dict):
        message_id = response.get("id")
    else:
        message_id = getattr(response, "id", None)

    if not message_id:
        return None

    return str(message_id)


# ==========================================
# ENVIAR SEGÚN EL TIPO DE EVENTO
# ==========================================

def _send_email(message: EmailOutbox) -> Any:
    payload = message.payload or {}

    if message.email_type == "payment_approved":
        return send_payment_approved_email(
            recipient_email=message.recipient_email,
            first_name=payload["first_name"],
            order_number=payload["order_number"],
            total=payload["total"],
            account_url=payload["account_url"],
        )

    if message.email_type == "payment_refunded":
        return send_payment_refunded_email(
            recipient_email=message.recipient_email,
            first_name=payload["first_name"],
            order_number=payload["order_number"],
            total=payload["total"],
            account_url=payload["account_url"],
        )

    if message.email_type == "order_shipped":
        return send_order_shipped_email(
            recipient_email=message.recipient_email,
            first_name=payload["first_name"],
            order_number=payload["order_number"],
            account_url=payload["account_url"],
        )

    if message.email_type == "order_delivered":
        return send_order_delivered_email(
            recipient_email=message.recipient_email,
            first_name=payload["first_name"],
            order_number=payload["order_number"],
            account_url=payload["account_url"],
        )

    raise ValueError(
        f"Tipo de correo no soportado: {message.email_type}"
    )


# ==========================================
# TIEMPO PARA EL SIGUIENTE REINTENTO
# ==========================================

def _get_retry_delay(attempts: int) -> timedelta:
    index = min(
        max(attempts - 1, 0),
        len(RETRY_DELAYS_MINUTES) - 1,
    )

    return timedelta(
        minutes=RETRY_DELAYS_MINUTES[index]
    )


# ==========================================
# RECUPERAR PROCESAMIENTOS INTERRUMPIDOS
# ==========================================

def _recover_stale_messages(
    db: Session,
    now: datetime,
) -> None:
    stale_before = now - timedelta(
        minutes=PROCESSING_TIMEOUT_MINUTES
    )

    # Si agotó todos los intentos y quedó bloqueado
    # como "processing", lo marcamos como fallido.
    db.execute(
        update(EmailOutbox)
        .where(
            EmailOutbox.status == "processing",
            EmailOutbox.processing_started_at.is_not(None),
            EmailOutbox.processing_started_at <= stale_before,
            EmailOutbox.attempts >= MAX_EMAIL_ATTEMPTS,
        )
        .values(
            status="failed",
            processing_started_at=None,
            next_retry_at=None,
        )
    )

    # Si el servidor murió mientras enviaba un correo,
    # después de 10 minutos vuelve a estar disponible.
    db.execute(
        update(EmailOutbox)
        .where(
            EmailOutbox.status == "processing",
            EmailOutbox.processing_started_at.is_not(None),
            EmailOutbox.processing_started_at <= stale_before,
            EmailOutbox.attempts < MAX_EMAIL_ATTEMPTS,
        )
        .values(
            status="pending",
            processing_started_at=None,
            next_retry_at=now,
        )
    )

    # Protección adicional para correos pendientes
    # que ya agotaron sus intentos.
    db.execute(
        update(EmailOutbox)
        .where(
            EmailOutbox.status == "pending",
            EmailOutbox.attempts >= MAX_EMAIL_ATTEMPTS,
        )
        .values(
            status="failed",
            next_retry_at=None,
        )
    )


# ==========================================
# TOMAR CORREOS PENDIENTES
# ==========================================

def _claim_pending_messages(
    db: Session,
    batch_size: int,
) -> list[EmailOutbox]:
    now = datetime.now(timezone.utc)

    _recover_stale_messages(
        db=db,
        now=now,
    )

    messages = list(
        db.scalars(
            select(EmailOutbox)
            .where(
                EmailOutbox.status == "pending",
                EmailOutbox.attempts < MAX_EMAIL_ATTEMPTS,
                or_(
                    EmailOutbox.next_retry_at.is_(None),
                    EmailOutbox.next_retry_at <= now,
                ),
            )
            .order_by(
                EmailOutbox.created_at.asc(),
                EmailOutbox.id.asc(),
            )
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        ).all()
    )

    for message in messages:
        message.status = "processing"
        message.attempts += 1
        message.processing_started_at = now

    db.commit()

    return messages


# ==========================================
# PROCESAR COLA
# ==========================================

def process_email_outbox(
    db: Session,
    batch_size: int = 20,
) -> dict[str, int]:
    messages = _claim_pending_messages(
        db=db,
        batch_size=batch_size,
    )

    sent_count = 0
    retry_count = 0
    failed_count = 0

    for message in messages:
        try:
            response = _send_email(message)

            message.status = "sent"
            message.sent_at = datetime.now(timezone.utc)
            message.processing_started_at = None
            message.next_retry_at = None
            message.last_error = None
            message.provider_message_id = (
                _get_provider_message_id(response)
            )

            db.commit()

            sent_count += 1

            print(
                "EMAIL OUTBOX ENVIADO:",
                message.event_key,
            )

        except Exception as error:
            now = datetime.now(timezone.utc)

            message.processing_started_at = None
            message.last_error = str(error)[:5000]

            if message.attempts >= MAX_EMAIL_ATTEMPTS:
                message.status = "failed"
                message.next_retry_at = None
                failed_count += 1

                print(
                    "EMAIL OUTBOX FALLÓ DEFINITIVAMENTE:",
                    message.event_key,
                    repr(error),
                )

            else:
                message.status = "pending"
                message.next_retry_at = (
                    now
                    + _get_retry_delay(
                        message.attempts
                    )
                )

                retry_count += 1

                print(
                    "EMAIL OUTBOX REPROGRAMADO:",
                    message.event_key,
                    repr(error),
                )

            db.commit()

    return {
        "claimed": len(messages),
        "sent": sent_count,
        "retry": retry_count,
        "failed": failed_count,
    }
