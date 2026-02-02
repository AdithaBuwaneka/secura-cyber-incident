"""
System Logging Utility
Logs system activities to Firebase for admin dashboard
"""

from datetime import datetime
from app.core.firebase_config import FirebaseConfig

def log_system_activity(user_email: str, action: str, message: str, level: str = "info", ip_address: str = "127.0.0.1"):
    """
    Log system activity to Firebase
    
    Args:
        user_email: Email of the user performing the action
        action: Type of action (login, logout, user_update, etc.)
        message: Human readable message
        level: Log level (info, warning, error, success)
        ip_address: IP address of the user
    """
    try:
        db = FirebaseConfig.get_firestore()
        
        log_entry = {
            "timestamp": datetime.utcnow(),
            "level": level,
            "message": message,
            "user": user_email,
            "action": action,
            "ip_address": ip_address
        }
        
        # Add to system logs collection
        db.collection('system_logs').add(log_entry)
        
    except Exception as e:
        print(f"Failed to log system activity: {str(e)}")

def log_admin_action(admin_email: str, action: str, target_user: str = None, details: str = None):
    """
    Log admin actions for audit trail
    
    Args:
        admin_email: Email of the admin performing the action
        action: Action type (user_role_change, user_status_change, etc.)
        target_user: User being affected by the action
        details: Additional details about the action
    """
    message = f"Admin action: {action}"
    if target_user:
        message += f" for user {target_user}"
    if details:
        message += f" - {details}"
    
    log_system_activity(admin_email, f"admin_{action}", message, "info")

def log_security_event(user_email: str, event_type: str, description: str, level: str = "warning"):
    """
    Log security-related events
    
    Args:
        user_email: User involved in the security event
        event_type: Type of security event
        description: Description of the event
        level: Severity level
    """
    log_system_activity(user_email, f"security_{event_type}", description, level)