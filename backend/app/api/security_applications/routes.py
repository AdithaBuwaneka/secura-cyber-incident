"""
Security Team Application API Routes
Handles security team application submissions and reviews
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List

from app.models.user import User
from app.models.common import UserRole
from app.models.security_application import ApplicationCreate, ApplicationReview, SecurityTeamApplication, ApplicationResponse
from app.services.security_application_service import SecurityApplicationService
from app.services.imagekit_service import imagekit_service
from app.utils.auth import get_current_user

router = APIRouter(tags=["Security Applications"])

@router.post("/apply", response_model=ApplicationResponse)
async def submit_application(
    application_data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    app_service: SecurityApplicationService = Depends()
):
    """
    Submit application to join security team
    """
    try:
        # Check if user can apply
        can_apply = await app_service.can_user_apply(current_user.uid)
        if not can_apply:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have a pending application or are already in security team"
            )
        
        application_id = await app_service.create_application(current_user.uid, application_data)
        
        return ApplicationResponse(
            message="Application submitted successfully",
            application_id=application_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit application: {str(e)}"
        )

@router.get("/my-applications", response_model=List[SecurityTeamApplication])
async def get_my_applications(
    current_user: User = Depends(get_current_user),
    app_service: SecurityApplicationService = Depends()
):
    """
    Get current user's applications
    """
    try:
        applications = await app_service.get_user_applications(current_user.uid)
        return applications
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve applications: {str(e)}"
        )

@router.get("/admin/pending", response_model=List[SecurityTeamApplication])
async def get_pending_applications(
    current_user: User = Depends(get_current_user),
    app_service: SecurityApplicationService = Depends()
):
    """
    Admin only: Get all pending applications
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        applications = await app_service.get_pending_applications()
        return applications
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve pending applications: {str(e)}"
        )

@router.get("/admin/all", response_model=List[SecurityTeamApplication])
async def get_all_applications(
    current_user: User = Depends(get_current_user),
    app_service: SecurityApplicationService = Depends()
):
    """
    Admin only: Get all applications regardless of status
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        applications = await app_service.get_all_applications()
        return applications
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve all applications: {str(e)}"
        )

@router.put("/admin/review/{application_id}", response_model=ApplicationResponse)
async def review_application(
    application_id: str,
    review_data: ApplicationReview,
    current_user: User = Depends(get_current_user),
    app_service: SecurityApplicationService = Depends()
):
    """
    Admin only: Review and approve/reject application
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # Check if application exists
        application = await app_service.get_application(application_id)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
        
        success = await app_service.review_application(application_id, review_data, current_user.uid)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to review application"
            )
        
        action = "approved" if review_data.status.value == "approved" else "rejected"
        return ApplicationResponse(
            message=f"Application {action} successfully",
            application_id=application_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to review application: {str(e)}"
        )

@router.get("/can-apply")
async def check_can_apply(
    current_user: User = Depends(get_current_user),
    app_service: SecurityApplicationService = Depends()
):
    """
    Check if current user can submit a new application
    """
    try:
        can_apply = await app_service.can_user_apply(current_user.uid)
        return {"can_apply": can_apply}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check application eligibility: {str(e)}"
        )

@router.post("/upload-document")
async def upload_application_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document for security team application
    """
    try:
        # Upload to ImageKit with application-specific folder
        result = await imagekit_service.upload_file(
            file=file,
            incident_id=f"app_{current_user.uid}",  # Use user ID for application files
            uploader_id=current_user.uid,
            folder="security-applications"
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "file_id": result["file_id"],
            "file_url": result["url"],
            "file_name": result["name"],
            "original_filename": result["original_filename"],
            "file_size": result["size"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )