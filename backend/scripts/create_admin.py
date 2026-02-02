#!/usr/bin/env python3
"""
Script to create a default admin user in the database
Run this once after setting up the database
"""

import sys
import os
import asyncio
from datetime import datetime

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.firebase_config import FirebaseConfig
from app.models.user import User
from app.models.common import UserRole
from app.services.auth.auth_service import AuthService
from firebase_admin import auth

async def create_admin_user():
    """Create a default admin user"""
    
    # Default admin credentials
    ADMIN_EMAIL = "admin@secura.com"
    ADMIN_PASSWORD = "SecuraAdmin123!"
    ADMIN_NAME = "System Administrator"
    
    try:
        print("Creating default admin user...")
        
        # Initialize Firebase (if not already initialized)
        try:
            FirebaseConfig.initialize()
        except:
            pass  # Already initialized
        
        # Create Firebase user
        try:
            firebase_user = auth.create_user(
                email=ADMIN_EMAIL,
                password=ADMIN_PASSWORD,
                display_name=ADMIN_NAME,
                email_verified=True
            )
            print(f"Firebase user created with UID: {firebase_user.uid}")
        except auth.EmailAlreadyExistsError:
            # If user already exists, get existing user
            firebase_user = auth.get_user_by_email(ADMIN_EMAIL)
            print(f"Firebase user already exists with UID: {firebase_user.uid}")
        
        # Create user profile in Firestore
        auth_service = AuthService()
        
        # Check if user profile already exists
        existing_user = await auth_service.get_user_profile(firebase_user.uid)
        if existing_user:
            print("Admin user profile already exists in database")
            print(f"Admin UID: {existing_user.uid}")
            print(f"Admin Email: {existing_user.email}")
            print(f"Admin Role: {existing_user.role}")
            return
        
        # Create new admin profile
        admin_user = User(
            uid=firebase_user.uid,
            email=ADMIN_EMAIL,
            full_name=ADMIN_NAME,
            phone_number=None,
            role=UserRole.ADMIN,
            is_active=True
        )
        
        await auth_service.create_user_profile(admin_user)
        
        print("SUCCESS: Default admin user created successfully!")
        print(f"Email: {ADMIN_EMAIL}")
        print(f"Password: {ADMIN_PASSWORD}")
        print(f"UID: {firebase_user.uid}")
        print()
        print("IMPORTANT: Change the default password after first login!")
        
    except Exception as e:
        print(f"ERROR creating admin user: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(create_admin_user())