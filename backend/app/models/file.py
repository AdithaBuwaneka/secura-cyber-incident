from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class FileUploadResponse(BaseModel):
    success: bool
    file_id: Optional[str] = None
    url: Optional[str] = None
    name: Optional[str] = None
    error: Optional[str] = None

class FileMetadata(BaseModel):
    file_id: str
    original_name: str
    file_name: str
    file_size: int
    content_type: str
    url: str
    uploaded_by: str
    uploaded_at: datetime
    incident_id: Optional[str] = None

class FileAttachment(BaseModel):
    id: str
    incident_id: str
    filename: str
    content_type: str
    size: int
    imagekit_file_id: str
    imagekit_url: str
    imagekit_thumbnail_url: Optional[str] = None
    uploader_id: str
    created_at: datetime
    is_scanned: bool = False
    scan_result: Optional[str] = None
    scanned_at: Optional[datetime] = None

class UploadTokenResponse(BaseModel):
    signature: str
    expire: int
    token: str