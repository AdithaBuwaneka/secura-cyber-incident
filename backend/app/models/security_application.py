"""
Security Team Application Models
Handles applications for security team membership
"""

from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime
from enum import Enum

class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ApplicationFile(BaseModel):
    """Model for uploaded application files"""
    file_id: str
    file_url: str
    file_name: str
    original_filename: str
    file_size: int
    upload_date: Optional[datetime] = None

class SecurityTeamApplication(BaseModel):
    """Model for security team application"""
    id: Optional[str] = None
    applicant_uid: str
    applicant_name: Optional[str] = None  # Full name of applicant
    reason: str
    experience: str
    certifications: Optional[str] = None
    proof_documents: List[Union[ApplicationFile, str]] = []  # Support both formats
    status: ApplicationStatus = ApplicationStatus.PENDING
    admin_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None  # Admin UID

class ApplicationCreate(BaseModel):
    """Model for creating new application"""
    reason: str
    experience: str
    certifications: Optional[str] = None
    proof_documents: List[Union[ApplicationFile, str]] = []

class ApplicationReview(BaseModel):
    """Model for admin reviewing application"""
    status: ApplicationStatus
    admin_notes: Optional[str] = None

class ApplicationResponse(BaseModel):
    """Response model for application operations"""
    message: str
    application_id: Optional[str] = None
    status: str = "success"