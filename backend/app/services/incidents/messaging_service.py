"""
Messaging Service - Jayasanka's Module
Handles secure messaging for incident communication
"""

from typing import List
from datetime import datetime
from uuid import uuid4

from app.models.message import Message, MessageType
from app.core.firebase_config import FirebaseConfig


class MessagingService:
    def __init__(self):
        self.db = FirebaseConfig.get_firestore()
        self.messages_collection = self.db.collection('messages')

    async def send_message(
        self,
        incident_id: str,
        sender_id: str,
        sender_name: str,
        sender_role: str,
        content: str,
        message_type: MessageType = MessageType.TEXT
    ) -> Message:
        """Send a secure message for incident communication"""
        message_id = str(uuid4())
        
        message_doc = {
            'id': message_id,
            'incident_id': incident_id,
            'sender_id': sender_id,
            'sender_name': sender_name,
            'sender_role': sender_role,
            'content': content,
            'message_type': message_type.value,
            'created_at': datetime.utcnow(),
            'updated_at': None,
            'is_read': False,
            'read_by': [],
            'attachments': [],
            'reply_to': None,
            'thread_id': None,
            'priority': 'normal',
            'metadata': {},
            'is_system_message': False,
            'system_event_type': None,
            'encrypted_content': None,
            'encryption_key_id': None,
            'is_encrypted': False,
            'read_at': None,
            'deleted_at': None
        }
        
        self.messages_collection.document(message_id).set(message_doc)
        
        return Message(**message_doc)

    async def get_incident_messages(self, incident_id: str) -> List[Message]:
        """Get all messages for an incident"""
        try:
            # First try with ordering
            query = self.messages_collection.where('incident_id', '==', incident_id).order_by('created_at')
            docs = query.stream()
            
            messages = []
            for doc in docs:
                data = doc.to_dict()
                messages.append(Message(**data))
            
            return messages
        except Exception as e:
            if "index" in str(e).lower():
                # Fallback: get messages without ordering
                print(f"Warning: Using fallback query for incident {incident_id} due to missing index")
                query = self.messages_collection.where('incident_id', '==', incident_id)
                docs = query.stream()
                
                messages = []
                for doc in docs:
                    data = doc.to_dict()
                    messages.append(Message(**data))
                
                # Sort in Python instead of Firestore
                messages.sort(key=lambda x: x.created_at if x.created_at else datetime.min)
                return messages
            else:
                raise e

    async def mark_message_read(self, message_id: str, user_id: str) -> bool:
        """Mark message as read by user"""
        try:
            self.messages_collection.document(message_id).update({
                'is_read': True,
                'read_by': user_id,
                'read_at': datetime.utcnow()
            })
            return True
        except Exception:
            return False

    async def get_unread_count(self, incident_id: str, user_id: str) -> int:
        """Get count of unread messages for user in incident"""
        query = self.messages_collection.where('incident_id', '==', incident_id).where('is_read', '==', False).where('sender_id', '!=', user_id)
        docs = list(query.stream())
        return len(docs)