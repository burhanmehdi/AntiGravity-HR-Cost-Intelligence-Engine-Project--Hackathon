from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, Table, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base
import datetime

# Association table for meetings and employees (many-to-many)
meeting_attendee = Table(
    "meeting_attendee",
    Base.metadata,
    Column("meeting_id", String, ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("employee_id", String, ForeignKey("employees.id", ondelete="CASCADE"), primary_key=True),
)

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)  # e.g., "proj_apollo"
    name = Column(String, nullable=False)
    description = Column(String)
    budget = Column(Float, default=0.0)

    attributions = relationship("MeetingAttribution", back_populates="project")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hourly_rate = Column(Float, nullable=False)

    meetings = relationship("Meeting", secondary=meeting_attendee, back_populates="attendees")

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_hours = Column(Float, nullable=False)
    cost = Column(Float, default=0.0)
    requires_human_review = Column(Boolean, default=False)
    is_reviewed = Column(Boolean, default=False)
    is_anomaly = Column(Boolean, default=False)
    z_score = Column(Float, default=0.0)

    attendees = relationship("Employee", secondary=meeting_attendee, back_populates="meetings")
    attributions = relationship("MeetingAttribution", back_populates="meeting", cascade="all, delete-orphan")

class MeetingAttribution(Base):
    __tablename__ = "meeting_attributions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    confidence_score = Column(Float, default=0.0)
    key_signals = Column(String)  # Comma-separated or JSON
    reasoning = Column(Text)
    attributed_by = Column(String, default="ai")  # "ai" or "human"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    meeting = relationship("Meeting", back_populates="attributions")
    project = relationship("Project", back_populates="attributions")
