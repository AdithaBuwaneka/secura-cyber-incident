#!/usr/bin/env python3
"""
Script to create a test incident with ID INC-2024-001 for testing
"""

import sys
import os
import asyncio
from datetime import datetime

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.firebase_config import FirebaseConfig
from app.services.incidents.incident_service import IncidentService
from app.services.incidents.messaging_service import MessagingService
from app.models.incident import IncidentCreate, IncidentLocation
from app.models.message import MessageType

async def create_inc_2024_001():
    """Create incident INC-2024-001 with messages"""
    
    try:
        print("Creating incident INC-2024-001 with messages...")
        
        # Initialize Firebase
        FirebaseConfig.initialize_firebase()
        
        # Create incident service
        incident_service = IncidentService()
        messaging_service = MessagingService()
        
        # Test incident data
        incident_data = IncidentCreate(
            title="Test Security Incident INC-2024-001",
            description="This is a test incident for messaging system with specific ID",
            severity="medium",
            location=IncidentLocation(
                address="Test Location",
                building="Test Building",
                floor="1st Floor",
                room="Room 101"
            )
        )
        
        # Create the incident with specific ID
        incident = await incident_service.create_incident_with_id(
            incident_id="INC-2024-001",
            incident_data=incident_data,
            reporter_id="test_user_123",
            reporter_email="test@example.com",
            reporter_name="Test User",
            reporter_department="IT Department"
        )
        print(f"Created incident: {incident.id}")
        
        # Create some test messages
        test_messages = [
            {
                "sender_id": "test_user_123",
                "sender_name": "Test User",
                "sender_role": "employee",
                "content": "Hello, I've noticed some suspicious activity.",
                "message_type": MessageType.TEXT
            },
            {
                "sender_id": "security_team_123",
                "sender_name": "Security Team",
                "sender_role": "security_team",
                "content": "Thank you for reporting this. We're investigating.",
                "message_type": MessageType.TEXT
            },
            {
                "sender_id": "test_user_123",
                "sender_name": "Test User",
                "sender_role": "employee",
                "content": "I've attached some screenshots for your review.",
                "message_type": MessageType.TEXT
            }
        ]
        
        # Add messages to the incident
        for msg_data in test_messages:
            message = await messaging_service.send_message(
                incident_id=incident.id,
                sender_id=msg_data["sender_id"],
                sender_name=msg_data["sender_name"],
                sender_role=msg_data["sender_role"],
                content=msg_data["content"],
                message_type=msg_data["message_type"]
            )
            print(f"Created message: {message.id}")
        
        print(f"\nSUCCESS: Test incident created with ID: {incident.id}")
        print("You can now test the messaging system with this incident ID")
        
    except Exception as e:
        print(f"ERROR creating test incident: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(create_inc_2024_001()) 