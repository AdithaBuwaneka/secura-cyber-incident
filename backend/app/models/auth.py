"""
Authentication Models - Aditha's Module
Pydantic models for authentication and user management
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from .common import UserRole

class TokenData(BaseModel):
    """Model for token data"""
    uid: str
    email: Optional[str] = None
    role: UserRole = UserRole.EMPLOYEE

class UserRegistration(BaseModel):
    """Model for user registration"""
    email: EmailStr
    password: str
    full_name: str
    phone_number: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    home_number: Optional[str] = None

class UserLogin(BaseModel):
    """Model for user login with Firebase ID token"""
    id_token: str  # Firebase ID token from frontend

class UserProfileCreate(BaseModel):
    """Model for creating user profile"""
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    home_number: Optional[str] = None

class UserProfile(BaseModel):
    """Model for updating user profile"""
    full_name: str
    phone_number: Optional[str] = None

class TokenVerification(BaseModel):
    """Model for token verification request"""
    id_token: str

class TokenVerificationResponse(BaseModel):
    """Model for token verification response"""
    uid: str
    email: str
    role: UserRole
    is_active: bool

class PasswordReset(BaseModel):
    """Model for password reset request"""
    email: EmailStr

class PasswordUpdate(BaseModel):
    """Model for password update"""
    current_password: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    """Model for profile update request from frontend"""
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    home_number: Optional[str] = None

class SecurityTeamManagement(BaseModel):
    """Model for security team management"""
    user_uid: str
    action: str  # "add" or "remove"

class AuthResponse(BaseModel):
    """Base authentication response"""
    message: str
    status: str = "success"
    uid: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None