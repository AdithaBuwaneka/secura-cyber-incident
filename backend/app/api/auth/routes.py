"""
Authentication API Routes - Aditha's Module
Handles Firebase Auth integration, role-based access control, and user management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from typing import Optional
from datetime import datetime
import os

from app.models.auth import UserRegistration, UserLogin, UserProfile, UserProfileCreate, TokenVerification, ProfileUpdateRequest
from app.models.user import User
from app.models.common import UserRole
from app.services.auth.auth_service import AuthService
from app.services.database import DatabaseService
from app.utils.auth import get_current_user

router = APIRouter(tags=["Authentication"])
# Force reload
security = HTTPBearer()

@router.post("/create-profile")
async def create_profile_for_existing_user(
    profile_data: UserProfileCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends()
):
    """
    Create user profile for existing Firebase Auth user
    This fixes the issue where users are created in Firebase Auth but not in Firestore
    """
    print(f"DEBUG: Received profile data: {profile_data}")
    print(f"DEBUG: Profile data type: {type(profile_data)}")
    print(f"DEBUG: Phone number from request: '{profile_data.phone_number}'")
    print(f"DEBUG: Phone number type: {type(profile_data.phone_number)}")
    print(f"DEBUG: Full request data dict: {profile_data.dict()}")
    try:
        # Verify Firebase ID token
        decoded_token = auth.verify_id_token(credentials.credentials)
        if not decoded_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        
        # Check if profile already exists
        existing_profile = await auth_service.get_user_profile(uid)
        if existing_profile:
            return {
                "message": "User profile already exists",
                "uid": uid,
                "email": email
            }
        
        # Create user profile in Firestore
        user_profile = User(
            uid=uid,
            email=email or profile_data.email,
            full_name=profile_data.full_name,
            phone_number=profile_data.phone_number,
            country=profile_data.country,
            city=profile_data.city,
            home_number=profile_data.home_number,
            role=UserRole.EMPLOYEE,  # Default role
            is_active=True
        )
        
        await auth_service.create_user_profile(user_profile)
        
        return {
            "message": "User profile created successfully",
            "uid": uid,
            "email": email or profile_data.email
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile creation failed: {str(e)}"
        )

@router.get("/register-format")
async def get_register_format():
    """
    Get the expected format for registration request
    """
    return {
        "server_status": "UPDATED - Code changes loaded successfully",
        "expected_format": {
            "email": "user@example.com",
            "full_name": "John Doe", 
            "phone_number": "+1234567890"  # Optional - NO PASSWORD REQUIRED
        },
        "note": "phone_number is optional, password NOT required for create-profile"
    }

@router.post("/register")
async def register_user(
    user_data: UserRegistration,
    auth_service: AuthService = Depends()
):
    """
    Register new user with Firebase Auth
    - Creates Firebase user account
    - Stores user profile in Firestore
    - Assigns default employee role
    """
    try:
        print(f"DEBUG: Registration request received for email: {user_data.email}")
        print(f"DEBUG: Full name: {user_data.full_name}")
        print(f"DEBUG: Phone: {user_data.phone_number}")
        
        # Create Firebase user
        firebase_user = auth.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.full_name
        )
        
        print(f"DEBUG: Firebase user created with UID: {firebase_user.uid}")
        
        # Create user profile in Firestore
        user_profile = User(
            uid=firebase_user.uid,
            email=user_data.email,
            full_name=user_data.full_name,
            phone_number=user_data.phone_number,
            country=user_data.country,
            city=user_data.city,
            home_number=user_data.home_number,
            role=UserRole.EMPLOYEE,  # Default role
            is_active=True
        )
        
        await auth_service.create_user_profile(user_profile)
        print(f"DEBUG: User profile created in Firestore")
        
        return {
            "message": "User registered successfully",
            "uid": firebase_user.uid,
            "email": user_data.email
        }
        
    except auth.EmailAlreadyExistsError:
        print(f"DEBUG: Email already exists: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    except Exception as e:
        print(f"DEBUG: Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/verify-token")
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Verify Firebase ID token and return user information
    """
    try:
        # Verify Firebase ID token
        decoded_token = auth.verify_id_token(credentials.credentials)
        uid = decoded_token['uid']
        
        # Get user profile from Firestore
        auth_service = AuthService()
        user_profile = await auth_service.get_user_profile(uid)
        
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        return {
            "uid": uid,
            "email": decoded_token.get('email'),
            "role": user_profile.role,
            "is_active": user_profile.is_active
        }
        
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token verification failed: {str(e)}"
        )

@router.get("/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's profile information
    """
    return {
        "uid": current_user.uid,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone_number": current_user.phone_number,
        "country": current_user.country,
        "city": current_user.city,
        "home_number": current_user.home_number,
        "role": current_user.role,
        "created_at": current_user.created_at,
        "last_login": current_user.last_login
    }

@router.put("/profile")
async def update_user_profile(
    profile_data: UserProfile,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Update user's profile information
    """
    try:
        updated_user = await auth_service.update_user_profile(
            current_user.uid, 
            profile_data
        )
        
        return {
            "message": "Profile updated successfully",
            "user": updated_user
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile update failed: {str(e)}"
        )

@router.patch("/update-profile")
async def update_user_profile_new(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Update user's profile information (new endpoint for frontend)
    Supports updating name, phone number, and password
    """
    try:
        # Update profile information
        update_data = {}
        if profile_data.full_name is not None:
            update_data['full_name'] = profile_data.full_name
        if profile_data.phone_number is not None:
            update_data['phone_number'] = profile_data.phone_number
        if profile_data.country is not None:
            update_data['country'] = profile_data.country
        if profile_data.city is not None:
            update_data['city'] = profile_data.city
        if profile_data.home_number is not None:
            update_data['home_number'] = profile_data.home_number
        
        # Update the user profile in Firestore
        updated_user = await auth_service.update_user_profile_fields(
            current_user.uid, 
            update_data
        )
        
        return updated_user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile update failed: {str(e)}"
        )


@router.get("/users/security-team")
async def get_security_team_members(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """Get all security team members - for team chat functionality"""
    try:
        # Only security team and admin can view team members
        if current_user.role.value not in ["security_team", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only security team can access team members"
            )

        from app.core.firebase_config import FirebaseConfig
        db = FirebaseConfig.get_firestore()
        users_collection = db.collection('users')

        # Get all security team members
        security_query = users_collection.where('role', '==', 'security_team')
        security_docs = list(security_query.stream())

        # Also get admins
        admin_query = users_collection.where('role', '==', 'admin')
        admin_docs = list(admin_query.stream())

        all_docs = security_docs + admin_docs

        # Format response for frontend SecurityMember interface
        members = []
        seen_uids = set()

        for doc in all_docs:
            data = doc.to_dict()
            uid = data.get('uid') or doc.id

            if uid in seen_uids:
                continue
            seen_uids.add(uid)

            members.append({
                "uid": uid,
                "full_name": data.get('full_name', 'Unknown'),
                "email": data.get('email', ''),
                "role": data.get('role', 'security_team'),
                "is_online": False,  # Will be updated by activity service
                "last_seen": data.get('last_login')
            })

        return members
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch security team: {str(e)}"
        )


@router.post("/admin/manage-security-team")
async def manage_security_team(
    user_uid: str,
    action: str,  # "add" or "remove"
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Admin-only: Add or remove users from security team
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        if action == "add":
            await auth_service.assign_security_role(user_uid)
            message = "User added to security team"
        elif action == "remove":
            await auth_service.remove_security_role(user_uid)
            message = "User removed from security team"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Use 'add' or 'remove'"
            )
        
        return {"message": message}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Security team management failed: {str(e)}"
        )

@router.get("/admin/users")
async def list_users(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Admin-only: List all users in the system
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        users = await auth_service.get_all_users()
        return {"users": users}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve users: {str(e)}"
        )

@router.patch("/admin/users/{uid}/role")
async def update_user_role(
    uid: str,
    role_data: dict,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Update user role (Admin only)
    Changes user role between employee and security_team
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can modify user roles"
        )
    
    # Prevent admin from modifying their own role
    if uid == current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own role"
        )
    
    new_role = role_data.get("role")
    if new_role not in ["employee", "security_team"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'employee' or 'security_team'"
        )
    
    try:
        # Get the target user
        target_user = await auth_service.get_user_profile(uid)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent modifying admin roles
        if target_user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify admin roles"
            )
        
        # Update the role
        if new_role == "security_team":
            success = await auth_service.assign_security_role(uid)
        else:
            success = await auth_service.remove_security_role(uid)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user role"
            )
        
        # Get updated user
        updated_user = await auth_service.get_user_profile(uid)
        
        return {
            "message": f"User role updated to {new_role}",
            "user": {
                "uid": updated_user.uid,
                "email": updated_user.email,
                "full_name": updated_user.full_name,
                "phone_number": updated_user.phone_number,
                "country": updated_user.country,
                "city": updated_user.city,
                "home_number": updated_user.home_number,
                "role": updated_user.role.value,
                "is_active": updated_user.is_active,
                "created_at": updated_user.created_at.isoformat() if updated_user.created_at else None,
                "last_login": updated_user.last_login.isoformat() if updated_user.last_login else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user role: {str(e)}"
        )

@router.patch("/admin/users/{uid}/status")
async def update_user_status(
    uid: str,
    status_data: dict,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Update user status (Admin only)
    Activates or deactivates user accounts
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can modify user status"
        )
    
    # Prevent admin from modifying their own status
    if uid == current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own status"
        )
    
    is_active = status_data.get("is_active")
    if not isinstance(is_active, bool):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="is_active must be a boolean value"
        )
    
    try:
        # Get the target user
        target_user = await auth_service.get_user_profile(uid)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update user status in Firestore
        await auth_service.update_user_status(uid, is_active)
        
        # Get updated user
        updated_user = await auth_service.get_user_profile(uid)
        
        return {
            "message": f"User {'activated' if is_active else 'deactivated'} successfully",
            "user": {
                "uid": updated_user.uid,
                "email": updated_user.email,
                "full_name": updated_user.full_name,
                "phone_number": updated_user.phone_number,
                "country": updated_user.country,
                "city": updated_user.city,
                "home_number": updated_user.home_number,
                "role": updated_user.role.value,
                "is_active": updated_user.is_active,
                "created_at": updated_user.created_at.isoformat() if updated_user.created_at else None,
                "last_login": updated_user.last_login.isoformat() if updated_user.last_login else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user status: {str(e)}"
        )