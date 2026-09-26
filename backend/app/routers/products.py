import re

from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.dependencies.auth import (
    get_current_admin,
)

from app.models.product import Product
from app.models.review import Review
from app.models.user import User

from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductStatusUpdate,
    ProductUpdate,
)


# ==========================================
# ROUTER
# ==========================================

router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


# ==========================================
# CONFIGURACIÓN DE IMÁGENES
# ==========================================

BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parents[2]
)


PRODUCT_UPLOAD_DIR = (
    BACKEND_DIR
    / "uploads"
    / "products"
)


PRODUCT_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


MAX_IMAGE_SIZE = (
    5 * 1024 * 1024
)


ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


# ==========================================
# FUNCIÓN AUXILIAR
# BUSCAR PRODUCTO POR ID
# ==========================================

def get_product_or_404(
    product_id: int,
    db: Session,
) -> Product:

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


    return product


# ==========================================
# FUNCIÓN AUXILIAR
# CONSTRUIR RESPUESTA CON RATING
# ==========================================

def build_product_response(
    product: Product,
    rating: float | None = None,
    review_count: int | None = None,
) -> ProductResponse:

    response = (
        ProductResponse
        .model_validate(
            product
        )
    )


    return response.model_copy(
        update={
            "rating": round(
                float(
                    rating or 0
                ),
                1,
            ),

            "review_count": int(
                review_count or 0
            ),
        }
    )


# ==========================================
# FUNCIÓN AUXILIAR
# OBTENER RATING DE UN PRODUCTO
# ==========================================

def get_product_review_stats(
    product_id: int,
    db: Session,
) -> tuple[
    float,
    int,
]:

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


    rating = (
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


    review_count = int(
        total_reviews or 0
    )


    return (
        rating,
        review_count,
    )


# ==========================================
# FUNCIÓN AUXILIAR
# OBTENER PRODUCTOS CON RATING
# ==========================================

def get_products_with_reviews(
    db: Session,
    only_active: bool,
) -> list[ProductResponse]:

    # ======================================
    # SUBCONSULTA DE RESEÑAS
    # ======================================

    review_stats = (
        select(
            Review.product_id.label(
                "product_id"
            ),

            func.avg(
                Review.rating
            ).label(
                "average_rating"
            ),

            func.count(
                Review.id
            ).label(
                "review_count"
            ),
        )
        .group_by(
            Review.product_id
        )
        .subquery()
    )


    # ======================================
    # PRODUCTOS + RATING
    # ======================================

    query = (
        select(
            Product,

            review_stats
            .c
            .average_rating,

            review_stats
            .c
            .review_count,
        )
        .outerjoin(
            review_stats,

            Product.id ==
            review_stats
            .c
            .product_id,
        )
    )


    # ======================================
    # SOLO ACTIVOS
    # ======================================

    if only_active:

        query = query.where(
            Product.is_active.is_(
                True
            )
        )


    query = query.order_by(
        Product.id.desc()
    )


    rows = db.execute(
        query
    ).all()


    # ======================================
    # CONVERTIR A RESPONSE
    # ======================================

    return [

        build_product_response(
            product,
            average_rating,
            review_count,
        )

        for (
            product,
            average_rating,
            review_count,
        )
        in rows

    ]


# ==========================================
# FUNCIÓN AUXILIAR
# VALIDAR SLUG DUPLICADO
# ==========================================

def validate_unique_slug(
    slug: str,
    db: Session,
    exclude_product_id: int | None = None,
) -> None:

    query = (
        select(Product)
        .where(
            Product.slug ==
            slug
        )
    )


    if exclude_product_id is not None:

        query = query.where(
            Product.id !=
            exclude_product_id
        )


    existing_product = db.scalar(
        query
    )


    if existing_product:

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=(
                "Ya existe un producto "
                "con ese slug."
            ),
        )


# ==========================================
# FUNCIÓN AUXILIAR
# NORMALIZAR SLUG PARA ARCHIVO
# ==========================================

def normalize_file_slug(
    value: str,
) -> str:

    value = (
        value
        .strip()
        .lower()
    )


    value = re.sub(
        r"[^a-z0-9_-]+",
        "-",
        value,
    )


    value = value.strip(
        "-"
    )


    return (
        value
        or "producto"
    )


# ==========================================
# FUNCIÓN AUXILIAR
# ELIMINAR IMAGEN LOCAL
# ==========================================

def delete_local_product_image(
    image_url: str | None,
) -> None:

    if not image_url:
        return


    local_prefix = (
        "/uploads/products/"
    )


    # No intentamos borrar imágenes
    # externas.

    if not image_url.startswith(
        local_prefix
    ):

        return


    filename = Path(
        image_url
    ).name


    file_path = (
        PRODUCT_UPLOAD_DIR
        / filename
    )


    try:

        if file_path.exists():

            file_path.unlink()


    except OSError as error:

        # El producto no debe fallar
        # solamente porque no pudimos
        # borrar una imagen antigua.

        print(
            "ERROR BORRANDO IMAGEN:",
            repr(error),
        )


# ==========================================
# PÚBLICO
# LISTAR PRODUCTOS ACTIVOS
#
# GET /products
# ==========================================

@router.get(
    "",
    response_model=list[
        ProductResponse
    ],
)
def get_products(
    db: Session = Depends(
        get_db
    ),
):

    return get_products_with_reviews(
        db=db,
        only_active=True,
    )


# ==========================================
# ADMIN
# LISTAR TODOS LOS PRODUCTOS
#
# GET /products/admin/all
# ==========================================

@router.get(
    "/admin/all",
    response_model=list[
        ProductResponse
    ],
)
def get_admin_products(

    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(
        get_db
    ),

):

    return get_products_with_reviews(
        db=db,
        only_active=False,
    )


# ==========================================
# ADMIN
# OBTENER PRODUCTO POR ID
#
# GET /products/admin/{product_id}
# ==========================================

@router.get(
    "/admin/{product_id}",
    response_model=
        ProductResponse,
)
def get_admin_product(

    product_id: int,

    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(
        get_db
    ),

):

    product = (
        get_product_or_404(
            product_id,
            db,
        )
    )


    rating, review_count = (
        get_product_review_stats(
            product.id,
            db,
        )
    )


    return build_product_response(
        product,
        rating,
        review_count,
    )


# ==========================================
# ADMIN
# SUBIR IMAGEN DE PRODUCTO
#
# POST /products/upload-image
# ==========================================

@router.post(
    "/upload-image",

    status_code=
        status.HTTP_201_CREATED,
)
async def upload_product_image(

    file: UploadFile = File(
        ...
    ),

    product_slug: str = Form(
        ...
    ),

    _current_admin: User = Depends(
        get_current_admin
    ),

):

    # ======================================
    # VALIDAR TIPO DE IMAGEN
    # ======================================

    content_type = (
        file.content_type
        or ""
    )


    extension = (
        ALLOWED_IMAGE_TYPES.get(
            content_type
        )
    )


    if not extension:

        raise HTTPException(
            status_code=
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,

            detail=(
                "Formato no permitido. "
                "Usa JPG, PNG o WEBP."
            ),
        )


    # ======================================
    # LEER ARCHIVO
    # ======================================

    contents = await file.read()


    # ======================================
    # VALIDAR ARCHIVO VACÍO
    # ======================================

    if not contents:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "La imagen está vacía.",
        )


    # ======================================
    # VALIDAR TAMAÑO
    # ======================================

    if (
        len(contents)
        > MAX_IMAGE_SIZE
    ):

        raise HTTPException(
            status_code=
                status.HTTP_413_CONTENT_TOO_LARGE,

            detail=(
                "La imagen no puede superar "
                "los 5 MB."
            ),
        )


    # ======================================
    # GENERAR NOMBRE SEGURO
    # ======================================

    safe_slug = (
        normalize_file_slug(
            product_slug
        )
    )


    unique_id = (
        uuid4().hex[:12]
    )


    filename = (
        f"{safe_slug}-"
        f"{unique_id}"
        f"{extension}"
    )


    file_path = (
        PRODUCT_UPLOAD_DIR
        / filename
    )


    # ======================================
    # GUARDAR IMAGEN
    # ======================================

    try:

        file_path.write_bytes(
            contents
        )


    except OSError as error:

        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail=(
                "No fue posible guardar "
                "la imagen."
            ),
        ) from error


    # ======================================
    # DEVOLVER URL
    # ======================================

    return {
        "image_url": (
            "/uploads/products/"
            f"{filename}"
        )
    }


# ==========================================
# ADMIN
# CREAR PRODUCTO
#
# POST /products
# ==========================================

@router.post(
    "",

    response_model=
        ProductResponse,

    status_code=
        status.HTTP_201_CREATED,
)
def create_product(

    product_data: ProductCreate,

    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(
        get_db
    ),

):

    # ======================================
    # VALIDAR SLUG
    # ======================================

    validate_unique_slug(
        product_data.slug,
        db,
    )


    # ======================================
    # CREAR PRODUCTO
    # ======================================

    product = Product(
        **product_data.model_dump()
    )


    try:

        db.add(
            product
        )

        db.commit()

        db.refresh(
            product
        )


        # Producto nuevo:
        # rating 0 y 0 reseñas.

        rating, review_count = (
            get_product_review_stats(
                product.id,
                db,
            )
        )


        return build_product_response(
            product,
            rating,
            review_count,
        )


    except Exception:

        db.rollback()

        raise


# ==========================================
# ADMIN
# ACTUALIZAR PRODUCTO
#
# PUT /products/{product_id}
# ==========================================

@router.put(
    "/{product_id}",

    response_model=
        ProductResponse,
)
def update_product(

    product_id: int,

    product_data: ProductUpdate,

    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(
        get_db
    ),

):

    # ======================================
    # BUSCAR PRODUCTO
    # ======================================

    product = (
        get_product_or_404(
            product_id,
            db,
        )
    )


    # Guardamos la URL anterior.

    old_image_url = (
        product.image_url
    )


    # ======================================
    # DATOS RECIBIDOS
    # ======================================

    update_data = (
        product_data.model_dump(
            exclude_unset=True
        )
    )


    # ======================================
    # VALIDAR SLUG
    # ======================================

    new_slug = (
        update_data.get(
            "slug"
        )
    )


    if new_slug:

        validate_unique_slug(
            slug=
                new_slug,

            db=
                db,

            exclude_product_id=
                product.id,
        )


    # ======================================
    # ACTUALIZAR CAMPOS
    # ======================================

    for (
        field,
        value,
    ) in update_data.items():

        setattr(
            product,
            field,
            value,
        )


    try:

        db.commit()

        db.refresh(
            product
        )


    except Exception:

        db.rollback()

        raise


    # ======================================
    # ELIMINAR IMAGEN ANTIGUA
    # ======================================

    if (
        old_image_url
        and
        old_image_url !=
        product.image_url
    ):

        delete_local_product_image(
            old_image_url
        )


    # ======================================
    # RATING ACTUAL
    # ======================================

    rating, review_count = (
        get_product_review_stats(
            product.id,
            db,
        )
    )


    return build_product_response(
        product,
        rating,
        review_count,
    )


# ==========================================
# ADMIN
# CAMBIAR ESTADO
#
# PATCH /products/{product_id}/status
# ==========================================

@router.patch(
    "/{product_id}/status",

    response_model=
        ProductResponse,
)
def change_product_status(

    product_id: int,

    status_data:
        ProductStatusUpdate,

    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(
        get_db
    ),

):

    product = (
        get_product_or_404(
            product_id,
            db,
        )
    )


    product.is_active = (
        status_data.is_active
    )


    try:

        db.commit()

        db.refresh(
            product
        )


        rating, review_count = (
            get_product_review_stats(
                product.id,
                db,
            )
        )


        return build_product_response(
            product,
            rating,
            review_count,
        )


    except Exception:

        db.rollback()

        raise


# ==========================================
# ADMIN
# DESACTIVAR PRODUCTO
#
# DELETE /products/{product_id}
# ==========================================

@router.delete(
    "/{product_id}",

    status_code=
        status.HTTP_204_NO_CONTENT,
)
def delete_product(

    product_id: int,

    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(
        get_db
    ),

):

    product = (
        get_product_or_404(
            product_id,
            db,
        )
    )


    # No borramos físicamente
    # ni el producto ni su imagen.
    #
    # Puede reactivarse después.

    product.is_active = False


    try:

        db.commit()


    except Exception:

        db.rollback()

        raise


    return Response(
        status_code=
            status.HTTP_204_NO_CONTENT
    )


# ==========================================
# PÚBLICO
# OBTENER PRODUCTO POR SLUG
#
# GET /products/{slug}
#
# ESTA RUTA DEBE IR AL FINAL
# ==========================================

@router.get(
    "/{slug}",

    response_model=
        ProductResponse,
)
def get_product_by_slug(

    slug: str,

    db: Session = Depends(
        get_db
    ),

):

    product = db.scalar(
        select(Product)
        .where(
            Product.slug ==
            slug,

            Product.is_active.is_(
                True
            ),
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
    # OBTENER RATING REAL
    # ======================================

    rating, review_count = (
        get_product_review_stats(
            product.id,
            db,
        )
    )


    return build_product_response(
        product,
        rating,
        review_count,
    )