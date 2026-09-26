from decimal import Decimal
from typing import Literal

from pydantic import (
    BaseModel,
    Field,
)


# ==========================================
# RECOMENDACIÓN ESTRUCTURADA
# ==========================================

class RecommendationRequest(BaseModel):
    gender: str | None = None

    occasion: str = Field(
        min_length=2,
        max_length=100,
    )

    preferred_notes: list[str] = Field(
        default_factory=list,
        max_length=10,
    )

    budget: Decimal = Field(
        gt=0,
    )


# ==========================================
# PRODUCTO RECOMENDADO
# ==========================================

class RecommendedProduct(BaseModel):
    id: int
    slug: str
    brand: str
    name: str
    price: Decimal
    size_ml: int
    perfume_type: str
    gender: str
    image_url: str | None
    reason: str


# ==========================================
# RESPUESTA RECOMENDACIÓN ESTRUCTURADA
# ==========================================

class RecommendationResponse(BaseModel):
    recommendations: list[
        RecommendedProduct
    ]


# ==========================================
# MENSAJE DEL HISTORIAL DEL CHAT
# ==========================================

class ChatHistoryItem(BaseModel):
    role: Literal[
        "user",
        "assistant",
    ]

    content: str = Field(
        min_length=1,
        max_length=2000,
    )


# ==========================================
# PETICIÓN DEL CHAT
# ==========================================

class ChatRecommendationRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=2000,
    )

    history: list[
        ChatHistoryItem
    ] = Field(
        default_factory=list,
        max_length=20,
    )


# ==========================================
# RESPUESTA DEL CHAT
# ==========================================

class ChatRecommendationResponse(BaseModel):
    type: Literal[
        "question",
        "recommendations",
    ]

    message: str

    recommendations: list[
        RecommendedProduct
    ] = Field(
        default_factory=list
    )