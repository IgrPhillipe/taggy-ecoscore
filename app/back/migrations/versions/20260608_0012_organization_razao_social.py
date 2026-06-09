"""organization_razao_social

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-08
"""

import sqlalchemy as sa
from alembic import op

revision = "0012_organization_razao_social"
down_revision = "0011_accel_surge_source"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("razao_social", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "razao_social")
