"""Add FIPE/DETRAN enrichment fields to vehicles."""

from alembic import op
import sqlalchemy as sa

revision = "0007_vehicle_fipe_fields"
down_revision = "0006_elapsed_time_estimates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vehicles", sa.Column("uf_emplacamento", sa.String(), nullable=True))
    op.add_column("vehicles", sa.Column("ano_fabricacao", sa.Integer(), nullable=True))
    op.add_column("vehicles", sa.Column("ano_modelo", sa.Integer(), nullable=True))
    op.add_column("vehicles", sa.Column("fipe_valor", sa.Float(), nullable=True))
    op.add_column("vehicles", sa.Column("fipe_codigo", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("vehicles", "fipe_codigo")
    op.drop_column("vehicles", "fipe_valor")
    op.drop_column("vehicles", "ano_modelo")
    op.drop_column("vehicles", "ano_fabricacao")
    op.drop_column("vehicles", "uf_emplacamento")
