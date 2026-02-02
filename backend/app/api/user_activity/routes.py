"""
User Activity API Routes - Online status and activity tracking
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from app.models.user_activity import TeamStatusResponse, OnlineStatusResponse, ActivityType
from app.services.user_activity.activity_service import UserActivityService
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.common import UserRole
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/team-status", response_model=TeamStatusResponse)
async def get_team_status(
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends()
):
    """
    Get online status of all security team members
    Available to security team and admin users
    """
    # Check if user has permission to view team status
    if current_user.role not in [UserRole.SECURITY_TEAM, UserRole.ADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Only security team members can view team status"
        )
    
    try:
        team_status = await activity_service.get_team_online_status()
        return team_status
    except Exception as e:
        logger.error(f"Error getting team status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve team status"
        )

@router.post("/heartbeat")
async def send_heartbeat(
    request: Request,
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends()
):
    """
    Send heartbeat to indicate user is still active
    Should be called periodically by frontend
    """
    try:
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent")
        
        success = await activity_service.track_user_activity(
            user_id=current_user.uid,
            activity_type=ActivityType.HEARTBEAT,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to record heartbeat"
            )
        
        return {"message": "Heartbeat recorded", "timestamp": ""}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording heartbeat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to record heartbeat"
        )

@router.post("/login")
async def track_login(
    request: Request,
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends()
):
    """
    Track user login activity
    Should be called when user successfully logs in
    """
    try:
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent")
        
        success = await activity_service.track_user_activity(
            user_id=current_user.uid,
            activity_type=ActivityType.LOGIN,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to track login"
            )
        
        return {"message": "Login tracked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking login: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to track login"
        )

@router.post("/logout")
async def track_logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends()
):
    """
    Track user logout activity
    Should be called when user logs out
    """
    try:
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent")
        
        success = await activity_service.track_user_activity(
            user_id=current_user.uid,
            activity_type=ActivityType.LOGOUT,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to track logout"
            )
        
        return {"message": "Logout tracked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking logout: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to track logout"
        )

@router.get("/status/{user_id}")
async def get_user_status(
    user_id: str,
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends()
):
    """
    Get online status of a specific user
    Available to security team and admin users
    """
    # Check permissions
    if current_user.role not in [UserRole.SECURITY_TEAM, UserRole.ADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Only security team members can view user status"
        )
    
    try:
        is_online = await activity_service.is_user_online(user_id)
        status = await activity_service.get_user_status(user_id)
        
        return {
            "user_id": user_id,
            "is_online": is_online,
            "last_activity": status.last_activity if status else None,
            "last_login": status.last_login if status else None
        }
        
    except Exception as e:
        logger.error(f"Error getting user status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve user status"
        )