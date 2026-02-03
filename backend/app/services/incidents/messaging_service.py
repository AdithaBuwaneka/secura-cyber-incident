"""
Messaging Service - Jayasanka's Module
Handles secure messaging for incident communication
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import uuid4
import time

from app.models.message import Message, MessageType
from app.core.firebase_config import FirebaseConfig


# PERFORMANCE: Simple cache for unread counts
class UnreadCountCache:
    def __init__(self, ttl_seconds: int = 30):
        self._cache: Dict[str, int] = {}
        self._timestamps: Dict[str, float] = {}
        self._ttl = ttl_seconds

    def get(self, key: str) -> Optional[int]:
        if key in self._cache and time.time() - self._timestamps[key] < self._ttl:
            return self._cache[key]
        return None

    def set(self, key: str, value: int):
        self._cache[key] = value
        self._timestamps[key] = time.time()

    def invalidate(self, incident_id: str):
        # Invalidate all cached counts for an incident
        keys_to_delete = [k for k in self._cache.keys() if k.startswith(f"{incident_id}_")]
        for key in keys_to_delete:
            self._cache.pop(key, None)
            self._timestamps.pop(key, None)


_unread_cache = UnreadCountCache(ttl_seconds=30)


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

        # PERFORMANCE: Invalidate unread count cache for this incident
        _unread_cache.invalidate(incident_id)

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
            # Get message to find incident_id for cache invalidation
            doc = self.messages_collection.document(message_id).get()
            if doc.exists:
                incident_id = doc.to_dict().get('incident_id')

            self.messages_collection.document(message_id).update({
                'is_read': True,
                'read_by': user_id,
                'read_at': datetime.utcnow()
            })

            # PERFORMANCE: Invalidate unread count cache
            if incident_id:
                _unread_cache.invalidate(incident_id)

            return True
        except Exception:
            return False

    async def get_unread_count(self, incident_id: str, user_id: str) -> int:
        """Get count of unread messages for user in incident - CACHED"""
        cache_key = f"{incident_id}_{user_id}"

        # Check cache first
        cached = _unread_cache.get(cache_key)
        if cached is not None:
            return cached

        # Query database
        query = self.messages_collection.where('incident_id', '==', incident_id).where('is_read', '==', False).where('sender_id', '!=', user_id)
        docs = list(query.stream())
        count = len(docs)

        # Cache the result
        _unread_cache.set(cache_key, count)
        return count