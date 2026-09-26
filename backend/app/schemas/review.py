from datetime import datetime

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)


# ==========================================
# CREAR RESEÑA
# ==========================================

class ReviewCreate(BaseModel):

    rating: int = Field(
        ge=1,
        le=5,
    )

    comment: str | None = Field(
        default=None,
        max_length=1000,
    )


    @field_validator(
        "comment"
    )
    @classmethod
    def clean_comment(
        cls,
        value: str | None,
    ):

        if value is None:
            return None


        value = value.strip()


        if not value:
            return None


        return value


# ==========================================
# ACTUALIZAR RESEÑA
# ==========================================

class ReviewUpdate(BaseModel):

    rating: int | None = Field(
        default=None,
        ge=1,
        le=5,
    )

    comment: str | None = Field(
        default=None,
        max_length=1000,
    )


    @field_validator(
        "comment"
    )
    @classmethod
    def clean_comment(
        cls,
        value: str | None,
    ):

        if value is None:
            return None


        value = value.strip()


        if not value:
            return None


        return value


# ==========================================
# RESPUESTA DE RESEÑA
# ==========================================

class ReviewResponse(BaseModel):

    id: int

    user_id: int

    product_id: int

    rating: int

    comment: str | None

    author_name: str

    created_at: datetime

    updated_at: datetime


# ==========================================
# RESUMEN DE CALIFICACIONES
# ==========================================

class ReviewSummaryResponse(BaseModel):

    average_rating: float

    total_reviews: int