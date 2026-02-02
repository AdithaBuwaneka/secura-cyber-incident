from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .common import UserRole

class User(BaseModel):
    uid: str
    email: EmailStr
    full_name: str
    role: UserRole
    phone_number: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    home_number: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    is_active: bool = True

class UserProfile(BaseModel):
    uid: str
    email: EmailStr
    full_name: str
    role: UserRole
    phone_number: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    home_number: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True

class UserCreate(BaseModel):
    uid: str  # Firebase UID from frontend
    email: EmailStr
    full_name: str
    role: UserRole
    phone_number: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    home_number: Optional[str] = None

class UserListResponse(BaseModel):
    users: List[UserProfile]
    total: int