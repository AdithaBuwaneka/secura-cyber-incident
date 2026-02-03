"""
Conversation Service - Enhanced Chat System
Handles conversation creation, management, and permissions
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4

from app.models.conversation import (
    ConversationCreate, ConversationResponse, ConversationUpdate,
    ConversationType, ConversationStatus, ConversationParticipant,
    ConversationPermissions
)
from app.core.firebase_config import FirebaseConfig


import time

# Simple in-memory cache for conversations
class ConversationCache:
    def __init__(self, ttl_seconds: int = 30):
        self._cache: Dict[str, Any] = {}
        self._timestamps: Dict[str, float] = {}
        self._ttl = ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache and time.time() - self._timestamps.get(key, 0) < self._ttl:
            return self._cache[key]
        return None

    def set(self, key: str, value: Any):
        self._cache[key] = value
        self._timestamps[key] = time.time()

    def invalidate(self, key: str):
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)

_conversation_cache = ConversationCache(ttl_seconds=30)
_user_cache = ConversationCache(ttl_seconds=60)  # Cache user data longer


class ConversationService:
    def __init__(self):
        self.db = FirebaseConfig.get_firestore()
        self.conversations_collection = self.db.collection('conversations')
        self.participants_collection = self.db.collection('conversation_participants')

    async def create_conversation(
        self,
        conversation_data: ConversationCreate,
        creator_id: str,
        creator_name: str,
        creator_role: str
    ) -> ConversationResponse:
        """Create a new conversation"""
        conversation_id = str(uuid4())
        
        # Auto-generate title if not provided
        title = conversation_data.title
        if not title:
            if conversation_data.conversation_type == ConversationType.INCIDENT_CHAT:
                title = f"Incident Chat - {conversation_data.incident_id}"
            elif conversation_data.conversation_type == ConversationType.TEAM_INTERNAL:
                title = "Security Team Discussion"
            else:
                title = "Direct Message"
        
        # Create conversation document
        conversation_doc = {
            'id': conversation_id,
            'conversation_type': conversation_data.conversation_type.value,
            'title': title,
            'incident_id': conversation_data.incident_id,
            'status': ConversationStatus.ACTIVE.value,
            'is_private': conversation_data.is_private,
            'metadata': conversation_data.metadata or {},
            'last_message_id': None,
            'last_message_content': None,
            'last_message_sender': None,
            'last_message_time': None,
            'total_messages': 0,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'created_by': creator_id,
            'archived_at': None,
            'archived_by': None
        }
        
        # Save conversation
        self.conversations_collection.document(conversation_id).set(conversation_doc)
        
        # Add creator as participant
        participants = [creator_id] + conversation_data.participants
        participants = list(set(participants))  # Remove duplicates
        
        # Get user information for all participants from Firestore
        from app.core.firebase_config import FirebaseConfig
        db = FirebaseConfig.get_firestore()
        users_collection = db.collection('users')
        
        for participant_id in participants:
            try:
                # Get user data from Firestore
                user_doc = users_collection.document(participant_id).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    full_name = user_data.get('full_name', 'Unknown User')
                    user_role = user_data.get('role', 'employee')
                    email = user_data.get('email', '')
                    
                    # Filter out "test" names
                    if not full_name or full_name.strip() == '' or 'test' in full_name.lower():
                        # Use email prefix as fallback
                        if email and '@' in email:
                            user_name = email.split('@')[0].replace('.', ' ').title()
                        else:
                            user_name = 'User'
                    else:
                        # Use only first name
                        name_parts = full_name.strip().split()
                        user_name = name_parts[0] if name_parts else 'User'
                else:
                    # Fallback for creator
                    user_name = creator_name if participant_id == creator_id else "Unknown User"
                    user_role = creator_role if participant_id == creator_id else "employee"
                
                await self.add_participant(
                    conversation_id, 
                    participant_id, 
                    user_name,
                    user_role
                )
            except Exception as e:
                print(f"Warning: Could not add participant {participant_id}: {e}")
                # Add with fallback data
                await self.add_participant(
                    conversation_id, 
                    participant_id, 
                    creator_name if participant_id == creator_id else "Unknown User",
                    creator_role if participant_id == creator_id else "employee"
                )
        
        return await self.get_conversation(conversation_id)

    async def get_conversation(self, conversation_id: str, skip_user_refresh: bool = False) -> Optional[ConversationResponse]:
        """Get conversation with participants - CACHED for performance"""

        # Check cache first
        cache_key = f"conv_{conversation_id}"
        cached = _conversation_cache.get(cache_key)
        if cached:
            return cached

        doc = self.conversations_collection.document(conversation_id).get()

        if not doc.exists:
            return None

        data = doc.to_dict()

        # Get participants
        participants = await self.get_conversation_participants(conversation_id)

        # Fetch user data - use cache to avoid redundant DB calls
        if participants and not skip_user_refresh:
            user_ids = [p.user_id for p in participants]
            user_data_map = await self._batch_get_users(user_ids)

            # Update participant data
            updated_participants = []
            for p in participants:
                p_dict = p.dict()
                if p.user_id in user_data_map:
                    p_dict['user_name'] = user_data_map[p.user_id]['user_name']
                    p_dict['user_role'] = user_data_map[p.user_id]['user_role']
                updated_participants.append(p_dict)

            data['participants'] = updated_participants
        else:
            data['participants'] = [p.dict() for p in participants] if participants else []

        data['participant_count'] = len(data.get('participants', []))

        # Convert enum strings back to enums
        data['conversation_type'] = ConversationType(data['conversation_type'])
        data['status'] = ConversationStatus(data['status'])

        # Fetch incident title - use cache
        if data.get('conversation_type') == ConversationType.INCIDENT_CHAT and data.get('incident_id'):
            incident_data = await self._get_cached_incident(data['incident_id'])
            if incident_data:
                data['incident_title'] = incident_data.get('title', data.get('title', 'Incident'))
                # Update employee participant name from incident reporter
                reporter_name = incident_data.get('reporter_name', '')
                reporter_id = incident_data.get('reporter_id', '')
                if reporter_name and reporter_name not in ['Unknown', 'User', '']:
                    name_parts = reporter_name.strip().split()
                    first_name = name_parts[0] if name_parts else reporter_name
                    for p in data.get('participants', []):
                        if p.get('user_role') == 'employee' or p.get('user_id') == reporter_id:
                            if p.get('user_name') in ['User', 'Employee', 'Unknown', '', None]:
                                p['user_name'] = first_name
            else:
                data['incident_title'] = data.get('title', 'Incident')

        result = ConversationResponse(**data)

        # Cache the result
        _conversation_cache.set(cache_key, result)

        return result

    async def _batch_get_users(self, user_ids: List[str]) -> Dict[str, Dict]:
        """Batch fetch user data with caching"""
        user_data_map = {}
        uncached_ids = []

        # Check cache first
        for user_id in user_ids:
            cached = _user_cache.get(f"user_{user_id}")
            if cached:
                user_data_map[user_id] = cached
            else:
                uncached_ids.append(user_id)

        # Fetch uncached users from DB
        if uncached_ids:
            from app.core.firebase_config import FirebaseConfig
            db = FirebaseConfig.get_firestore()
            users_collection = db.collection('users')

            for user_id in uncached_ids:
                try:
                    user_doc = users_collection.document(user_id).get()
                    if user_doc.exists:
                        user_info = user_doc.to_dict()
                        full_name = user_info.get('full_name', '')
                        email = user_info.get('email', '')

                        if not full_name or full_name.strip() == '' or 'test' in full_name.lower():
                            if email and '@' in email:
                                full_name = email.split('@')[0].replace('.', ' ').title()
                            else:
                                full_name = 'User'
                        else:
                            name_parts = full_name.strip().split()
                            full_name = name_parts[0] if name_parts else 'User'

                        user_data = {
                            'user_name': full_name,
                            'user_role': user_info.get('role', 'employee')
                        }
                        user_data_map[user_id] = user_data
                        _user_cache.set(f"user_{user_id}", user_data)
                except Exception:
                    pass

        return user_data_map

    async def _get_cached_incident(self, incident_id: str) -> Optional[Dict]:
        """Get incident data with caching"""
        cache_key = f"incident_{incident_id}"
        cached = _conversation_cache.get(cache_key)
        if cached:
            return cached

        try:
            from app.services.incidents.incident_service import IncidentService
            incident_service = IncidentService()
            incident = await incident_service.get_incident(incident_id)
            if incident:
                _conversation_cache.set(cache_key, incident)
            return incident
        except Exception:
            return None

    async def get_user_conversations(
        self,
        user_id: str,
        user_role: str,
        conversation_type: Optional[ConversationType] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[ConversationResponse]:
        """Get conversations for a user based on their role and permissions"""

        # Get conversations where user is a participant
        participant_query = self.participants_collection.where('user_id', '==', user_id)
        participant_docs = list(participant_query.stream())

        conversation_ids = [doc.to_dict()['conversation_id'] for doc in participant_docs]

        if not conversation_ids:
            return []

        # PERFORMANCE FIX: Batch load conversations instead of N+1 queries
        # Firestore 'in' query has limit of 10, so batch if needed
        conversations_data = []
        for i in range(0, len(conversation_ids), 10):
            batch_ids = conversation_ids[i:i+10]
            batch_docs = self.conversations_collection.where('id', 'in', batch_ids).stream()
            for doc in batch_docs:
                data = doc.to_dict()
                conversations_data.append(data)

        # Batch load all participants for these conversations
        all_participants = {}
        for i in range(0, len(conversation_ids), 10):
            batch_ids = conversation_ids[i:i+10]
            participant_docs = self.participants_collection.where('conversation_id', 'in', batch_ids).stream()
            for pdoc in participant_docs:
                pdata = pdoc.to_dict()
                conv_id = pdata.get('conversation_id')
                if conv_id not in all_participants:
                    all_participants[conv_id] = []
                all_participants[conv_id].append(pdata)
        
        # Batch fetch fresh user data for all participants
        all_user_ids = set()
        for participants_list in all_participants.values():
            for p in participants_list:
                all_user_ids.add(p.get('user_id'))
        
        
        # Fetch all user data by document ID (more reliable than field queries)
        user_data_map = {}
        if all_user_ids:
            from app.core.firebase_config import FirebaseConfig
            db = FirebaseConfig.get_firestore()
            users_collection = db.collection('users')

            user_ids_list = list(all_user_ids)
            for user_id in user_ids_list:
                try:
                    # Fetch user by document ID directly (more reliable)
                    user_doc = users_collection.document(user_id).get()
                    if user_doc.exists:
                        user_info = user_doc.to_dict()
                        full_name = user_info.get('full_name', '')
                        email = user_info.get('email', '')

                        # Filter out "test" names and use email prefix or better fallback
                        if not full_name or full_name.strip() == '' or 'test' in full_name.lower():
                            # Use email prefix (before @) as fallback
                            if email and '@' in email:
                                full_name = email.split('@')[0].replace('.', ' ').title()
                            else:
                                full_name = 'User'
                        else:
                            # Use only the first part of the actual name (first name)
                            name_parts = full_name.strip().split()
                            full_name = name_parts[0] if name_parts else 'User'

                        user_data_map[user_id] = {
                            'full_name': full_name,
                            'role': user_info.get('role', 'employee')
                        }
                except Exception as e:
                    pass
        
        # Update participant data with fresh user info
        for conv_id, participants_list in all_participants.items():
            for p in participants_list:
                user_id = p.get('user_id')
                if user_id in user_data_map:
                    p['user_name'] = user_data_map[user_id]['full_name']
                    p['user_role'] = user_data_map[user_id]['role']
                else:
                    # User not found in our batch fetch - use existing name or fallback
                    current_name = p.get('user_name', '')
                    if not current_name or current_name.strip() == '' or 'test' in current_name.lower():
                        p['user_name'] = 'User'
                    else:
                        # Use first name only
                        name_parts = current_name.strip().split()
                        p['user_name'] = name_parts[0] if name_parts else 'User'

                # Final check: ensure no "test" slips through
                final_name = p.get('user_name', '')
                if 'test' in final_name.lower():
                    p['user_name'] = 'User'

        # PERFORMANCE: Batch fetch all incident data at once
        incident_ids = [
            data.get('incident_id') for data in conversations_data
            if data.get('conversation_type') == ConversationType.INCIDENT_CHAT.value and data.get('incident_id')
        ]

        incident_data_map = {}
        if incident_ids:
            for incident_id in incident_ids:
                incident_data = await self._get_cached_incident(incident_id)
                if incident_data:
                    incident_data_map[incident_id] = incident_data

        conversations = []
        for data in conversations_data:
            try:
                conv_id = data.get('id')

                # Filter by conversation type if specified
                conv_type_str = data.get('conversation_type')
                conv_type = ConversationType(conv_type_str) if conv_type_str else None

                if conversation_type and conv_type != conversation_type:
                    continue

                # Role-based filtering
                if user_role == "employee" and conv_type == ConversationType.TEAM_INTERNAL:
                    continue

                # Add participants from batch-loaded data
                data['participants'] = all_participants.get(conv_id, [])
                data['participant_count'] = len(data['participants'])
                data['conversation_type'] = conv_type
                data['status'] = ConversationStatus(data.get('status', 'active'))

                # Use pre-fetched incident data
                if conv_type == ConversationType.INCIDENT_CHAT and data.get('incident_id'):
                    incident = incident_data_map.get(data['incident_id'])
                    if incident:
                        data['incident_title'] = incident.get('title', data.get('title', 'Incident'))
                        reporter_name = incident.get('reporter_name', '')
                        reporter_id = incident.get('reporter_id', '')
                        if reporter_name and reporter_name not in ['Unknown', 'User', '']:
                            name_parts = reporter_name.strip().split()
                            first_name = name_parts[0] if name_parts else reporter_name
                            for p in data.get('participants', []):
                                if p.get('user_role') == 'employee' or p.get('user_id') == reporter_id:
                                    if p.get('user_name') in ['User', 'Employee', 'Unknown', '', None]:
                                        p['user_name'] = first_name
                    else:
                        data['incident_title'] = data.get('title', 'Incident')

                conversations.append(ConversationResponse(**data))
            except Exception:
                continue

        # Sort by last message time
        conversations.sort(key=lambda x: x.last_message_time or x.created_at, reverse=True)

        # Apply pagination
        return conversations[offset:offset + limit]

    async def get_incident_conversation(self, incident_id: str) -> Optional[ConversationResponse]:
        """Get the conversation for a specific incident"""
        query = self.conversations_collection.where('incident_id', '==', incident_id).where('conversation_type', '==', ConversationType.INCIDENT_CHAT.value)
        docs = list(query.stream())
        
        if docs:
            return await self.get_conversation(docs[0].id)
        return None

    async def create_incident_conversation(
        self,
        incident_id: str,
        reporter_id: str,
        reporter_name: str,
        assigned_to: Optional[str] = None,
        target_members: Optional[List[str]] = None
    ) -> ConversationResponse:
        """Create conversation for an incident"""
        participants = [reporter_id]
        
        # Get incident details for title
        incident_title = "Incident"
        try:
            from app.services.incidents.incident_service import IncidentService
            incident_service = IncidentService()
            incident = await incident_service.get_incident(incident_id)
            if incident:
                incident_title = incident.get('title', 'Incident')
        except Exception as e:
            print(f"Warning: Could not fetch incident title: {e}")
        
        if target_members:
            # Add specific target members (for targeted conversations)
            participants.extend(target_members)
        elif assigned_to:
            # Add assigned member only
            participants.append(assigned_to)
        else:
            # Add all security team members (fallback for general conversations)
            try:
                from app.core.firebase_config import FirebaseConfig
                db = FirebaseConfig.get_firestore()
                users_collection = db.collection('users')
                
                # Get all security team members
                security_team_query = users_collection.where('role', '==', 'security_team')
                security_team_docs = security_team_query.stream()
                
                for doc in security_team_docs:
                    user_data = doc.to_dict()
                    if user_data.get('uid') not in participants:
                        participants.append(user_data.get('uid'))
                        
            except Exception as e:
                print(f"Warning: Could not add security team to conversation: {e}")
        
        # Remove duplicates
        participants = list(set(participants))
        
        conversation_data = ConversationCreate(
            conversation_type=ConversationType.INCIDENT_CHAT,
            incident_id=incident_id,
            participants=participants,
            title=incident_title,  # Use incident title instead of ID
            is_private=len(participants) <= 2  # Private if just 2 people
        )
        
        return await self.create_conversation(
            conversation_data,
            reporter_id,
            reporter_name,
            "employee"
        )

    async def add_participant(
        self,
        conversation_id: str,
        user_id: str,
        user_name: str,
        user_role: str
    ) -> bool:
        """Add participant to conversation"""
        participant_id = f"{conversation_id}_{user_id}"
        
        participant_doc = {
            'id': participant_id,
            'conversation_id': conversation_id,
            'user_id': user_id,
            'user_name': user_name,
            'user_role': user_role,
            'joined_at': datetime.utcnow(),
            'is_active': True,
            'last_read_at': None
        }
        
        self.participants_collection.document(participant_id).set(participant_doc)
        return True

    async def get_conversation_participants(self, conversation_id: str) -> List[ConversationParticipant]:
        """Get all participants for a conversation"""
        query = self.participants_collection.where('conversation_id', '==', conversation_id).where('is_active', '==', True)
        docs = query.stream()
        
        participants = []
        for doc in docs:
            data = doc.to_dict()
            participants.append(ConversationParticipant(**data))
        
        return participants

    async def update_last_message(
        self,
        conversation_id: str,
        message_id: str,
        message_content: str,
        sender_name: str
    ) -> bool:
        """Update conversation's last message info"""
        try:
            self.conversations_collection.document(conversation_id).update({
                'last_message_id': message_id,
                'last_message_content': message_content[:100],  # Truncate for preview
                'last_message_sender': sender_name,
                'last_message_time': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'total_messages': self.db.collection('messages').where('incident_id', '==', conversation_id).count()
            })
            return True
        except Exception as e:
            print(f"Error updating last message: {e}")
            return False

    async def check_user_permission(
        self,
        conversation_id: str,
        user_id: str,
        user_role: str,
        action: str = "read"
    ) -> bool:
        """Check if user has permission for an action on conversation - OPTIMIZED"""

        # Admin has full access - no DB query needed
        if user_role == "admin":
            return True

        # Security team has access to incident chats - minimal query
        if user_role == "security_team":
            return True

        # For employees, just check if they're a participant - FAST query
        participant_doc = self.participants_collection.document(f"{conversation_id}_{user_id}").get()
        return participant_doc.exists

    async def get_team_internal_conversations(self, user_role: str) -> List[ConversationResponse]:
        """Get all team internal conversations for security team - OPTIMIZED"""
        if user_role not in ["security_team", "admin"]:
            return []

        # Batch fetch all team_internal conversations
        query = self.conversations_collection.where('conversation_type', '==', ConversationType.TEAM_INTERNAL.value)
        docs = list(query.stream())

        if not docs:
            return []

        conversations_data = [doc.to_dict() for doc in docs]
        conversation_ids = [data.get('id') for data in conversations_data]

        # Batch load all participants for these conversations
        all_participants = {}
        for i in range(0, len(conversation_ids), 10):
            batch_ids = conversation_ids[i:i+10]
            participant_docs = self.participants_collection.where('conversation_id', 'in', batch_ids).stream()
            for pdoc in participant_docs:
                pdata = pdoc.to_dict()
                conv_id = pdata.get('conversation_id')
                if conv_id not in all_participants:
                    all_participants[conv_id] = []
                all_participants[conv_id].append(pdata)

        # Batch fetch user data for all participants
        all_user_ids = set()
        for participants_list in all_participants.values():
            for p in participants_list:
                all_user_ids.add(p.get('user_id'))

        # Also add creator IDs
        for data in conversations_data:
            if data.get('created_by'):
                all_user_ids.add(data.get('created_by'))

        user_data_map = await self._batch_get_users(list(all_user_ids))

        # Build conversation responses
        conversations = []
        for data in conversations_data:
            try:
                conv_id = data.get('id')

                # Add participants from batch-loaded data
                participants = all_participants.get(conv_id, [])
                for p in participants:
                    user_id = p.get('user_id')
                    if user_id in user_data_map:
                        p['user_name'] = user_data_map[user_id]['user_name']
                        p['user_role'] = user_data_map[user_id]['user_role']

                data['participants'] = participants
                data['participant_count'] = len(participants)
                data['conversation_type'] = ConversationType(data['conversation_type'])
                data['status'] = ConversationStatus(data.get('status', 'active'))

                conversations.append(ConversationResponse(**data))
            except Exception:
                continue

        return sorted(conversations, key=lambda x: x.updated_at or x.created_at, reverse=True)