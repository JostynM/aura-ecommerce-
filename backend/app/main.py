import asyncio

from contextlib import (
    asynccontextmanager,
    suppress,
)

from fastapi import FastAPI
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from sqlalchemy import text

from app.database import (
    SessionLocal,
    engine,
)
from app.routers.addresses import (
    router as addresses_router,
)
from app.routers.auth import (
    router as auth_router,
)
from app.routers.orders import (
    router as orders_router,
)
from app.routers.payments import (
    router as payments_router,
)
from app.routers.products import (
    router as products_router,
)
from app.routers.users import (
    router as users_router,
)
from app.services.stock_service import (
    expire_stock_reservations,
)


# ==========================================
# CONFIGURACIÓN DE RESERVAS
# ==========================================

RESERVATION_CHECK_INTERVAL_SECONDS = 60


# ==========================================
# PROCESAR RESERVAS VENCIDAS
# ==========================================

def process_expired_reservations() -> int:
    """
    Abre una sesión independiente de
    PostgreSQL y procesa las reservas
    de inventario vencidas.
    """

    db = SessionLocal()

    try:

        expired_count = (
            expire_stock_reservations(
                db
            )
        )

        db.commit()

        if expired_count > 0:
            print(
                "RESERVAS EXPIRADAS:",
                expired_count,
            )

        return expired_count

    except Exception as error:

        db.rollback()

        print(
            "ERROR EXPIRANDO RESERVAS:",
            repr(error),
        )

        return 0

    finally:

        db.close()


# ==========================================
# LOOP AUTOMÁTICO
# ==========================================

async def reservation_cleanup_loop():
    """
    Ejecuta periódicamente el proceso
    de expiración de reservas.
    """

    while True:

        try:

            # Ejecutamos la función SQLAlchemy
            # síncrona en otro thread para no
            # bloquear FastAPI.
            await asyncio.to_thread(
                process_expired_reservations
            )

            await asyncio.sleep(
                RESERVATION_CHECK_INTERVAL_SECONDS
            )

        except asyncio.CancelledError:

            # FastAPI se está cerrando.
            raise

        except Exception as error:

            print(
                "ERROR EN LOOP DE RESERVAS:",
                repr(error),
            )

            await asyncio.sleep(
                RESERVATION_CHECK_INTERVAL_SECONDS
            )


# ==========================================
# CICLO DE VIDA DE FASTAPI
# ==========================================

@asynccontextmanager
async def lifespan(
    app: FastAPI,
):

    print(
        "AURA: iniciando control "
        "automático de reservas."
    )

    reservation_task = (
        asyncio.create_task(
            reservation_cleanup_loop()
        )
    )

    try:

        yield

    finally:

        print(
            "AURA: deteniendo control "
            "automático de reservas."
        )

        reservation_task.cancel()

        with suppress(
            asyncio.CancelledError
        ):
            await reservation_task


# ==========================================
# FASTAPI
# ==========================================

app = FastAPI(
    title="AURA API",
    description=(
        "API del ecommerce "
        "de perfumes AURA"
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# ROUTERS
# ==========================================

app.include_router(
    auth_router
)

app.include_router(
    addresses_router
)

app.include_router(
    products_router
)

app.include_router(
    orders_router
)

app.include_router(
    users_router
)

app.include_router(
    payments_router
)


# ==========================================
# RUTA PRINCIPAL
# ==========================================

@app.get("/")
def root():
    return {
        "message":
            "AURA API funcionando "
            "correctamente"
    }


# ==========================================
# TEST DE POSTGRESQL
# ==========================================

@app.get("/database-test")
def database_test():

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT 1")
        )

        value = result.scalar()

    return {
        "database":
            "PostgreSQL conectado",

        "result":
            value,
    }