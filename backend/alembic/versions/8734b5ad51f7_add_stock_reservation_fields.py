"""add stock reservation fields

Revision ID: 8734b5ad51f7
Revises: 43f929a7f013
Create Date: 2026-09-07 20:44:46.487385
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8734b5ad51f7"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "43f929a7f013"

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
    """
    Agrega el sistema de reservas
    de inventario a los pedidos.
    """

    # ==========================================
    # 1. ESTADO DE RESERVA
    # ==========================================
    #
    # Para los pedidos NUEVOS:
    #
    # reserved
    #
    # será el valor por defecto.
    # ==========================================

    op.add_column(
        "orders",
        sa.Column(
            "stock_status",
            sa.String(length=20),
            server_default="reserved",
            nullable=False,
        ),
    )

    # ==========================================
    # 2. FECHA DE EXPIRACIÓN
    # ==========================================

    op.add_column(
        "orders",
        sa.Column(
            "stock_reserved_until",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
    )

    # ==========================================
    # 3. MARCAR PEDIDOS HISTÓRICOS
    # ==========================================
    #
    # Todos los pedidos que ya existían
    # antes de esta migración pasan a:
    #
    # legacy
    #
    # De esa manera no liberaremos ni
    # confirmaremos su stock automáticamente.
    # ==========================================

    op.execute(
        """
        UPDATE orders
        SET stock_status = 'legacy'
        """
    )

    # ==========================================
    # 4. ÍNDICE PARA RESERVAS
    # ==========================================

    op.create_index(
        "ix_orders_stock_reservation",
        "orders",
        [
            "stock_status",
            "stock_reserved_until",
        ],
        unique=False,
    )


def downgrade() -> None:
    """
    Elimina el sistema de reservas.
    """

    op.drop_index(
        "ix_orders_stock_reservation",
        table_name="orders",
    )

    op.drop_column(
        "orders",
        "stock_reserved_until",
    )

    op.drop_column(
        "orders",
        "stock_status",
    )