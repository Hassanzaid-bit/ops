from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession, require_roles
from app.models import User, UserRole, VisitRecord
from app.schemas.job import VisitRecordRead

router = APIRouter(prefix="/records", tags=["records"])

ManagerUser = Annotated[User, Depends(require_roles(UserRole.manager, UserRole.admin))]


@router.get("", response_model=list[VisitRecordRead])
def list_records(
    db: DbSession,
    user: CurrentUser,
    site_id: str | None = None,
    from_date: Annotated[str | None, Query(alias="from", pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
    to_date: Annotated[str | None, Query(alias="to", pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
) -> list[VisitRecord]:
    query = select(VisitRecord)
    if user.role == UserRole.technician:
        query = query.where(VisitRecord.technician_name == user.name)
    if site_id:
        query = query.where(VisitRecord.site_id == site_id)
    if from_date:
        query = query.where(VisitRecord.date >= from_date)
    if to_date:
        query = query.where(VisitRecord.date <= to_date)
    query = query.order_by(VisitRecord.submitted_at.desc())
    return list(db.scalars(query).all())


@router.get("/{record_id}", response_model=VisitRecordRead)
def get_record(record_id: str, db: DbSession, user: CurrentUser) -> VisitRecord:
    record = db.get(VisitRecord, record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    if user.role == UserRole.technician and record.technician_name != user.name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your record")
    return record
