"""Add estimated elapsed time constants for tag passages to technical_specs."""

from alembic import op
import sqlalchemy as sa

revision = "0006_elapsed_time_estimates"
down_revision = "0005_technical_specs_co2e_audit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("technical_specs", sa.Column(
        "elapsed_pedagio_avg_sec", sa.Integer(), nullable=False, server_default="15"
    ))
    op.add_column("technical_specs", sa.Column(
        "elapsed_estacionamento_avg_sec", sa.Integer(), nullable=False, server_default="30"
    ))
    op.add_column("technical_specs", sa.Column(
        "elapsed_times_source", sa.String(), nullable=False,
        server_default="Premissa declarada — sem dado público disponível (Sem Parar/ConectCar não publicam tempo médio por passagem)"
    ))


def downgrade() -> None:
    op.drop_column("technical_specs", "elapsed_pedagio_avg_sec")
    op.drop_column("technical_specs", "elapsed_estacionamento_avg_sec")
    op.drop_column("technical_specs", "elapsed_times_source")
