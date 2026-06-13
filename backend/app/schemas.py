from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Schema for OpenAI Structured Output
class AIProjectAttribution(BaseModel):
    project_id: str = Field(description="The unique identifier (slug) of the project this meeting is attributed to.")
    confidence_score: float = Field(description="A confidence score between 0.0 and 1.0 indicating AI confidence.")
    key_signals: List[str] = Field(description="Key words or phrases from the meeting details that match the project.")
    reasoning: str = Field(description="Logical reasoning explaining the choice of attribution.")

# Database communication schemas
class ProjectBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    budget: float = 0.0

    class Config:
        from_attributes = True

class ProjectResponse(ProjectBase):
    pass

class EmployeeBase(BaseModel):
    id: str
    name: str
    email: str
    hourly_rate: float

    class Config:
        from_attributes = True

class EmployeeResponse(EmployeeBase):
    pass

class MeetingAttributionResponse(BaseModel):
    id: int
    meeting_id: str
    project_id: Optional[str]
    confidence_score: float
    key_signals: str  # Comma separated
    reasoning: Optional[str]
    attributed_by: str
    timestamp: datetime

    class Config:
        from_attributes = True

class MeetingBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_hours: float
    cost: float = 0.0
    requires_human_review: bool = False
    is_reviewed: bool = False
    is_anomaly: bool = False
    z_score: float = 0.0

    class Config:
        from_attributes = True

class MeetingResponse(MeetingBase):
    attendees: List[EmployeeResponse] = []
    attributions: List[MeetingAttributionResponse] = []

class SyncResponse(BaseModel):
    events: List[MeetingResponse]
    nextSyncToken: str

class ReviewRequest(BaseModel):
    project_id: str
    reasoning: Optional[str] = None

class RateUpdateRequest(BaseModel):
    hourly_rate: float
