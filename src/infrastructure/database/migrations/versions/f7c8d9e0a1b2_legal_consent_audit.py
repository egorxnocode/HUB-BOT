"""legal consent audit

Revision ID: f7c8d9e0a1b2
Revises: e1a2b3c4d5f6
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "f7c8d9e0a1b2"
down_revision = "e1a2b3c4d5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("rules_accepted_at", sa.DateTime(timezone=True)))
    op.add_column("users", sa.Column("rules_accepted_version", sa.String(length=32)))


def downgrade() -> None:
    op.drop_column("users", "rules_accepted_version")
    op.drop_column("users", "rules_accepted_at")
