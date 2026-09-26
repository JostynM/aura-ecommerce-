from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class PaymentIdentification(BaseModel):
    type: str
    number: str


class PaymentCreate(BaseModel):
    order_id: int = Field(gt=0)
    token: str | None = None
    payment_method_id: str
    payment_type_id: str
    installments: int = Field(default=1, ge=1, le=48)
    issuer_id: str | None = None
    payer_email: EmailStr
    identification: PaymentIdentification | None = None


class PaymentResponse(BaseModel):
    order_id: int
    mercado_pago_payment_id: str | None
    mercado_pago_status: str
    status_detail: str | None
    payment_status: str


class RefundResponse(BaseModel):
    order_id: int
    order_number: str
    mercado_pago_order_id: str
    mercado_pago_refund_id: str | None
    payment_status: str
    refunded_at: datetime
    message: str