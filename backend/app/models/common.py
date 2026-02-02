from enum import Enum
from pydantic import BaseModel
from datetime import datetime

# Common Response Model
class BaseResponse(BaseModel):
    message: str
    status: str = "success"
    timestamp: datetime = datetime.now()

# Test Models
class TestResponse(BaseResponse):
    pass

# Common Enums
class UserRole(str, Enum):
    EMPLOYEE = "employee"
    SECURITY_TEAM = "security_team"
    ADMIN = "admin"

class IncidentType(str, Enum):
    MALWARE = "malware"
    PHISHING = "phishing"
    DATA_BREACH = "data_breach"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    SOCIAL_ENGINEERING = "social_engineering"
    PHYSICAL_SECURITY = "physical_security"

class IncidentSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IncidentStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    INVESTIGATING = "investigating"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class MessageType(str, Enum):
    TEXT = "text"
    FILE = "file"
    SYSTEM = "system"