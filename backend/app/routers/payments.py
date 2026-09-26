import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, status
from mercadopago.webhook import (
    InvalidWebhookSignatureError,
    WebhookSignatureValidator,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_admin, get_current_user
from app.models.order import Order
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    RefundResponse,
)
from app.services.business_hours_service import calculate_scheduled_processing_at
from app.services.email_outbox_service import (
    enqueue_payment_approved_email,
    enqueue_payment_refunded_email,
)
from app.services.stock_service import commit_order_stock, restore_order_stock
# ==========================================
# VARIABLES DE ENTORNO
# ==========================================
BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(
    BACKEND_DIR / ".env",
    override=True,
)
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).rstrip("/")
# ==========================================
# ROUTER
# ==========================================
router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)
# ==========================================
# MAPEAR ESTADOS MERCADO PAGO → AURA
# ==========================================
def map_payment_status(
    mercado_pago_status: str,
    status_detail: str | None,
) -> str:
    if (
        mercado_pago_status == "processed"
        and status_detail == "accredited"
    ):
        return "paid"
    if mercado_pago_status in {
        "failed",
        "cancelled",
        "canceled",
    }:
        return "failed"
    return "pending"
# ==========================================
# OBTENER PRIMER PAGO DE UNA ORDER MP
# ==========================================
def get_mp_transaction(mp_order: dict) -> dict:
    transactions = (
        mp_order
        .get("transactions", {})
        .get("payments", [])
    )
    if not transactions:
        return {}
    return transactions[0]
# ==========================================
# GUARDAR IDENTIFICADORES DE MERCADO PAGO
# ==========================================
def save_mercado_pago_identifiers(
    order: Order,
    mp_order: dict,
    transaction: dict,
) -> None:
    mp_order_id = mp_order.get("id")
    mp_payment_id = transaction.get("id")
    if mp_order_id is not None:
        mp_order_id = str(mp_order_id)
        if (
            order.mercado_pago_order_id is not None
            and order.mercado_pago_order_id != mp_order_id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El pedido ya está relacionado con "
                    "otra Order de Mercado Pago."
                ),
            )
        order.mercado_pago_order_id = mp_order_id
    if mp_payment_id is not None:
        mp_payment_id = str(mp_payment_id)
        if (
            order.mercado_pago_payment_id is not None
            and order.mercado_pago_payment_id != mp_payment_id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El pedido ya está relacionado con "
                    "otro pago de Mercado Pago."
                ),
            )
        order.mercado_pago_payment_id = mp_payment_id
# ==========================================
# APLICAR RESULTADO DEL PAGO
# ==========================================
def apply_payment_result(
    order: Order,
    new_payment_status: str,
    db: Session,
) -> bool:
    """
    Sincroniza pago, pedido y stock.
    Devuelve True únicamente cuando el pago
    acaba de quedar aprobado Y el pedido puede
    continuar normalmente.
    Si Mercado Pago confirma un pago después
    de que el stock fue liberado, registramos
    el pago como paid, pero NO confirmamos el
    pedido ni enviamos el correo normal de compra.
    """
    current_payment_status = order.payment_status

    # ======================================
    # REEMBOLSO YA CONFIRMADO
    # ======================================
    # Un reembolso es un estado final. Un webhook
    # antiguo no debe volver a convertirlo en paid,
    # failed o pending.
    if current_payment_status == "refunded":
        return False

    # ======================================
    # PAGO APROBADO
    # ======================================
    if new_payment_status == "paid":
        if current_payment_status == "paid":
            return False
        # ----------------------------------
        # RESERVA ACTIVA
        # ----------------------------------
        if order.stock_status == "reserved":
            commit_order_stock(order)
            if order.status == "pending":
                order.status = "confirmed"
        # ----------------------------------
        # STOCK YA CONFIRMADO
        # ----------------------------------
        elif order.stock_status == "committed":
            if order.status == "pending":
                order.status = "confirmed"
        # ----------------------------------
        # PAGO DESPUÉS DE EXPIRAR EL STOCK
        # ----------------------------------
        elif order.stock_status == "released":
            order.payment_status = "paid"
            order.scheduled_processing_at = None
            print(
                "ALERTA AURA:",
                (
                    "Mercado Pago confirmó un pago para "
                    "un pedido cuyo stock ya había sido "
                    "liberado. Requiere revisión y posible "
                    "reembolso."
                ),
                order.order_number,
            )
            return False
        # ----------------------------------
        # PEDIDO ANTIGUO
        # ----------------------------------
        elif order.stock_status == "legacy":
            order.payment_status = "paid"
            print(
                "ALERTA AURA:",
                (
                    "Pago recibido para un pedido legacy. "
                    "El inventario no será modificado "
                    "automáticamente."
                ),
                order.order_number,
            )
            return False
        order.payment_status = "paid"
        # ----------------------------------
        # PROGRAMAR PROCESAMIENTO
        # ----------------------------------
        if (
            order.status == "confirmed"
            and order.scheduled_processing_at is None
        ):
            try:
                order.scheduled_processing_at = (
                    calculate_scheduled_processing_at(db)
                )
            except Exception as error:
                print(
                    "ERROR PROGRAMANDO PROCESAMIENTO DEL PEDIDO:",
                    repr(error),
                )
        return order.status == "confirmed"
    # ======================================
    # PAGO FALLIDO
    # ======================================
    if new_payment_status == "failed":
        if current_payment_status == "paid":
            print(
                "ALERTA AURA:",
                (
                    "Se recibió estado failed para un "
                    "pedido que ya estaba marcado como paid."
                ),
                order.order_number,
            )
            return False
        if order.stock_status == "reserved":
            restore_order_stock(
                order,
                db,
            )
        if order.status != "cancelled":
            order.status = "cancelled"
        order.payment_status = "failed"
        return False
    # ======================================
    # PAGO PENDIENTE
    # ======================================
    if current_payment_status in {
        "paid",
        "failed",
        "refunded",
    }:
        return False
    order.payment_status = "pending"
    return False
# ==========================================
# VALIDAR PEDIDO ANTES DE PAGAR
# ==========================================
def validate_order_before_payment(
    order: Order,
    db: Session,
) -> None:
    if order.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Este pedido fue cancelado. "
                "Debes crear uno nuevo."
            ),
        )
    if order.payment_status == "paid":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este pedido ya fue pagado.",
        )
    if order.payment_status == "failed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "El pago de este pedido ya falló. "
                "Debes crear un nuevo pedido."
            ),
        )
    now = datetime.now(timezone.utc)
    if (
        order.stock_status == "reserved"
        and order.stock_reserved_until is not None
        and order.stock_reserved_until <= now
    ):
        restore_order_stock(
            order,
            db,
        )
        order.status = "cancelled"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La reserva de este pedido ha vencido. "
                "El stock fue liberado. Debes crear "
                "un pedido nuevo."
            ),
        )
    if order.stock_status != "reserved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La reserva de stock de este pedido "
                "ya no está activa. Debes crear un "
                "pedido nuevo."
            ),
        )
# ==========================================
# CREAR / RECUPERAR CLAVE DE IDEMPOTENCIA
# ==========================================
def ensure_payment_idempotency_key(
    order: Order,
    db: Session,
) -> str:
    """
    Los pedidos nuevos ya deberían tener una
    clave gracias al modelo Order.
    Este fallback permite pagar pedidos creados
    antes de agregar la nueva columna.
    """
    if order.payment_idempotency_key:
        return order.payment_idempotency_key
    order.payment_idempotency_key = uuid4().hex
    try:
        # Guardamos la clave ANTES de contactar
        # a Mercado Pago. Así un timeout no hace
        # que el siguiente intento genere otra.
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se pudo preparar de forma segura "
                "el intento de pago."
            ),
        ) from error
    return order.payment_idempotency_key
# ==========================================
# CREAR / RECUPERAR CLAVE DE REEMBOLSO
# ==========================================
def ensure_refund_idempotency_key(
    order: Order,
    db: Session,
) -> str:
    """
    Mantiene una única clave para el reembolso
    de este pedido. Si la petición a Mercado Pago
    se corta o se reintenta, reutilizamos la misma
    clave para evitar solicitar dos devoluciones.
    """
    if order.refund_idempotency_key:
        return order.refund_idempotency_key

    order.refund_idempotency_key = uuid4().hex

    try:
        # La clave se persiste ANTES de contactar
        # con Mercado Pago para que un timeout no
        # provoque una solicitud nueva con otra clave.
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se pudo preparar de forma segura "
                "el reembolso."
            ),
        ) from error

    return order.refund_idempotency_key

# ==========================================
# REGISTRAR CORREO DE REEMBOLSO EN OUTBOX
# ==========================================
def enqueue_refund_confirmation_email(
    order: Order,
    db: Session,
) -> bool:
    """
    Registra el correo de reembolso dentro de la
    misma transacción que actualiza el pedido.

    La event_key del outbox evita duplicados si
    el endpoint se vuelve a ejecutar.
    """
    customer = db.scalar(
        select(User).where(
            User.id == order.user_id
        )
    )

    if not customer:
        print(
            "ALERTA AURA: no se encontró el cliente "
            "para registrar el correo de reembolso:",
            order.order_number,
        )
        return False

    return enqueue_payment_refunded_email(
        db=db,
        order_id=order.id,
        recipient_email=customer.email,
        first_name=customer.first_name,
        order_number=order.order_number,
        total=f"{order.total:.2f}",
        account_url=f"{FRONTEND_URL}/cuenta",
    )

# ==========================================
# CREAR PAGO
# ==========================================
@router.post(
    "/create",
    response_model=PaymentResponse,
)
def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        access_token = os.getenv(
            "MERCADO_PAGO_ACCESS_TOKEN"
        )
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Mercado Pago no está configurado.",
            )
        # ======================================
        # BUSCAR Y BLOQUEAR PEDIDO
        # ======================================
        order = db.scalar(
            select(Order)
            .where(
                Order.id == payment_data.order_id,
                Order.user_id == current_user.id,
            )
            .with_for_update()
        )
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado.",
            )
        validate_order_before_payment(
            order,
            db,
        )
        # ======================================
        # IDEMPOTENCIA CONTROLADA POR BACKEND
        # ======================================
        had_idempotency_key = bool(
            order.payment_idempotency_key
        )
        idempotency_key = (
            ensure_payment_idempotency_key(
                order,
                db,
            )
        )
        # Si acabamos de hacer commit para crear
        # la clave de un pedido antiguo, volvemos
        # a bloquear y validar la fila.
        if not had_idempotency_key:
            order = db.scalar(
                select(Order)
                .where(
                    Order.id == payment_data.order_id,
                    Order.user_id == current_user.id,
                )
                .with_for_update()
            )
            if not order:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pedido no encontrado.",
                )
            validate_order_before_payment(
                order,
                db,
            )
        # ======================================
        # VALIDAR TOKEN
        # ======================================
        if not payment_data.token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "No se recibió el token "
                    "de la tarjeta."
                ),
            )
        # ======================================
        # MONTO REAL DESDE POSTGRESQL
        # ======================================
        amount = f"{order.total:.2f}"
        payer = {
            "email": payment_data.payer_email,
        }
        mercado_pago_data = {
            "type": "online",
            "processing_mode": "automatic",
            "total_amount": amount,
            "external_reference": order.order_number,
            "payer": payer,
            "transactions": {
                "payments": [
                    {
                        "amount": amount,
                        "payment_method": {
                            "id": payment_data.payment_method_id,
                            "type": payment_data.payment_type_id,
                            "token": payment_data.token,
                            "installments": payment_data.installments,
                        },
                    }
                ]
            },
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotency_key,
        }
        # ======================================
        # SI YA CONOCEMOS LA ORDER DE MP
        # NO CREAMOS OTRA
        # ======================================
        try:
            if order.mercado_pago_order_id:
                response = httpx.get(
                    (
                        "https://api.mercadopago.com"
                        f"/v1/orders/{order.mercado_pago_order_id}"
                    ),
                    headers={
                        "Authorization": f"Bearer {access_token}",
                    },
                    timeout=30.0,
                )
            else:
                response = httpx.post(
                    "https://api.mercadopago.com/v1/orders",
                    headers=headers,
                    json=mercado_pago_data,
                    timeout=30.0,
                )
        except httpx.RequestError as error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "No fue posible comunicarse "
                    "con Mercado Pago."
                ),
            ) from error
        # ======================================
        # RESPUESTA MERCADO PAGO
        # ======================================
        try:
            response_data = response.json()
        except ValueError:
            response_data = {
                "message": response.text,
            }
        if response.status_code >= 400:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": (
                        "Mercado Pago rechazó "
                        "la solicitud."
                    ),
                    "mercado_pago": response_data,
                },
            )
        # ======================================
        # LEER TRANSACCIÓN
        # ======================================
        transaction = get_mp_transaction(
            response_data
        )
        mercado_pago_status = (
            transaction.get("status")
            or response_data.get(
                "status",
                "processing",
            )
        )
        status_detail = (
            transaction.get("status_detail")
            or response_data.get(
                "status_detail"
            )
        )
        mercado_pago_payment_id = (
            transaction.get("id")
        )
        # ======================================
        # GUARDAR IDS DE MERCADO PAGO
        # ======================================
        save_mercado_pago_identifiers(
            order,
            response_data,
            transaction,
        )
        # ======================================
        # MAPEAR Y SINCRONIZAR
        # ======================================
        aura_payment_status = map_payment_status(
            mercado_pago_status,
            status_detail,
        )
        payment_became_paid = apply_payment_result(
            order,
            aura_payment_status,
            db,
        )
        # ======================================
        # REGISTRAR CORREO EN OUTBOX
        # ======================================
        if payment_became_paid:
            enqueue_payment_approved_email(
                db=db,
                order_id=order.id,
                recipient_email=current_user.email,
                first_name=current_user.first_name,
                order_number=order.order_number,
                total=f"{order.total:.2f}",
                account_url=f"{FRONTEND_URL}/cuenta",
            )
        # ======================================
        # GUARDAR PEDIDO + OUTBOX
        # ======================================
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Los identificadores de Mercado Pago "
                    "ya están relacionados con otro pedido."
                ),
            ) from error
        db.refresh(order)
        print(
            "RESULTADO PAGO AURA:",
            {
                "order_number": order.order_number,
                "order_status": order.status,
                "payment_status": order.payment_status,
                "stock_status": order.stock_status,
                "mercado_pago_order_id": (
                    order.mercado_pago_order_id
                ),
                "mercado_pago_payment_id": (
                    order.mercado_pago_payment_id
                ),
                "mercado_pago_status": (
                    mercado_pago_status
                ),
                "status_detail": status_detail,
            },
        )
        return PaymentResponse(
            order_id=order.id,
            mercado_pago_payment_id=(
                str(mercado_pago_payment_id)
                if mercado_pago_payment_id is not None
                else None
            ),
            mercado_pago_status=mercado_pago_status,
            status_detail=status_detail,
            payment_status=order.payment_status,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        print(
            "ERROR CREANDO PAGO:",
            repr(error),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo procesar el pago.",
        ) from error
# ==========================================
# REEMBOLSAR PEDIDO
# ADMIN
# ==========================================
@router.post(
    "/admin/orders/{order_id}/refund",
    response_model=RefundResponse,
)
def refund_order(
    order_id: int,
    _current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        access_token = os.getenv(
            "MERCADO_PAGO_ACCESS_TOKEN"
        )

        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Mercado Pago no está configurado.",
            )

        # ======================================
        # BUSCAR Y BLOQUEAR PEDIDO
        # ======================================
        order = db.scalar(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        )

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado.",
            )

        # ======================================
        # YA FUE REEMBOLSADO
        # ======================================
        if order.payment_status == "refunded":
            if (
                order.mercado_pago_order_id
                and order.refunded_at
            ):
                enqueue_refund_confirmation_email(
                    order,
                    db,
                )
                db.commit()

                return RefundResponse(
                    order_id=order.id,
                    order_number=order.order_number,
                    mercado_pago_order_id=(
                        order.mercado_pago_order_id
                    ),
                    mercado_pago_refund_id=(
                        order.mercado_pago_refund_id
                    ),
                    payment_status="refunded",
                    refunded_at=order.refunded_at,
                    message=(
                        "Este pago ya fue reembolsado."
                    ),
                )

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El pedido figura como reembolsado, "
                    "pero su información de reembolso "
                    "está incompleta."
                ),
            )

        # ======================================
        # VALIDAR PAGO Y CASO PERMITIDO
        # ======================================
        if order.payment_status != "paid":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Solo se puede reembolsar un pedido "
                    "con un pago confirmado."
                ),
            )

        # Por ahora AURA solo automatiza el caso
        # pago tardío: paid + cancelled + released.
        if (
            order.status != "cancelled"
            or order.stock_status != "released"
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Este pedido no corresponde a un "
                    "pago tardío con stock liberado."
                ),
            )

        if not order.mercado_pago_order_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El pedido no tiene una Order de "
                    "Mercado Pago asociada."
                ),
            )

        mercado_pago_order_id = (
            order.mercado_pago_order_id
        )

        # ======================================
        # IDEMPOTENCIA DEL REEMBOLSO
        # ======================================
        refund_idempotency_key = (
            ensure_refund_idempotency_key(
                order,
                db,
            )
        )

        # ensure_refund_idempotency_key puede hacer
        # commit para persistir la clave. Volvemos a
        # leer el pedido antes de contactar a MP.
        order = db.scalar(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        )

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado.",
            )

        if order.payment_status == "refunded":
            if order.refunded_at:
                enqueue_refund_confirmation_email(
                    order,
                    db,
                )
                db.commit()

                return RefundResponse(
                    order_id=order.id,
                    order_number=order.order_number,
                    mercado_pago_order_id=(
                        mercado_pago_order_id
                    ),
                    mercado_pago_refund_id=(
                        order.mercado_pago_refund_id
                    ),
                    payment_status="refunded",
                    refunded_at=order.refunded_at,
                    message=(
                        "Este pago ya fue reembolsado."
                    ),
                )

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El pedido figura como reembolsado, "
                    "pero su información está incompleta."
                ),
            )

        if (
            order.payment_status != "paid"
            or order.status != "cancelled"
            or order.stock_status != "released"
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El pedido cambió de estado y ya no "
                    "puede reembolsarse automáticamente."
                ),
            )

        # No mantenemos el bloqueo de PostgreSQL
        # durante la llamada externa. La clave de
        # idempotencia protege los reintentos.
        db.commit()

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": (
                refund_idempotency_key
            ),
        }

        # ======================================
        # SOLICITAR REEMBOLSO TOTAL A MP
        # ======================================
        try:
            response = httpx.post(
                (
                    "https://api.mercadopago.com"
                    f"/v1/orders/{mercado_pago_order_id}"
                    "/refund"
                ),
                headers=headers,
                json={},
                timeout=30.0,
            )
        except httpx.RequestError as error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "No fue posible comunicarse con "
                    "Mercado Pago para realizar "
                    "el reembolso."
                ),
            ) from error

        try:
            response_data = response.json()
        except ValueError:
            response_data = {
                "message": response.text,
            }

        if not (
            status.HTTP_200_OK
            <= response.status_code
            < status.HTTP_300_MULTIPLE_CHOICES
        ):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": (
                        "Mercado Pago rechazó "
                        "el reembolso."
                    ),
                    "mercado_pago": response_data,
                },
            )

        mercado_pago_status = (
            response_data.get("status")
        )
        status_detail = (
            response_data.get("status_detail")
        )

        # Una devolución total exitosa puede venir
        # como status=refunded o con status_detail=refunded.
        if (
            mercado_pago_status != "refunded"
            and status_detail != "refunded"
        ):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "message": (
                        "Mercado Pago respondió, pero "
                        "el reembolso todavía no figura "
                        "como completado."
                    ),
                    "mercado_pago": response_data,
                },
            )

        # ======================================
        # EXTRAER ID DEL REEMBOLSO
        # ======================================
        refunds = (
            response_data
            .get("transactions", {})
            .get("refunds", [])
        )

        mercado_pago_refund_id = None

        if refunds:
            refund_data = refunds[0]
            refund_id = refund_data.get("id")

            if refund_id is not None:
                mercado_pago_refund_id = str(
                    refund_id
                )

        # ======================================
        # VOLVER A BLOQUEAR Y GUARDAR EN AURA
        # ======================================
        order = db.scalar(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
        )

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado.",
            )

        if (
            order.payment_status == "refunded"
            and order.refunded_at
        ):
            enqueue_refund_confirmation_email(
                order,
                db,
            )
            db.commit()

            return RefundResponse(
                order_id=order.id,
                order_number=order.order_number,
                mercado_pago_order_id=(
                    mercado_pago_order_id
                ),
                mercado_pago_refund_id=(
                    order.mercado_pago_refund_id
                ),
                payment_status="refunded",
                refunded_at=order.refunded_at,
                message=(
                    "Este pago ya fue reembolsado."
                ),
            )

        order.payment_status = "refunded"
        order.mercado_pago_refund_id = (
            mercado_pago_refund_id
        )
        order.refunded_at = datetime.now(
            timezone.utc
        )
        order.scheduled_processing_at = None

        # ======================================
        # REGISTRAR CORREO DE REEMBOLSO
        # ======================================
        enqueue_refund_confirmation_email(
            order,
            db,
        )

        # Pedido reembolsado + correo outbox se
        # guardan juntos en la misma transacción.
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El identificador del reembolso "
                    "ya está relacionado con otro pedido."
                ),
            ) from error

        db.refresh(order)

        print(
            "REEMBOLSO AURA:",
            {
                "order_number": order.order_number,
                "payment_status": order.payment_status,
                "mercado_pago_order_id": (
                    order.mercado_pago_order_id
                ),
                "mercado_pago_refund_id": (
                    order.mercado_pago_refund_id
                ),
                "refunded_at": order.refunded_at,
            },
        )

        return RefundResponse(
            order_id=order.id,
            order_number=order.order_number,
            mercado_pago_order_id=(
                mercado_pago_order_id
            ),
            mercado_pago_refund_id=(
                order.mercado_pago_refund_id
            ),
            payment_status=order.payment_status,
            refunded_at=order.refunded_at,
            message=(
                "El pago fue reembolsado correctamente."
            ),
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        print(
            "ERROR REEMBOLSANDO PEDIDO:",
            repr(error),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "No se pudo procesar el reembolso."
            ),
        ) from error

# ==========================================
# WEBHOOK MERCADO PAGO
# ==========================================
@router.post("/webhook")
async def mercado_pago_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    # ======================================
    # BODY
    # ======================================
    try:
        body = await request.json()
    except Exception:
        body = {}
    # ======================================
    # DATA.ID
    # ======================================
    data_id = request.query_params.get(
        "data.id"
    )
    if not data_id:
        data = body.get(
            "data",
            {},
        )
        if isinstance(
            data,
            dict,
        ):
            data_id = data.get(
                "id"
            )
    # ======================================
    # TIPO
    # ======================================
    notification_type = (
        request.query_params.get("type")
        or body.get("type")
    )
    # ======================================
    # HEADERS
    # ======================================
    x_signature = request.headers.get(
        "x-signature"
    )
    x_request_id = request.headers.get(
        "x-request-id"
    )
    print(
        "WEBHOOK MP:",
        {
            "data_id": data_id,
            "type": notification_type,
            "has_signature": bool(
                x_signature
            ),
            "has_request_id": bool(
                x_request_id
            ),
        },
    )
    print(
        "WEBHOOK META:",
        {
            "application_id": body.get(
                "application_id"
            ),
            "live_mode": body.get(
                "live_mode"
            ),
            "user_id": body.get(
                "user_id"
            ),
            "action": body.get(
                "action"
            ),
        },
    )
    # ======================================
    # CONFIGURACIÓN
    # ======================================
    webhook_secret = os.getenv(
        "MERCADO_PAGO_WEBHOOK_SECRET"
    )
    access_token = os.getenv(
        "MERCADO_PAGO_ACCESS_TOKEN"
    )
    if not webhook_secret:
        raise HTTPException(
            status_code=500,
            detail=(
                "Webhook de Mercado Pago "
                "no configurado."
            ),
        )
    if not access_token:
        raise HTTPException(
            status_code=500,
            detail=(
                "Mercado Pago no está "
                "configurado."
            ),
        )
    # ======================================
    # DATOS OBLIGATORIOS
    # ======================================
    if not data_id:
        raise HTTPException(
            status_code=400,
            detail="No se recibió data.id.",
        )
    if not x_signature:
        raise HTTPException(
            status_code=400,
            detail="No se recibió x-signature.",
        )
    if not x_request_id:
        raise HTTPException(
            status_code=400,
            detail="No se recibió x-request-id.",
        )
    # ======================================
    # VALIDAR FIRMA
    # ======================================
    signature_valid = True
    try:
        WebhookSignatureValidator.validate(
            x_signature,
            x_request_id,
            data_id,
            webhook_secret,
        )
        print(
            "FIRMA WEBHOOK: OK"
        )
    except InvalidWebhookSignatureError as error:
        signature_valid = False
        print(
            "FIRMA WEBHOOK NO COINCIDE:",
            repr(error),
        )
        # Fallback exclusivamente para las
        # notificaciones de prueba de MP.
        is_test_notification = (
            body.get("live_mode") is False
            and str(data_id).startswith(
                "ORDTST"
            )
        )
        if not is_test_notification:
            raise HTTPException(
                status_code=401,
                detail=(
                    "Firma de webhook inválida."
                ),
            ) from error
        print(
            "WEBHOOK DE PRUEBA: verificando "
            "Order directamente con Mercado Pago."
        )
    except Exception as error:
        print(
            "ERROR VALIDANDO FIRMA:",
            repr(error),
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Error interno validando "
                "la firma del webhook."
            ),
        ) from error
    # ======================================
    # SOLO ORDER
    # ======================================
    if notification_type not in {
        "order",
        "orders",
    }:
        return {
            "received": True,
            "ignored": True,
        }
    # ======================================
    # CONSULTAR ORDER EN MERCADO PAGO
    # ======================================
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    try:
        async with httpx.AsyncClient(
            timeout=20.0
        ) as client:
            mp_response = await client.get(
                (
                    "https://api.mercadopago.com"
                    f"/v1/orders/{data_id}"
                ),
                headers=headers,
            )
    except httpx.RequestError as error:
        print(
            "ERROR CONSULTANDO ORDER MP:",
            repr(error),
        )
        raise HTTPException(
            status_code=502,
            detail=(
                "No se pudo consultar "
                "Mercado Pago."
            ),
        ) from error
    print(
        "MP ORDER STATUS:",
        mp_response.status_code,
    )
    if mp_response.status_code >= 400:
        print(
            "MP ORDER RESPONSE:",
            mp_response.text,
        )
        raise HTTPException(
            status_code=502,
            detail={
                "message": (
                    "No se pudo consultar "
                    "la Order de Mercado Pago."
                ),
                "mercado_pago": (
                    mp_response.text
                ),
            },
        )
    mp_order = mp_response.json()
    returned_order_id = str(
        mp_order.get(
            "id",
            "",
        )
    )
    # ======================================
    # VERIFICACIÓN EXTRA PARA TEST
    # ======================================
    if not signature_valid:
        if returned_order_id != str(
            data_id
        ):
            raise HTTPException(
                status_code=401,
                detail=(
                    "La Order consultada no "
                    "coincide con la notificación."
                ),
            )
        print(
            "ORDER DE PRUEBA VERIFICADA "
            "DIRECTAMENTE CON MERCADO PAGO."
        )
    # ======================================
    # EXTERNAL REFERENCE
    # ======================================
    external_reference = mp_order.get(
        "external_reference"
    )
    if not external_reference:
        return {
            "received": True,
            "updated": False,
            "reason": "Sin external_reference.",
        }
    if (
        not signature_valid
        and not external_reference.startswith(
            "AURA-"
        )
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "La Order no corresponde "
                "a un pedido AURA."
            ),
        )
    # ======================================
    # BUSCAR Y BLOQUEAR PEDIDO AURA
    # ======================================
    order = db.scalar(
        select(Order)
        .where(
            Order.order_number
            == external_reference
        )
        .with_for_update()
    )
    if not order:
        return {
            "received": True,
            "updated": False,
            "reason": (
                "Pedido AURA no encontrado."
            ),
        }
    # ======================================
    # VERIFICAR ORDER MP
    # ======================================
    if (
        order.mercado_pago_order_id is not None
        and order.mercado_pago_order_id
        != returned_order_id
    ):
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La Order de Mercado Pago no "
                "coincide con la registrada "
                "para este pedido."
            ),
        )
    if (
        order.mercado_pago_order_id is None
        and returned_order_id
    ):
        order.mercado_pago_order_id = (
            returned_order_id
        )
    # ======================================
    # LEER TRANSACCIÓN
    # ======================================
    transaction = get_mp_transaction(
        mp_order
    )
    mp_status = (
        transaction.get("status")
        or mp_order.get("status")
        or "processing"
    )
    status_detail = (
        transaction.get("status_detail")
        or mp_order.get("status_detail")
    )
    mp_payment_id = transaction.get(
        "id"
    )
    # ======================================
    # VERIFICAR PAYMENT ID
    # ======================================
    if mp_payment_id is not None:
        mp_payment_id = str(
            mp_payment_id
        )
        if (
            order.mercado_pago_payment_id
            is not None
            and order.mercado_pago_payment_id
            != mp_payment_id
        ):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El pago de Mercado Pago no "
                    "coincide con el registrado "
                    "para este pedido."
                ),
            )
        if (
            order.mercado_pago_payment_id
            is None
        ):
            order.mercado_pago_payment_id = (
                mp_payment_id
            )
    print(
        "ESTADO MP:",
        {
            "status": mp_status,
            "status_detail": status_detail,
        },
    )
    # ======================================
    # SINCRONIZAR
    # ======================================
    aura_status = map_payment_status(
        mp_status,
        status_detail,
    )
    payment_became_paid = apply_payment_result(
        order,
        aura_status,
        db,
    )
    # ======================================
    # REGISTRAR CORREO EN OUTBOX
    # ======================================
    if payment_became_paid:
        customer = db.scalar(
            select(User).where(
                User.id == order.user_id
            )
        )
        if customer:
            enqueue_payment_approved_email(
                db=db,
                order_id=order.id,
                recipient_email=customer.email,
                first_name=customer.first_name,
                order_number=order.order_number,
                total=f"{order.total:.2f}",
                account_url=f"{FRONTEND_URL}/cuenta",
            )
        else:
            print(
                "ALERTA AURA: no se encontró "
                "el cliente para registrar el correo:",
                order.order_number,
            )
    # ======================================
    # GUARDAR PEDIDO + OUTBOX
    # ======================================
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Los identificadores de Mercado Pago "
                "ya están asociados a otro pedido."
            ),
        ) from error
    db.refresh(order)
    print(
        "PEDIDO AURA ACTUALIZADO:",
        {
            "order_number": order.order_number,
            "order_status": order.status,
            "payment_status": order.payment_status,
            "stock_status": order.stock_status,
            "mercado_pago_order_id": (
                order.mercado_pago_order_id
            ),
            "mercado_pago_payment_id": (
                order.mercado_pago_payment_id
            ),
            "signature_valid": signature_valid,
        },
    )
    return {
        "received": True,
        "order_number": order.order_number,
        "order_status": order.status,
        "payment_status": order.payment_status,
        "stock_status": order.stock_status,
        "verification": (
            "signature"
            if signature_valid
            else "mercado_pago_api"
        ),
    }
