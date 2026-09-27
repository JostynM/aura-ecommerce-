import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User


DEMO_PASSWORD = os.getenv(
    "DEMO_ACCOUNT_PASSWORD",
    "AuraDemo2026!",
)

DEMO_ACCOUNTS = (
    {
        "first_name": "Cliente",
        "last_name": "Demo",
        "email": "demo@example.com",
        "role": "customer",
    },
    {
        "first_name": "Administrador",
        "last_name": "Demo",
        "email": "admin.demo@example.com",
        "role": "demo_admin",
    },
)


def ensure_demo_accounts(
    db: Session,
) -> None:
    """
    Crea o normaliza las cuentas públicas de demostración.

    La cuenta demo_admin nunca obtiene el rol admin real.
    Los endpoints de escritura continúan protegidos por
    get_current_admin.
    """

    demo_enabled = os.getenv(
        "ENABLE_DEMO_ACCOUNTS",
        "true",
    ).lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    if not demo_enabled:
        return

    changed = False

    for account in DEMO_ACCOUNTS:
        email = account["email"]

        user = db.scalar(
            select(User).where(
                User.email == email
            )
        )

        if user is None:
            user = User(
                first_name=account["first_name"],
                last_name=account["last_name"],
                email=email,
                password_hash=hash_password(
                    DEMO_PASSWORD
                ),
                email_verified=True,
                is_active=True,
                role=account["role"],
            )

            db.add(user)
            changed = True
            continue

        if user.first_name != account["first_name"]:
            user.first_name = account["first_name"]
            changed = True

        if user.last_name != account["last_name"]:
            user.last_name = account["last_name"]
            changed = True

        if not user.email_verified:
            user.email_verified = True
            changed = True

        if not user.is_active:
            user.is_active = True
            changed = True

        if user.role != account["role"]:
            user.role = account["role"]
            changed = True

        if not verify_password(
            DEMO_PASSWORD,
            user.password_hash,
        ):
            user.password_hash = hash_password(
                DEMO_PASSWORD
            )
            changed = True

    if changed:
        db.commit()
