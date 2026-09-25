import os

from decimal import Decimal
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import (
    get_current_admin,
    get_current_user,
)
from app.models.address import Address
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
    OrderStatusUpdate,
)
from app.services.stock_service import (
    restore_order_stock,
)
from app.services.email_service import (
    send_order_delivered_email,
    send_order_shipped_email,
)
from datetime import (
    datetime,
    timedelta,
    timezone,
)


FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).rstrip("/")

# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


# =====================================================
# CONVERTIR ORDER SQLALCHEMY → ORDER RESPONSE
# =====================================================

def build_order_response(
    order: Order,
    db: Session,
) -> OrderResponse:

    items = db.scalars(
        select(OrderItem)
        .where(
            OrderItem.order_id == order.id
        )
        .order_by(OrderItem.id.asc())
    ).all()

    return OrderResponse(
        id=order.id,

        order_number=order.order_number,

        status=order.status,

        payment_status=order.payment_status,

        stock_status=order.stock_status,

        stock_reserved_until=(
            order.stock_reserved_until
        ),

        scheduled_processing_at=(
            order.scheduled_processing_at
        ),

        subtotal=order.subtotal,

        shipping_cost=order.shipping_cost,

        total=order.total,

        recipient_name=order.recipient_name,

        phone=order.phone,

        department=order.department,

        province=order.province,

        district=order.district,

        address_line=order.address_line,

        reference=order.reference,

        created_at=order.created_at,

        items=[
            OrderItemResponse.model_validate(
                item
            )
            for item in items
        ],
    )



# =====================================================
# CREAR PEDIDO
# CLIENTE
# =====================================================

@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    order_data: OrderCreate,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    try:

        # =============================================
        # 1. VERIFICAR DIRECCIÓN
        # =============================================

        address = db.scalar(
            select(Address).where(
                Address.id
                == order_data.address_id,

                Address.user_id
                == current_user.id,
            )
        )

        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dirección no encontrada.",
            )

        # =============================================
        # 2. VERIFICAR QUE HAYA PRODUCTOS
        # =============================================

        if not order_data.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "El pedido debe contener "
                    "al menos un producto."
                ),
            )

        # =============================================
        # 3. EVITAR PRODUCTOS DUPLICADOS
        # =============================================

        product_ids = [
            item.product_id
            for item in order_data.items
        ]

        if (
            len(product_ids)
            != len(set(product_ids))
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "No puedes enviar el mismo "
                    "producto dos veces."
                ),
            )

        # =============================================
        # 4. BLOQUEAR PRODUCTOS
        # =============================================
        #
        # with_for_update evita que dos compras
        # modifiquen simultáneamente el mismo stock.
        #
        # Los ordenamos por ID para disminuir el
        # riesgo de bloqueos cruzados.
        # =============================================

        products = db.scalars(
            select(Product)
            .where(
                Product.id.in_(
                    product_ids
                )
            )
            .order_by(Product.id.asc())
            .with_for_update()
        ).all()

        products_by_id = {
            product.id: product
            for product in products
        }

        # =============================================
        # 5. VALIDAR PRODUCTOS Y CALCULAR SUBTOTAL
        # =============================================

        subtotal = Decimal("0.00")

        validated_items = []

        for item in order_data.items:

            product = products_by_id.get(
                item.product_id
            )

            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"Producto "
                        f"{item.product_id} "
                        "no encontrado."
                    ),
                )

            if not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"{product.name} "
                        "no está disponible."
                    ),
                )

            if item.quantity <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "La cantidad debe ser "
                        "mayor que cero."
                    ),
                )

            if (
                product.stock
                < item.quantity
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Stock insuficiente para "
                        f"{product.name}."
                    ),
                )

            line_total = (
                product.price
                * item.quantity
            )

            subtotal += line_total

            validated_items.append({
                "product": product,
                "quantity": item.quantity,
                "line_total": line_total,
            })

        # =============================================
        # 6. CALCULAR ENVÍO
        # =============================================

        if subtotal >= Decimal("299.00"):
            shipping_cost = Decimal(
                "0.00"
            )

        else:
            shipping_cost = Decimal(
                "10.00"
            )

        total = (
            subtotal
            + shipping_cost
        )

        # =============================================
        # 7. GENERAR NÚMERO DE PEDIDO
        # =============================================

        order_number = (
            "AURA-"
            + uuid4().hex[:10].upper()
        )

        # =============================================
        # 8. CREAR PEDIDO
        # =============================================

        new_order = Order(
            order_number=order_number,

            user_id=current_user.id,

            address_id=address.id,

            # =========================================
            # ESTADO DEL PEDIDO
            # =========================================

            status="pending",

            # =========================================
            # ESTADO DEL PAGO
            # =========================================

            payment_status="pending",

            # =========================================
            # RESERVA DE INVENTARIO
            # =========================================
            #
            # Cuando se crea el pedido, las unidades
            # quedan reservadas durante 15 minutos.
            # =========================================

            stock_status="reserved",

            stock_reserved_until=(
                datetime.now(timezone.utc)
                + timedelta(minutes=15)
            ),

            # =========================================
            # IMPORTES
            # =========================================

            subtotal=subtotal,

            shipping_cost=shipping_cost,

            total=total,

            # =========================================
            # SNAPSHOT DE DIRECCIÓN
            # =========================================

            recipient_name=(
                address.recipient_name
            ),

            phone=address.phone,

            department=(
                address.department
            ),

            province=(
                address.province
            ),

            district=(
                address.district
            ),

            address_line=(
                address.address_line
            ),

            reference=(
                address.reference
            ),
        )

        db.add(new_order)

        # Necesitamos obtener new_order.id
        # antes de crear los OrderItem.
        db.flush()

        # =============================================
        # 9. CREAR ITEMS Y RESERVAR STOCK
        # =============================================
        #
        # IMPORTANTE:
        #
        # Ya no pensaremos en esto como una venta
        # definitiva.
        #
        # Aquí estamos RESERVANDO el inventario
        # mientras el cliente realiza el pago.
        # =============================================

        for validated in validated_items:

            product = validated[
                "product"
            ]

            quantity = validated[
                "quantity"
            ]

            line_total = validated[
                "line_total"
            ]

            new_item = OrderItem(
                order_id=new_order.id,

                product_id=product.id,

                product_name=product.name,

                brand=product.brand,

                size_ml=product.size_ml,

                unit_price=product.price,

                quantity=quantity,

                line_total=line_total,
            )

            db.add(new_item)

            # =========================================
            # RESERVAR UNIDADES
            # =========================================

            product.stock -= quantity

        # =============================================
        # 10. GUARDAR TRANSACCIÓN
        # =============================================

        db.commit()

        db.refresh(new_order)

        # =============================================
        # 11. RESPONDER
        # =============================================

        return build_order_response(
            new_order,
            db,
        )

    except HTTPException:

        db.rollback()

        raise

    except Exception as error:

        db.rollback()

        print(
            "ERROR CREANDO PEDIDO:",
            repr(error),
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="No se pudo crear el pedido.",
        ) from error


# =====================================================
# LISTAR MIS PEDIDOS
# CLIENTE
# =====================================================

@router.get(
    "",
    response_model=list[OrderResponse],
)
def get_my_orders(
    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):

    orders = db.scalars(
        select(Order)
        .where(
            Order.user_id
            == current_user.id
        )
        .order_by(
            Order.id.desc()
        )
    ).all()

    return [
        build_order_response(
            order,
            db,
        )
        for order in orders
    ]


# =====================================================
# LISTAR TODOS LOS PEDIDOS
# ADMIN
#
# IMPORTANTE:
# Esta ruta debe ir antes de /{order_id}
# =====================================================

@router.get(
    "/admin/all",
    response_model=list[OrderResponse],
)
def get_admin_orders(
    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(get_db),
):

    orders = db.scalars(
        select(Order)
        .order_by(
            Order.id.desc()
        )
    ).all()

    return [
        build_order_response(
            order,
            db,
        )
        for order in orders
    ]


# =====================================================
# VER PEDIDO
# ADMIN
# =====================================================

@router.get(
    "/admin/{order_id}",
    response_model=OrderResponse,
)
def get_admin_order(
    order_id: int,

    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(get_db),
):

    order = db.scalar(
        select(Order).where(
            Order.id == order_id
        )
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado.",
        )

    return build_order_response(
        order,
        db,
    )


# =====================================================
# CAMBIAR ESTADO DEL PEDIDO
# ADMIN
# =====================================================

@router.patch(
    "/admin/{order_id}/status",
    response_model=OrderResponse,
)
def update_order_status(
    order_id: int,

    status_data: OrderStatusUpdate,

    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(get_db),
):
    try:

        # =============================================
        # 1. BUSCAR Y BLOQUEAR PEDIDO
        # =============================================

        order = db.scalar(
            select(Order)
            .where(
                Order.id == order_id
            )
            .with_for_update()
        )


        if not order:

            raise HTTPException(
                status_code=
                    status.HTTP_404_NOT_FOUND,

                detail=
                    "Pedido no encontrado.",
            )


        current_status = (
            order.status
        )

        new_status = (
            status_data.status
        )


        # =============================================
        # 2. SI NO HAY CAMBIO
        # =============================================

        if current_status == new_status:

            return build_order_response(
                order,
                db,
            )


        # =============================================
        # 3. ESTADOS PERMITIDOS
        # =============================================

        allowed_statuses = {
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
        }


        if new_status not in allowed_statuses:

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=(
                    "Estado de pedido "
                    "no válido."
                ),
            )


        # =============================================
        # 4. PEDIDOS CANCELADOS SON FINALES
        # =============================================

        if current_status == "cancelled":

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Un pedido cancelado "
                    "no puede reabrirse."
                ),
            )


        # =============================================
        # 5. PEDIDOS ENTREGADOS SON FINALES
        # =============================================

        if current_status == "delivered":

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Un pedido entregado "
                    "no puede cambiar de estado."
                ),
            )


        # =============================================
        # 6. FLUJO PERMITIDO
        # =============================================
        #
        # pending
        #   ↓
        # confirmed
        #   ↓
        # processing
        #   ↓
        # shipped
        #   ↓
        # delivered
        #
        # pending también puede cancelarse.
        # =============================================

        allowed_transitions = {

            "pending": {
                "confirmed",
                "cancelled",
            },

            "confirmed": {
                "processing",
            },

            "processing": {
                "shipped",
            },

            "shipped": {
                "delivered",
            },

            "delivered": set(),

            "cancelled": set(),
        }


        valid_next_statuses = (
            allowed_transitions.get(
                current_status,
                set(),
            )
        )


        if new_status not in valid_next_statuses:

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    f"No se puede cambiar "
                    f"el pedido de "
                    f"'{current_status}' "
                    f"a '{new_status}'."
                ),
            )


        # =============================================
        # 7. CONFIRMAR / PROCESAR SOLO PAGADOS
        # =============================================

        if (
            new_status in {
                "confirmed",
                "processing",
                "shipped",
                "delivered",
            }
            and order.payment_status != "paid"
        ):

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "No puedes avanzar un "
                    "pedido que todavía "
                    "no ha sido pagado."
                ),
            )


        # =============================================
        # 8. CANCELAR PEDIDO
        # =============================================
        #
        # Solo debería ocurrir normalmente mientras
        # está pendiente de pago.
        # =============================================

        if new_status == "cancelled":

            if order.payment_status == "paid":

                raise HTTPException(
                    status_code=
                        status.HTTP_409_CONFLICT,

                    detail=(
                        "Un pedido pagado no puede "
                        "cancelarse directamente. "
                        "Primero debe procesarse "
                        "un reembolso."
                    ),
                )


            if order.stock_status == "reserved":

                restore_order_stock(
                    order,
                    db,
                )


        # =============================================
        # 9. ACTUALIZAR ESTADO
        # =============================================

        order.status = (
            new_status
        )


        # =============================================
        # 10. GUARDAR
        # =============================================

        db.commit()

        db.refresh(
            order
        )


        # =============================================
        # 11. NOTIFICAR AL CLIENTE
        # =============================================
        #
        # El cambio de estado ya fue guardado antes de
        # intentar enviar el correo. Si Resend falla,
        # el pedido conserva su estado correctamente.
        # =============================================

        if new_status in {
            "shipped",
            "delivered",
        }:

            try:

                customer = db.scalar(
                    select(User).where(
                        User.id == order.user_id
                    )
                )


                if customer:

                    account_url = (
                        f"{FRONTEND_URL}/cuenta"
                    )


                    if new_status == "shipped":

                        send_order_shipped_email(
                            recipient_email=(
                                customer.email
                            ),
                            first_name=(
                                customer.first_name
                            ),
                            order_number=(
                                order.order_number
                            ),
                            account_url=(
                                account_url
                            ),
                        )


                    elif new_status == "delivered":

                        send_order_delivered_email(
                            recipient_email=(
                                customer.email
                            ),
                            first_name=(
                                customer.first_name
                            ),
                            order_number=(
                                order.order_number
                            ),
                            account_url=(
                                account_url
                            ),
                        )


            except Exception as email_error:

                print(
                    "ERROR ENVIANDO CORREO "
                    "DE ESTADO DEL PEDIDO:",
                    repr(email_error),
                )


        # =============================================
        # 12. RESPONDER
        # =============================================

        return build_order_response(
            order,
            db,
        )


    except HTTPException:

        db.rollback()

        raise


    except Exception as error:

        db.rollback()

        print(
            "ERROR ACTUALIZANDO PEDIDO:",
            repr(error),
        )


        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail=(
                "No se pudo actualizar "
                "el pedido."
            ),
        ) from error

# =====================================================
# VER MI PEDIDO
# CLIENTE
#
# IMPORTANTE:
# Esta ruta debe permanecer al final.
# =====================================================

@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_my_order(
    order_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):

    order = db.scalar(
        select(Order).where(
            Order.id == order_id,

            Order.user_id
            == current_user.id,
        )
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado.",
        )

    return build_order_response(
        order,
        db,
    )