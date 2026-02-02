#!/usr/bin/env python3
"""
Script to create security team users in the database
Run this to add security team members with proper credentials
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

# Security Team Members Configuration
SECURITY_TEAM_MEMBERS = [
    {
        "email": "security.lead@secura.com",
        "password": "SecuraSecLead123!",
        "full_name": "Security Team Lead",
        "phone_number": "+1-555-0101"
    },
    {
        "email": "analyst1@secura.com", 
        "password": "SecuraAnalyst123!",
        "full_name": "Security Analyst 1",
        "phone_number": "+1-555-0102"
    },
    {
        "email": "analyst2@secura.com",
        "password": "SecuraAnalyst234!",
        "full_name": "Security Analyst 2", 
        "phone_number": "+1-555-0103"
    },
    {
        "email": "incident.response@secura.com",
        "password": "SecuraIncident123!",
        "full_name": "Incident Response Specialist",
        "phone_number": "+1-555-0104"
    }
]

async def create_security_team_user(user_data):
    """Create a single security team user"""
    
    email = user_data["email"]
    password = user_data["password"]
    full_name = user_data["full_name"]
    phone_number = user_data["phone_number"]
    
    try:
        print(f"Creating security team user: {email}")
        
        # Create Firebase user
        try:
            firebase_user = auth.create_user(
                email=email,
                password=password,
                display_name=full_name,
                email_verified=True
            )
            print(f"  [SUCCESS] Firebase user created with UID: {firebase_user.uid}")
        except auth.EmailAlreadyExistsError:
            # If user already exists, get existing user
            firebase_user = auth.get_user_by_email(email)
            print(f"  [INFO] Firebase user already exists with UID: {firebase_user.uid}")
        
        # Create user profile in Firestore
        auth_service = AuthService()
        
        # Check if user profile already exists
        existing_user = await auth_service.get_user_profile(firebase_user.uid)
        if existing_user:
            print(f"  [INFO] User profile already exists in database")
            return existing_user
        
        # Create new security team member profile
        security_user = User(
            uid=firebase_user.uid,
            email=email,
            full_name=full_name,
            phone_number=phone_number,
            role=UserRole.SECURITY_TEAM,
            is_active=True
        )
        
        await auth_service.create_user_profile(security_user)
        print(f"  [SUCCESS] Security team user profile created successfully")
        
        return security_user
        
    except Exception as e:
        print(f"  [ERROR] creating security team user {email}: {str(e)}")
        return None

async def create_all_security_team_users():
    """Create all security team users"""
    
    try:
        print("Creating security team users...")
        print("=" * 50)
        
        # Initialize Firebase (if not already initialized)
        try:
            FirebaseConfig.initialize()
        except:
            pass  # Already initialized
        
        created_users = []
        
        # Create each security team member
        for user_data in SECURITY_TEAM_MEMBERS:
            user = await create_security_team_user(user_data)
            if user:
                created_users.append((user_data, user))
            print()
        
        # Print summary
        print("=" * 50)
        print("SECURITY TEAM CREDENTIALS SUMMARY")
        print("=" * 50)
        
        if created_users:
            print("Successfully created/verified security team users:")
            print()
            
            for user_data, user in created_users:
                print(f"Email: {user_data['email']}")
                print(f"Password: {user_data['password']}")
                print(f"Name: {user_data['full_name']}")
                print(f"Phone: {user_data['phone_number']}")
                print(f"Role: {user.role}")
                print(f"UID: {user.uid}")
                print("-" * 30)
            
            print()
            print("IMPORTANT SECURITY NOTES:")
            print("• Change default passwords after first login")
            print("• Ensure all team members enable 2FA")
            print("• These credentials should be shared securely")
            print("• Monitor login activities for these accounts")
        else:
            print("No users were created successfully.")
        
    except Exception as e:
        print(f"ERROR in security team creation process: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(create_all_security_team_users())
