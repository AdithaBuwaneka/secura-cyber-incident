"""
Authentication Service - Aditha's Module
Handles Firebase Auth integration and user management
"""

from typing import Optional, List
from firebase_admin import auth, firestore
from datetime import datetime

from app.models.user import User
from app.models.common import UserRole
from app.models.auth import UserProfile
from app.core.firebase_config import FirebaseConfig
from app.services.user_activity.activity_service import UserActivityService
from app.models.user_activity import ActivityType

class AuthService:
    def __init__(self):
        self.db = FirebaseConfig.get_firestore()
        self.users_collection = self.db.collection('users')
        self.activity_service = UserActivityService()

    async def create_user_profile(self, user: User) -> User:
        """Create user profile in Firestore"""
        print(f"AUTH_SERVICE DEBUG: Creating user profile for {user.uid}")
        print(f"AUTH_SERVICE DEBUG: Phone number: '{user.phone_number}' (type: {type(user.phone_number)})")
        print(f"AUTH_SERVICE DEBUG: Country: '{user.country}' (type: {type(user.country)})")
        
        user_data = {
            'uid': user.uid,
            'email': user.email,
            'full_name': user.full_name,
            'phone_number': user.phone_number,
            'country': user.country,
            'city': user.city,
            'home_number': user.home_number,
            'role': user.role.value,
            'is_active': user.is_active,
            'created_at': datetime.utcnow(),
            'last_login': None
        }
        
        print(f"AUTH_SERVICE DEBUG: Data to be stored: {user_data}")
        self.users_collection.document(user.uid).set(user_data)
        print(f"AUTH_SERVICE DEBUG: User profile stored successfully")
        return user

    async def get_user_profile(self, uid: str) -> Optional[User]:
        """Get user profile from Firestore"""
        doc = self.users_collection.document(uid).get()
        
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        return User(
            uid=data['uid'],
            email=data['email'],
            full_name=data['full_name'],
            phone_number=data.get('phone_number'),
            country=data.get('country'),
            city=data.get('city'),
            home_number=data.get('home_number'),
            role=UserRole(data['role']),
            is_active=data['is_active'],
            created_at=data['created_at'],
            last_login=data.get('last_login')
        )

    async def update_user_profile(self, uid: str, profile_data: UserProfile) -> User:
        """Update user profile"""
        update_data = {
            'full_name': profile_data.full_name,
            'phone_number': profile_data.phone_number,
            'updated_at': datetime.utcnow()
        }
        
        self.users_collection.document(uid).update(update_data)
        return await self.get_user_profile(uid)

    async def update_user_profile_fields(self, uid: str, update_data: dict) -> User:
        """Update specific user profile fields"""
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.utcnow()
        
        self.users_collection.document(uid).update(update_data)
        return await self.get_user_profile(uid)

    async def assign_security_role(self, uid: str) -> bool:
        """Add user to security team"""
        try:
            self.users_collection.document(uid).update({
                'role': UserRole.SECURITY_TEAM.value,
                'updated_at': datetime.utcnow()
            })
            return True
        except Exception:
            return False

    async def remove_security_role(self, uid: str) -> bool:
        """Remove user from security team"""
        try:
            self.users_collection.document(uid).update({
                'role': UserRole.EMPLOYEE.value,
                'updated_at': datetime.utcnow()
            })
            return True
        except Exception:
            return False

    async def get_all_users(self) -> List[User]:
        """Get all users (Admin only)"""
        print("AuthService: Getting all users from Firestore...")
        docs = self.users_collection.stream()
        users = []
        
        for doc in docs:
            data = doc.to_dict()
            print(f"AuthService: Found user {data.get('email', 'unknown')} with role {data.get('role', 'unknown')}")
            users.append(User(
                uid=data['uid'],
                email=data['email'],
                full_name=data['full_name'],
                phone_number=data.get('phone_number'),
                country=data.get('country'),
                city=data.get('city'),
                home_number=data.get('home_number'),
                role=UserRole(data['role']),
                is_active=data['is_active'],
                created_at=data['created_at'],
                last_login=data.get('last_login')
            ))
        
        print(f"AuthService: Total users found: {len(users)}")
        return users

    async def update_last_login(self, uid: str, ip_address: str = None, user_agent: str = None):
        """Update user's last login timestamp and track activity"""
        # Update in users collection
        self.users_collection.document(uid).update({
            'last_login': datetime.utcnow()
        })
        
        # Track login activity
        await self.activity_service.track_user_activity(
            user_id=uid,
            activity_type=ActivityType.LOGIN,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def track_logout(self, uid: str, ip_address: str = None, user_agent: str = None):
        """Track user logout activity"""
        await self.activity_service.track_user_activity(
            user_id=uid,
            activity_type=ActivityType.LOGOUT,
            ip_address=ip_address,
            user_agent=user_agent
        )

    async def update_user_status(self, uid: str, is_active: bool) -> bool:
        """Update user active status"""
        try:
            self.users_collection.document(uid).update({
                'is_active': is_active,
                'updated_at': datetime.utcnow()
            })
            return True
        except Exception:
            return False