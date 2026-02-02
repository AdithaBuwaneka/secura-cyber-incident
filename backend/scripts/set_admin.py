#!/usr/bin/env python3
"""
Script to set a user as admin in the database
Usage: python scripts/set_admin.py <user_email>
"""

import sys
import os
import asyncio
from datetime import datetime

# Add the app directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app_dir = os.path.join(backend_dir, 'app')
sys.path.insert(0, app_dir)

# Change to app directory
os.chdir(app_dir)

from services.auth.auth_service import AuthService
from models.common import UserRole
from core.firebase_config import FirebaseConfig

async def set_user_as_admin(email: str):
    """Set a user as admin in the database"""
    FirebaseConfig.initialize_firebase()
    auth_service = AuthService()
    
    # Get all users
    users = await auth_service.get_all_users()
    
    # Find user by email
    target_user = None
    for user in users:
        if user.email == email:
            target_user = user
            break
    
    if not target_user:
        print(f"User with email {email} not found in database")
        print("Available users:")
        for user in users:
            print(f"  - {user.email} (role: {user.role.value})")
        return
    
    print(f"Found user: {target_user.email}")
    print(f"Current role: {target_user.role.value}")
    
    if target_user.role == UserRole.ADMIN:
        print("User is already an admin!")
        return
    
    # Update user role to admin
    try:
        auth_service.users_collection.document(target_user.uid).update({
            'role': UserRole.ADMIN.value,
            'updated_at': datetime.utcnow()
        })
        print(f"Successfully set {target_user.email} as admin!")
    except Exception as e:
        print(f"Error setting user as admin: {e}")

async def list_users():
    """List all users in the database"""
    FirebaseConfig.initialize_firebase()
    auth_service = AuthService()
    
    users = await auth_service.get_all_users()
    
    print(f"Total users in database: {len(users)}")
    for user in users:
        print(f"  - {user.email} (role: {user.role.value}, active: {user.is_active})")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/set_admin.py <user_email>")
        print("Or: python scripts/set_admin.py --list to see all users")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        asyncio.run(list_users())
    else:
        email = sys.argv[1]
        asyncio.run(set_user_as_admin(email)) 