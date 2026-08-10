"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-08-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role = sa.Enum("technician", "manager", "admin", name="user_role")
    visit_type = sa.Enum("full_inspection", "follow_up", name="visit_type")
    job_status = sa.Enum("scheduled", "in_progress", "submitted", name="job_status")
    photo_status = sa.Enum("pending", "uploaded", name="photo_status")
    issue_status = sa.Enum(
        "identified",
        "reviewed",
        "assigned",
        "in_progress",
        "follow_up_required",
        "completed",
        "verified",
        "closed",
        name="issue_status",
    )

    user_role.create(op.get_bind(), checkfirst=True)
    visit_type.create(op.get_bind(), checkfirst=True)
    job_status.create(op.get_bind(), checkfirst=True)
    photo_status.create(op.get_bind(), checkfirst=True)
    issue_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "clients",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_clients_name"), "clients", ["name"], unique=True)

    op.create_table(
        "sites",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("client_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("areas", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sites_client_id"), "sites", ["client_id"], unique=False)

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("site_id", sa.String(length=36), nullable=False),
        sa.Column("technician_id", sa.String(length=36), nullable=True),
        sa.Column("technician_name", sa.String(length=255), nullable=False),
        sa.Column("visit_type", visit_type, nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("status", job_status, nullable=False),
        sa.Column("time_window", sa.String(length=64), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("follow_up_areas", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("parent_visit_id", sa.String(length=36), nullable=True),
        sa.Column("draft", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["technician_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_jobs_date"), "jobs", ["date"], unique=False)
    op.create_index(op.f("ix_jobs_site_id"), "jobs", ["site_id"], unique=False)
    op.create_index(op.f("ix_jobs_status"), "jobs", ["status"], unique=False)
    op.create_index(op.f("ix_jobs_technician_id"), "jobs", ["technician_id"], unique=False)

    op.create_table(
        "visit_records",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("site_id", sa.String(length=36), nullable=False),
        sa.Column("client_name", sa.String(length=255), nullable=False),
        sa.Column("site_name", sa.String(length=255), nullable=False),
        sa.Column("visit_type", visit_type, nullable=False),
        sa.Column("technician_name", sa.String(length=255), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("areas", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("report_text", sa.Text(), nullable=False),
        sa.Column("submit_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id"),
        sa.UniqueConstraint("submit_id", name="uq_visit_records_submit_id"),
    )
    op.create_index(op.f("ix_visit_records_date"), "visit_records", ["date"], unique=False)
    op.create_index(op.f("ix_visit_records_job_id"), "visit_records", ["job_id"], unique=False)
    op.create_index(op.f("ix_visit_records_site_id"), "visit_records", ["site_id"], unique=False)
    op.create_index(op.f("ix_visit_records_submit_id"), "visit_records", ["submit_id"], unique=False)
    op.create_index(op.f("ix_visit_records_submitted_at"), "visit_records", ["submitted_at"], unique=False)

    op.create_table(
        "photos",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("area", sa.String(length=255), nullable=True),
        sa.Column("point_id", sa.String(length=64), nullable=True),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("status", photo_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_photos_job_id"), "photos", ["job_id"], unique=False)

    op.create_table(
        "issues",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("visit_record_id", sa.String(length=64), nullable=False),
        sa.Column("area", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("priority", sa.String(length=32), nullable=False),
        sa.Column("status", issue_status, nullable=False),
        sa.Column("assignee_id", sa.String(length=36), nullable=True),
        sa.Column("due_date", sa.String(length=10), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assignee_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["visit_record_id"], ["visit_records.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_issues_assignee_id"), "issues", ["assignee_id"], unique=False)
    op.create_index(op.f("ix_issues_priority"), "issues", ["priority"], unique=False)
    op.create_index(op.f("ix_issues_status"), "issues", ["status"], unique=False)
    op.create_index(op.f("ix_issues_visit_record_id"), "issues", ["visit_record_id"], unique=False)


def downgrade() -> None:
    op.drop_table("issues")
    op.drop_table("photos")
    op.drop_table("visit_records")
    op.drop_table("jobs")
    op.drop_table("sites")
    op.drop_table("clients")
    op.drop_table("users")

    sa.Enum(name="issue_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="photo_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="job_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="visit_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
