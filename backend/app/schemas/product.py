from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


# ==========================================
# BASE PRODUCT
# ==========================================

class ProductBase(BaseModel):
    slug: str = Field(
        min_length=1,
        max_length=200,
    )

    brand: str = Field(
        min_length=1,
        max_length=100,
    )

    name: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str = Field(
        min_length=1,
    )

    price: Decimal = Field(
        gt=0,
    )

    stock: int = Field(
        ge=0,
    )

    size_ml: int = Field(
        gt=0,
    )

    perfume_type: str = Field(
        min_length=1,
        max_length=50,
    )

    gender: str = Field(
        min_length=1,
        max_length=50,
    )

    image_url: str | None = None

    top_notes: list[str] = Field(
        default_factory=list,
    )

    heart_notes: list[str] = Field(
        default_factory=list,
    )

    base_notes: list[str] = Field(
        default_factory=list,
    )


# ==========================================
# CREAR PRODUCTO
# ==========================================

class ProductCreate(ProductBase):
    is_active: bool = True


# ==========================================
# ACTUALIZAR PRODUCTO
# ==========================================

class ProductUpdate(BaseModel):
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    brand: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    price: Decimal | None = Field(
        default=None,
        gt=0,
    )

    stock: int | None = Field(
        default=None,
        ge=0,
    )

    size_ml: int | None = Field(
        default=None,
        gt=0,
    )

    perfume_type: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    gender: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    image_url: str | None = None

    top_notes: list[str] | None = None

    heart_notes: list[str] | None = None

    base_notes: list[str] | None = None

    is_active: bool | None = None


# ==========================================
# ACTIVAR / DESACTIVAR PRODUCTO
# ==========================================

class ProductStatusUpdate(BaseModel):
    is_active: bool


# ==========================================
# RESPUESTA PRODUCTO
# ==========================================

class ProductResponse(ProductBase):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    is_active: bool

    rating: float = 0.0

    review_count: int = 0

    created_at: datetime

    updated_at: datetime