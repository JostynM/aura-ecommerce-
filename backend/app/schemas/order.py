from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


# ==========================================
# TIPOS DE ESTADO
# ==========================================

OrderStatus = Literal[
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
]

PaymentStatus = Literal[
    "pending",
    "paid",
    "failed",
    "refunded",
]

StockStatus = Literal[
    "reserved",
    "committed",
    "released",
    "legacy",
]


# ==========================================
# ITEM PARA CREAR PEDIDO
# ==========================================

class OrderItemCreate(BaseModel):

    product_id: int = Field(
        gt=0,
    )

    quantity: int = Field(
        ge=1,
        le=20,
    )


# ==========================================
# CREAR PEDIDO
# ==========================================

class OrderCreate(BaseModel):

    address_id: int = Field(
        gt=0,
    )

    items: list[OrderItemCreate] = Field(
        min_length=1,
    )


# ==========================================
# ITEM DE RESPUESTA
# ==========================================

class OrderItemResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    product_id: int

    product_name: str

    brand: str

    size_ml: int

    unit_price: Decimal

    quantity: int

    line_total: Decimal


# ==========================================
# RESPUESTA DEL PEDIDO
# ==========================================

class OrderResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    order_number: str

    status: OrderStatus

    payment_status: PaymentStatus

    stock_status: StockStatus

    stock_reserved_until: datetime | None

    # Fecha/hora desde la que el pedido
    # puede empezar a ser procesado.
    scheduled_processing_at: datetime | None

    subtotal: Decimal

    shipping_cost: Decimal

    total: Decimal

    recipient_name: str

    phone: str

    department: str

    province: str

    district: str

    address_line: str

    reference: str | None

    created_at: datetime

    items: list[OrderItemResponse]


# ==========================================
# CAMBIAR ESTADO DEL PEDIDO
# ==========================================

class OrderStatusUpdate(BaseModel):

    status: OrderStatus