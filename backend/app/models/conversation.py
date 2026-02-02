"""
Conversation Models - Enhanced Chat System
Handles different types of conversations: incident-specific and team internal
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .common import MessageType
from enum import Enum

class ConversationType(str, Enum):
    INCIDENT_CHAT = "incident_chat"  # Employee <-> Security Team about specific incident
    TEAM_INTERNAL = "team_internal"  # Security Team internal communication
    DIRECT_MESSAGE = "direct_message"  # Direct 1-on-1 communication

class ConversationStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    RESOLVED = "resolved"

class ConversationParticipant(BaseModel):
    """Model for conversation participants"""
    user_id: str
    user_name: str
    user_role: str  # employee, security_team, admin
    joined_at: datetime
    is_active: bool = True
    last_read_at: Optional[datetime] = None

class ConversationCreate(BaseModel):
    """Model for creating new conversations"""
    conversation_type: ConversationType
    title: Optional[str] = None
    incident_id: Optional[str] = None  # Required for incident_chat type
    participants: List[str] = []  # User IDs
    is_private: bool = False
    metadata: Optional[Dict[str, Any]] = {}

class ConversationResponse(BaseModel):
    """Complete conversation response model"""
    id: str
    conversation_type: ConversationType
    title: Optional[str] = None
    incident_id: Optional[str] = None
    
    # Participants
    participants: List[ConversationParticipant] = []
    participant_count: int = 0
    
    # Status and metadata
    status: ConversationStatus = ConversationStatus.ACTIVE
    is_private: bool = False
    metadata: Dict[str, Any] = {}
    
    # Message tracking
    last_message_id: Optional[str] = None
    last_message_content: Optional[str] = None
    last_message_sender: Optional[str] = None
    last_message_time: Optional[datetime] = None
    total_messages: int = 0
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Security
    created_by: str
    archived_at: Optional[datetime] = None
    archived_by: Optional[str] = None

class ConversationUpdate(BaseModel):
    """Model for updating conversations"""
    title: Optional[str] = None
    status: Optional[ConversationStatus] = None
    is_private: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

class ConversationListResponse(BaseModel):
    """Response model for conversation lists"""
    conversations: List[ConversationResponse]
    total: int
    page: int = 1
    per_page: int = 20
    has_next: bool
    has_prev: bool

class ConversationSearch(BaseModel):
    """Model for conversation search parameters"""
    conversation_type: Optional[ConversationType] = None
    incident_id: Optional[str] = None
    participant_id: Optional[str] = None
    status: Optional[ConversationStatus] = None
    is_private: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = 1
    per_page: int = 20
    sort_by: str = "updated_at"
    sort_order: str = "desc"

class ConversationPermissions(BaseModel):
    """Model for conversation permissions"""
    conversation_id: str
    user_id: str
    can_read: bool = True
    can_write: bool = True
    can_invite: bool = False
    can_remove: bool = False
    can_archive: bool = False
    is_moderator: bool = False

class ConversationInvite(BaseModel):
    """Model for inviting users to conversations"""
    conversation_id: str
    user_ids: List[str]
    invited_by: str
    message: Optional[str] = None