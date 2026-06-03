"""Add CO2e factors, GNV/EV support, blend percentages and source attribution to technical_specs."""

from alembic import op
import sqlalchemy as sa

revision = "0005_technical_specs_co2e_audit"
down_revision = "0004_user_password_hash"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # New emission factors for GNV and electric
    op.add_column("technical_specs", sa.Column("emission_factor_gnv", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("emission_factor_eletrico_kwh", sa.Float(), nullable=False, server_default="0"))

    # CH4 factors per fuel type (kg CH4 / L or m³)
    op.add_column("technical_specs", sa.Column("ch4_factor_gasolina_c", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("ch4_factor_diesel_s10", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("ch4_factor_etanol", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("ch4_factor_gnv", sa.Float(), nullable=False, server_default="0"))

    # N2O factors per fuel type (kg N2O / L or m³)
    op.add_column("technical_specs", sa.Column("n2o_factor_gasolina_c", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("n2o_factor_diesel_s10", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("n2o_factor_etanol", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("n2o_factor_gnv", sa.Float(), nullable=False, server_default="0"))

    # GWP100 (IPCC AR6)
    op.add_column("technical_specs", sa.Column("gwp100_ch4", sa.Float(), nullable=False, server_default="27.9"))
    op.add_column("technical_specs", sa.Column("gwp100_n2o", sa.Float(), nullable=False, server_default="273.0"))

    # Biofuel blend percentages
    op.add_column("technical_specs", sa.Column("blend_etanol_pct", sa.Float(), nullable=False, server_default="0.27"))
    op.add_column("technical_specs", sa.Column("blend_biodiesel_pct", sa.Float(), nullable=False, server_default="0.14"))

    # Idle rates for GNV and electric
    op.add_column("technical_specs", sa.Column("idle_rate_gnv", sa.Float(), nullable=False, server_default="0"))
    op.add_column("technical_specs", sa.Column("idle_rate_eletrico", sa.Float(), nullable=False, server_default="0"))

    # Source attribution fields
    op.add_column("technical_specs", sa.Column("emission_factors_source", sa.String(), nullable=False, server_default=""))
    op.add_column("technical_specs", sa.Column("emission_factors_year", sa.Integer(), nullable=False, server_default="2023"))
    op.add_column("technical_specs", sa.Column("idle_rates_source", sa.String(), nullable=False, server_default=""))
    op.add_column("technical_specs", sa.Column("idle_rates_year", sa.Integer(), nullable=False, server_default="2015"))
    op.add_column("technical_specs", sa.Column("gwp100_source", sa.String(), nullable=False, server_default=""))
    op.add_column("technical_specs", sa.Column("blend_factors_source", sa.String(), nullable=False, server_default=""))
    op.add_column("technical_specs", sa.Column("blend_factors_year", sa.Integer(), nullable=False, server_default="2024"))
    op.add_column("technical_specs", sa.Column("paper_impact_source", sa.String(), nullable=False, server_default=""))
    op.add_column("technical_specs", sa.Column("grid_factor_source", sa.String(), nullable=False, server_default=""))


def downgrade() -> None:
    cols = [
        "emission_factor_gnv", "emission_factor_eletrico_kwh",
        "ch4_factor_gasolina_c", "ch4_factor_diesel_s10", "ch4_factor_etanol", "ch4_factor_gnv",
        "n2o_factor_gasolina_c", "n2o_factor_diesel_s10", "n2o_factor_etanol", "n2o_factor_gnv",
        "gwp100_ch4", "gwp100_n2o",
        "blend_etanol_pct", "blend_biodiesel_pct",
        "idle_rate_gnv", "idle_rate_eletrico",
        "emission_factors_source", "emission_factors_year",
        "idle_rates_source", "idle_rates_year",
        "gwp100_source", "blend_factors_source", "blend_factors_year",
        "paper_impact_source", "grid_factor_source",
    ]
    for col in cols:
        op.drop_column("technical_specs", col)
