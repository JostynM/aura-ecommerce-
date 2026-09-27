from pathlib import Path

from sqlalchemy import select

from app.database import SessionLocal
from app.models.product import Product
from app.services.storage_service import (
    delete_product_image,
    upload_product_image,
)


# ==========================================
# RUTAS
# ==========================================

BACKEND_DIR = Path(__file__).resolve().parents[1]

PRODUCT_UPLOAD_DIR = (
    BACKEND_DIR
    / "uploads"
    / "products"
)


# ==========================================
# MIGRACIÓN
# ==========================================

def migrate_product_images() -> None:
    db = SessionLocal()

    uploaded_urls: list[str] = []

    try:
        products = db.scalars(
            select(Product)
            .where(
                Product.image_url.like(
                    "/uploads/products/%"
                )
            )
            .order_by(Product.id)
        ).all()

        print(
            f"Productos por migrar: {len(products)}"
        )

        if not products:
            print(
                "No hay imágenes locales por migrar."
            )
            return

        for product in products:
            if not product.image_url:
                continue

            filename = Path(
                product.image_url
            ).name

            local_file = (
                PRODUCT_UPLOAD_DIR
                / filename
            )

            print()
            print(
                f"[{product.id}] {product.name}"
            )
            print(
                f"Archivo: {filename}"
            )

            if not local_file.exists():
                raise FileNotFoundError(
                    "No se encontró el archivo local: "
                    f"{local_file}"
                )

            contents = (
                local_file.read_bytes()
            )

            print(
                "Subiendo a Supabase Storage..."
            )

            public_url = (
                upload_product_image(
                    filename=filename,
                    contents=contents,
                )
            )

            uploaded_urls.append(
                public_url
            )

            product.image_url = (
                public_url
            )

            print(
                "OK"
            )

        # ==================================
        # GUARDAR CAMBIOS EN POSTGRESQL
        # ==================================

        db.commit()

        print()
        print(
            "=================================="
        )
        print(
            "MIGRACIÓN COMPLETADA"
        )
        print(
            "=================================="
        )
        print(
            f"Imágenes migradas: {len(products)}"
        )

    except Exception as error:
        db.rollback()

        print()
        print(
            "ERROR DURANTE LA MIGRACIÓN:"
        )
        print(
            repr(error)
        )

        # ==================================
        # LIMPIAR ARCHIVOS SUBIDOS
        # SI LA MIGRACIÓN NO TERMINÓ
        # ==================================

        if uploaded_urls:
            print()
            print(
                "Limpiando archivos subidos..."
            )

            for image_url in uploaded_urls:
                try:
                    delete_product_image(
                        image_url
                    )
                except Exception as cleanup_error:
                    print(
                        "No se pudo limpiar:",
                        repr(cleanup_error),
                    )

        raise

    finally:
        db.close()


# ==========================================
# EJECUCIÓN
# ==========================================

if __name__ == "__main__":
    migrate_product_images()