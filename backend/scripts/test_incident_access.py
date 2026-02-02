#!/usr/bin/env python3
"""
Script to test incident access and messaging functionality
"""

import sys
import os
import asyncio

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.firebase_config import FirebaseConfig
from app.services.incidents.incident_service import IncidentService
from app.services.incidents.messaging_service import MessagingService

async def test_incident_access():
    """Test if incident exists and messaging works"""
    
    try:
        print("Testing incident access...")
        
        # Test incident service
        incident_service = IncidentService()
        incident = await incident_service.get_incident('INC-2024-001')
        
        if incident:
            print(f"✅ Incident found: {incident.title}")
            print(f"   ID: {incident.id}")
            print(f"   Reporter: {incident.reporter_id}")
        else:
            print("❌ Incident INC-2024-001 not found")
            return
        
        # Test messaging service
        messaging_service = MessagingService()
        messages = await messaging_service.get_incident_messages('INC-2024-001')
        
        print(f"✅ Found {len(messages)} messages for incident")
        for i, msg in enumerate(messages[:3]):  # Show first 3 messages
            print(f"   Message {i+1}: {msg.sender_name} - {msg.content[:50]}...")
        
        # Test creating a new message
        print("\nTesting message creation...")
        new_message = await messaging_service.send_message(
            incident_id='INC-2024-001',
            sender_id='test_user_123',
            sender_name='Test User',
            sender_role='employee',
            content='This is a test message from the script'
        )
        print(f"✅ Created new message: {new_message.id}")
        
        # Get updated message count
        updated_messages = await messaging_service.get_incident_messages('INC-2024-001')
        print(f"✅ Total messages now: {len(updated_messages)}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_incident_access()) 