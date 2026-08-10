from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession, require_roles
from app.models import Job, JobStatus, Site, User, UserRole, VisitRecord
from app.models import VisitType as DbVisitType
from app.schemas.job import JobCreate, JobDraftUpdate, JobRead, JobSubmitRequest, VisitRecordRead

router = APIRouter(prefix="/jobs", tags=["jobs"])

ManagerUser = Annotated[User, Depends(require_roles(UserRole.manager, UserRole.admin))]


@router.get("/mine", response_model=list[JobRead])
def list_my_jobs(
    db: DbSession,
    user: CurrentUser,
    date: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
) -> list[Job]:
    query = select(Job).where(Job.technician_id == user.id)
    if date:
        query = query.where(Job.date == date)
    query = query.order_by(Job.date.desc(), Job.time_window.asc())
    return list(db.scalars(query).all())


@router.get("", response_model=list[JobRead])
def list_jobs(
    db: DbSession,
    _: ManagerUser,
    date: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
) -> list[Job]:
    query = select(Job)
    if date:
        query = query.where(Job.date == date)
    query = query.order_by(Job.date.desc())
    return list(db.scalars(query).all())


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(payload: JobCreate, db: DbSession, _: ManagerUser) -> Job:
    site = db.get(Site, payload.site_id)
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    job = Job(
        id=f"visit-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
        site_id=payload.site_id,
        technician_id=payload.technician_id,
        technician_name=payload.technician_name,
        visit_type=DbVisitType(payload.visit_type.value),
        date=payload.date,
        status=JobStatus.scheduled,
        time_window=payload.time_window,
        notes=payload.notes,
        follow_up_areas=payload.follow_up_areas,
        parent_visit_id=payload.parent_visit_id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: str, db: DbSession, user: CurrentUser) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if user.role == UserRole.technician and job.technician_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your job")
    return job


@router.put("/{job_id}/draft", response_model=JobRead)
def update_draft(job_id: str, payload: JobDraftUpdate, db: DbSession, user: CurrentUser) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if user.role == UserRole.technician and job.technician_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your job")
    if job.status == JobStatus.submitted:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job already submitted")

    job.draft = payload.draft
    job.status = JobStatus.in_progress
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/submit", response_model=VisitRecordRead, status_code=status.HTTP_201_CREATED)
def submit_job(job_id: str, payload: JobSubmitRequest, db: DbSession, user: CurrentUser) -> VisitRecord:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if user.role == UserRole.technician and job.technician_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your job")

    existing = db.scalar(select(VisitRecord).where(VisitRecord.submit_id == payload.submit_id))
    if existing:
        return existing

    if db.scalar(select(VisitRecord).where(VisitRecord.job_id == job.id)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job already submitted")

    site = db.get(Site, job.site_id)
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    client = site.client
    submitted_at = datetime.now(UTC)
    record = VisitRecord(
        id=f"rec-{job.id}-{submitted_at.date().isoformat()}",
        job_id=job.id,
        site_id=site.id,
        client_name=client.name,
        site_name=site.name,
        visit_type=job.visit_type,
        technician_name=job.technician_name,
        date=job.date,
        submitted_at=submitted_at,
        areas=payload.areas,
        report_text=payload.report_text,
        submit_id=payload.submit_id,
    )
    job.status = JobStatus.submitted
    job.draft = None
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
