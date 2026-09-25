from decimal import Decimal

from sqlalchemy import (
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database import Base


class OrderItem(Base):
    __tablename__ = "order_items"

    # ==========================================
    # IDENTIFICACIÓN
    # ==========================================

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    # ==========================================
    # RELACIÓN CON EL PEDIDO
    # ==========================================

    order_id: Mapped[int] = mapped_column(
        ForeignKey(
            "orders.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    # ==========================================
    # RELACIÓN CON EL PRODUCTO
    # ==========================================

    product_id: Mapped[int] = mapped_column(
        ForeignKey(
            "products.id",
            ondelete="RESTRICT",
        ),
        index=True,
        nullable=False,
    )

    # ==========================================
    # SNAPSHOT DEL PRODUCTO
    # ==========================================
    #
    # Estos campos guardan cómo era el perfume
    # exactamente cuando se realizó la compra.
    #
    # Si después el administrador cambia:
    #
    # - nombre
    # - marca
    # - tamaño
    # - precio
    #
    # el pedido histórico no cambia.
    # ==========================================

    product_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    brand: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    size_ml: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    # ==========================================
    # CANTIDAD
    # ==========================================

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # ==========================================
    # TOTAL DEL ITEM
    # ==========================================

    line_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )