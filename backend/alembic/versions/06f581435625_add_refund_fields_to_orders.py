"""add refund fields to orders

Revision ID: 06f581435625
Revises: 1cea607489b5
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "06f581435625"
down_revision: Union[str, Sequence[str], None] = "1cea607489b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column(
            "refund_idempotency_key",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "orders",
        sa.Column(
            "mercado_pago_refund_id",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "orders",
        sa.Column(
            "refunded_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_orders_refund_idempotency_key",
        "orders",
        ["refund_idempotency_key"],
        unique=True,
    )

    op.create_index(
        "ix_orders_mercado_pago_refund_id",
        "orders",
        ["mercado_pago_refund_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_orders_mercado_pago_refund_id",
        table_name="orders",
    )

    op.drop_index(
        "ix_orders_refund_idempotency_key",
        table_name="orders",
    )

    op.drop_column(
        "orders",
        "refunded_at",
    )

    op.drop_column(
        "orders",
        "mercado_pago_refund_id",
    )

    op.drop_column(
        "orders",
        "refund_idempotency_key",
    )