import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    technician = "technician"
    manager = "manager"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    assigned_jobs: Mapped[list["Job"]] = relationship(back_populates="technician")


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sites: Mapped[list["Site"]] = relationship(back_populates="client")


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    areas: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    client: Mapped[Client] = relationship(back_populates="sites")
    jobs: Mapped[list["Job"]] = relationship(back_populates="site")


class VisitType(str, enum.Enum):
    full_inspection = "full_inspection"
    follow_up = "follow_up"


class JobStatus(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    submitted = "submitted"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    site_id: Mapped[str] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), index=True)
    technician_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    technician_name: Mapped[str] = mapped_column(String(255))
    visit_type: Mapped[VisitType] = mapped_column(Enum(VisitType, name="visit_type"))
    date: Mapped[str] = mapped_column(String(10), index=True)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus, name="job_status"), index=True)
    time_window: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)
    follow_up_areas: Mapped[list | None] = mapped_column(JSONB)
    parent_visit_id: Mapped[str | None] = mapped_column(String(36))
    draft: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    site: Mapped[Site] = relationship(back_populates="jobs")
    technician: Mapped[User | None] = relationship(back_populates="assigned_jobs")
    visit_record: Mapped["VisitRecord | None"] = relationship(back_populates="job", uselist=False)
    photos: Mapped[list["Photo"]] = relationship(back_populates="job")


class VisitRecord(Base):
    __tablename__ = "visit_records"
    __table_args__ = (UniqueConstraint("submit_id", name="uq_visit_records_submit_id"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, index=True)
    site_id: Mapped[str] = mapped_column(String(36), index=True)
    client_name: Mapped[str] = mapped_column(String(255))
    site_name: Mapped[str] = mapped_column(String(255))
    visit_type: Mapped[VisitType] = mapped_column(Enum(VisitType, name="visit_type", create_type=False))
    technician_name: Mapped[str] = mapped_column(String(255))
    date: Mapped[str] = mapped_column(String(10), index=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    areas: Mapped[list] = mapped_column(JSONB)
    report_text: Mapped[str] = mapped_column(Text)
    submit_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    job: Mapped[Job] = relationship(back_populates="visit_record")
    issues: Mapped[list["Issue"]] = relationship(back_populates="visit_record")


class PhotoStatus(str, enum.Enum):
    pending = "pending"
    uploaded = "uploaded"


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    area: Mapped[str | None] = mapped_column(String(255))
    point_id: Mapped[str | None] = mapped_column(String(64))
    storage_key: Mapped[str] = mapped_column(String(512))
    content_type: Mapped[str] = mapped_column(String(128), default="image/jpeg")
    status: Mapped[PhotoStatus] = mapped_column(Enum(PhotoStatus, name="photo_status"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    job: Mapped[Job] = relationship(back_populates="photos")


class IssueStatus(str, enum.Enum):
    identified = "identified"
    reviewed = "reviewed"
    assigned = "assigned"
    in_progress = "in_progress"
    follow_up_required = "follow_up_required"
    completed = "completed"
    verified = "verified"
    closed = "closed"


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    visit_record_id: Mapped[str] = mapped_column(
        ForeignKey("visit_records.id", ondelete="CASCADE"), index=True
    )
    area: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(32), default="normal", index=True)
    status: Mapped[IssueStatus] = mapped_column(Enum(IssueStatus, name="issue_status"), index=True)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    due_date: Mapped[str | None] = mapped_column(String(10))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    visit_record: Mapped[VisitRecord] = relationship(back_populates="issues")
    assignee: Mapped[User | None] = relationship()
