from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database import Base


# ==========================================
# REVIEW
# ==========================================

class Review(Base):
    __tablename__ = "reviews"


    # ======================================
    # RESTRICCIONES
    # ======================================
    #
    # 1 usuario solo puede dejar
    # 1 reseña por producto.
    #
    # Además, el rating únicamente puede
    # estar entre 1 y 5.
    #
    # ======================================

    __table_args__ = (

        UniqueConstraint(
            "user_id",
            "product_id",
            name="uq_review_user_product",
        ),

        CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="ck_review_rating_range",
        ),

    )


    # ======================================
    # ID
    # ======================================

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )


    # ======================================
    # USUARIO
    # ======================================

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    # ======================================
    # PRODUCTO
    # ======================================

    product_id: Mapped[int] = mapped_column(
        ForeignKey(
            "products.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    # ======================================
    # CALIFICACIÓN
    # ======================================

    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )


    # ======================================
    # COMENTARIO
    # ======================================
    #
    # Puede ser null porque permitiremos:
    #
    # ★★★★★
    #
    # sin obligar al usuario a escribir.
    #
    # ======================================

    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )


    # ======================================
    # FECHA DE CREACIÓN
    # ======================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(
            timezone=True
        ),
        server_default=func.now(),
        nullable=False,
    )


    # ======================================
    # ÚLTIMA ACTUALIZACIÓN
    # ======================================

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(
            timezone=True
        ),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )