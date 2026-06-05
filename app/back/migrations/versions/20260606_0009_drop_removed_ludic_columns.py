"""Drop removed ludic metaphor columns from technical_specs."""

from alembic import op
import sqlalchemy as sa

revision = "0009_drop_removed_ludic_columns"
down_revision = "0008_taggy_places"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("technical_specs", "ludic_phone_charge_factor")
    op.drop_column("technical_specs", "ludic_coffee_factor")
    op.drop_column("technical_specs", "benchmark_kg_co2_per_km_car")
    op.drop_column("technical_specs", "benchmark_kg_co2_per_burger")


def downgrade() -> None:
    op.add_column("technical_specs", sa.Column("benchmark_kg_co2_per_burger", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("benchmark_kg_co2_per_km_car", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("ludic_coffee_factor", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("ludic_phone_charge_factor", sa.Float(), nullable=False, server_default="0"))
