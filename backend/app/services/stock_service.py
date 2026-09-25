from datetime import (
    datetime,
    timezone,
)

from fastapi import (
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product


# =====================================================
# DEVOLVER STOCK DE UN PEDIDO
# =====================================================

def restore_order_stock(
    order: Order,
    db: Session,
) -> bool:
    """
    Devuelve al inventario las unidades
    reservadas por un pedido.
    """

    # Solo una reserva activa puede liberarse.
    if order.stock_status != "reserved":
        return False

    items = db.scalars(
        select(OrderItem)
        .where(
            OrderItem.order_id == order.id
        )
        .order_by(
            OrderItem.product_id.asc()
        )
    ).all()

    if not items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se puede restaurar el stock "
                "porque el pedido no contiene items."
            ),
        )

    for item in items:

        product = db.scalar(
            select(Product)
            .where(
                Product.id == item.product_id
            )
            .with_for_update()
        )

        if not product:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "No se pudo restaurar "
                    "el stock del producto "
                    f"{item.product_id}."
                ),
            )

        product.stock += item.quantity

    # La reserva ya fue liberada.
    order.stock_status = "released"

    # Ya no necesitamos una fecha de expiración.
    order.stock_reserved_until = None

    return True


# =====================================================
# CONFIRMAR STOCK DE UN PEDIDO PAGADO
# =====================================================

def commit_order_stock(
    order: Order,
) -> bool:
    """
    Convierte la reserva en venta definitiva.

    Product.stock NO vuelve a disminuir aquí,
    porque ya se descontó al crear el pedido.
    """

    if order.stock_status != "reserved":
        return False

    order.stock_status = "committed"

    order.stock_reserved_until = None

    return True


# =====================================================
# EXPIRAR RESERVAS VENCIDAS
# =====================================================

def expire_stock_reservations(
    db: Session,
) -> int:
    """
    Busca pedidos cuya reserva de stock
    ya venció y devuelve sus unidades.

    Retorna la cantidad de pedidos expirados.
    """

    now = datetime.now(
        timezone.utc
    )

    # ==========================================
    # BUSCAR RESERVAS VENCIDAS
    # ==========================================
    #
    # skip_locked=True evita que este proceso
    # interfiera con un pago que esté procesando
    # exactamente el mismo pedido.
    # ==========================================

    expired_orders = db.scalars(
        select(Order)
        .where(
            Order.stock_status == "reserved",

            Order.payment_status == "pending",

            Order.stock_reserved_until.is_not(
                None
            ),

            Order.stock_reserved_until <= now,
        )
        .order_by(
            Order.id.asc()
        )
        .with_for_update(
            skip_locked=True
        )
    ).all()

    expired_count = 0

    # ==========================================
    # LIBERAR CADA PEDIDO
    # ==========================================

    for order in expired_orders:

        restored = restore_order_stock(
            order,
            db,
        )

        if not restored:
            continue

        # El cliente ya perdió la reserva.
        order.status = "cancelled"

        expired_count += 1

    return expired_count