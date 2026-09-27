import os
from getpass import getpass
from pathlib import Path

from dotenv import load_dotenv

from sqlalchemy import (
    MetaData,
    create_engine,
    func,
    insert,
    select,
    text,
)
from sqlalchemy.engine import make_url


# ==========================================
# CONFIGURACIÓN
# ==========================================

BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parents[1]
)

ENV_FILE = (
    BACKEND_DIR
    / ".env"
)

TABLES_TO_COPY = (
    "users",
    "products",
    "business_hours",
)

ADMIN_ID = 4


# ==========================================
# CARGAR BASE LOCAL
# ==========================================

load_dotenv(
    ENV_FILE,
    override=True,
)

LOCAL_DATABASE_URL = os.getenv(
    "DATABASE_URL"
)


if not LOCAL_DATABASE_URL:
    raise RuntimeError(
        "No se encontró DATABASE_URL "
        "en backend/.env"
    )


# ==========================================
# PEDIR CONEXIÓN DE SUPABASE
# ==========================================

print()
print("==========================================")
print(" MIGRACIÓN AURA → SUPABASE")
print("==========================================")
print()
print(
    "Pega la URI de Session pooler "
    "que te dio Supabase."
)
print(
    "La contraseña NO aparecerá "
    "en pantalla mientras pegas."
)
print()

SUPABASE_DATABASE_URL = getpass(
    "URL de Supabase: "
).strip()


if not SUPABASE_DATABASE_URL:
    raise RuntimeError(
        "No ingresaste la URL de Supabase."
    )


# ==========================================
# FORZAR SSL EN SUPABASE
# ==========================================

if "sslmode=" not in SUPABASE_DATABASE_URL:

    separator = (
        "&"
        if "?"
        in SUPABASE_DATABASE_URL
        else "?"
    )

    SUPABASE_DATABASE_URL = (
        SUPABASE_DATABASE_URL
        + separator
        + "sslmode=require"
    )


# ==========================================
# COMPROBAR QUE SON BASES DIFERENTES
# ==========================================

local_url_info = make_url(
    LOCAL_DATABASE_URL
)

remote_url_info = make_url(
    SUPABASE_DATABASE_URL
)


if (
    local_url_info.host
    ==
    remote_url_info.host
):
    raise RuntimeError(
        "La base local y Supabase "
        "parecen ser la misma conexión."
    )


print()
print(
    f"Base local: "
    f"{local_url_info.host}"
)

print(
    f"Supabase: "
    f"{remote_url_info.host}"
)

print()


# ==========================================
# CREAR CONEXIONES
# ==========================================

local_engine = create_engine(
    LOCAL_DATABASE_URL,
    pool_pre_ping=True,
)

supabase_engine = create_engine(
    SUPABASE_DATABASE_URL,
    pool_pre_ping=True,
)


# ==========================================
# REFLEJAR TABLAS
# ==========================================

local_metadata = MetaData()

local_metadata.reflect(
    bind=local_engine,
    only=TABLES_TO_COPY,
)


remote_metadata = MetaData()

remote_metadata.reflect(
    bind=supabase_engine,
    only=TABLES_TO_COPY,
)


local_users = (
    local_metadata.tables["users"]
)

local_products = (
    local_metadata.tables["products"]
)

local_business_hours = (
    local_metadata.tables[
        "business_hours"
    ]
)


remote_users = (
    remote_metadata.tables["users"]
)

remote_products = (
    remote_metadata.tables["products"]
)

remote_business_hours = (
    remote_metadata.tables[
        "business_hours"
    ]
)


# ==========================================
# LEER DATOS LOCALES
# ==========================================

with local_engine.connect() as connection:

    admin = (
        connection.execute(
            select(
                local_users
            )
            .where(
                local_users.c.id
                == ADMIN_ID
            )
        )
        .mappings()
        .all()
    )

    products = (
        connection.execute(
            select(
                local_products
            )
            .order_by(
                local_products.c.id
                .asc()
            )
        )
        .mappings()
        .all()
    )

    business_hours = (
        connection.execute(
            select(
                local_business_hours
            )
            .order_by(
                local_business_hours.c.id
                .asc()
            )
        )
        .mappings()
        .all()
    )


# ==========================================
# VALIDAR DATOS LOCALES
# ==========================================

if len(admin) != 1:
    raise RuntimeError(
        "No se encontró exactamente "
        "un administrador con ID 4."
    )


if not products:
    raise RuntimeError(
        "No se encontraron productos "
        "en la base local."
    )


if not business_hours:
    raise RuntimeError(
        "No se encontraron horarios "
        "en la base local."
    )


print(
    f"Administrador encontrado: "
    f"{len(admin)}"
)

print(
    f"Productos encontrados: "
    f"{len(products)}"
)

print(
    f"Horarios encontrados: "
    f"{len(business_hours)}"
)

print()


# ==========================================
# REINICIAR SECUENCIA
# ==========================================

def reset_sequence(
    connection,
    table_name: str,
) -> None:

    sequence_name = (
        connection.execute(
            text(
                """
                SELECT pg_get_serial_sequence(
                    :table_name,
                    'id'
                )
                """
            ),
            {
                "table_name":
                    table_name
            },
        )
        .scalar()
    )

    if not sequence_name:
        return

    max_id = (
        connection.execute(
            text(
                f"""
                SELECT MAX(id)
                FROM "{table_name}"
                """
            )
        )
        .scalar()
    )

    if max_id is None:
        return

    connection.execute(
        text(
            """
            SELECT setval(
                CAST(:sequence_name AS regclass),
                :max_id,
                true
            )
            """
        ),
        {
            "sequence_name":
                sequence_name,

            "max_id":
                max_id,
        },
    )


# ==========================================
# COPIAR A SUPABASE
# ==========================================

with supabase_engine.begin() as connection:

    # ======================================
    # COMPROBAR QUE SUPABASE ESTÉ VACÍO
    # ======================================

    remote_user_count = (
        connection.scalar(
            select(
                func.count()
            )
            .select_from(
                remote_users
            )
        )
    )

    remote_product_count = (
        connection.scalar(
            select(
                func.count()
            )
            .select_from(
                remote_products
            )
        )
    )

    remote_hours_count = (
        connection.scalar(
            select(
                func.count()
            )
            .select_from(
                remote_business_hours
            )
        )
    )

    if (
        remote_user_count
        or remote_product_count
        or remote_hours_count
    ):
        raise RuntimeError(
            "Supabase ya contiene datos "
            "en users, products o "
            "business_hours. "
            "Se canceló la migración "
            "para evitar duplicados."
        )

    # ======================================
    # COPIAR ADMIN
    # ======================================

    connection.execute(
        insert(
            remote_users
        ),
        [
            dict(
                row
            )
            for row in admin
        ],
    )

    # ======================================
    # COPIAR PRODUCTOS
    # ======================================

    connection.execute(
        insert(
            remote_products
        ),
        [
            dict(
                row
            )
            for row in products
        ],
    )

    # ======================================
    # COPIAR HORARIOS
    # ======================================

    connection.execute(
        insert(
            remote_business_hours
        ),
        [
            dict(
                row
            )
            for row in business_hours
        ],
    )

    # ======================================
    # ACTUALIZAR SECUENCIAS
    # ======================================

    reset_sequence(
        connection,
        "users",
    )

    reset_sequence(
        connection,
        "products",
    )

    reset_sequence(
        connection,
        "business_hours",
    )


# ==========================================
# VERIFICAR RESULTADO
# ==========================================

with supabase_engine.connect() as connection:

    final_users = (
        connection.scalar(
            select(
                func.count()
            )
            .select_from(
                remote_users
            )
        )
    )

    final_products = (
        connection.scalar(
            select(
                func.count()
            )
            .select_from(
                remote_products
            )
        )
    )

    final_hours = (
        connection.scalar(
            select(
                func.count()
            )
            .select_from(
                remote_business_hours
            )
        )
    )


print()
print("==========================================")
print(" MIGRACIÓN COMPLETADA")
print("==========================================")
print()

print(
    f"Usuarios en Supabase: "
    f"{final_users}"
)

print(
    f"Productos en Supabase: "
    f"{final_products}"
)

print(
    f"Horarios en Supabase: "
    f"{final_hours}"
)

print()

print(
    "AURA ya tiene sus datos "
    "iniciales en Supabase."
)