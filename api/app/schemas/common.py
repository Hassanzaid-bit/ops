from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    technician = "technician"
    manager = "manager"
    admin = "admin"


class VisitType(str, Enum):
    full_inspection = "full_inspection"
    follow_up = "follow_up"


class JobStatus(str, Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    submitted = "submitted"


class IssueStatus(str, Enum):
    identified = "identified"
    reviewed = "reviewed"
    assigned = "assigned"
    in_progress = "in_progress"
    follow_up_required = "follow_up_required"
    completed = "completed"
    verified = "verified"
    closed = "closed"


class ThresholdLevel(str, Enum):
    none = "none"
    light = "light"
    moderate = "moderate"
    heavy = "heavy"


class PestTypeId(str, Enum):
    cockroach_german = "cockroach_german"
    cockroach_american = "cockroach_american"
    rodent = "rodent"
    fly = "fly"
    ant = "ant"
    other = "other"


class ActionTier(str, Enum):
    monitor = "monitor"
    exclusion_sanitation = "exclusion_sanitation"
    targeted_treatment = "targeted_treatment"
    escalation = "escalation"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    name: str
    role: UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginResponse(TokenResponse):
    user: UserPublic


class RefreshRequest(BaseModel):
    refresh_token: str


class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    environment: str
    timestamp: datetime
