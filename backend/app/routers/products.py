import re
from io import BytesIO
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

from PIL import (
    Image,
    ImageChops,
    ImageFilter,
    ImageOps,
    UnidentifiedImageError,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import (\n    get_current_admin,\n    get_current_admin_viewer,\n)

from app.models.product import Product
from app.models.review import Review
from app.models.user import User

from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductStatusUpdate,
    ProductUpdate,
)

from app.services.storage_service import (
    delete_product_image as delete_product_image_from_storage,
    upload_product_image as upload_product_image_to_storage,
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

MAX_IMAGE_DIMENSION = 6000


ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


# ==========================================
# NORMALIZACIÓN VISUAL
# ==========================================

PRODUCT_IMAGE_CANVAS = (
    1200,
    1200,
)

PRODUCT_IMAGE_MAX_OBJECT = (
    1000,
    1000,
)

BACKGROUND_DIFFERENCE_THRESHOLD = 32


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
            Product.id
            == product_id
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
            "rating":
                round(
                    float(
                        rating or 0
                    ),
                    1,
                ),

            "review_count":
                int(
                    review_count or 0
                ),
        }
    )


# ==========================================
# FUNCIÓN AUXILIAR
# OBTENER RATING
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
                Review.product_id
                == product_id
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
# PRODUCTOS + RATING
# ==========================================

def get_products_with_reviews(
    db: Session,
    only_active: bool,
) -> list[
    ProductResponse
]:

    review_stats = (
        select(
            Review.product_id
            .label(
                "product_id"
            ),

            func.avg(
                Review.rating
            )
            .label(
                "average_rating"
            ),

            func.count(
                Review.id
            )
            .label(
                "review_count"
            ),
        )
        .group_by(
            Review.product_id
        )
        .subquery()
    )

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

            Product.id
            ==
            review_stats
            .c
            .product_id,
        )
    )

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
# VALIDAR SLUG
# ==========================================

def validate_unique_slug(
    slug: str,
    db: Session,
    exclude_product_id:
        int | None = None,
) -> None:

    query = (
        select(Product)
        .where(
            Product.slug
            == slug
        )
    )

    if (
        exclude_product_id
        is not None
    ):

        query = query.where(
            Product.id
            != exclude_product_id
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
# BORRAR IMAGEN LOCAL ANTIGUA
# ==========================================

def delete_local_product_image(
    image_url:
        str | None,
) -> None:

    if not image_url:
        return

    local_prefix = (
        "/uploads/products/"
    )

    if not image_url.startswith(
        local_prefix
    ):
        return

    filename = (
        Path(
            image_url
        )
        .name
    )

    file_path = (
        PRODUCT_UPLOAD_DIR
        / filename
    )

    try:

        if file_path.exists():
            file_path.unlink()

    except OSError as error:

        print(
            "ERROR BORRANDO IMAGEN LOCAL:",
            repr(error),
        )


# ==========================================
# BORRAR IMAGEN ANTIGUA
# LOCAL O SUPABASE
# ==========================================

def delete_old_product_image(
    image_url:
        str | None,
) -> None:

    if not image_url:
        return

    if image_url.startswith(
        "/uploads/products/"
    ):

        delete_local_product_image(
            image_url
        )

        return

    try:

        delete_product_image_from_storage(
            image_url
        )

    except Exception as error:

        print(
            "ERROR BORRANDO IMAGEN "
            "DE STORAGE:",
            repr(error),
        )


# ==========================================
# DETECTAR COLOR DE FONDO
# ==========================================

def get_background_color(
    image: Image.Image,
) -> tuple[
    int,
    int,
    int,
]:

    rgb = image.convert(
        "RGB"
    )

    width, height = (
        rgb.size
    )

    sample_size = max(
        8,
        min(
            width,
            height,
        ) // 40,
    )

    areas = [
        (
            0,
            0,
            sample_size,
            sample_size,
        ),

        (
            width
            - sample_size,
            0,
            width,
            sample_size,
        ),

        (
            0,
            height
            - sample_size,
            sample_size,
            height,
        ),

        (
            width
            - sample_size,
            height
            - sample_size,
            width,
            height,
        ),
    ]

    samples: list[
        tuple[
            int,
            int,
            int,
        ]
    ] = []

    for area in areas:

        crop = rgb.crop(
            area
        )

        samples.extend(
            list(
                crop.getdata()
            )
        )

    if not samples:

        return (
            255,
            255,
            255,
        )

    red = sorted(
        pixel[0]
        for pixel in samples
    )

    green = sorted(
        pixel[1]
        for pixel in samples
    )

    blue = sorted(
        pixel[2]
        for pixel in samples
    )

    middle = (
        len(samples)
        // 2
    )

    return (
        red[middle],
        green[middle],
        blue[middle],
    )


# ==========================================
# QUITAR FONDO DE JPG / IMAGEN SIN ALPHA
# ==========================================

def extract_product_from_background(
    image: Image.Image,
) -> Image.Image:

    rgba = image.convert(
        "RGBA"
    )

    rgb = rgba.convert(
        "RGB"
    )

    background_color = (
        get_background_color(
            rgb
        )
    )

    background = Image.new(
        "RGB",
        rgb.size,
        background_color,
    )

    difference = (
        ImageChops.difference(
            rgb,
            background,
        )
    )

    red, green, blue = (
        difference.split()
    )

    difference_mask = (
        ImageChops.lighter(
            ImageChops.lighter(
                red,
                green,
            ),
            blue,
        )
    )

    object_mask = (
        difference_mask.point(
            lambda value:
                255
                if value
                >=
                BACKGROUND_DIFFERENCE_THRESHOLD
                else 0
        )
    )

    object_mask = (
        object_mask.filter(
            ImageFilter
            .MedianFilter(
                size=5
            )
        )
    )

    object_mask = (
        object_mask.filter(
            ImageFilter
            .MaxFilter(
                size=7
            )
        )
    )

    bbox = (
        object_mask.getbbox()
    )

    if not bbox:

        return rgba

    (
        left,
        top,
        right,
        bottom,
    ) = bbox

    object_width = (
        right
        - left
    )

    object_height = (
        bottom
        - top
    )

    padding_x = max(
        12,
        int(
            object_width
            * 0.06
        ),
    )

    padding_y = max(
        12,
        int(
            object_height
            * 0.06
        ),
    )

    left = max(
        0,
        left
        - padding_x,
    )

    top = max(
        0,
        top
        - padding_y,
    )

    right = min(
        rgba.width,
        right
        + padding_x,
    )

    bottom = min(
        rgba.height,
        bottom
        + padding_y,
    )

    cropped_rgba = (
        rgba.crop(
            (
                left,
                top,
                right,
                bottom,
            )
        )
    )

    cropped_difference = (
        difference_mask.crop(
            (
                left,
                top,
                right,
                bottom,
            )
        )
    )

    alpha = (
        cropped_difference.point(
            lambda value: (
                0
                if value <= 18
                else
                255
                if value >= 70
                else
                int(
                    (
                        value
                        - 18
                    )
                    * 255
                    / 52
                )
            )
        )
    )

    alpha = alpha.filter(
        ImageFilter
        .GaussianBlur(
            radius=0.8
        )
    )

    original_alpha = (
        cropped_rgba
        .getchannel(
            "A"
        )
    )

    alpha = (
        ImageChops.multiply(
            alpha,
            original_alpha,
        )
    )

    cropped_rgba.putalpha(
        alpha
    )

    return cropped_rgba


# ==========================================
# RECORTAR TRANSPARENCIA
# ==========================================

def crop_transparent_bounds(
    image: Image.Image,
) -> Image.Image:

    rgba = image.convert(
        "RGBA"
    )

    alpha = rgba.getchannel(
        "A"
    )

    bbox = alpha.getbbox()

    if not bbox:

        raise ValueError(
            "La imagen quedó "
            "completamente transparente."
        )

    (
        left,
        top,
        right,
        bottom,
    ) = bbox

    object_width = (
        right
        - left
    )

    object_height = (
        bottom
        - top
    )

    padding_x = max(
        12,
        int(
            object_width
            * 0.06
        ),
    )

    padding_y = max(
        12,
        int(
            object_height
            * 0.06
        ),
    )

    left = max(
        0,
        left
        - padding_x,
    )

    top = max(
        0,
        top
        - padding_y,
    )

    right = min(
        rgba.width,
        right
        + padding_x,
    )

    bottom = min(
        rgba.height,
        bottom
        + padding_y,
    )

    return rgba.crop(
        (
            left,
            top,
            right,
            bottom,
        )
    )


# ==========================================
# REDIMENSIONAR PRODUCTO
# TAMBIÉN AGRANDA IMÁGENES PEQUEÑAS
# ==========================================

def resize_product_to_target(
    image: Image.Image,
    target_size:
        tuple[
            int,
            int,
        ],
) -> Image.Image:

    if (
        image.width <= 0
        or
        image.height <= 0
    ):

        raise ValueError(
            "La imagen procesada "
            "no tiene dimensiones válidas."
        )

    (
        target_width,
        target_height,
    ) = target_size

    scale = min(
        target_width
        / image.width,

        target_height
        / image.height,
    )

    new_width = max(
        1,
        round(
            image.width
            * scale
        ),
    )

    new_height = max(
        1,
        round(
            image.height
            * scale
        ),
    )

    if (
        new_width,
        new_height,
    ) == image.size:

        return image

    return image.resize(
        (
            new_width,
            new_height,
        ),
        Image.Resampling.LANCZOS,
    )


# ==========================================
# PROCESAR IMAGEN
# ==========================================

def process_product_image(
    contents: bytes,
) -> bytes:

    try:

        with Image.open(
            BytesIO(
                contents
            )
        ) as original_image:

            image = (
                ImageOps
                .exif_transpose(
                    original_image
                )
            )

            image.load()

            if (
                image.width
                >
                MAX_IMAGE_DIMENSION

                or

                image.height
                >
                MAX_IMAGE_DIMENSION
            ):

                raise ValueError(
                    "La imagen tiene "
                    "dimensiones demasiado grandes."
                )

            if (
                image.width < 100
                or
                image.height < 100
            ):

                raise ValueError(
                    "La imagen es "
                    "demasiado pequeña."
                )

            image = image.convert(
                "RGBA"
            )

            (
                alpha_min,
                _alpha_max,
            ) = (
                image.getchannel(
                    "A"
                )
                .getextrema()
            )

            if alpha_min < 255:

                image = (
                    crop_transparent_bounds(
                        image
                    )
                )

            else:

                image = (
                    extract_product_from_background(
                        image
                    )
                )

            image = (
                resize_product_to_target(
                    image,
                    PRODUCT_IMAGE_MAX_OBJECT,
                )
            )

            canvas = Image.new(
                "RGBA",
                PRODUCT_IMAGE_CANVAS,
                (
                    0,
                    0,
                    0,
                    0,
                ),
            )

            x = (
                PRODUCT_IMAGE_CANVAS[0]
                - image.width
            ) // 2

            y = (
                PRODUCT_IMAGE_CANVAS[1]
                - image.height
            ) // 2

            canvas.alpha_composite(
                image,
                (
                    x,
                    y,
                ),
            )

            output = BytesIO()

            canvas.save(
                output,
                format="WEBP",
                quality=92,
                method=6,
            )

            return (
                output.getvalue()
            )

    except (
        UnidentifiedImageError,
        OSError,
    ) as error:

        raise ValueError(
            "El archivo no contiene "
            "una imagen válida."
        ) from error


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

    db:
        Session = Depends(
            get_db
        ),

):

    return (
        get_products_with_reviews(
            db=db,
            only_active=True,
        )
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

    _current_admin:
        User = Depends(
            get_current_admin_viewer
        ),

    db:
        Session = Depends(
            get_db
        ),

):

    return (
        get_products_with_reviews(
            db=db,
            only_active=False,
        )
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

    _current_admin:
        User = Depends(
            get_current_admin_viewer
        ),

    db:
        Session = Depends(
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

    return (
        build_product_response(
            product,
            rating,
            review_count,
        )
    )


# ==========================================
# ADMIN
# SUBIR IMAGEN
# PILLOW → SUPABASE STORAGE
#
# POST /products/upload-image
# ==========================================

@router.post(
    "/upload-image",

    status_code=
        status.HTTP_201_CREATED,
)
async def upload_product_image(

    file:
        UploadFile = File(
            ...
        ),

    product_slug:
        str = Form(
            ...
        ),

    _current_admin:
        User = Depends(
            get_current_admin
        ),

):

    content_type = (
        file.content_type
        or ""
    )

    if (
        content_type
        not in
        ALLOWED_IMAGE_TYPES
    ):

        raise HTTPException(
            status_code=
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,

            detail=(
                "Formato no permitido. "
                "Usa JPG, PNG o WEBP."
            ),
        )

    contents = (
        await file.read()
    )

    if not contents:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "La imagen está vacía.",
        )

    if (
        len(contents)
        >
        MAX_IMAGE_SIZE
    ):

        raise HTTPException(
            status_code=
                status.HTTP_413_CONTENT_TOO_LARGE,

            detail=(
                "La imagen no puede "
                "superar los 5 MB."
            ),
        )

    try:

        processed_contents = (
            process_product_image(
                contents
            )
        )

    except ValueError as error:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                str(error),
        ) from error

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
        ".webp"
    )

    try:

        image_url = (
            upload_product_image_to_storage(
                filename=
                    filename,

                contents=
                    processed_contents,
            )
        )

    except RuntimeError as error:

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,

            detail=
                str(error),
        ) from error

    return {
        "image_url":
            image_url
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

    product_data:
        ProductCreate,

    _current_admin:
        User = Depends(
            get_current_admin
        ),

    db:
        Session = Depends(
            get_db
        ),

):

    validate_unique_slug(
        product_data.slug,
        db,
    )

    product = Product(
        **product_data
        .model_dump()
    )

    try:

        db.add(
            product
        )

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

        return (
            build_product_response(
                product,
                rating,
                review_count,
            )
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

    product_data:
        ProductUpdate,

    _current_admin:
        User = Depends(
            get_current_admin
        ),

    db:
        Session = Depends(
            get_db
        ),

):

    product = (
        get_product_or_404(
            product_id,
            db,
        )
    )

    old_image_url = (
        product.image_url
    )

    update_data = (
        product_data
        .model_dump(
            exclude_unset=True
        )
    )

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

    if (
        old_image_url
        and
        old_image_url
        !=
        product.image_url
    ):

        delete_old_product_image(
            old_image_url
        )

    rating, review_count = (
        get_product_review_stats(
            product.id,
            db,
        )
    )

    return (
        build_product_response(
            product,
            rating,
            review_count,
        )
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

    _current_admin:
        User = Depends(
            get_current_admin
        ),

    db:
        Session = Depends(
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

        return (
            build_product_response(
                product,
                rating,
                review_count,
            )
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

    _current_admin:
        User = Depends(
            get_current_admin
        ),

    db:
        Session = Depends(
            get_db
        ),

):

    product = (
        get_product_or_404(
            product_id,
            db,
        )
    )

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
# PRODUCTO POR SLUG
#
# GET /products/{slug}
#
# IMPORTANTE:
# ESTA RUTA DEBE IR AL FINAL
# ==========================================

@router.get(
    "/{slug}",

    response_model=
        ProductResponse,
)
def get_product_by_slug(

    slug: str,

    db:
        Session = Depends(
            get_db
        ),

):

    product = db.scalar(
        select(Product)
        .where(
            Product.slug
            == slug,

            Product.is_active
            .is_(
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

    rating, review_count = (
        get_product_review_stats(
            product.id,
            db,
        )
    )

    return (
        build_product_response(
            product,
            rating,
            review_count,
        )
    )