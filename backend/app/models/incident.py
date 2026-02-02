"""
Incident Models - Jayasanka's Module
Pydantic models for incident management and tracking
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from .common import IncidentType, IncidentSeverity, IncidentStatus

class IncidentLocation(BaseModel):
    """Model for incident location data"""
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = Field(None, max_length=500)
    building: Optional[str] = Field(None, max_length=100)
    floor: Optional[str] = Field(None, max_length=20)
    room: Optional[str] = Field(None, max_length=50)

class IncidentAttachment(BaseModel):
    """Model for incident file attachments"""
    file_id: str
    filename: str
    original_filename: str
    file_size: int
    file_type: str
    file_hash: str
    upload_timestamp: datetime
    uploader_id: str

class AIAnalysis(BaseModel):
    """Model for AI analysis results"""
    category: IncidentType
    confidence: float = Field(ge=0, le=1)
    severity: IncidentSeverity
    severity_confidence: float = Field(ge=0, le=1)
    mitigation_suggestions: List[str] = []
    analysis_timestamp: datetime

class IncidentBase(BaseModel):
    """Base incident model"""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    incident_type: Optional[IncidentType] = None
    severity: Optional[IncidentSeverity] = IncidentSeverity.LOW
    location: Optional[IncidentLocation] = None
    additional_context: Optional[Dict[str, Any]] = {}
    
    @field_validator('title', 'description', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '':
            return None
        return v

class IncidentCreate(IncidentBase):
    """Model for creating new incidents"""
    attachments: Optional[List[str]] = []  # File IDs

class IncidentUpdate(BaseModel):
    """Model for updating incidents"""
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    incident_type: Optional[IncidentType] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    assigned_to: Optional[str] = None
    location: Optional[IncidentLocation] = None
    additional_context: Optional[Dict[str, Any]] = {}

class IncidentResponse(BaseModel):
    """Complete incident response model"""
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    incident_type: Optional[IncidentType] = None
    severity: IncidentSeverity
    status: IncidentStatus
    location: Optional[IncidentLocation] = None
    
    # Reporter information
    reporter_id: str
    reporter_name: str
    reporter_email: str
    reporter_department: Optional[str] = None
    
    # Assignment information
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
    assigned_by: Optional[str] = None
    
    # AI Analysis
    ai_analysis: Optional[Dict[str, Any]] = None
    
    # Attachments
    attachments: List[IncidentAttachment] = []
    
    # Timeline
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    closed_at: Optional[datetime] = None
    
    # Additional context
    additional_context: Dict[str, Any] = {}
    
    # Tracking
    last_activity: datetime
    priority_score: Optional[float] = None

class IncidentListResponse(BaseModel):
    """Response model for incident lists"""
    incidents: List[IncidentResponse]
    total: int
    page: int = 1
    per_page: int = 20
    total_pages: int
    has_next: bool
    has_prev: bool

class IncidentStats(BaseModel):
    """Incident statistics model"""
    total_incidents: int
    open_incidents: int
    
    # By status
    pending: int
    investigating: int
    resolved: int
    closed: int
    
    # By severity
    critical: int
    high: int
    medium: int
    low: int
    
    # By type
    by_type: Dict[str, int]
    
    # By department
    by_department: Dict[str, int]
    
    # Response times
    avg_response_time_hours: Optional[float] = None
    avg_resolution_time_hours: Optional[float] = None
    
    # Time period
    period_start: datetime
    period_end: datetime

class IncidentAssignment(BaseModel):
    """Model for incident assignment"""
    incident_id: str
    assigned_to: str
    assigned_by: str
    assignment_reason: Optional[str] = None

class IncidentStatusUpdate(BaseModel):
    """Model for status updates"""
    incident_id: str
    status: IncidentStatus
    update_reason: Optional[str] = None
    internal_notes: Optional[str] = None

class IncidentSearch(BaseModel):
    """Model for incident search parameters"""
    query: Optional[str] = None
    status: Optional[IncidentStatus] = None
    severity: Optional[IncidentSeverity] = None
    incident_type: Optional[IncidentType] = None
    assigned_to: Optional[str] = None
    reporter_id: Optional[str] = None
    department: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = 1
    per_page: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"