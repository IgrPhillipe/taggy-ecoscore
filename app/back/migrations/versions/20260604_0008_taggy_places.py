"""Add taggy_toll_places and taggy_parking_places tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0008_taggy_places"
down_revision = "0007_vehicle_fipe_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "taggy_toll_places",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("plaza_short_name", sa.String(), nullable=False, server_default=""),
        sa.Column("company_short_name", sa.String(), nullable=False, server_default=""),
        sa.Column("vicinity", sa.String(), nullable=False, server_default=""),
        sa.Column("city", sa.String(), nullable=False, server_default=""),
        sa.Column("state", sa.String(), nullable=False, server_default=""),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("payment_by_plate", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("raw_json", JSONB(), nullable=False, server_default="{}"),
        sa.Column("synced_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_taggy_toll_places_state", "taggy_toll_places", ["state"])
    op.create_index("ix_taggy_toll_places_lat_lng", "taggy_toll_places", ["latitude", "longitude"])

    op.create_table(
        "taggy_parking_places",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("plaza_short_name", sa.String(), nullable=False, server_default=""),
        sa.Column("company_short_name", sa.String(), nullable=False, server_default=""),
        sa.Column("vicinity", sa.String(), nullable=False, server_default=""),
        sa.Column("city", sa.String(), nullable=False, server_default=""),
        sa.Column("state", sa.String(), nullable=False, server_default=""),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("payment_by_plate", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("raw_json", JSONB(), nullable=False, server_default="{}"),
        sa.Column("synced_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_taggy_parking_places_state", "taggy_parking_places", ["state"])
    op.create_index("ix_taggy_parking_places_lat_lng", "taggy_parking_places", ["latitude", "longitude"])


def downgrade() -> None:
    op.drop_index("ix_taggy_parking_places_lat_lng", "taggy_parking_places")
    op.drop_index("ix_taggy_parking_places_state", "taggy_parking_places")
    op.drop_table("taggy_parking_places")
    op.drop_index("ix_taggy_toll_places_lat_lng", "taggy_toll_places")
    op.drop_index("ix_taggy_toll_places_state", "taggy_toll_places")
    op.drop_table("taggy_toll_places")
