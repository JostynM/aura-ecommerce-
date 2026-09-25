import os

from datetime import (
    datetime,
    timezone,
)
from pathlib import Path

import httpx

from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from mercadopago.webhook import (
    InvalidWebhookSignatureError,
    WebhookSignatureValidator,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import (
    get_current_user,
)
from app.models.order import Order
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
)
from app.services.stock_service import (
    commit_order_stock,
    restore_order_stock,
)
from app.services.email_service import (
    send_payment_approved_email,
)
from app.services.business_hours_service import (
    calculate_scheduled_processing_at,
)


# ==========================================
# VARIABLES DE ENTORNO
# ==========================================

BACKEND_DIR = Path(
    __file__
).resolve().parents[2]

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
    """
    Convierte los estados recibidos desde
    Mercado Pago a los estados internos
    utilizados por AURA.
    """

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
# APLICAR RESULTADO DEL PAGO
# ==========================================

def apply_payment_result(
    order: Order,
    new_payment_status: str,
    db: Session,
) -> bool:
    """
    Sincroniza:

    - estado del pago
    - estado del pedido
    - reserva de stock

    Devuelve True únicamente cuando el pago
    acaba de pasar a "paid".
    """

    current_payment_status = (
        order.payment_status
    )


    # ======================================
    # 1. PAGO APROBADO
    # ======================================

    if new_payment_status == "paid":

        # Ya estaba registrado como pagado.
        # Evita procesar stock y correos otra vez.
        if current_payment_status == "paid":
            return False


        # ==================================
        # RESERVA ACTIVA
        # ==================================
        #
        # El stock ya fue descontado al crear
        # el pedido.
        #
        # reserved → committed
        # pending  → confirmed
        # ==================================

        if order.stock_status == "reserved":

            commit_order_stock(
                order
            )


            # El pago ya fue aprobado y el
            # inventario quedó confirmado.
            #
            # Solo cambiamos a confirmed si el
            # pedido todavía estaba pendiente.

            if order.status == "pending":

                order.status = (
                    "confirmed"
                )


        # ==================================
        # PAGO DESPUÉS DE LIBERAR STOCK
        # ==================================
        #
        # No marcamos el pedido como confirmed
        # porque el stock ya fue liberado.
        # Requiere revisión manual.
        # ==================================

        elif order.stock_status == "released":

            print(
                "ALERTA AURA:",
                (
                    "Mercado Pago confirmó un "
                    "pago para un pedido cuyo "
                    "stock ya fue liberado."
                ),
                order.order_number,
            )


        # ==================================
        # PEDIDOS ANTIGUOS
        # ==================================

        elif order.stock_status == "legacy":

            print(
                "AURA:",
                (
                    "Pago recibido para pedido "
                    "legacy. El inventario no "
                    "será modificado."
                ),
                order.order_number,
            )


        # ==================================
        # STOCK YA CONFIRMADO
        # ==================================

        elif order.stock_status == "committed":

            if order.status == "pending":

                order.status = (
                    "confirmed"
                )


        order.payment_status = (
            "paid"
        )

        # ==================================
        # PROGRAMAR INICIO DE PROCESAMIENTO
        # ==================================
        #
        # Solo se programa cuando el pedido
        # quedó confirmado correctamente.
        #
        # Ejemplos:
        # - Compra dentro del horario:
        #   puede procesarse inmediatamente.
        #
        # - Compra fuera del horario:
        #   queda programada para la próxima
        #   apertura de AURA.
        #
        # Si el cálculo del horario falla,
        # NO se invalida un pago aprobado.
        # ==================================

        if (
            order.status == "confirmed"
            and order.scheduled_processing_at
            is None
        ):

            try:

                order.scheduled_processing_at = (
                    calculate_scheduled_processing_at(
                        db
                    )
                )

            except Exception as error:

                print(
                    "ERROR PROGRAMANDO "
                    "PROCESAMIENTO DEL PEDIDO:",
                    repr(error),
                )

        return True


    # ======================================
    # 2. PAGO FALLIDO
    # ======================================

    if new_payment_status == "failed":

        # Nunca convertir un pago confirmado
        # nuevamente en fallido.
        if current_payment_status == "paid":

            print(
                "ALERTA AURA:",
                (
                    "Se recibió estado failed "
                    "para un pedido que ya "
                    "estaba marcado como paid."
                ),
                order.order_number,
            )

            return False


        # ==================================
        # DEVOLVER STOCK RESERVADO
        # ==================================

        if order.stock_status == "reserved":

            restore_order_stock(
                order,
                db,
            )


        # ==================================
        # CANCELAR PEDIDO
        # ==================================

        if order.status != "cancelled":

            order.status = (
                "cancelled"
            )


        order.payment_status = (
            "failed"
        )

        return False


    # ======================================
    # 3. PAGO PENDIENTE
    # ======================================

    # Nunca degradamos un estado definitivo.

    if current_payment_status in {
        "paid",
        "failed",
        "refunded",
    }:

        return False


    order.payment_status = (
        "pending"
    )

    return False

# ==========================================
# CREAR PAGO
# ==========================================

@router.post(
    "/create",
    response_model=PaymentResponse,
)
def create_payment(
    payment_data: PaymentCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    try:

        # ======================================
        # 1. ACCESS TOKEN
        # ======================================

        access_token = os.getenv(
            "MERCADO_PAGO_ACCESS_TOKEN"
        )

        if not access_token:

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Mercado Pago no está "
                    "configurado."
                ),
            )

        # ======================================
        # 2. BUSCAR Y BLOQUEAR PEDIDO
        # ======================================
        #
        # with_for_update bloquea temporalmente
        # la fila para evitar que otro proceso,
        # webhook o scheduler modifique el mismo
        # pedido simultáneamente.
        # ======================================

        order = db.scalar(
            select(Order)
            .where(
                Order.id
                == payment_data.order_id,

                Order.user_id
                == current_user.id,
            )
            .with_for_update()
        )

        if not order:

            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "Pedido no encontrado."
                ),
            )

        # ======================================
        # 3. NO PAGAR PEDIDO CANCELADO
        # ======================================

        if order.status == "cancelled":

            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Este pedido fue cancelado. "
                    "Debes crear uno nuevo."
                ),
            )

        # ======================================
        # 4. EVITAR DOBLE PAGO
        # ======================================

        if order.payment_status == "paid":

            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Este pedido ya fue pagado."
                ),
            )

        # ======================================
        # 5. PEDIDO CON PAGO FALLIDO
        # ======================================

        if order.payment_status == "failed":

            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "El pago de este pedido "
                    "ya falló. Debes crear "
                    "un nuevo pedido."
                ),
            )

        # ======================================
        # 6. VALIDAR VENCIMIENTO DE RESERVA
        # ======================================

        now = datetime.now(
            timezone.utc
        )

        if (
            order.stock_status == "reserved"
            and order.stock_reserved_until
            is not None
            and order.stock_reserved_until <= now
        ):

            # ==================================
            # LA RESERVA VENCIÓ
            # ==================================
            #
            # No necesitamos esperar al proceso
            # automático del main.py.
            #
            # Liberamos el inventario ahora.
            # ==================================

            restore_order_stock(
                order,
                db,
            )

            order.status = "cancelled"

            db.commit()

            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "La reserva de este pedido "
                    "ha vencido. El stock fue "
                    "liberado. Debes crear "
                    "un pedido nuevo."
                ),
            )

        # ======================================
        # 7. VALIDAR RESERVA ACTIVA
        # ======================================

        if order.stock_status != "reserved":

            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "La reserva de stock de "
                    "este pedido ya no está "
                    "activa. Debes crear un "
                    "pedido nuevo."
                ),
            )

        # ======================================
        # 8. VALIDAR TOKEN DE TARJETA
        # ======================================

        if not payment_data.token:

            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "No se recibió el token "
                    "de la tarjeta."
                ),
            )

        # ======================================
        # 9. MONTO REAL DESDE POSTGRESQL
        # ======================================
        #
        # Nunca utilizamos un monto enviado
        # desde React.
        #
        # El backend utiliza el total real
        # almacenado en PostgreSQL.
        # ======================================

        amount = (
            f"{order.total:.2f}"
        )

        # ======================================
        # 10. DATOS DEL PAGADOR
        # ======================================

        payer = {
            "email":
                payment_data.payer_email,
        }

        # ======================================
        # 11. PAYLOAD MERCADO PAGO
        # ======================================

        mercado_pago_data = {

            "type":
                "online",

            "processing_mode":
                "automatic",

            "total_amount":
                amount,

            "external_reference":
                order.order_number,

            "payer":
                payer,

            "transactions": {

                "payments": [
                    {
                        "amount":
                            amount,

                        "payment_method": {

                            "id":
                                payment_data
                                .payment_method_id,

                            "type":
                                payment_data
                                .payment_type_id,

                            "token":
                                payment_data.token,

                            "installments":
                                payment_data
                                .installments,
                        },
                    }
                ]
            },
        }

        # ======================================
        # 12. HEADERS MERCADO PAGO
        # ======================================

        headers = {

            "Authorization":
                f"Bearer {access_token}",

            "Content-Type":
                "application/json",

            "X-Idempotency-Key":
                payment_data.idempotency_key,
        }

        # ======================================
        # 13. CREAR ORDER EN MERCADO PAGO
        # ======================================

        try:

            response = httpx.post(
                (
                    "https://api.mercadopago.com"
                    "/v1/orders"
                ),
                headers=headers,
                json=mercado_pago_data,
                timeout=30.0,
            )

        except httpx.RequestError as error:

            db.rollback()

            raise HTTPException(
                status_code=(
                    status.HTTP_502_BAD_GATEWAY
                ),
                detail=(
                    "No fue posible comunicarse "
                    "con Mercado Pago."
                ),
            ) from error

        # ======================================
        # 14. LEER RESPUESTA
        # ======================================

        try:

            response_data = (
                response.json()
            )

        except ValueError:

            response_data = {
                "message":
                    response.text,
            }

        # ======================================
        # 15. ERROR HTTP MERCADO PAGO
        # ======================================
        #
        # Un HTTP 400 no significa siempre
        # que el banco haya rechazado el pago.
        #
        # Por eso aquí NO liberamos stock.
        #
        # La reserva seguirá activa hasta
        # que venza o Mercado Pago confirme
        # un estado definitivo.
        # ======================================

        if response.status_code >= 400:

            db.rollback()

            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail={
                    "message":
                        "Mercado Pago rechazó "
                        "la solicitud.",

                    "mercado_pago":
                        response_data,
                },
            )

        # ======================================
        # 16. LEER TRANSACCIÓN
        # ======================================

        transactions = (
            response_data
            .get(
                "transactions",
                {},
            )
            .get(
                "payments",
                [],
            )
        )

        transaction = (
            transactions[0]
            if transactions
            else {}
        )

        mercado_pago_status = (
            transaction.get(
                "status"
            )
            or response_data.get(
                "status",
                "processing",
            )
        )

        status_detail = (
            transaction.get(
                "status_detail"
            )
            or response_data.get(
                "status_detail"
            )
        )

        mercado_pago_payment_id = (
            transaction.get(
                "id"
            )
        )

        # ======================================
        # 17. MAPEAR ESTADO
        # ======================================

        aura_payment_status = (
            map_payment_status(
                mercado_pago_status,
                status_detail,
            )
        )

        # ======================================
        # 18. SINCRONIZAR PEDIDO + STOCK
        # ======================================

        payment_became_paid = (
            apply_payment_result(
                order,
                aura_payment_status,
                db,
            )
        )

        # ======================================
        # 19. GUARDAR EN POSTGRESQL
        # ======================================

        db.commit()

        db.refresh(
            order
        )

        # ======================================
        # 20. CORREO DE COMPRA CONFIRMADA
        # ======================================
        #
        # Se envía solo cuando este proceso
        # cambió el pedido de pending → paid.
        #
        # Si el webhook llega después y el pedido
        # ya está paid, no se enviará otra vez.
        # ======================================

        if payment_became_paid:

            try:

                send_payment_approved_email(
                    recipient_email=(
                        current_user.email
                    ),
                    first_name=(
                        current_user.first_name
                    ),
                    order_number=(
                        order.order_number
                    ),
                    total=(
                        f"{order.total:.2f}"
                    ),
                    account_url=(
                        f"{FRONTEND_URL}/cuenta"
                    ),
                )

            except Exception as error:

                print(
                    "No se pudo enviar el "
                    "correo de compra confirmada:",
                    repr(error),
                )

        # ======================================
        # 21. LOG
        # ======================================

        print(
            "RESULTADO PAGO AURA:",
            {
                "order_number":
                    order.order_number,

                "order_status":
                    order.status,

                "payment_status":
                    order.payment_status,

                "stock_status":
                    order.stock_status,

                "mercado_pago_status":
                    mercado_pago_status,

                "status_detail":
                    status_detail,
            },
        )

        # ======================================
        # 22. RESPUESTA AL FRONTEND
        # ======================================

        return PaymentResponse(

            order_id=order.id,

            mercado_pago_payment_id=(
                str(
                    mercado_pago_payment_id
                )
                if mercado_pago_payment_id
                is not None
                else None
            ),

            mercado_pago_status=(
                mercado_pago_status
            ),

            status_detail=(
                status_detail
            ),

            payment_status=(
                order.payment_status
            ),
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
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "No se pudo procesar "
                "el pago."
            ),
        ) from error


# ==========================================
# WEBHOOK MERCADO PAGO
# ==========================================

@router.post(
    "/webhook"
)
async def mercado_pago_webhook(
    request: Request,
    db: Session = Depends(
        get_db
    ),
):

    # ======================================
    # 1. LEER BODY
    # ======================================

    try:

        body = await request.json()

    except Exception:

        body = {}

    # ======================================
    # 2. OBTENER DATA.ID
    # ======================================

    data_id = (
        request.query_params.get(
            "data.id"
        )
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
    # 3. TIPO DE NOTIFICACIÓN
    # ======================================

    notification_type = (
        request.query_params.get(
            "type"
        )
        or body.get(
            "type"
        )
    )

    # ======================================
    # 4. HEADERS DEL WEBHOOK
    # ======================================

    x_signature = (
        request.headers.get(
            "x-signature"
        )
    )

    x_request_id = (
        request.headers.get(
            "x-request-id"
        )
    )

    # ======================================
    # 5. LOG BÁSICO
    # ======================================

    print(
        "WEBHOOK MP:",
        {
            "data_id":
                data_id,

            "type":
                notification_type,

            "has_signature":
                bool(
                    x_signature
                ),

            "has_request_id":
                bool(
                    x_request_id
                ),
        },
    )

    print(
        "WEBHOOK META:",
        {
            "application_id":
                body.get(
                    "application_id"
                ),

            "live_mode":
                body.get(
                    "live_mode"
                ),

            "user_id":
                body.get(
                    "user_id"
                ),

            "action":
                body.get(
                    "action"
                ),
        },
    )

    # ======================================
    # 6. VARIABLES DE ENTORNO
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
    # 7. VALIDAR DATOS OBLIGATORIOS
    # ======================================

    if not data_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "No se recibió data.id."
            ),
        )

    if not x_signature:

        raise HTTPException(
            status_code=400,
            detail=(
                "No se recibió x-signature."
            ),
        )

    if not x_request_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "No se recibió x-request-id."
            ),
        )

    # ======================================
    # 8. VALIDAR FIRMA
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

        # ==================================
        # FALLBACK SOLO PARA TEST
        # ==================================
        #
        # NO utilizar este mecanismo como
        # sustituto de la validación real
        # cuando AURA pase a producción.
        # ==================================

        is_test_notification = (
            body.get(
                "live_mode"
            ) is False

            and str(
                data_id
            ).startswith(
                "ORDTST"
            )
        )

        if not is_test_notification:

            raise HTTPException(
                status_code=401,
                detail=(
                    "Firma de webhook "
                    "inválida."
                ),
            ) from error

        print(
            "WEBHOOK DE PRUEBA:"
            " verificando Order directamente "
            "con Mercado Pago."
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
    # 9. SOLO PROCESAR ORDER
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
    # 10. CONSULTAR ORDER A MERCADO PAGO
    # ======================================

    headers = {
        "Authorization":
            f"Bearer {access_token}",
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

    # ======================================
    # 11. VALIDAR RESPUESTA DE MP
    # ======================================

    if mp_response.status_code >= 400:

        print(
            "MP ORDER RESPONSE:",
            mp_response.text,
        )

        raise HTTPException(
            status_code=502,
            detail={
                "message":
                    "No se pudo consultar "
                    "la Order de Mercado Pago.",

                "mercado_pago":
                    mp_response.text,
            },
        )

    # ======================================
    # 12. LEER ORDER DE MERCADO PAGO
    # ======================================

    mp_order = (
        mp_response.json()
    )

    # ======================================
    # 13. VERIFICACIÓN EXTRA EN TEST
    # ======================================
    #
    # Como la firma de algunas notificaciones
    # de pruebas todavía no coincide, hacemos
    # una consulta directa a Mercado Pago.
    # ======================================

    if not signature_valid:

        returned_order_id = str(
            mp_order.get(
                "id",
                "",
            )
        )

        if returned_order_id != str(
            data_id
        ):

            raise HTTPException(
                status_code=401,
                detail=(
                    "La Order consultada "
                    "no coincide con "
                    "la notificación."
                ),
            )

        print(
            "ORDER DE PRUEBA VERIFICADA "
            "DIRECTAMENTE CON MERCADO PAGO."
        )

    # ======================================
    # 14. EXTERNAL REFERENCE
    # ======================================

    external_reference = (
        mp_order.get(
            "external_reference"
        )
    )

    if not external_reference:

        return {
            "received": True,
            "updated": False,
            "reason":
                "Sin external_reference.",
        }

    # ======================================
    # 15. SEGURIDAD EXTRA DEL FALLBACK
    # ======================================

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
    # 16. BUSCAR Y BLOQUEAR PEDIDO AURA
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
            "reason":
                "Pedido AURA no encontrado.",
        }

    # ======================================
    # 17. LEER TRANSACCIÓN
    # ======================================

    transactions = (
        mp_order
        .get(
            "transactions",
            {},
        )
        .get(
            "payments",
            [],
        )
    )

    transaction = (
        transactions[0]
        if transactions
        else {}
    )

    mp_status = (
        transaction.get(
            "status"
        )
        or mp_order.get(
            "status"
        )
        or "processing"
    )

    status_detail = (
        transaction.get(
            "status_detail"
        )
        or mp_order.get(
            "status_detail"
        )
    )

    print(
        "ESTADO MP:",
        {
            "status":
                mp_status,

            "status_detail":
                status_detail,
        },
    )

    # ======================================
    # 18. MAPEAR ESTADO
    # ======================================

    aura_status = (
        map_payment_status(
            mp_status,
            status_detail,
        )
    )

    # ======================================
    # 19. SINCRONIZAR PAGO + PEDIDO + STOCK
    # ======================================

    payment_became_paid = (
        apply_payment_result(
            order,
            aura_status,
            db,
        )
    )

    # ======================================
    # 20. GUARDAR
    # ======================================

    db.commit()

    db.refresh(
        order
    )

    # ======================================
    # 21. CORREO DE COMPRA CONFIRMADA
    # ======================================

    if payment_became_paid:

        customer = db.scalar(
            select(User)
            .where(
                User.id == order.user_id
            )
        )

        if customer:

            try:

                send_payment_approved_email(
                    recipient_email=(
                        customer.email
                    ),
                    first_name=(
                        customer.first_name
                    ),
                    order_number=(
                        order.order_number
                    ),
                    total=(
                        f"{order.total:.2f}"
                    ),
                    account_url=(
                        f"{FRONTEND_URL}/cuenta"
                    ),
                )

            except Exception as error:

                print(
                    "No se pudo enviar el "
                    "correo de compra confirmada "
                    "desde webhook:",
                    repr(error),
                )

    # ======================================
    # 22. LOG
    # ======================================

    print(
        "PEDIDO AURA ACTUALIZADO:",
        {
            "order_number":
                order.order_number,

            "order_status":
                order.status,

            "payment_status":
                order.payment_status,

            "stock_status":
                order.stock_status,

            "signature_valid":
                signature_valid,
        },
    )

    # ======================================
    # 23. RESPONDER A MERCADO PAGO
    # ======================================

    return {
        "received": True,

        "order_number":
            order.order_number,

        "order_status":
            order.status,

        "payment_status":
            order.payment_status,

        "stock_status":
            order.stock_status,

        "verification":
            (
                "signature"
                if signature_valid
                else "mercado_pago_api"
            ),
    }