"""
User Activity Service - Track user online status and activity
"""

from datetime import datetime, timedelta
from typing import List, Optional
from app.core.firebase_config import FirebaseConfig
from app.models.user_activity import UserActivity, UserStatus, ActivityType, OnlineStatusResponse, TeamStatusResponse
from app.models.common import UserRole
import logging

logger = logging.getLogger(__name__)

class UserActivityService:
    def __init__(self):
        self.db = FirebaseConfig.get_firestore()
        self.online_threshold_minutes = 15  # Consider user offline after 15 minutes of inactivity
        
    async def track_user_activity(
        self, 
        user_id: str, 
        activity_type: ActivityType,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        endpoint: Optional[str] = None
    ) -> bool:
        """Track user activity in database"""
        try:
            activity = UserActivity(
                user_id=user_id,
                activity_type=activity_type,
                timestamp=datetime.utcnow(),
                ip_address=ip_address,
                user_agent=user_agent,
                endpoint=endpoint
            )
            
            # Store activity in user_activities collection
            activity_ref = self.db.collection('user_activities').document()
            activity_data = activity.dict()
            activity_data['id'] = activity_ref.id
            activity_ref.set(activity_data)
            
            # Update user status
            await self._update_user_status(user_id, activity_type)
            
            logger.info(f"Tracked activity for user {user_id}: {activity_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error tracking user activity: {str(e)}")
            return False
    
    async def _update_user_status(self, user_id: str, activity_type: ActivityType):
        """Update user's current status"""
        try:
            now = datetime.utcnow()
            user_status_ref = self.db.collection('user_status').document(user_id)
            
            # Get existing status
            status_doc = user_status_ref.get()
            
            if activity_type == ActivityType.LOGIN:
                status_data = {
                    'user_id': user_id,
                    'is_online': True,
                    'last_activity': now,
                    'last_login': now,
                    'last_logout': None
                }
            elif activity_type == ActivityType.LOGOUT:
                existing_data = status_doc.to_dict() if status_doc.exists else {}
                last_login = existing_data.get('last_login')
                session_duration = None
                if last_login:
                    session_duration = int((now - last_login.replace(tzinfo=None)).total_seconds() / 60)
                
                status_data = {
                    'user_id': user_id,
                    'is_online': False,
                    'last_activity': now,
                    'last_logout': now,
                    'session_duration': session_duration
                }
            else:  # HEARTBEAT or API_CALL
                status_data = {
                    'user_id': user_id,
                    'is_online': True,
                    'last_activity': now
                }
            
            user_status_ref.set(status_data, merge=True)
            
        except Exception as e:
            logger.error(f"Error updating user status: {str(e)}")
    
    async def get_user_status(self, user_id: str) -> Optional[UserStatus]:
        """Get current status of a specific user"""
        try:
            status_doc = self.db.collection('user_status').document(user_id).get()
            if status_doc.exists:
                data = status_doc.to_dict()
                return UserStatus(**data)
            return None
        except Exception as e:
            logger.error(f"Error getting user status: {str(e)}")
            return None
    
    async def is_user_online(self, user_id: str) -> bool:
        """Check if user is currently online"""
        try:
            status = await self.get_user_status(user_id)
            if not status:
                return False
            
            # Check if user is marked online and last activity was within threshold
            if status.is_online:
                time_diff = datetime.utcnow() - status.last_activity.replace(tzinfo=None)
                return time_diff.total_seconds() < (self.online_threshold_minutes * 60)
            
            return False
        except Exception as e:
            logger.error(f"Error checking user online status: {str(e)}")
            return False
    
    async def get_team_online_status(self) -> TeamStatusResponse:
        """Get online status of all security team members"""
        try:
            # Get only security team members (excluding admin)
            users_ref = self.db.collection('users')
            security_members_query = users_ref.where('role', '==', 'security_team').where('is_active', '==', True)
            security_members = security_members_query.stream()
            
            team_members = []
            online_count = 0
            
            for member_doc in security_members:
                member_data = member_doc.to_dict()
                user_id = member_data['uid']
                
                # Get user status
                is_online = await self.is_user_online(user_id)
                status = await self.get_user_status(user_id)
                
                if is_online:
                    online_count += 1
                
                member_status = OnlineStatusResponse(
                    user_id=user_id,
                    email=member_data['email'],
                    full_name=member_data['full_name'],
                    role=member_data['role'],
                    is_online=is_online,
                    last_activity=status.last_activity if status else datetime.utcnow(),
                    last_login=status.last_login if status else None
                )
                team_members.append(member_status)
            
            return TeamStatusResponse(
                total_members=len(team_members),
                online_members=online_count,
                members=team_members
            )
            
        except Exception as e:
            logger.error(f"Error getting team online status: {str(e)}")
            return TeamStatusResponse(
                total_members=0,
                online_members=0,
                members=[]
            )
    
    async def cleanup_old_activities(self, days_to_keep: int = 30):
        """Clean up old activity records"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            activities_ref = self.db.collection('user_activities')
            old_activities = activities_ref.where('timestamp', '<', cutoff_date).stream()
            
            batch = self.db.batch()
            count = 0
            
            for activity_doc in old_activities:
                batch.delete(activity_doc.reference)
                count += 1
                
                # Firestore batch limit is 500
                if count >= 500:
                    batch.commit()
                    batch = self.db.batch()
                    count = 0
            
            if count > 0:
                batch.commit()
            
            logger.info(f"Cleaned up old user activities older than {days_to_keep} days")
            
        except Exception as e:
            logger.error(f"Error cleaning up old activities: {str(e)}")
    
    async def update_offline_users(self):
        """Mark users as offline if they haven't been active"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=self.online_threshold_minutes)
            
            # Get all users marked as online
            status_ref = self.db.collection('user_status')
            online_users = status_ref.where('is_online', '==', True).stream()
            
            batch = self.db.batch()
            count = 0
            
            for status_doc in online_users:
                status_data = status_doc.to_dict()
                last_activity = status_data.get('last_activity')
                
                if last_activity and last_activity.replace(tzinfo=None) < cutoff_time:
                    # Mark user as offline
                    batch.update(status_doc.reference, {
                        'is_online': False,
                        'last_logout': datetime.utcnow()
                    })
                    count += 1
            
            if count > 0:
                batch.commit()
                logger.info(f"Marked {count} inactive users as offline")
            
        except Exception as e:
            logger.error(f"Error updating offline users: {str(e)}")