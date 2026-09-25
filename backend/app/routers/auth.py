import hmac
import os

import jwt

from dotenv import load_dotenv

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_password_signature,
    decode_email_verification_token,
    decode_password_reset_token,
    hash_password,
    verify_password,
)

from app.database import get_db

from app.dependencies.auth import (
    get_current_user,
)

from app.models.user import User

from app.schemas.user import (
    EmailVerificationRequest,
    ForgotPasswordRequest,
    MessageResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)

from app.services.email_service import (
    send_password_changed_email,
    send_password_reset_email,
    send_verification_email,
    send_welcome_email,
)


# ==========================================
# VARIABLES DE ENTORNO
# ==========================================

load_dotenv()


FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).rstrip("/")


# ==========================================
# ROUTER
# ==========================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ==========================================
# FUNCIÓN AUXILIAR
# ENVIAR VERIFICACIÓN
# ==========================================

def send_user_verification_email(
    user: User,
) -> None:

    verification_token = (
        create_email_verification_token(
            user.id
        )
    )

    verification_url = (
        f"{FRONTEND_URL}"
        f"/verificar-email"
        f"?token={verification_token}"
    )

    send_verification_email(
        recipient_email=user.email,
        first_name=user.first_name,
        verification_url=verification_url,
    )


# ==========================================
# REGISTRO
# ==========================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):

    # ======================================
    # NORMALIZAR EMAIL
    # ======================================

    email = (
        user_data.email
        .lower()
        .strip()
    )


    # ======================================
    # COMPROBAR SI YA EXISTE
    # ======================================

    existing_user = db.scalar(
        select(User)
        .where(
            User.email == email
        )
    )

    if existing_user:

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "Ya existe una cuenta "
                "con este correo electrónico"
            ),
        )


    # ======================================
    # CREAR USUARIO
    # ======================================

    new_user = User(
        first_name=
            user_data.first_name.strip(),

        last_name=
            user_data.last_name.strip(),

        email=
            email,

        password_hash=
            hash_password(
                user_data.password
            ),

        email_verified=False,
    )


    # ======================================
    # GUARDAR EN POSTGRESQL
    # ======================================

    try:

        db.add(
            new_user
        )

        db.commit()

        db.refresh(
            new_user
        )

    except Exception:

        db.rollback()

        raise


    # ======================================
    # ENVIAR VERIFICACIÓN
    # ======================================

    try:

        send_user_verification_email(
            new_user
        )

    except Exception as error:

        print(
            "No se pudo enviar "
            "el correo de verificación:",
            error,
        )


    return new_user


# ==========================================
# REENVIAR CORREO DE VERIFICACIÓN
# ==========================================

@router.post(
    "/resend-verification",
    response_model=MessageResponse,
)
def resend_verification_email(
    request_data:
        ResendVerificationRequest,

    db: Session = Depends(get_db),
):

    email = (
        request_data.email
        .lower()
        .strip()
    )


    user = db.scalar(
        select(User)
        .where(
            User.email == email
        )
    )


    generic_response = (
        "Si existe una cuenta pendiente "
        "de verificación con ese correo, "
        "recibirás un nuevo mensaje."
    )


    # ======================================
    # NO REVELAMOS SI EL USUARIO EXISTE
    # ======================================

    if not user:

        return MessageResponse(
            message=generic_response
        )


    if user.email_verified:

        return MessageResponse(
            message=generic_response
        )


    # ======================================
    # REENVIAR
    # ======================================

    try:

        send_user_verification_email(
            user
        )

    except Exception as error:

        print(
            "Error al reenviar "
            "correo de verificación:",
            error,
        )

        raise HTTPException(
            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "No fue posible enviar "
                "el correo en este momento."
            ),
        )


    return MessageResponse(
        message=generic_response
    )


# ==========================================
# VERIFICAR CORREO
# ==========================================

@router.post(
    "/verify-email",
    response_model=MessageResponse,
)
def verify_email(
    verification_data:
        EmailVerificationRequest,

    db: Session = Depends(get_db),
):

    # ======================================
    # DECODIFICAR TOKEN
    # ======================================

    try:

        payload = (
            decode_email_verification_token(
                verification_data.token
            )
        )

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "El enlace de verificación "
                "ha expirado."
            ),
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "El enlace de verificación "
                "no es válido."
            ),
        )


    # ======================================
    # OBTENER ID
    # ======================================

    user_id = payload.get(
        "sub"
    )


    if not user_id:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "El token de verificación "
                "no contiene un usuario válido."
            ),
        )


    try:

        user_id_int = int(
            user_id
        )

    except (
        TypeError,
        ValueError,
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "El identificador del usuario "
                "no es válido."
            ),
        )


    # ======================================
    # BUSCAR USUARIO
    # ======================================

    user = db.scalar(
        select(User)
        .where(
            User.id == user_id_int
        )
    )


    if not user:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=
                "Usuario no encontrado.",
        )


    # ======================================
    # YA ESTÁ VERIFICADO
    # ======================================

    if user.email_verified:

        return MessageResponse(
            message=(
                "El correo electrónico "
                "ya estaba verificado."
            )
        )


    # ======================================
    # MARCAR COMO VERIFICADO
    # ======================================

    user.email_verified = True


    try:

        db.commit()

        db.refresh(
            user
        )

    except Exception:

        db.rollback()

        raise


    # ======================================
    # CORREO DE BIENVENIDA
    # ======================================

    try:

        send_welcome_email(
            recipient_email=
                user.email,

            first_name=
                user.first_name,

            shop_url=
                FRONTEND_URL,
        )

    except Exception as error:

        print(
            "No se pudo enviar "
            "el correo de bienvenida:",
            error,
        )


    return MessageResponse(
        message=(
            "Correo electrónico "
            "verificado correctamente."
        )
    )


# ==========================================
# OLVIDÉ MI CONTRASEÑA
# ==========================================

@router.post(
    "/forgot-password",
    response_model=MessageResponse,
)
def forgot_password(
    request_data:
        ForgotPasswordRequest,

    db: Session = Depends(get_db),
):

    # ======================================
    # NORMALIZAR EMAIL
    # ======================================

    email = (
        request_data.email
        .lower()
        .strip()
    )


    # ======================================
    # BUSCAR USUARIO
    # ======================================

    user = db.scalar(
        select(User)
        .where(
            User.email == email
        )
    )


    # ======================================
    # RESPUESTA GENÉRICA
    #
    # No revelamos si existe el correo.
    # ======================================

    generic_response = (
        "Si existe una cuenta asociada "
        "a ese correo, recibirás "
        "instrucciones para restablecer "
        "tu contraseña."
    )


    # ======================================
    # USUARIO INEXISTENTE O DESACTIVADO
    # ======================================

    if (
        not user
        or
        not user.is_active
    ):

        return MessageResponse(
            message=generic_response
        )


    # ======================================
    # GENERAR TOKEN
    # ======================================

    reset_token = (
        create_password_reset_token(
            user.id,
            user.password_hash,
        )
    )


    # ======================================
    # CREAR ENLACE DEL FRONTEND
    # ======================================

    reset_url = (
        f"{FRONTEND_URL}"
        f"/restablecer-password"
        f"?token={reset_token}"
    )


    # ======================================
    # ENVIAR EMAIL
    # ======================================

    try:

        send_password_reset_email(
            recipient_email=
                user.email,

            first_name=
                user.first_name,

            reset_url=
                reset_url,
        )

    except Exception as error:

        print(
            "No se pudo enviar "
            "el correo para recuperar "
            "la contraseña:",
            error,
        )


    return MessageResponse(
        message=generic_response
    )


# ==========================================
# RESTABLECER CONTRASEÑA
# ==========================================

@router.post(
    "/reset-password",
    response_model=MessageResponse,
)
def reset_password(
    request_data:
        ResetPasswordRequest,

    db: Session = Depends(get_db),
):

    # ======================================
    # DECODIFICAR TOKEN
    # ======================================

    try:

        payload = (
            decode_password_reset_token(
                request_data.token
            )
        )

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "El enlace para restablecer "
                "la contraseña ha expirado."
            ),
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "El enlace para restablecer "
                "la contraseña no es válido."
            ),
        )


    # ======================================
    # OBTENER ID DEL USUARIO
    # ======================================

    user_id = payload.get(
        "sub"
    )


    if not user_id:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "El token no contiene "
                "un usuario válido."
            ),
        )


    try:

        user_id_int = int(
            user_id
        )

    except (
        TypeError,
        ValueError,
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "El token no contiene "
                "un usuario válido."
            ),
        )


    # ======================================
    # BUSCAR USUARIO
    # ======================================

    user = db.scalar(
        select(User)
        .where(
            User.id == user_id_int
        )
    )


    if not user:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=
                "Usuario no encontrado.",
        )


    # ======================================
    # CUENTA DESACTIVADA
    # ======================================

    if not user.is_active:

        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "La cuenta se encuentra "
                "desactivada."
            ),
        )


    # ======================================
    # VALIDAR FIRMA DE CONTRASEÑA
    #
    # Si la contraseña ya cambió,
    # el token queda inutilizable.
    # ======================================

    token_password_signature = (
        payload.get(
            "password_signature"
        )
    )


    current_password_signature = (
        create_password_signature(
            user.password_hash
        )
    )


    if (
        not token_password_signature
        or
        not hmac.compare_digest(
            token_password_signature,
            current_password_signature,
        )
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "Este enlace ya no es válido. "
                "Solicita uno nuevo."
            ),
        )


    # ======================================
    # EVITAR USAR LA MISMA CONTRASEÑA
    # ======================================

    if verify_password(
        request_data.new_password,
        user.password_hash,
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "La nueva contraseña debe ser "
                "diferente a la contraseña actual."
            ),
        )


    # ======================================
    # GENERAR NUEVO HASH ARGON2
    # ======================================

    user.password_hash = (
        hash_password(
            request_data.new_password
        )
    )


    # ======================================
    # GUARDAR NUEVA CONTRASEÑA
    # ======================================

    try:

        db.commit()

        db.refresh(
            user
        )

    except Exception:

        db.rollback()

        raise


    # ======================================
    # AVISAR AL CLIENTE
    # ======================================

    try:

        send_password_changed_email(
            recipient_email=
                user.email,

            first_name=
                user.first_name,
        )

    except Exception as error:

        print(
            "No se pudo enviar "
            "el correo de contraseña "
            "modificada:",
            error,
        )


    return MessageResponse(
        message=(
            "Tu contraseña fue actualizada "
            "correctamente."
        )
    )


# ==========================================
# LOGIN
# ==========================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login_user(
    credentials: UserLogin,
    db: Session = Depends(get_db),
):

    # ======================================
    # NORMALIZAR EMAIL
    # ======================================

    email = (
        credentials.email
        .lower()
        .strip()
    )


    # ======================================
    # BUSCAR USUARIO
    # ======================================

    user = db.scalar(
        select(User)
        .where(
            User.email == email
        )
    )


    # ======================================
    # VALIDAR CREDENCIALES
    # ======================================

    if (
        not user
        or
        not verify_password(
            credentials.password,
            user.password_hash,
        )
    ):

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=
                "Correo o contraseña incorrectos",
            headers={
                "WWW-Authenticate":
                    "Bearer"
            },
        )


    # ======================================
    # CUENTA DESACTIVADA
    # ======================================

    if not user.is_active:

        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "La cuenta se encuentra "
                "desactivada"
            ),
        )


    # ======================================
    # CORREO NO VERIFICADO
    # ======================================

    if not user.email_verified:

        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "Debes verificar tu correo "
                "electrónico antes de iniciar sesión."
            ),
        )


    # ======================================
    # GENERAR JWT
    # ======================================

    access_token = (
        create_access_token(
            user.id
        )
    )


    return TokenResponse(
        access_token=
            access_token,

        token_type=
            "bearer",
    )


# ==========================================
# USUARIO ACTUAL
# ==========================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(
        get_current_user
    ),
):

    return current_user