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
                    user_name = user_data.get('full_name', 'Unknown User')
                    user_role = user_data.get('role', 'employee')
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

    async def get_conversation(self, conversation_id: str) -> Optional[ConversationResponse]:
        """Get conversation with participants"""
        doc = self.conversations_collection.document(conversation_id).get()
        
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        
        # Get participants
        participants = await self.get_conversation_participants(conversation_id)
        data['participants'] = [p.dict() for p in participants]
        data['participant_count'] = len(participants)
        
        # Convert enum strings back to enums
        data['conversation_type'] = ConversationType(data['conversation_type'])
        data['status'] = ConversationStatus(data['status'])
        
        return ConversationResponse(**data)

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

                conversations.append(ConversationResponse(**data))
            except Exception as e:
                print(f"Error processing conversation: {e}")
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
            title=f"Incident Chat - {incident_id}",
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
        """Check if user has permission for an action on conversation"""
        
        # Get conversation
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            return False
        
        # Admin has full access
        if user_role == "admin":
            return True
        
        # Team leader has access to all security-related conversations
        if user_role == "security_team" and user_id == "security.lead@secura.com":
            return True
        
        # Check if user is participant
        is_participant = any(p.user_id == user_id for p in conversation.participants)
        
        if conversation.conversation_type == ConversationType.INCIDENT_CHAT:
            if user_role == "employee":
                # Employee can only access if they're the reporter
                return is_participant
            elif user_role == "security_team":
                # Security team can access if assigned or if it's team leader
                return True  # Security team has access to incident chats
        
        elif conversation.conversation_type == ConversationType.TEAM_INTERNAL:
            # Only security team can access internal conversations
            return user_role in ["security_team", "admin"]
        
        return is_participant

    async def get_team_internal_conversations(self, user_role: str) -> List[ConversationResponse]:
        """Get all team internal conversations for security team"""
        if user_role not in ["security_team", "admin"]:
            return []
        
        query = self.conversations_collection.where('conversation_type', '==', ConversationType.TEAM_INTERNAL.value)
        docs = query.stream()
        
        conversations = []
        for doc in docs:
            conv = await self.get_conversation(doc.id)
            if conv:
                conversations.append(conv)
        
        return sorted(conversations, key=lambda x: x.updated_at, reverse=True)