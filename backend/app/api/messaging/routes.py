"""
Enhanced Messaging API Routes
Handles conversations, real-time messaging, and WebSocket connections
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status, Query, Depends
from firebase_admin import auth
from typing import Optional, List
import json
import time
from collections import defaultdict

from app.services.messaging.connection_manager import ConnectionManager
from app.services.incidents.messaging_service import MessagingService
from app.services.messaging.conversation_service import ConversationService
from app.models.message import Message, MessageCreate
from app.models.conversation import (
    ConversationCreate, ConversationResponse, ConversationType,
    ConversationListResponse
)
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(tags=["Messaging"])

# WebSocket connection manager
manager = ConnectionManager()

# Rate limiting for connections (user_id -> last_connection_time)
connection_attempts = defaultdict(list)

@router.get("/conversations")
async def get_conversations(
    conversation_type: Optional[ConversationType] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends()
):
    """Get all conversations for the current user"""
    try:
        conversations = await conversation_service.get_user_conversations(
            current_user.uid,
            current_user.role.value,
            conversation_type,
            limit,
            offset
        )

        return {
            "conversations": conversations,
            "total": len(conversations),
            "page": (offset // limit) + 1,
            "per_page": limit,
            "has_next": len(conversations) == limit,
            "has_prev": offset > 0
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve conversations: {str(e)}"
        )

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends()
):
    """Create a new conversation"""
    try:
        # Permission checks
        if conversation_data.conversation_type == ConversationType.TEAM_INTERNAL:
            if current_user.role.value not in ["security_team", "admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only security team can create internal conversations"
                )
        
        conversation = await conversation_service.create_conversation(
            conversation_data,
            current_user.uid,
            current_user.full_name,
            current_user.role.value
        )
        
        return conversation
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends()
):
    """Get specific conversation details"""
    try:
        # Check permissions
        has_permission = await conversation_service.check_user_permission(
            conversation_id,
            current_user.uid,
            current_user.role.value,
            "read"
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this conversation"
            )
        
        conversation = await conversation_service.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve conversation: {str(e)}"
        )

@router.get("/conversations/incident/{incident_id}", response_model=ConversationResponse)
async def get_incident_conversation(
    incident_id: str,
    target_member: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends()
):
    """Get or create conversation for an incident - OPTIMIZED"""
    try:
        # Quick permission check without full conversation load
        if current_user.role.value == "employee":
            # For employees, verify they own the incident
            from app.services.incidents.incident_service import IncidentService
            incident_service = IncidentService()
            incident = await incident_service.get_incident(incident_id)

            if not incident:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Incident not found"
                )

            reporter_id = incident.get('reporter_id')
            if current_user.uid != reporter_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only access conversations for your own incidents"
                )
        else:
            # Security team/admin - quick incident existence check
            from app.services.incidents.incident_service import IncidentService
            incident_service = IncidentService()
            incident = await incident_service.get_incident(incident_id)

            if not incident:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Incident not found"
                )

            reporter_id = incident.get('reporter_id')

        assigned_to = incident.get('assigned_to')

        # Check if conversation exists - uses caching
        conversation = await conversation_service.get_incident_conversation(incident_id)

        if not conversation:
            # Create new incident conversation
            target_members = [target_member] if target_member else None
            conversation = await conversation_service.create_incident_conversation(
                incident_id,
                reporter_id,
                incident.get('reporter_name', 'Reporter'),
                assigned_to=assigned_to,
                target_members=target_members
            )
        else:
            # Quick participant check - no need to reload full conversation
            is_participant = any(p.user_id == current_user.uid for p in conversation.participants)

            if not is_participant:
                if current_user.role.value == "security_team" or current_user.uid == reporter_id:
                    await conversation_service.add_participant(
                        conversation.id,
                        current_user.uid,
                        current_user.full_name,
                        current_user.role.value
                    )
                    # Only refresh if we added a participant
                    conversation = await conversation_service.get_conversation(conversation.id)

        # Permission already verified above - skip redundant check
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get incident conversation: {str(e)}"
        )

@router.post("/conversations/{conversation_id}/messages")
async def send_message_to_conversation(
    conversation_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(),
    messaging_service: MessagingService = Depends()
):
    """Send message to a conversation"""
    try:
        # Check permissions
        has_permission = await conversation_service.check_user_permission(
            conversation_id,
            current_user.uid,
            current_user.role.value,
            "write"
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to send messages to this conversation"
            )
        
        # Send message (using incident_id field for compatibility)
        message = await messaging_service.send_message(
            incident_id=conversation_id,
            sender_id=current_user.uid,
            sender_name=current_user.full_name,
            sender_role=current_user.role.value,
            content=message_data.content,
            message_type=message_data.message_type
        )
        
        # Update conversation's last message
        await conversation_service.update_last_message(
            conversation_id,
            message.id,
            message_data.content,
            current_user.full_name
        )
        
        # Broadcast to conversation participants with proper message structure
        message_dict = {
            "id": message.id,
            "sender_id": message.sender_id,
            "sender_name": message.sender_name,
            "sender_role": message.sender_role,
            "content": message.content,
            "message_type": message.message_type.value if hasattr(message.message_type, 'value') else message.message_type,
            "created_at": message.created_at.isoformat() if hasattr(message.created_at, 'isoformat') else str(message.created_at),
            "attachments": message.attachments,
            "is_read": message.is_read
        }
        
        await manager.broadcast_to_room(f"conversation_{conversation_id}", json.dumps({
            "type": "incident_message",
            "conversation_id": conversation_id,
            "incident_id": conversation_id,  # For backward compatibility
            "message": message_dict,
            "sender": current_user.full_name,
            "user_id": current_user.uid,
            "timestamp": message.created_at.isoformat() if hasattr(message.created_at, 'isoformat') else str(message.created_at)
        }))
        
        return {"message": "Message sent successfully", "message_id": message.id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(),
    messaging_service: MessagingService = Depends()
):
    """Get all messages for a conversation"""
    try:
        # Check permissions
        has_permission = await conversation_service.check_user_permission(
            conversation_id,
            current_user.uid,
            current_user.role.value,
            "read"
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to read messages in this conversation"
            )
        
        # Get messages (using incident_id field for compatibility)
        messages = await messaging_service.get_incident_messages(conversation_id)
        
        return {"messages": [msg.dict() for msg in messages]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve messages: {str(e)}"
        )

@router.get("/team-conversations")
async def get_team_internal_conversations(
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends()
):
    """Get all team internal conversations for security team - OPTIMIZED"""
    try:
        if current_user.role.value not in ["security_team", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only security team can access team conversations"
            )

        conversations = await conversation_service.get_team_internal_conversations(
            current_user.role.value
        )

        # Format response for frontend TeamChatRoom interface
        formatted_conversations = []
        for conv in conversations:
            # Find creator name from participants
            creator_name = "Unknown"
            for p in conv.participants:
                if p.user_id == conv.created_by:
                    creator_name = p.user_name
                    break

            # Format last message as object
            last_message = None
            if conv.last_message_content:
                last_message = {
                    "content": conv.last_message_content,
                    "sender_name": conv.last_message_sender or "Unknown",
                    "created_at": conv.last_message_time.isoformat() if conv.last_message_time else None
                }

            formatted_conversations.append({
                "id": conv.id,
                "title": conv.title or "Team Chat",
                "created_by": conv.created_by,
                "created_by_name": creator_name,
                "participants": [
                    {
                        "user_id": p.user_id if hasattr(p, 'user_id') else p.get('user_id'),
                        "user_name": p.user_name if hasattr(p, 'user_name') else p.get('user_name', 'Unknown'),
                        "user_role": p.user_role if hasattr(p, 'user_role') else p.get('user_role', 'security_team')
                    }
                    for p in conv.participants
                ],
                "last_message": last_message,
                "unread_count": 0,  # TODO: Implement unread count
                "created_at": conv.created_at.isoformat() if conv.created_at else None
            })

        return {"conversations": formatted_conversations}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve team conversations: {str(e)}"
        )

@router.get("/ws/test")
async def test_websocket_connection():
    """Test endpoint to check WebSocket service status"""
    return {
        "status": "WebSocket service is running",
        "active_connections": len(manager.active_connections),
        "room_connections": len(manager.room_connections),
        "connection_details": {
            "active_users": list(manager.active_connections.keys()),
            "rooms": list(manager.room_connections.keys())
        },
        "recent_connection_attempts": {
            user_id: {
                "count": len(attempts),
                "last_attempt": attempts[-1] if attempts else None
            }
            for user_id, attempts in connection_attempts.items() 
            if attempts and time.time() - attempts[-1] < 300  # Last 5 minutes
        },
        "endpoints": {
            "general": "/api/messaging/ws/general?token=<firebase_token>&user_id=<user_id>",
            "incident": "/api/messaging/ws/<incident_id>?token=<firebase_token>"
        }
    }

@router.post("/ws/disconnect/{user_id}")
async def force_disconnect_user(user_id: str):
    """Force disconnect a user (for debugging)"""
    if user_id in manager.active_connections:
        try:
            await manager.active_connections[user_id].close(code=status.WS_1000_NORMAL_CLOSURE, reason="Admin disconnect")
            manager.disconnect(manager.active_connections[user_id], user_id)
            return {"message": f"User {user_id} disconnected successfully"}
        except Exception as e:
            return {"error": f"Failed to disconnect user {user_id}: {str(e)}"}
    else:
        return {"message": f"User {user_id} is not connected"}

async def authenticate_websocket(websocket: WebSocket, token: str) -> Optional[dict]:
    """Authenticate WebSocket connection using Firebase ID token"""
    try:
        print(f"DEBUG: Attempting WebSocket authentication with token: {token[:20]}...")
        
        # Verify Firebase ID token
        decoded_token = auth.verify_id_token(token)
        
        # Check token expiration
        current_time = time.time()
        token_exp = decoded_token.get('exp', 0)
        time_until_exp = token_exp - current_time
        
        print(f"DEBUG: WebSocket authentication successful for user: {decoded_token.get('email')}")
        print(f"DEBUG: Token expires in {time_until_exp:.0f} seconds")
        
        if time_until_exp < 300:  # Less than 5 minutes
            print(f"WARNING: Token expires soon ({time_until_exp:.0f}s), user should refresh")
        
        return {
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email'),
            'user_id': decoded_token['uid'],
            'expires_in': time_until_exp
        }
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"DEBUG: WebSocket authentication failed ({error_type}): {error_msg}")
        print(f"DEBUG: Token that failed: {token[:50]}...")
        
        # Specific handling for token expiration
        if "expired" in error_msg.lower() or "token" in error_msg.lower():
            print(f"DEBUG: Token appears to be expired or invalid")
        
        return None

@router.websocket("/ws/general")
async def websocket_general_endpoint(websocket: WebSocket, token: str = Query(...), user_id: str = Query(...)):
    """
    WebSocket endpoint for general messaging
    """
    # Accept the WebSocket connection first
    await websocket.accept()
    
    current_time = time.time()
    print(f"DEBUG: WebSocket connection attempt for user_id: {user_id} at {current_time}")
    
    # Rate limiting: Allow max 5 connections per minute per user
    connection_attempts[user_id] = [t for t in connection_attempts[user_id] if current_time - t < 60]
    if len(connection_attempts[user_id]) >= 5:
        print(f"DEBUG: Rate limit exceeded for user {user_id} - {len(connection_attempts[user_id])} attempts in last minute")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Too many connection attempts - please wait before retrying")
        return
    
    connection_attempts[user_id].append(current_time)
    
    # Check if user already has an active connection
    if user_id in manager.active_connections:
        print(f"DEBUG: User {user_id} already has an active connection, closing old connection")
        try:
            old_websocket = manager.active_connections[user_id]
            await old_websocket.close(code=status.WS_1000_NORMAL_CLOSURE, reason="New connection established")
        except:
            pass
        manager.disconnect(old_websocket, user_id)
    
    # Authenticate the connection
    user_data = await authenticate_websocket(websocket, token)
    if not user_data:
        print(f"DEBUG: WebSocket authentication failed for user_id: {user_id}")
        
        # Check if this might be a token expiration issue
        attempt_count = len(connection_attempts[user_id])
        if attempt_count > 2:
            print(f"DEBUG: Multiple failed attempts ({attempt_count}) detected - likely token expiration")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed - token may be expired, please refresh your session")
        else:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return
    
    # Verify user_id matches token
    if user_data['uid'] != user_id:
        print(f"DEBUG: User ID mismatch. Token UID: {user_data['uid']}, Provided UID: {user_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User ID mismatch")
        return
    
    # Check if token is expiring soon
    if user_data.get('expires_in', 0) < 300:  # Less than 5 minutes
        print(f"WARNING: User {user_id} connecting with token that expires in {user_data.get('expires_in', 0):.0f} seconds")
    
    await manager.connect(websocket, user_id)
    
    # Send a welcome message to confirm connection
    try:
        welcome_message = {
            'type': 'connection_established',
            'message': 'WebSocket connection successful',
            'user_id': user_id,
            'token_expires_in': user_data.get('expires_in', 0)
        }
        await websocket.send_text(json.dumps(welcome_message))
        print(f"DEBUG: Sent welcome message to {user_id}")
    except Exception as e:
        print(f"Failed to send welcome message: {str(e)}")
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            print(f"DEBUG: Received WebSocket message from {user_id}: {data[:100]}")
            try:
                message_data = json.loads(data)
                
                # Handle ping/pong for connection health
                if message_data.get('type') == 'ping':
                    await websocket.send_text(json.dumps({
                        'type': 'pong',
                        'timestamp': message_data.get('timestamp'),
                        'token_expires_in': user_data.get('expires_in', 0)
                    }))
                    continue
                
                # Handle token refresh requests
                if message_data.get('type') == 'token_refresh':
                    await websocket.send_text(json.dumps({
                        'type': 'token_refresh_required',
                        'message': 'Please refresh your authentication token and reconnect'
                    }))
                    continue
                
                # Broadcast message to all connected users
                await manager.broadcast(json.dumps({
                    'type': 'message',
                    'user_id': user_id,
                    'message': message_data,
                    'timestamp': message_data.get('timestamp')
                }))
            except json.JSONDecodeError:
                # Handle invalid JSON
                await websocket.send_text(json.dumps({
                    'type': 'error',
                    'message': 'Invalid message format'
                }))
            
    except WebSocketDisconnect:
        print(f"DEBUG: WebSocket disconnect for user {user_id}")
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"DEBUG: WebSocket error for user {user_id}: {str(e)}")
        manager.disconnect(websocket, user_id)

@router.websocket("/ws/{conversation_id}")
async def websocket_conversation_endpoint(websocket: WebSocket, conversation_id: str, token: str = Query(...)):
    """
    WebSocket endpoint for conversation-specific messaging
    """
    # Accept the WebSocket connection first
    await websocket.accept()
    
    # Authenticate the connection
    user_data = await authenticate_websocket(websocket, token)
    if not user_data:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return
    
    user_id = user_data['uid']
    room_id = f"conversation_{conversation_id}"
    
    await manager.connect(websocket, user_id, room_id)
    
    # Send confirmation message
    try:
        welcome_message = {
            'type': 'connection_established',
            'message': f'Connected to conversation {conversation_id}',
            'conversation_id': conversation_id,
            'user_id': user_id
        }
        await websocket.send_text(json.dumps(welcome_message))
    except Exception as e:
        print(f"Failed to send welcome message: {str(e)}")
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                
                # Handle room join requests
                if message_data.get('type') == 'join_room':
                    requested_room = message_data.get('room_id')
                    if requested_room == room_id:
                        await websocket.send_text(json.dumps({
                            'type': 'room_joined',
                            'room_id': room_id,
                            'message': f'Successfully joined {room_id}'
                        }))
                    continue
                
                # Handle ping/pong for connection health
                if message_data.get('type') == 'ping':
                    await websocket.send_text(json.dumps({
                        'type': 'pong',
                        'timestamp': message_data.get('timestamp')
                    }))
                    continue
                
                # Handle direct WebSocket messages - extract the message content
                if 'message' in message_data and isinstance(message_data['message'], dict):
                    # This is a structured message from frontend
                    msg_content = message_data['message']
                    
                    broadcast_data = {
                        'type': 'incident_message',
                        'conversation_id': conversation_id,
                        'user_id': user_id,
                        'message': {
                            'id': msg_content.get('id'),
                            'sender_id': msg_content.get('sender_id'),
                            'sender_name': msg_content.get('sender_name'),
                            'sender_role': msg_content.get('sender_role'),
                            'content': msg_content.get('content'),
                            'created_at': msg_content.get('created_at'),
                            'message_type': msg_content.get('message_type', 'text'),
                            'attachments': msg_content.get('attachments', []),
                            'is_read': False
                        },
                        'sender': msg_content.get('sender_name'),
                        'timestamp': message_data.get('timestamp')
                    }
                else:
                    # Fallback for simple message format
                    broadcast_data = {
                        'type': 'incident_message',
                        'conversation_id': conversation_id,
                        'user_id': user_id,
                        'message': message_data,
                        'timestamp': message_data.get('timestamp')
                    }
                
                await manager.broadcast_to_room(room_id, json.dumps(broadcast_data))
            except json.JSONDecodeError:
                # Handle invalid JSON
                await websocket.send_text(json.dumps({
                    'type': 'error',
                    'message': 'Invalid message format'
                }))
            
    except WebSocketDisconnect:
        print(f"WebSocket disconnect for user {user_id} from conversation {conversation_id}")
        manager.disconnect(websocket, user_id, room_id)
    except Exception as e:
        print(f"WebSocket error for user {user_id} in conversation {conversation_id}: {str(e)}")
        manager.disconnect(websocket, user_id, room_id)