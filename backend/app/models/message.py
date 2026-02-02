"""
Message Models - Jayasanka's Module
Pydantic models for secure messaging and communication
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .common import MessageType

class MessageAttachment(BaseModel):
    """Model for message file attachments"""
    file_id: str
    filename: str
    file_size: int
    file_type: str
    file_url: str

class MessageCreate(BaseModel):
    """Model for creating new messages"""
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: MessageType = MessageType.TEXT
    attachments: Optional[List[str]] = []  # File IDs
    reply_to: Optional[str] = None  # Reply to message ID
    priority: Optional[str] = Field("normal", pattern="^(low|normal|high|urgent)$")

class MessageUpdate(BaseModel):
    """Model for updating messages"""
    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    is_read: Optional[bool] = None

class MessageResponse(BaseModel):
    """Message response model"""
    id: str
    incident_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    content: str
    message_type: MessageType
    attachments: List[MessageAttachment] = []
    
    # Thread/Reply support
    reply_to: Optional[str] = None
    reply_to_content: Optional[str] = None
    
    # Security and encryption
    is_encrypted: bool = True
    encryption_method: str = "AES-256"
    
    # Read status
    is_read: bool = False
    read_by: List[str] = []  # User IDs who read the message
    read_receipts: Dict[str, datetime] = {}  # User ID -> read timestamp
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    edited_at: Optional[datetime] = None
    
    # Priority and delivery
    priority: str = "normal"
    delivery_status: str = "delivered"
    
    # Internal tracking
    message_hash: Optional[str] = None  # For integrity verification

class Message(BaseModel):
    """Internal message model for processing"""
    id: str
    incident_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    content: str
    message_type: MessageType
    attachments: List[MessageAttachment] = []
    
    # Encryption
    encrypted_content: Optional[str] = None
    encryption_key_id: Optional[str] = None
    is_encrypted: bool = True
    
    # Threading
    reply_to: Optional[str] = None
    thread_id: Optional[str] = None
    
    # Read tracking
    is_read: bool = False
    read_by: List[str] = []
    read_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    
    # Priority and metadata
    priority: str = "normal"
    metadata: Dict[str, Any] = {}
    
    # System messages
    is_system_message: bool = False
    system_event_type: Optional[str] = None

class MessageListResponse(BaseModel):
    """Response model for message lists"""
    messages: List[MessageResponse]
    total: int
    incident_id: str
    page: int = 1
    per_page: int = 50
    has_next: bool
    has_prev: bool
    unread_count: int

class MessageThread(BaseModel):
    """Model for message thread"""
    thread_id: str
    incident_id: str
    root_message_id: str
    messages: List[MessageResponse]
    participant_count: int
    last_activity: datetime
    is_active: bool = True

class MessageSearch(BaseModel):
    """Model for message search parameters"""
    incident_id: str
    query: Optional[str] = None
    sender_id: Optional[str] = None
    message_type: Optional[MessageType] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    is_read: Optional[bool] = None
    priority: Optional[str] = None
    page: int = 1
    per_page: int = 50

class MessageDelivery(BaseModel):
    """Model for message delivery tracking"""
    message_id: str
    recipient_id: str
    delivery_status: str  # sent, delivered, read, failed
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_message: Optional[str] = None

class SystemMessage(BaseModel):
    """Model for system-generated messages"""
    incident_id: str
    event_type: str  # incident_created, status_changed, assigned, etc.
    event_data: Dict[str, Any]
    auto_generated: bool = True
    visible_to_roles: List[str] = ["security_team", "admin"]

class MessageEncryption(BaseModel):
    """Model for message encryption metadata"""
    message_id: str
    encryption_method: str = "AES-256"
    key_id: str
    encrypted_at: datetime
    encryption_version: str = "1.0"