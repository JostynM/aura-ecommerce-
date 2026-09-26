from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from app.database import (
    get_db,
)

from app.dependencies.auth import (
    get_current_user,
)

from app.models.favorite import (
    Favorite,
)

from app.models.product import (
    Product,
)

from app.models.user import (
    User,
)

from app.schemas.favorite import (
    FavoriteResponse,
)


# ==========================================
# ROUTER
# ==========================================

router = APIRouter(
    prefix="/favorites",
    tags=["Favorites"],
)


# ==========================================
# LISTAR FAVORITOS DEL USUARIO
#
# GET /favorites
# ==========================================

@router.get(
    "",
    response_model=list[
        FavoriteResponse
    ],
)
def get_favorites(
    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    favorites = db.scalars(
        select(Favorite)
        .where(
            Favorite.user_id ==
            current_user.id
        )
        .order_by(
            Favorite.created_at.desc()
        )
    ).all()

    return favorites


# ==========================================
# AGREGAR FAVORITO
#
# POST /favorites/{product_id}
# ==========================================

@router.post(
    "/{product_id}",
    response_model=FavoriteResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_favorite(
    product_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    # ======================================
    # COMPROBAR PRODUCTO
    # ======================================

    product = db.scalar(
        select(Product)
        .where(
            Product.id ==
            product_id
        )
    )


    if not product:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Producto no encontrado",
        )


    # ======================================
    # COMPROBAR SI YA EXISTE
    # ======================================

    existing_favorite = db.scalar(
        select(Favorite)
        .where(
            Favorite.user_id ==
            current_user.id,

            Favorite.product_id ==
            product_id,
        )
    )


    if existing_favorite:

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                "El producto ya está en favoritos",
        )


    # ======================================
    # CREAR FAVORITO
    # ======================================

    favorite = Favorite(
        user_id=current_user.id,
        product_id=product_id,
    )


    try:

        db.add(
            favorite
        )

        db.commit()

        db.refresh(
            favorite
        )

        return favorite

    except Exception:

        db.rollback()

        raise


# ==========================================
# ELIMINAR FAVORITO
#
# DELETE /favorites/{product_id}
# ==========================================

@router.delete(
    "/{product_id}",
    status_code=
        status.HTTP_204_NO_CONTENT,
)
def remove_favorite(
    product_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    favorite = db.scalar(
        select(Favorite)
        .where(
            Favorite.user_id ==
            current_user.id,

            Favorite.product_id ==
            product_id,
        )
    )


    if not favorite:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "El producto no está en favoritos",
        )


    try:

        db.delete(
            favorite
        )

        db.commit()

    except Exception:

        db.rollback()

        raise


    return Response(
        status_code=
            status.HTTP_204_NO_CONTENT
    )


# ==========================================
# COMPROBAR FAVORITO
#
# GET /favorites/check/{product_id}
# ==========================================

@router.get(
    "/check/{product_id}",
)
def check_favorite(
    product_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    favorite = db.scalar(
        select(Favorite)
        .where(
            Favorite.user_id ==
            current_user.id,

            Favorite.product_id ==
            product_id,
        )
    )


    return {
        "is_favorite":
            favorite is not None
    }