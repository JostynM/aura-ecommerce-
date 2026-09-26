"""create email outbox

Revision ID: 1cea607489b5
Revises: 6039038e699e
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "1cea607489b5"
down_revision: Union[str, Sequence[str], None] = "6039038e699e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_outbox",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "event_key",
            sa.String(length=150),
            nullable=False,
        ),

        sa.Column(
            "email_type",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "recipient_email",
            sa.String(length=320),
            nullable=False,
        ),

        sa.Column(
            "payload",
            postgresql.JSONB(
                astext_type=sa.Text()
            ),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=20),
            server_default="pending",
            nullable=False,
        ),

        sa.Column(
            "attempts",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),

        sa.Column(
            "next_retry_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "processing_started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "last_error",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "provider_message_id",
            sa.String(length=150),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),

        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_email_outbox_event_key",
        "email_outbox",
        ["event_key"],
        unique=True,
    )

    op.create_index(
        "ix_email_outbox_status_next_retry_at",
        "email_outbox",
        [
            "status",
            "next_retry_at",
        ],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_email_outbox_status_next_retry_at",
        table_name="email_outbox",
    )

    op.drop_index(
        "ix_email_outbox_event_key",
        table_name="email_outbox",
    )

    op.drop_table(
        "email_outbox"
    )