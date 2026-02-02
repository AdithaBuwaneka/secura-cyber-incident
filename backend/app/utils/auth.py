from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.firebase_config import FirebaseConfig
from app.models.auth import TokenData
from app.models.common import UserRole
from app.models.user import User
from app.services.auth.auth_service import AuthService
from typing import List, Dict, Any, Optional
import time

# Security scheme for Bearer token
security = HTTPBearer()

# PERFORMANCE FIX: Cache user profiles to avoid DB hit on every request
class UserProfileCache:
    def __init__(self, ttl_seconds: int = 60):
        self._cache: Dict[str, User] = {}
        self._timestamps: Dict[str, float] = {}
        self._ttl = ttl_seconds

    def get(self, uid: str) -> Optional[User]:
        if uid in self._cache:
            if time.time() - self._timestamps[uid] < self._ttl:
                return self._cache[uid]
            else:
                del self._cache[uid]
                del self._timestamps[uid]
        return None

    def set(self, uid: str, user: User):
        self._cache[uid] = user
        self._timestamps[uid] = time.time()

    def invalidate(self, uid: str = None):
        if uid:
            self._cache.pop(uid, None)
            self._timestamps.pop(uid, None)
        else:
            self._cache.clear()
            self._timestamps.clear()

# Global cache - 60 second TTL
_user_cache = UserProfileCache(ttl_seconds=60)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Verify Firebase ID token and return user data"""

    # Extract token from Authorization header
    id_token = credentials.credentials

    # Verify token with Firebase
    decoded_token = FirebaseConfig.verify_id_token(id_token)

    if not decoded_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    uid = decoded_token.get('uid')
    email = decoded_token.get('email')
    name = decoded_token.get('name', email.split('@')[0] if email else 'User')

    # PERFORMANCE FIX: Check cache first before hitting database
    cached_user = _user_cache.get(uid)
    if cached_user:
        return cached_user

    auth_service = AuthService()
    user_profile = await auth_service.get_user_profile(uid)

    if not user_profile:
        # Automatically create profile for existing Firebase users
        try:
            from models.user import User
            from models.common import UserRole

            auto_profile = User(
                uid=uid,
                email=email,
                full_name=name,
                phone_number=None,
                role=UserRole.EMPLOYEE,
                is_active=True
            )

            user_profile = await auth_service.create_user_profile(auto_profile)

        except Exception as create_error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User profile not found for UID: {uid}. Please complete registration."
            )

    # Cache the user profile
    _user_cache.set(uid, user_profile)

    # Update last login in background (don't block response)
    # Only update occasionally, not every request
    import asyncio
    asyncio.create_task(auth_service.update_last_login(uid))

    return user_profile

def require_role(required_role: UserRole):
    """Dependency to require specific role"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        return current_user
    return role_checker

def require_roles(allowed_roles: List[UserRole]):
    """Dependency to require one of multiple roles"""
    def roles_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Allowed roles: {allowed_roles}"
            )
        return current_user
    return roles_checker