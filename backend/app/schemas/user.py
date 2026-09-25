from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


# ==========================================
# REGISTRO
# ==========================================

class UserCreate(BaseModel):
    first_name: str = Field(
        min_length=2,
        max_length=100
    )

    last_name: str = Field(
        min_length=2,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128
    )


# ==========================================
# LOGIN
# ==========================================

class UserLogin(BaseModel):
    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128
    )


# ==========================================
# USUARIO NORMAL
# ==========================================

class UserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    first_name: str
    last_name: str

    email: EmailStr

    email_verified: bool
    is_active: bool

    role: str

    created_at: datetime


# ==========================================
# TOKEN DE SESIÓN
# ==========================================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str


# ==========================================
# MENSAJE GENERAL
# ==========================================

class MessageResponse(BaseModel):
    message: str


# ==========================================
# VERIFICACIÓN DE CORREO
# ==========================================

class EmailVerificationRequest(BaseModel):
    token: str = Field(
        min_length=10
    )


# ==========================================
# REENVIAR VERIFICACIÓN
# LO USAREMOS CUANDO CONECTEMOS EMAIL
# ==========================================

class ResendVerificationRequest(BaseModel):
    email: EmailStr


# ==========================================
# SOLICITAR RECUPERACIÓN DE CONTRASEÑA
# ==========================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


# ==========================================
# RESTABLECER CONTRASEÑA
# ==========================================

class ResetPasswordRequest(BaseModel):
    token: str = Field(
        min_length=10
    )

    new_password: str = Field(
        min_length=8,
        max_length=128
    )


# ==========================================
# CLIENTE PARA LISTADO ADMIN
# ==========================================

class AdminUserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    first_name: str
    last_name: str

    email: EmailStr

    email_verified: bool
    is_active: bool

    role: str

    created_at: datetime

    order_count: int


# ==========================================
# PEDIDO RESUMIDO DEL CLIENTE
# ==========================================

class AdminCustomerOrderResponse(BaseModel):
    id: int

    order_number: str

    status: str

    payment_status: str

    total: Decimal

    created_at: datetime


# ==========================================
# DETALLE DEL CLIENTE PARA ADMIN
# ==========================================

class AdminUserDetailResponse(
    AdminUserResponse
):
    paid_order_count: int

    total_spent: Decimal

    orders: list[
        AdminCustomerOrderResponse
    ]