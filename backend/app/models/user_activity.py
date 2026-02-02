from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class ActivityType(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    HEARTBEAT = "heartbeat"
    API_CALL = "api_call"

class UserActivity(BaseModel):
    id: Optional[str] = None
    user_id: str
    activity_type: ActivityType
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None

class UserStatus(BaseModel):
    user_id: str
    is_online: bool
    last_activity: datetime
    last_login: Optional[datetime] = None
    last_logout: Optional[datetime] = None
    session_duration: Optional[int] = None  # in minutes

class OnlineStatusResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str
    is_online: bool
    last_activity: datetime
    last_login: Optional[datetime] = None

class TeamStatusResponse(BaseModel):
    total_members: int
    online_members: int
    members: list[OnlineStatusResponse]