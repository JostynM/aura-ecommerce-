from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    __table_args__ = (
        Index(
            "ix_orders_stock_reservation",
            "stock_status",
            "stock_reserved_until",
        ),
    )

    # ==========================================
    # IDENTIFICACIÓN
    # ==========================================

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    order_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    # ==========================================
    # RELACIONES
    # ==========================================

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        index=True,
        nullable=False,
    )

    address_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "addresses.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    # ==========================================
    # ESTADO DEL PEDIDO
    # ==========================================

    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
    )

    # ==========================================
    # ESTADO DEL PAGO
    # ==========================================

    payment_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
    )

    # ==========================================
    # ESTADO DE LA RESERVA DE STOCK
    # ==========================================
    #
    # reserved:
    #   El stock está separado temporalmente.
    #
    # committed:
    #   El pago fue aprobado y el stock ya
    #   representa una venta definitiva.
    #
    # released:
    #   El stock ya fue devuelto.
    # ==========================================

    stock_status: Mapped[str] = mapped_column(
        String(20),
        default="reserved",
        server_default="reserved",
        nullable=False,
    )

    # Fecha límite de la reserva.
    #
    # Ejemplo:
    # pedido creado 20:00
    # reserva hasta 20:15
    #
    # En pedidos antiguos puede ser NULL.

    stock_reserved_until: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================
    # PROCESAMIENTO PROGRAMADO
    # ==========================================
    #
    # Guarda la fecha y hora desde la que
    # el pedido puede empezar a procesarse.
    #
    # Ejemplo:
    #
    # Compra:
    # domingo 22:00
    #
    # scheduled_processing_at:
    # lunes 09:00
    #
    # IMPORTANTE:
    # Esto NO cambia automáticamente el pedido
    # a "processing".
    #
    # El administrador seguirá iniciando
    # manualmente la preparación.
    # ==========================================

    scheduled_processing_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # ==========================================
    # IMPORTES
    # ==========================================

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    shipping_cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    # ==========================================
    # SNAPSHOT DE DIRECCIÓN
    # ==========================================

    recipient_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    department: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    province: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    district: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    address_line: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    reference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # ==========================================
    # FECHAS
    # ==========================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )