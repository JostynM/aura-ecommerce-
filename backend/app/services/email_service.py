import os

from pathlib import Path

import resend

from dotenv import load_dotenv

from jinja2 import (
    Environment,
    FileSystemLoader,
    select_autoescape,
)


# ==========================================
# VARIABLES DE ENTORNO
# ==========================================

load_dotenv()


RESEND_API_KEY = os.getenv(
    "RESEND_API_KEY"
)


if not RESEND_API_KEY:

    raise ValueError(
        "RESEND_API_KEY no está configurada "
        "en el archivo .env"
    )


# ==========================================
# CONFIGURAR RESEND
# ==========================================

resend.api_key = RESEND_API_KEY


# ==========================================
# REMITENTE
# ==========================================

EMAIL_FROM = (
    "AURA <onboarding@resend.dev>"
)


# ==========================================
# UBICACIÓN DE LAS PLANTILLAS
# ==========================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)


EMAIL_TEMPLATE_DIR = (
    BASE_DIR
    / "templates"
    / "emails"
)


# ==========================================
# CONFIGURAR JINJA2
# ==========================================

template_environment = Environment(

    loader=FileSystemLoader(
        EMAIL_TEMPLATE_DIR
    ),

    autoescape=select_autoescape(
        [
            "html",
            "xml",
        ]
    ),
)


# ==========================================
# RENDERIZAR PLANTILLA
# ==========================================

def render_email_template(
    template_name: str,
    **context,
) -> str:

    template = (
        template_environment
        .get_template(
            template_name
        )
    )

    return template.render(
        **context
    )


# ==========================================
# ENVIAR CORREO DE VERIFICACIÓN
# ==========================================

def send_verification_email(
    recipient_email: str,
    first_name: str,
    verification_url: str,
):

    html_content = (
        render_email_template(
            "verify_email.html",

            first_name=
                first_name,

            verification_url=
                verification_url,
        )
    )


    params: resend.Emails.SendParams = {

        "from":
            EMAIL_FROM,

        "to": [
            recipient_email
        ],

        "subject":
            "Verifica tu correo electrónico - AURA",

        "html":
            html_content,
    }


    return resend.Emails.send(
        params
    )


# ==========================================
# ENVIAR CORREO DE BIENVENIDA
# ==========================================

def send_welcome_email(
    recipient_email: str,
    first_name: str,
    shop_url: str,
):

    html_content = (
        render_email_template(
            "welcome.html",

            first_name=
                first_name,

            shop_url=
                shop_url,
        )
    )


    params: resend.Emails.SendParams = {

        "from":
            EMAIL_FROM,

        "to": [
            recipient_email
        ],

        "subject":
            "Bienvenido a AURA",

        "html":
            html_content,
    }


    return resend.Emails.send(
        params
    )


# ==========================================
# ENVIAR CORREO PARA RECUPERAR CONTRASEÑA
# ==========================================

def send_password_reset_email(
    recipient_email: str,
    first_name: str,
    reset_url: str,
):

    html_content = (
        render_email_template(
            "reset_password.html",

            first_name=
                first_name,

            reset_url=
                reset_url,
        )
    )


    params: resend.Emails.SendParams = {

        "from":
            EMAIL_FROM,

        "to": [
            recipient_email
        ],

        "subject":
            "Restablece tu contraseña - AURA",

        "html":
            html_content,
    }


    return resend.Emails.send(
        params
    )


# ==========================================
# CONFIRMACIÓN DE CAMBIO DE CONTRASEÑA
# ==========================================

def send_password_changed_email(
    recipient_email: str,
    first_name: str,
):

    html_content = (
        render_email_template(
            "password_changed.html",

            first_name=
                first_name,
        )
    )


    params: resend.Emails.SendParams = {

        "from":
            EMAIL_FROM,

        "to": [
            recipient_email
        ],

        "subject":
            "Tu contraseña fue actualizada - AURA",

        "html":
            html_content,
    }


    return resend.Emails.send(
        params
    )


# ==========================================
# COMPRA / PAGO CONFIRMADO
# ==========================================

def send_payment_approved_email(
    recipient_email: str,
    first_name: str,
    order_number: str,
    total: str,
    account_url: str,
):

    html_content = (
        render_email_template(
            "payment_approved.html",

            first_name=
                first_name,

            order_number=
                order_number,

            total=
                total,

            account_url=
                account_url,
        )
    )


    params: resend.Emails.SendParams = {

        "from":
            EMAIL_FROM,

        "to": [
            recipient_email
        ],

        "subject": (
            f"Compra confirmada "
            f"{order_number} - AURA"
        ),

        "html":
            html_content,
    }


    return resend.Emails.send(
        params
    )


# ==========================================
# PEDIDO DESPACHADO
# ==========================================

def send_order_shipped_email(
    recipient_email: str,
    first_name: str,
    order_number: str,
    account_url: str,
):

    html_content = (
        render_email_template(
            "order_shipped.html",

            first_name=
                first_name,

            order_number=
                order_number,

            account_url=
                account_url,
        )
    )


    params: resend.Emails.SendParams = {

        "from":
            EMAIL_FROM,

        "to": [
            recipient_email
        ],

        "subject": (
            f"Tu pedido {order_number} "
            f"fue despachado - AURA"
        ),

        "html":
            html_content,
    }


    return resend.Emails.send(
        params
    )


# ==========================================
# PEDIDO ENTREGADO
# ==========================================

def send_order_delivered_email(
    recipient_email: str,
    first_name: str,
    order_number: str,
    account_url: str,
):

    html_content = (
        render_email_template(
            "order_delivered.html",

            first_name=
                first_name,

            order_number=
                order_number,

            account_url=
                account_url,
        )
    )


    params: resend.Emails.SendParams = {

        "from":
            EMAIL_FROM,

        "to": [
            recipient_email
        ],

        "subject": (
            f"Tu pedido {order_number} "
            f"fue entregado - AURA"
        ),

        "html":
            html_content,
    }


    return resend.Emails.send(
        params
    )


# ==========================================
# CORREO DE PRUEBA
# ==========================================

def send_test_email(
    recipient_email: str,
):

    params: resend.Emails.SendParams = {

        "from":
            EMAIL_FROM,

        "to": [
            recipient_email
        ],

        "subject":
            "Prueba de correo - AURA",

        "html": """
        <div
            style="
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 40px;
                background: #f8f7f4;
            "
        >

            <h1
                style="
                    text-align: center;
                    letter-spacing: 6px;
                    font-family: Georgia, serif;
                "
            >
                AURA
            </h1>

            <p>
                Este correo confirma que
                FastAPI y Resend están
                correctamente conectados.
            </p>

        </div>
        """,
    }


    return resend.Emails.send(
        params
    )