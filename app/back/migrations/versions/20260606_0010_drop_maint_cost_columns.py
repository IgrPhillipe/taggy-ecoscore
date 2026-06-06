"""Drop unused maintenance cost columns from technical_specs."""

from alembic import op
import sqlalchemy as sa

revision = "0010_drop_maint_cost_columns"
down_revision = "0009_drop_removed_ludic_columns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("technical_specs", "maint_cost_leve")
    op.drop_column("technical_specs", "maint_cost_pesado")


def downgrade() -> None:
    op.add_column(
        "technical_specs",
        sa.Column("maint_cost_pesado", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "technical_specs",
        sa.Column("maint_cost_leve", sa.Float(), nullable=False, server_default="0"),
    )
