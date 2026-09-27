import os
from urllib.parse import quote

import httpx
from dotenv import load_dotenv


load_dotenv()


SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "",
).rstrip("/")

SUPABASE_SECRET_KEY = os.getenv(
    "SUPABASE_SECRET_KEY",
    "",
)

SUPABASE_STORAGE_BUCKET = os.getenv(
    "SUPABASE_STORAGE_BUCKET",
    "product-images",
)


def validate_storage_config() -> None:
    if not SUPABASE_URL:
        raise RuntimeError(
            "Falta SUPABASE_URL en el archivo .env."
        )

    if not SUPABASE_SECRET_KEY:
        raise RuntimeError(
            "Falta SUPABASE_SECRET_KEY en el archivo .env."
        )

    if not SUPABASE_STORAGE_BUCKET:
        raise RuntimeError(
            "Falta SUPABASE_STORAGE_BUCKET en el archivo .env."
        )


def get_storage_headers() -> dict[str, str]:
    validate_storage_config()

    return {
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "apikey": SUPABASE_SECRET_KEY,
    }


def upload_product_image(
    filename: str,
    contents: bytes,
) -> str:
    """
    Sube una imagen WEBP procesada por Pillow
    al bucket de productos de Supabase.

    Devuelve la URL pública de la imagen.
    """

    validate_storage_config()

    object_path = f"products/{filename}"

    encoded_path = quote(
        object_path,
        safe="/",
    )

    upload_url = (
        f"{SUPABASE_URL}"
        f"/storage/v1/object/"
        f"{SUPABASE_STORAGE_BUCKET}/"
        f"{encoded_path}"
    )

    headers = get_storage_headers()

    headers.update({
        "Content-Type": "image/webp",
        "x-upsert": "false",
    })

    try:
        response = httpx.post(
            upload_url,
            headers=headers,
            content=contents,
            timeout=30.0,
        )

    except httpx.RequestError as error:
        raise RuntimeError(
            "No se pudo conectar con Supabase Storage."
        ) from error

    if response.status_code not in {
        200,
        201,
    }:
        raise RuntimeError(
            "Supabase no pudo guardar la imagen. "
            f"Status: {response.status_code}. "
            f"Respuesta: {response.text}"
        )

    public_url = (
        f"{SUPABASE_URL}"
        f"/storage/v1/object/public/"
        f"{SUPABASE_STORAGE_BUCKET}/"
        f"{encoded_path}"
    )

    return public_url


def delete_product_image(
    image_url: str | None,
) -> None:
    """
    Elimina una imagen de Supabase Storage.

    Si la URL no pertenece a nuestro bucket,
    simplemente no hace nada.
    """

    if not image_url:
        return

    validate_storage_config()

    public_prefix = (
        f"{SUPABASE_URL}"
        f"/storage/v1/object/public/"
        f"{SUPABASE_STORAGE_BUCKET}/"
    )

    if not image_url.startswith(
        public_prefix
    ):
        return

    object_path = image_url.replace(
        public_prefix,
        "",
        1,
    )

    delete_url = (
        f"{SUPABASE_URL}"
        f"/storage/v1/object/"
        f"{SUPABASE_STORAGE_BUCKET}"
    )

    headers = get_storage_headers()

    headers.update({
        "Content-Type": "application/json",
    })

    try:
        response = httpx.request(
            method="DELETE",
            url=delete_url,
            headers=headers,
            json={
                "prefixes": [
                    object_path
                ]
            },
            timeout=30.0,
        )

    except httpx.RequestError as error:
        print(
            "ERROR ELIMINANDO IMAGEN "
            "DE SUPABASE:",
            repr(error),
        )

        return

    if response.status_code not in {
        200,
        204,
    }:
        print(
            "ERROR ELIMINANDO IMAGEN "
            "DE SUPABASE:",
            response.status_code,
            response.text,
        )