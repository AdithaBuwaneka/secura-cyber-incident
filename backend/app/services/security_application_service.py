"""
Security Team Application Service
Handles security team applications and approvals
"""

from typing import Optional, List
from datetime import datetime
import uuid

from app.core.firebase_config import FirebaseConfig
from app.models.security_application import SecurityTeamApplication, ApplicationStatus, ApplicationCreate, ApplicationReview
from app.models.common import UserRole
from app.services.auth.auth_service import AuthService

class SecurityApplicationService:
    def __init__(self):
        self.db = FirebaseConfig.get_firestore()
        self.applications_collection = self.db.collection('security_applications')
        self.auth_service = AuthService()

    async def create_application(self, applicant_uid: str, application_data: ApplicationCreate) -> str:
        """Create a new security team application"""
        application_id = str(uuid.uuid4())
        
        application = SecurityTeamApplication(
            id=application_id,
            applicant_uid=applicant_uid,
            reason=application_data.reason,
            experience=application_data.experience,
            certifications=application_data.certifications,
            proof_documents=application_data.proof_documents,
            status=ApplicationStatus.PENDING,
            created_at=datetime.utcnow()
        )
        
        # Store in Firestore
        app_data = application.dict()
        app_data['created_at'] = datetime.utcnow()
        
        self.applications_collection.document(application_id).set(app_data)
        return application_id

    async def get_application(self, application_id: str) -> Optional[SecurityTeamApplication]:
        """Get application by ID"""
        doc = self.applications_collection.document(application_id).get()
        
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        return SecurityTeamApplication(**data)

    async def get_user_applications(self, user_uid: str) -> List[SecurityTeamApplication]:
        """Get all applications for a specific user"""
        docs = self.applications_collection.where('applicant_uid', '==', user_uid).stream()
        applications = []
        
        for doc in docs:
            data = doc.to_dict()
            applications.append(SecurityTeamApplication(**data))
        
        return applications

    async def get_pending_applications(self) -> List[SecurityTeamApplication]:
        """Get all pending applications (Admin only)"""
        docs = self.applications_collection.where('status', '==', ApplicationStatus.PENDING.value).stream()
        applications = []
        
        for doc in docs:
            data = doc.to_dict()
            application = SecurityTeamApplication(**data)
            
            # Fetch applicant name
            try:
                user_profile = await self.auth_service.get_user_profile(application.applicant_uid)
                application.applicant_name = user_profile.full_name if user_profile else "Unknown User"
            except Exception:
                application.applicant_name = "Unknown User"
            
            applications.append(application)
        
        return applications

    async def get_all_applications(self) -> List[SecurityTeamApplication]:
        """Get all applications regardless of status (Admin only)"""
        docs = self.applications_collection.order_by('created_at', direction='DESCENDING').stream()
        applications = []
        
        for doc in docs:
            data = doc.to_dict()
            application = SecurityTeamApplication(**data)
            
            # Fetch applicant name
            try:
                user_profile = await self.auth_service.get_user_profile(application.applicant_uid)
                application.applicant_name = user_profile.full_name if user_profile else "Unknown User"
            except Exception:
                application.applicant_name = "Unknown User"
            
            applications.append(application)
        
        return applications

    async def review_application(self, application_id: str, review_data: ApplicationReview, admin_uid: str) -> bool:
        """Review and approve/reject application"""
        try:
            update_data = {
                'status': review_data.status.value,
                'admin_notes': review_data.admin_notes,
                'reviewed_at': datetime.utcnow(),
                'reviewed_by': admin_uid
            }
            
            self.applications_collection.document(application_id).update(update_data)
            
            # If approved, update user role
            if review_data.status == ApplicationStatus.APPROVED:
                application = await self.get_application(application_id)
                if application:
                    await self.auth_service.assign_security_role(application.applicant_uid)
            
            return True
        except Exception:
            return False

    async def can_user_apply(self, user_uid: str) -> bool:
        """Check if user can submit a new application"""
        # Check if user already has a pending application
        pending_apps = self.applications_collection.where('applicant_uid', '==', user_uid).where('status', '==', ApplicationStatus.PENDING.value).stream()
        
        for _ in pending_apps:
            return False  # User already has a pending application
        
        # Check if user is already security team or admin
        user = await self.auth_service.get_user_profile(user_uid)
        if user and user.role in [UserRole.SECURITY_TEAM, UserRole.ADMIN]:
            return False
        
        return True