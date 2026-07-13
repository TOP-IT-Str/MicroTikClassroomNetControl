"""Add device statistics history

Revision ID: 20260713_0008
Revises: 20260626_0007
Create Date: 2026-07-13
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260713_0008"
down_revision: str | None = "20260626_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "device_statistics_state",
        sa.Column("device_id", sa.Integer(), nullable=False),
        sa.Column("online", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("wan_state", sa.String(length=16), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "wan_state IN ('allowed', 'blocked', 'protected')",
            name="ck_device_statistics_state_wan_state",
        ),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("device_id"),
    )

    op.create_table(
        "device_statistics_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.Integer(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("online", sa.Boolean(), nullable=False),
        sa.Column("wan_state", sa.String(length=16), nullable=False),
        sa.CheckConstraint(
            "wan_state IN ('allowed', 'blocked', 'protected')",
            name="ck_device_statistics_events_wan_state",
        ),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_device_statistics_events_device_occurred",
        "device_statistics_events",
        ["device_id", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_device_statistics_events_device_occurred",
        table_name="device_statistics_events",
    )
    op.drop_table("device_statistics_events")
    op.drop_table("device_statistics_state")
