from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.exc import (
    IntegrityError,
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

from app.models.product import (
    Product,
)

from app.models.review import (
    Review,
)

from app.models.user import (
    User,
)

from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
    ReviewSummaryResponse,
    ReviewUpdate,
)


# ==========================================
# ROUTER
# ==========================================

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"],
)


# ==========================================
# CONVERTIR REVIEW A RESPUESTA
# ==========================================

def build_review_response(
    review: Review,
    user: User,
) -> ReviewResponse:

    return ReviewResponse(
        id=review.id,
        user_id=review.user_id,
        product_id=review.product_id,
        rating=review.rating,
        comment=review.comment,
        author_name=(
            f"{user.first_name} "
            f"{user.last_name}"
        ).strip(),
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


# ==========================================
# CREAR RESEÑA
#
# POST /reviews/{product_id}
# ==========================================

@router.post(
    "/{product_id}",
    response_model=ReviewResponse,
    status_code=
        status.HTTP_201_CREATED,
)
def create_review(
    product_id: int,

    review_data: ReviewCreate,

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
    # COMPROBAR RESEÑA EXISTENTE
    # ======================================

    existing_review = db.scalar(
        select(Review)
        .where(
            Review.user_id ==
            current_user.id,

            Review.product_id ==
            product_id,
        )
    )


    if existing_review:

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=(
                "Ya calificaste este producto. "
                "Puedes editar tu reseña existente."
            ),
        )


    # ======================================
    # CREAR
    # ======================================

    review = Review(
        user_id=
            current_user.id,

        product_id=
            product_id,

        rating=
            review_data.rating,

        comment=
            review_data.comment,
    )


    try:

        db.add(
            review
        )

        db.commit()

        db.refresh(
            review
        )


    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                "Ya calificaste este producto",
        )


    return build_review_response(
        review,
        current_user,
    )


# ==========================================
# LISTAR RESEÑAS DE UN PRODUCTO
#
# GET /reviews/product/{product_id}
# ==========================================

@router.get(
    "/product/{product_id}",
    response_model=list[
        ReviewResponse
    ],
)
def get_product_reviews(
    product_id: int,

    db: Session = Depends(
        get_db
    ),
):

    results = db.execute(

        select(
            Review,
            User,
        )
        .join(
            User,
            User.id ==
            Review.user_id,
        )
        .where(
            Review.product_id ==
            product_id
        )
        .order_by(
            Review.created_at.desc()
        )

    ).all()


    return [

        build_review_response(
            review,
            user,
        )

        for review, user
        in results

    ]


# ==========================================
# RESUMEN DEL PRODUCTO
#
# GET /reviews/product/{product_id}/summary
# ==========================================

@router.get(
    "/product/{product_id}/summary",
    response_model=
        ReviewSummaryResponse,
)
def get_review_summary(
    product_id: int,

    db: Session = Depends(
        get_db
    ),
):

    average_rating, total_reviews = (
        db.execute(
            select(
                func.avg(
                    Review.rating
                ),
                func.count(
                    Review.id
                ),
            )
            .where(
                Review.product_id ==
                product_id
            )
        )
        .one()
    )


    average = (
        round(
            float(
                average_rating
            ),
            1,
        )
        if average_rating
        is not None
        else 0.0
    )


    return ReviewSummaryResponse(
        average_rating=
            average,

        total_reviews=
            int(
                total_reviews
            ),
    )


# ==========================================
# ACTUALIZAR RESEÑA
#
# PUT /reviews/{review_id}
# ==========================================

@router.put(
    "/{review_id}",
    response_model=
        ReviewResponse,
)
def update_review(
    review_id: int,

    review_data: ReviewUpdate,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    review = db.scalar(
        select(Review)
        .where(
            Review.id ==
            review_id
        )
    )


    if not review:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Reseña no encontrada",
        )


    # Solo propietario o admin.

    if (
        review.user_id !=
            current_user.id
        and
        current_user.role !=
            "admin"
    ):

        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,

            detail=
                "No puedes editar esta reseña",
        )


    update_data = (
        review_data.model_dump(
            exclude_unset=True
        )
    )


    for (
        field,
        value,
    ) in update_data.items():

        setattr(
            review,
            field,
            value,
        )


    db.commit()

    db.refresh(
        review
    )


    author = db.scalar(
        select(User)
        .where(
            User.id ==
            review.user_id
        )
    )


    if not author:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Usuario no encontrado",
        )


    return build_review_response(
        review,
        author,
    )


# ==========================================
# ELIMINAR RESEÑA
#
# DELETE /reviews/{review_id}
# ==========================================

@router.delete(
    "/{review_id}",
    status_code=
        status.HTTP_204_NO_CONTENT,
)
def delete_review(
    review_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    review = db.scalar(
        select(Review)
        .where(
            Review.id ==
            review_id
        )
    )


    if not review:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Reseña no encontrada",
        )


    # Propietario o administrador.

    if (
        review.user_id !=
            current_user.id
        and
        current_user.role !=
            "admin"
    ):

        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,

            detail=
                "No puedes eliminar esta reseña",
        )


    db.delete(
        review
    )

    db.commit()


    return Response(
        status_code=
            status.HTTP_204_NO_CONTENT
    )