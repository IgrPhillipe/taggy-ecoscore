"""Add accel_surge_source for auditability."""

import sqlalchemy as sa
from alembic import op

revision = "0011_accel_surge_source"
down_revision = "0010_drop_maint_cost_columns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "technical_specs",
        sa.Column("accel_surge_source", sa.String(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("technical_specs", "accel_surge_source")
