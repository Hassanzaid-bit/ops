from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import JobStatus, VisitType


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    site_id: str
    technician_id: str | None
    technician_name: str
    visit_type: VisitType
    date: str
    status: JobStatus
    time_window: str | None = None
    notes: str | None = None
    follow_up_areas: list[str] | None = None
    parent_visit_id: str | None = None


class JobCreate(BaseModel):
    site_id: str
    technician_id: str | None = None
    technician_name: str = Field(min_length=1, max_length=255)
    visit_type: VisitType = VisitType.full_inspection
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time_window: str | None = None
    notes: str | None = None
    follow_up_areas: list[str] | None = None
    parent_visit_id: str | None = None


class JobDraftUpdate(BaseModel):
    draft: dict


class JobSubmitRequest(BaseModel):
    submit_id: str = Field(min_length=8, max_length=64)
    areas: list[dict]
    report_text: str = Field(min_length=1)


class VisitRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    site_id: str
    client_name: str
    site_name: str
    visit_type: VisitType
    technician_name: str
    date: str
    submitted_at: datetime
    areas: list[dict]
    report_text: str
