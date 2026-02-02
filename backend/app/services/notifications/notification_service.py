from typing import Dict, List, Any, Optional
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from datetime import datetime

from app.core.firebase_config import FirebaseConfig


class NotificationService:
    """Service for handling notifications - Pramudi's Module"""
    
    def __init__(self):
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@secura.com')
        self.sg = SendGridAPIClient(api_key=self.sendgrid_api_key) if self.sendgrid_api_key else None
        self.db = FirebaseConfig.get_firestore()
        self.notifications_collection = self.db.collection('notifications')
    
    async def send_incident_notification(
        self, 
        incident_id: str, 
        incident_title: str, 
        recipient_email: str,
        notification_type: str = "new_incident"
    ) -> bool:
        """Send email notification for incident updates"""
        try:
            if not self.sg:
                print("SendGrid not configured, skipping email notification")
                return False
            
            # Create email content based on notification type
            if notification_type == "new_incident":
                subject = f"New Security Incident: {incident_title}"
                content = f"""
                <h2>New Security Incident Reported</h2>
                <p><strong>Incident ID:</strong> {incident_id}</p>
                <p><strong>Title:</strong> {incident_title}</p>
                <p><strong>Reported:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>Please log in to the Secura platform to review and respond to this incident.</p>
                <br>
                <p>This is an automated notification from Secura Security Platform.</p>
                """
            elif notification_type == "incident_assigned":
                subject = f"Incident Assigned: {incident_title}"
                content = f"""
                <h2>Security Incident Assigned to You</h2>
                <p><strong>Incident ID:</strong> {incident_id}</p>
                <p><strong>Title:</strong> {incident_title}</p>
                <p><strong>Assigned:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>Please log in to the Secura platform to begin investigation.</p>
                <br>
                <p>This is an automated notification from Secura Security Platform.</p>
                """
            elif notification_type == "incident_resolved":
                subject = f"Incident Resolved: {incident_title}"
                content = f"""
                <h2>Security Incident Resolved</h2>
                <p><strong>Incident ID:</strong> {incident_id}</p>
                <p><strong>Title:</strong> {incident_title}</p>
                <p><strong>Resolved:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>The incident has been successfully resolved.</p>
                <br>
                <p>This is an automated notification from Secura Security Platform.</p>
                """
            else:
                subject = f"Incident Update: {incident_title}"
                content = f"""
                <h2>Security Incident Update</h2>
                <p><strong>Incident ID:</strong> {incident_id}</p>
                <p><strong>Title:</strong> {incident_title}</p>
                <p><strong>Updated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>The incident status has been updated. Please check the platform for details.</p>
                <br>
                <p>This is an automated notification from Secura Security Platform.</p>
                """
            
            # Create and send email
            from_email = Email(self.from_email)
            to_email = To(recipient_email)
            content = Content("text/html", content)
            mail = Mail(from_email, to_email, subject, content)
            
            response = self.sg.send(mail)
            
            # Log notification in Firestore
            await self._log_notification({
                'type': 'email',
                'recipient': recipient_email,
                'subject': subject,
                'incident_id': incident_id,
                'status': 'sent' if response.status_code == 202 else 'failed',
                'sent_at': datetime.utcnow()
            })
            
            return response.status_code == 202
            
        except Exception as e:
            print(f"Failed to send email notification: {e}")
            return False
    
    async def send_security_alert(
        self, 
        title: str, 
        message: str, 
        severity: str = "medium",
        recipients: List[str] = None
    ) -> bool:
        """Send security alert to security team"""
        try:
            if not self.sg or not recipients:
                return False
            
            # Determine email styling based on severity
            severity_colors = {
                "low": "#28a745",
                "medium": "#ffc107", 
                "high": "#fd7e14",
                "critical": "#dc3545"
            }
            
            color = severity_colors.get(severity.lower(), "#6c757d")
            
            subject = f"[{severity.upper()}] Security Alert: {title}"
            content = f"""
            <div style="border-left: 4px solid {color}; padding-left: 20px;">
                <h2 style="color: {color};">Security Alert - {severity.upper()}</h2>
                <h3>{title}</h3>
                <p>{message}</p>
                <p><strong>Alert Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p><strong>Severity:</strong> {severity.upper()}</p>
            </div>
            <br>
            <p>Please review and take appropriate action.</p>
            <p>This is an automated security alert from Secura Security Platform.</p>
            """
            
            # Send to all recipients
            success_count = 0
            for recipient in recipients:
                try:
                    from_email = Email(self.from_email)
                    to_email = To(recipient)
                    mail_content = Content("text/html", content)
                    mail = Mail(from_email, to_email, subject, mail_content)
                    
                    response = self.sg.send(mail)
                    if response.status_code == 202:
                        success_count += 1
                        
                except Exception as e:
                    print(f"Failed to send alert to {recipient}: {e}")
            
            return success_count > 0
            
        except Exception as e:
            print(f"Failed to send security alert: {e}")
            return False
    
    async def send_compliance_report_notification(
        self, 
        report_type: str, 
        recipient_email: str,
        report_url: Optional[str] = None
    ) -> bool:
        """Send notification for generated compliance reports"""
        try:
            if not self.sg:
                return False
            
            subject = f"{report_type.upper()} Compliance Report Generated"
            content = f"""
            <h2>{report_type.upper()} Compliance Report Ready</h2>
            <p>Your requested compliance report has been generated and is ready for review.</p>
            <p><strong>Report Type:</strong> {report_type.upper()}</p>
            <p><strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            """
            
            if report_url:
                content += f'<p><a href="{report_url}" style="color: #007bff;">Download Report</a></p>'
            
            content += """
            <br>
            <p>This is an automated notification from Secura Security Platform.</p>
            """
            
            from_email = Email(self.from_email)
            to_email = To(recipient_email)
            mail_content = Content("text/html", content)
            mail = Mail(from_email, to_email, subject, mail_content)
            
            response = self.sg.send(mail)
            return response.status_code == 202
            
        except Exception as e:
            print(f"Failed to send compliance report notification: {e}")
            return False
    
    async def send_push_notification(
        self, 
        user_id: str, 
        title: str, 
        body: str, 
        data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Send push notification via Firebase Cloud Messaging"""
        # This would integrate with Firebase Cloud Messaging
        # For now, return a placeholder response
        try:
            # Store notification in Firestore for real-time updates
            await self._log_notification({
                'type': 'push',
                'user_id': user_id,
                'title': title,
                'body': body,
                'data': data or {},
                'status': 'sent',
                'sent_at': datetime.utcnow()
            })
            
            return {
                'success': True,
                'message_id': f'push_{user_id}_{int(datetime.now().timestamp())}'
            }
            
        except Exception as e:
            print(f"Failed to send push notification: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_notification_history(
        self, 
        user_id: Optional[str] = None, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get notification history"""
        try:
            query = self.notifications_collection.order_by('sent_at', direction='desc').limit(limit)
            
            if user_id:
                query = query.where('user_id', '==', user_id)
            
            docs = query.stream()
            notifications = []
            
            for doc in docs:
                notification_data = doc.to_dict()
                notification_data['id'] = doc.id
                notifications.append(notification_data)
            
            return notifications
            
        except Exception as e:
            print(f"Failed to get notification history: {e}")
            return []
    
    async def _log_notification(self, notification_data: Dict[str, Any]) -> None:
        """Log notification to Firestore for audit trail"""
        try:
            self.notifications_collection.add(notification_data)
        except Exception as e:
            print(f"Failed to log notification: {e}")