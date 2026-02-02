"""
WebSocket Connection Manager
Handles WebSocket connections, disconnections, and message broadcasting
"""

from fastapi import WebSocket
from typing import Dict, List, Optional
import json

class ConnectionManager:
    def __init__(self):
        # Store active connections: {user_id: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}
        # Store room-based connections: {room_id: {user_id: WebSocket}}
        self.room_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, room_id: Optional[str] = None):
        """Connect a user to WebSocket"""
        # WebSocket should already be accepted by the route handler
        # await websocket.accept()  # REMOVED - duplicate accept
        
        if room_id:
            # Room-based connection
            if room_id not in self.room_connections:
                self.room_connections[room_id] = {}
            self.room_connections[room_id][user_id] = websocket
        else:
            # General connection
            self.active_connections[user_id] = websocket
        
        print(f"WebSocket connected: user_id={user_id}, room_id={room_id}")

    def disconnect(self, websocket: WebSocket, user_id: str, room_id: Optional[str] = None):
        """Disconnect a user from WebSocket"""
        if room_id:
            # Remove from room connections
            if room_id in self.room_connections and user_id in self.room_connections[room_id]:
                del self.room_connections[room_id][user_id]
                if not self.room_connections[room_id]:
                    # Remove empty room
                    del self.room_connections[room_id]
        else:
            # Remove from general connections
            if user_id in self.active_connections:
                del self.active_connections[user_id]
        
        print(f"WebSocket disconnected: user_id={user_id}, room_id={room_id}")

    async def send_personal_message(self, message: str, user_id: str):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(message)
            except Exception as e:
                print(f"Failed to send message to {user_id}: {str(e)}")
                # Remove broken connection
                del self.active_connections[user_id]

    async def broadcast(self, message: str):
        """Broadcast a message to all connected users"""
        disconnected_users = []
        
        for user_id, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Failed to broadcast to {user_id}: {str(e)}")
                disconnected_users.append(user_id)
        
        # Remove broken connections
        for user_id in disconnected_users:
            del self.active_connections[user_id]

    async def broadcast_to_room(self, room_id: str, message: str):
        """Broadcast a message to all users in a specific room"""
        if room_id not in self.room_connections:
            return
        
        disconnected_users = []
        
        for user_id, connection in self.room_connections[room_id].items():
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Failed to broadcast to {user_id} in room {room_id}: {str(e)}")
                disconnected_users.append(user_id)
        
        # Remove broken connections
        for user_id in disconnected_users:
            del self.room_connections[room_id][user_id]

    def get_connection_count(self) -> dict:
        """Get the number of active connections"""
        return {
            'general_connections': len(self.active_connections),
            'room_connections': {room_id: len(connections) for room_id, connections in self.room_connections.items()},
            'total_rooms': len(self.room_connections)
        }
    
    async def send_to_user(self, user_id: str, message: str):
        """Send a message to a specific user across all their connections"""
        sent = False
        
        # Check general connections
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(message)
                sent = True
            except Exception as e:
                print(f"Failed to send to user {user_id} in general connections: {str(e)}")
                del self.active_connections[user_id]
        
        # Check room connections
        for room_id, connections in self.room_connections.items():
            if user_id in connections:
                try:
                    await connections[user_id].send_text(message)
                    sent = True
                except Exception as e:
                    print(f"Failed to send to user {user_id} in room {room_id}: {str(e)}")
                    del connections[user_id]
        
        return sent