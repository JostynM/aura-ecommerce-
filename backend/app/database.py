import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool


# ==========================================
# VARIABLES DE ENTORNO
# ==========================================

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL"
)

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL no está configurada."
    )


# ==========================================
# NORMALIZAR DRIVER POSTGRESQL
# ==========================================

# Si Render/Supabase entrega:
#
# postgresql://...
#
# SQLAlchemy intenta usar psycopg2.
#
# Como AURA utiliza psycopg 3,
# convertimos automáticamente a:
#
# postgresql+psycopg://...
#

if DATABASE_URL.startswith(
    "postgresql://"
):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1,
    )


# ==========================================
# ENGINE
#
# Supabase ya utiliza un pooler.
# NullPool evita mantener un segundo
# pool dentro de FastAPI.
# ==========================================

engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,
    pool_pre_ping=True,
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

class Base(
    DeclarativeBase
):
    pass


# ==========================================
# DEPENDENCIA DE BASE DE DATOS
# ==========================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()