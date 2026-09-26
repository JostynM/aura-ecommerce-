"""add performance indexes

Revision ID: b672dcc40e1f
Revises: daff621b57c7
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b672dcc40e1f"
down_revision: Union[str, None] = "daff621b57c7"

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:

    # ==========================================
    # PEDIDOS POR USUARIO
    #
    # Optimiza consultas como:
    #
    # WHERE user_id = ?
    # ORDER BY id DESC
    # ==========================================

    op.create_index(
        "ix_orders_user_id_id",
        "orders",
        [
            "user_id",
            "id",
        ],
        unique=False,
    )


    # ==========================================
    # ESTADO DEL PEDIDO
    #
    # Optimiza filtros:
    #
    # pending
    # confirmed
    # processing
    # shipped
    # delivered
    # cancelled
    # ==========================================

    op.create_index(
        "ix_orders_status",
        "orders",
        [
            "status",
        ],
        unique=False,
    )


    # ==========================================
    # ESTADO DEL PAGO
    #
    # Optimiza filtros:
    #
    # pending
    # paid
    # failed
    # refunded
    # ==========================================

    op.create_index(
        "ix_orders_payment_status",
        "orders",
        [
            "payment_status",
        ],
        unique=False,
    )


    # ==========================================
    # RESERVAS DE STOCK
    #
    # Optimiza consultas que buscan pedidos:
    #
    # stock_status = reserved
    #
    # y cuya reserva ya venció.
    # ==========================================

    op.create_index(
        "ix_orders_stock_status_reserved_until",
        "orders",
        [
            "stock_status",
            "stock_reserved_until",
        ],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        "ix_orders_stock_status_reserved_until",
        table_name="orders",
    )

    op.drop_index(
        "ix_orders_payment_status",
        table_name="orders",
    )

    op.drop_index(
        "ix_orders_status",
        table_name="orders",
    )

    op.drop_index(
        "ix_orders_user_id_id",
        table_name="orders",
    )