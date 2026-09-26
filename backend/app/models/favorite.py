from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database import Base


# ==========================================
# FAVORITOS
# ==========================================

class Favorite(Base):
    __tablename__ = "favorites"


    # ======================================
    # RESTRICCIONES
    # ======================================
    #
    # Un mismo usuario no puede guardar
    # dos veces el mismo producto.
    #
    # Ejemplo prohibido:
    #
    # user_id = 3, product_id = 7
    # user_id = 3, product_id = 7
    #
    # ======================================

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "product_id",
            name="uq_favorite_user_product",
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
    # FECHA
    # ======================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(
            timezone=True
        ),
        server_default=func.now(),
        nullable=False,
    )