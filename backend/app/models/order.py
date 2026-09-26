from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    __table_args__ = (
        Index(
            "ix_orders_stock_reservation",
            "stock_status",
            "stock_reserved_until",
        ),
        Index(
            "ix_orders_payment_idempotency_key",
            "payment_idempotency_key",
            unique=True,
        ),
        Index(
            "ix_orders_mercado_pago_order_id",
            "mercado_pago_order_id",
            unique=True,
        ),
        Index(
            "ix_orders_mercado_pago_payment_id",
            "mercado_pago_payment_id",
            unique=True,
        ),
        Index(
            "ix_orders_refund_idempotency_key",
            "refund_idempotency_key",
            unique=True,
        ),
        Index(
            "ix_orders_mercado_pago_refund_id",
            "mercado_pago_refund_id",
            unique=True,
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
    # PAGO
    # ==========================================

    payment_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
    )

    payment_idempotency_key: Mapped[str | None] = mapped_column(
        String(100),
        default=lambda: uuid4().hex,
        nullable=True,
    )

    mercado_pago_order_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    mercado_pago_payment_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # ==========================================
    # REEMBOLSO
    # ==========================================

    refund_idempotency_key: Mapped[str | None] = mapped_column(
        String(100),
        default=lambda: uuid4().hex,
        nullable=True,
    )

    mercado_pago_refund_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    refunded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================
    # RESERVA DE STOCK
    # ==========================================

    stock_status: Mapped[str] = mapped_column(
        String(20),
        default="reserved",
        server_default="reserved",
        nullable=False,
    )

    stock_reserved_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================
    # PROCESAMIENTO PROGRAMADO
    # ==========================================

    scheduled_processing_at: Mapped[datetime | None] = mapped_column(
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