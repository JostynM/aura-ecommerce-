from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class ProductStatusUpdate(BaseModel):
    is_active: bool


class ProductCreate(BaseModel):
    slug: str = Field(
        min_length=2,
        max_length=200
    )

    brand: str = Field(
        min_length=2,
        max_length=100
    )

    name: str = Field(
        min_length=2,
        max_length=200
    )

    description: str = Field(
        min_length=10
    )

    price: Decimal = Field(
        gt=0
    )

    stock: int = Field(
        ge=0
    )

    size_ml: int = Field(
        gt=0
    )

    perfume_type: str = Field(
        min_length=2,
        max_length=50
    )

    gender: str = Field(
        min_length=2,
        max_length=50
    )

    image_url: str | None = None

    top_notes: list[str] = Field(
        default_factory=list
    )

    heart_notes: list[str] = Field(
        default_factory=list
    )

    base_notes: list[str] = Field(
        default_factory=list
    )

    is_active: bool = True


class ProductUpdate(BaseModel):
    slug: str = Field(
        min_length=2,
        max_length=200
    )

    brand: str = Field(
        min_length=2,
        max_length=100
    )

    name: str = Field(
        min_length=2,
        max_length=200
    )

    description: str = Field(
        min_length=10
    )

    price: Decimal = Field(
        gt=0
    )

    stock: int = Field(
        ge=0
    )

    size_ml: int = Field(
        gt=0
    )

    perfume_type: str = Field(
        min_length=2,
        max_length=50
    )

    gender: str = Field(
        min_length=2,
        max_length=50
    )

    image_url: str | None = None

    top_notes: list[str] = Field(
        default_factory=list
    )

    heart_notes: list[str] = Field(
        default_factory=list
    )

    base_notes: list[str] = Field(
        default_factory=list
    )

    is_active: bool = True


class ProductResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    slug: str
    brand: str
    name: str
    description: str
    price: Decimal
    stock: int
    size_ml: int
    perfume_type: str
    gender: str
    image_url: str | None
    top_notes: list[str]
    heart_notes: list[str]
    base_notes: list[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime