from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmailOutbox(Base):
    __tablename__ = "email_outbox"

    __table_args__ = (
        Index(
            "ix_email_outbox_status_next_retry_at",
            "status",
            "next_retry_at",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    # Identificador único del evento.
    #
    # Ejemplos:
    # payment_approved:15
    # order_shipped:15
    # order_delivered:15
    #
    # Evita que el mismo correo se cree dos veces.
    event_key: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        index=True,
        nullable=False,
    )

    # Tipo de correo que debe enviarse.
    email_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    recipient_email: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
    )

    # Datos necesarios para renderizar
    # posteriormente la plantilla.
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )

    # pending:
    #   esperando envío
    #
    # processing:
    #   un worker lo está procesando
    #
    # sent:
    #   enviado correctamente
    #
    # failed:
    #   agotó sus reintentos
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        server_default="pending",
        nullable=False,
    )

    # Número de intentos realizados.
    attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    # Momento a partir del cual se puede
    # intentar enviar nuevamente.
    next_retry_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Momento en que un worker tomó
    # temporalmente este correo.
    processing_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Último error devuelto por Resend.
    last_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ID devuelto por el proveedor de correo.
    provider_message_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )