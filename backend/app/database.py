import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# ==========================================
# VARIABLES DE ENTORNO
# ==========================================

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL no está configurada en el archivo .env"
    )


# ==========================================
# CONFIGURACIÓN DEL POOL
#
# Los valores pueden cambiarse desde .env
# sin modificar el código.
# ==========================================

DB_POOL_SIZE = int(
    os.getenv(
        "DB_POOL_SIZE",
        "5",
    )
)

DB_MAX_OVERFLOW = int(
    os.getenv(
        "DB_MAX_OVERFLOW",
        "10",
    )
)

DB_POOL_TIMEOUT = int(
    os.getenv(
        "DB_POOL_TIMEOUT",
        "30",
    )
)

DB_POOL_RECYCLE = int(
    os.getenv(
        "DB_POOL_RECYCLE",
        "1800",
    )
)


# ==========================================
# ENGINE
# ==========================================

engine = create_engine(
    DATABASE_URL,

    # Verifica que una conexión siga viva
    # antes de entregarla a una petición.
    pool_pre_ping=True,

    # Conexiones permanentes disponibles.
    pool_size=DB_POOL_SIZE,

    # Conexiones adicionales permitidas
    # durante momentos de mayor tráfico.
    max_overflow=DB_MAX_OVERFLOW,

    # Máximo tiempo esperando una conexión.
    pool_timeout=DB_POOL_TIMEOUT,

    # Recicla conexiones antiguas para evitar
    # conexiones muertas o cerradas por el
    # servidor de PostgreSQL.
    pool_recycle=DB_POOL_RECYCLE,
)


# ==========================================
# SESIONES
# ==========================================

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


# ==========================================
# BASE DE LOS MODELOS
# ==========================================

class Base(DeclarativeBase):
    pass


# ==========================================
# DEPENDENCIA DE BASE DE DATOS
#
# Cada request obtiene su propia Session.
# Al terminar la petición se libera y la
# conexión vuelve al pool.
# ==========================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()