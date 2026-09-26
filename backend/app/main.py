import asyncio
from contextlib import asynccontextmanager, suppress
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.database import SessionLocal, engine
from app.routers.addresses import router as addresses_router
from app.routers.auth import router as auth_router
from app.routers.favorites import router as favorites_router
from app.routers.orders import router as orders_router
from app.routers.payments import router as payments_router
from app.routers.products import router as products_router
from app.routers.recommendations import router as recommendations_router
from app.routers.reviews import router as reviews_router
from app.routers.users import router as users_router
from app.services.email_outbox_service import process_email_outbox
from app.services.stock_service import expire_stock_reservations


# ==========================================
# RUTA BASE DEL BACKEND
# ==========================================

BACKEND_DIR = Path(__file__).resolve().parent.parent


# ==========================================
# CARPETA DE ARCHIVOS SUBIDOS
# ==========================================

UPLOADS_DIR = BACKEND_DIR / "uploads"

UPLOADS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ==========================================
# INTERVALOS DE PROCESAMIENTO
# ==========================================

RESERVATION_CHECK_INTERVAL_SECONDS = 60
EMAIL_OUTBOX_CHECK_INTERVAL_SECONDS = 10


# ==========================================
# PROCESAR RESERVAS VENCIDAS
# ==========================================

def process_expired_reservations() -> int:
    """
    Abre una sesión independiente de PostgreSQL
    y procesa las reservas de inventario vencidas.
    """

    db = SessionLocal()

    try:
        expired_count = expire_stock_reservations(db)

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
# PROCESAR CORREOS PENDIENTES
# ==========================================

def process_pending_emails() -> dict[str, int]:
    """
    Abre una sesión independiente de PostgreSQL
    y procesa los correos pendientes del outbox.
    """

    db = SessionLocal()

    try:
        result = process_email_outbox(
            db=db,
            batch_size=20,
        )

        if result["claimed"] > 0:
            print(
                "EMAIL OUTBOX:",
                result,
            )

        return result

    except Exception as error:
        db.rollback()

        print(
            "ERROR PROCESANDO EMAIL OUTBOX:",
            repr(error),
        )

        return {
            "claimed": 0,
            "sent": 0,
            "retry": 0,
            "failed": 0,
        }

    finally:
        db.close()


# ==========================================
# LOOP AUTOMÁTICO DE RESERVAS
# ==========================================

async def reservation_cleanup_loop():
    """
    Ejecuta periódicamente el proceso de
    expiración de reservas de stock.
    """

    while True:
        try:
            await asyncio.to_thread(
                process_expired_reservations
            )

            await asyncio.sleep(
                RESERVATION_CHECK_INTERVAL_SECONDS
            )

        except asyncio.CancelledError:
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
# LOOP AUTOMÁTICO DE CORREOS
# ==========================================

async def email_outbox_loop():
    """
    Revisa periódicamente PostgreSQL en busca
    de correos pendientes y los envía mediante
    el servicio configurado en email_service.py.
    """

    while True:
        try:
            await asyncio.to_thread(
                process_pending_emails
            )

            await asyncio.sleep(
                EMAIL_OUTBOX_CHECK_INTERVAL_SECONDS
            )

        except asyncio.CancelledError:
            raise

        except Exception as error:
            print(
                "ERROR EN LOOP DE EMAIL OUTBOX:",
                repr(error),
            )

            await asyncio.sleep(
                EMAIL_OUTBOX_CHECK_INTERVAL_SECONDS
            )


# ==========================================
# CICLO DE VIDA DE FASTAPI
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(
        "AURA: iniciando procesos automáticos "
        "de reservas y correos."
    )

    reservation_task = asyncio.create_task(
        reservation_cleanup_loop()
    )

    email_task = asyncio.create_task(
        email_outbox_loop()
    )

    try:
        yield

    finally:
        print(
            "AURA: deteniendo procesos automáticos "
            "de reservas y correos."
        )

        reservation_task.cancel()
        email_task.cancel()

        with suppress(asyncio.CancelledError):
            await reservation_task

        with suppress(asyncio.CancelledError):
            await email_task


# ==========================================
# FASTAPI
# ==========================================

app = FastAPI(
    title="AURA API",
    description="API del ecommerce de perfumes AURA",
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
# ARCHIVOS ESTÁTICOS
# ==========================================

app.mount(
    "/uploads",
    StaticFiles(
        directory=str(UPLOADS_DIR)
    ),
    name="uploads",
)


# ==========================================
# ROUTERS
# ==========================================

app.include_router(auth_router)
app.include_router(addresses_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(users_router)
app.include_router(reviews_router)
app.include_router(payments_router)
app.include_router(favorites_router)
app.include_router(recommendations_router)


# ==========================================
# RUTA PRINCIPAL
# ==========================================

@app.get("/")
def root():
    return {
        "message": "AURA API funcionando correctamente"
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
        "database": "PostgreSQL conectado",
        "result": value,
    }