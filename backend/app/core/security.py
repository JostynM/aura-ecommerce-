import hashlib
import hmac
import os

from datetime import (
    datetime,
    timedelta,
    timezone,
)

import jwt

from dotenv import load_dotenv
from pwdlib import PasswordHash


# ==========================================
# VARIABLES DE ENTORNO
# ==========================================

load_dotenv()


JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY"
)


if not JWT_SECRET_KEY:

    raise ValueError(
        "JWT_SECRET_KEY no está configurada "
        "en el archivo .env"
    )


# ==========================================
# CONFIGURACIÓN JWT
# ==========================================

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30

EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS = 24

PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 30


# ==========================================
# CONFIGURACIÓN DE CONTRASEÑAS
# ==========================================

password_hash = (
    PasswordHash.recommended()
)


# ==========================================
# HASHEAR CONTRASEÑA
# ==========================================

def hash_password(
    password: str
) -> str:

    return password_hash.hash(
        password
    )


# ==========================================
# VERIFICAR CONTRASEÑA
# ==========================================

def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:

    return password_hash.verify(
        plain_password,
        hashed_password
    )


# ==========================================
# CREAR TOKEN DE ACCESO
# ==========================================

def create_access_token(
    user_id: int
) -> str:

    expire = (
        datetime.now(
            timezone.utc
        )
        +
        timedelta(
            minutes=
                ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )


    payload = {

        "sub":
            str(user_id),

        "token_type":
            "access",

        "exp":
            expire,
    }


    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=ALGORITHM,
    )


# ==========================================
# DECODIFICAR TOKEN DE ACCESO
# ==========================================

def decode_access_token(
    token: str
) -> dict:

    payload = jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[
            ALGORITHM
        ],
    )


    token_type = payload.get(
        "token_type"
    )


    # ======================================
    # COMPATIBILIDAD TEMPORAL
    #
    # Los tokens creados antes de agregar
    # token_type pueden no tener este campo.
    # ======================================

    if token_type not in (
        None,
        "access",
    ):

        raise jwt.InvalidTokenError(
            "El token no es un token de acceso"
        )


    return payload


# ==========================================
# CREAR TOKEN DE VERIFICACIÓN DE EMAIL
# ==========================================

def create_email_verification_token(
    user_id: int
) -> str:

    expire = (
        datetime.now(
            timezone.utc
        )
        +
        timedelta(
            hours=
                EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        )
    )


    payload = {

        "sub":
            str(user_id),

        "token_type":
            "email_verification",

        "exp":
            expire,
    }


    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=ALGORITHM,
    )


# ==========================================
# DECODIFICAR TOKEN DE VERIFICACIÓN
# ==========================================

def decode_email_verification_token(
    token: str
) -> dict:

    payload = jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[
            ALGORITHM
        ],
    )


    token_type = payload.get(
        "token_type"
    )


    if (
        token_type !=
        "email_verification"
    ):

        raise jwt.InvalidTokenError(
            "El token no es válido "
            "para verificar el correo"
        )


    return payload


# ==========================================
# CREAR FIRMA DE CONTRASEÑA
# ==========================================
#
# Esta firma representa el hash ACTUAL
# de la contraseña del usuario.
#
# Cuando la contraseña cambia,
# password_hash también cambia.
#
# Por lo tanto, esta firma también cambia.
# ==========================================

def create_password_signature(
    password_hash_value: str
) -> str:

    return hmac.new(
        JWT_SECRET_KEY.encode(
            "utf-8"
        ),

        password_hash_value.encode(
            "utf-8"
        ),

        hashlib.sha256,
    ).hexdigest()


# ==========================================
# CREAR TOKEN PARA RESTABLECER CONTRASEÑA
# ==========================================

def create_password_reset_token(
    user_id: int,
    current_password_hash: str,
) -> str:

    expire = (
        datetime.now(
            timezone.utc
        )
        +
        timedelta(
            minutes=
                PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        )
    )


    password_signature = (
        create_password_signature(
            current_password_hash
        )
    )


    payload = {

        "sub":
            str(user_id),

        "token_type":
            "password_reset",

        "password_signature":
            password_signature,

        "exp":
            expire,
    }


    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=ALGORITHM,
    )


# ==========================================
# DECODIFICAR TOKEN DE RESTABLECIMIENTO
# ==========================================

def decode_password_reset_token(
    token: str
) -> dict:

    payload = jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[
            ALGORITHM
        ],
    )


    token_type = payload.get(
        "token_type"
    )


    if (
        token_type !=
        "password_reset"
    ):

        raise jwt.InvalidTokenError(
            "El token no es válido "
            "para restablecer la contraseña"
        )


    return payload