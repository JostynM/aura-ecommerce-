"""add mercado pago identifiers to orders

Revision ID: 6039038e699e
Revises: b672dcc40e1f
Create Date: 2026-09-25 22:33:02.522634
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6039038e699e"
down_revision: Union[str, Sequence[str], None] = "b672dcc40e1f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column(
            "payment_idempotency_key",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "orders",
        sa.Column(
            "mercado_pago_order_id",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "orders",
        sa.Column(
            "mercado_pago_payment_id",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_orders_payment_idempotency_key",
        "orders",
        ["payment_idempotency_key"],
        unique=True,
    )

    op.create_index(
        "ix_orders_mercado_pago_order_id",
        "orders",
        ["mercado_pago_order_id"],
        unique=True,
    )

    op.create_index(
        "ix_orders_mercado_pago_payment_id",
        "orders",
        ["mercado_pago_payment_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_orders_mercado_pago_payment_id",
        table_name="orders",
    )

    op.drop_index(
        "ix_orders_mercado_pago_order_id",
        table_name="orders",
    )

    op.drop_index(
        "ix_orders_payment_idempotency_key",
        table_name="orders",
    )

    op.drop_column(
        "orders",
        "mercado_pago_payment_id",
    )

    op.drop_column(
        "orders",
        "mercado_pago_order_id",
    )

    op.drop_column(
        "orders",
        "payment_idempotency_key",
    )