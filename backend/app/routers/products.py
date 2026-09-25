from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db

from app.dependencies.auth import (
    get_current_admin,
)

from app.models.product import Product
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
            Product.id == product_id
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
# VALIDAR SLUG DUPLICADO
# ==========================================

def validate_unique_slug(
    slug: str,
    db: Session,
    exclude_product_id: int | None = None,
) -> None:

    query = select(Product).where(
        Product.slug == slug
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
# PÚBLICO - LISTAR PRODUCTOS ACTIVOS
#
# GET /products
# ==========================================

@router.get(
    "",
    response_model=list[ProductResponse],
)
def get_products(
    db: Session = Depends(get_db),
):

    products = db.scalars(
        select(Product)
        .where(
            Product.is_active.is_(True)
        )
        .order_by(
            Product.id.desc()
        )
    ).all()

    return products


# ==========================================
# ADMIN - LISTAR TODOS LOS PRODUCTOS
#
# GET /products/admin/all
#
# Incluye activos e inactivos.
# ==========================================

@router.get(
    "/admin/all",
    response_model=list[ProductResponse],
)
def get_admin_products(
    _current_admin: User = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):

    products = db.scalars(
        select(Product)
        .order_by(
            Product.id.desc()
        )
    ).all()

    return products


# ==========================================
# ADMIN - OBTENER PRODUCTO POR ID
#
# GET /products/admin/{product_id}
# ==========================================

@router.get(
    "/admin/{product_id}",
    response_model=ProductResponse,
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

    product = get_product_or_404(
        product_id,
        db,
    )

    return product


# ==========================================
# ADMIN - CREAR PRODUCTO
#
# POST /products
# ==========================================

@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
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

        db.add(product)

        db.commit()

        db.refresh(product)

        return product

    except Exception:

        db.rollback()

        raise


# ==========================================
# ADMIN - ACTUALIZAR PRODUCTO
#
# PUT /products/{product_id}
# ==========================================

@router.put(
    "/{product_id}",
    response_model=ProductResponse,
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

    product = get_product_or_404(
        product_id,
        db,
    )


    # ======================================
    # VALIDAR SLUG
    # ======================================

    validate_unique_slug(
        slug=product_data.slug,
        db=db,
        exclude_product_id=
            product.id,
    )


    # ======================================
    # ACTUALIZAR CAMPOS
    # ======================================

    update_data = (
        product_data.model_dump()
    )


    for field, value in (
        update_data.items()
    ):

        setattr(
            product,
            field,
            value,
        )


    try:

        db.commit()

        db.refresh(product)

        return product

    except Exception:

        db.rollback()

        raise


# ==========================================
# ADMIN - CAMBIAR ESTADO
#
# PATCH /products/{product_id}/status
# ==========================================

@router.patch(
    "/{product_id}/status",
    response_model=ProductResponse,
)
def change_product_status(
    product_id: int,

    status_data: ProductStatusUpdate,

    _current_admin: User = Depends(
        get_current_admin
    ),

    db: Session = Depends(
        get_db
    ),
):

    product = get_product_or_404(
        product_id,
        db,
    )


    product.is_active = (
        status_data.is_active
    )


    try:

        db.commit()

        db.refresh(product)

        return product

    except Exception:

        db.rollback()

        raise


# ==========================================
# ADMIN - DESACTIVAR PRODUCTO
#
# DELETE /products/{product_id}
#
# IMPORTANTE:
# No eliminamos físicamente el registro.
# Solo lo desactivamos.
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

    product = get_product_or_404(
        product_id,
        db,
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
# PÚBLICO - OBTENER PRODUCTO POR SLUG
#
# GET /products/{slug}
#
# ESTA RUTA DEBE IR AL FINAL.
# ==========================================

@router.get(
    "/{slug}",
    response_model=ProductResponse,
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
            Product.slug == slug,
            Product.is_active.is_(True),
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