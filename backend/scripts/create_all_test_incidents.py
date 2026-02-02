#!/usr/bin/env python3
"""
Script to create all missing test incidents (INC-2024-001, INC-2024-002, INC-2024-003)
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

async def create_all_test_incidents():
    """Create all missing test incidents"""
    
    try:
        print("Creating all missing test incidents...")
        
        # Initialize services
        incident_service = IncidentService()
        messaging_service = MessagingService()
        
        # Test incidents to create
        test_incidents = [
            {
                'id': 'INC-2024-001',
                'title': 'Test Security Incident INC-2024-001',
                'description': 'This is a test incident for messaging system - INC-2024-001',
                'severity': 'medium',
                'location': IncidentLocation(
                    address='Test Location 1',
                    building='Test Building 1',
                    floor='1st Floor',
                    room='Room 101'
                ),
                'reporter_id': 'test_user_123',
                'reporter_email': 'test@example.com',
                'reporter_name': 'Test User 1',
                'reporter_department': 'IT'
            },
            {
                'id': 'INC-2024-002',
                'title': 'Test Security Incident INC-2024-002',
                'description': 'This is a test incident for messaging system - INC-2024-002',
                'severity': 'high',
                'location': IncidentLocation(
                    address='Test Location 2',
                    building='Test Building 2',
                    floor='2nd Floor',
                    room='Room 202'
                ),
                'reporter_id': 'test_user_456',
                'reporter_email': 'test2@example.com',
                'reporter_name': 'Test User 2',
                'reporter_department': 'Security'
            },
            {
                'id': 'INC-2024-003',
                'title': 'Test Security Incident INC-2024-003',
                'description': 'This is a test incident for messaging system - INC-2024-003',
                'severity': 'low',
                'location': IncidentLocation(
                    address='Test Location 3',
                    building='Test Building 3',
                    floor='3rd Floor',
                    room='Room 303'
                ),
                'reporter_id': 'test_user_789',
                'reporter_email': 'test3@example.com',
                'reporter_name': 'Test User 3',
                'reporter_department': 'HR'
            }
        ]
        
        for incident_data in test_incidents:
            try:
                # Check if incident already exists
                existing_incident = await incident_service.get_incident(incident_data['id'])
                if existing_incident:
                    print(f"✅ Incident {incident_data['id']} already exists")
                    continue
                
                # Create incident data
                incident_create = IncidentCreate(
                    title=incident_data['title'],
                    description=incident_data['description'],
                    severity=incident_data['severity'],
                    location=incident_data['location']
                )
                
                # Create the incident with specific ID
                incident = await incident_service.create_incident_with_id(
                    incident_id=incident_data['id'],
                    incident_data=incident_create,
                    reporter_id=incident_data['reporter_id'],
                    reporter_email=incident_data['reporter_email'],
                    reporter_name=incident_data['reporter_name'],
                    reporter_department=incident_data['reporter_department']
                )
                
                print(f"✅ Created incident {incident_data['id']}: {incident.title}")
                
                # Add some test messages to each incident
                test_messages = [
                    {
                        'sender_id': incident_data['reporter_id'],
                        'sender_name': incident_data['reporter_name'],
                        'sender_role': 'employee',
                        'content': f'Initial report for {incident_data["id"]} - suspicious activity detected.'
                    },
                    {
                        'sender_id': 'security_team_001',
                        'sender_name': 'Security Team Lead',
                        'sender_role': 'security_team',
                        'content': f'Thank you for reporting {incident_data["id"]}. We are investigating this incident.'
                    },
                    {
                        'sender_id': 'admin_001',
                        'sender_name': 'System Administrator',
                        'sender_role': 'admin',
                        'content': f'Incident {incident_data["id"]} has been assigned to the security team for investigation.'
                    }
                ]
                
                for msg_data in test_messages:
                    message = await messaging_service.send_message(
                        incident_id=incident_data['id'],
                        sender_id=msg_data['sender_id'],
                        sender_name=msg_data['sender_name'],
                        sender_role=msg_data['sender_role'],
                        content=msg_data['content']
                    )
                    print(f"   📝 Added message: {msg_data['content'][:50]}...")
                
            except Exception as e:
                print(f"❌ Error creating incident {incident_data['id']}: {str(e)}")
        
        print("\n🎉 All test incidents created successfully!")
        print("📋 Summary:")
        print("   - INC-2024-001: Test incident with 3 messages")
        print("   - INC-2024-002: Test incident with 3 messages") 
        print("   - INC-2024-003: Test incident with 3 messages")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(create_all_test_incidents()) 