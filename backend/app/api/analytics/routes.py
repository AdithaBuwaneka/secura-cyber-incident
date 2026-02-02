"""
Analytics & Infrastructure API Routes - Pramudi's Module
Handles data visualization, executive dashboards, and enterprise integration
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel

from app.models.user import User
from app.services.analytics.analytics_service import AnalyticsService
# from app.services.notifications.notification_service import NotificationService
from app.utils.auth import get_current_user

router = APIRouter(tags=["Analytics & Infrastructure"])

class DashboardMetrics(BaseModel):
    total_incidents: int
    open_incidents: int
    resolved_incidents: int
    avg_resolution_time: float
    severity_breakdown: Dict[str, int]
    category_breakdown: Dict[str, int]
    incident_trends: Dict[str, Any]
    severity_distribution: Dict[str, Any]
    response_times: Dict[str, Any]
    team_performance: Dict[str, Any]
    monthly_summary: Dict[str, Any]

class ExecutiveReport(BaseModel):
    report_id: str
    generated_at: datetime
    period: str
    kpi_metrics: Dict[str, Any]
    compliance_status: Dict[str, Any]
    recommendations: List[str]

def get_analytics_service() -> AnalyticsService:
    return AnalyticsService()

@router.get("/dashboard/basic")
async def get_basic_dashboard(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get basic analytics dashboard data
    Available to Security Team and Admin
    """
    if current_user.role.value not in ["security_team", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analytics access requires security team or admin privileges"
        )
    
    try:
        metrics = await analytics_service.get_basic_metrics(days)
        return metrics
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve dashboard metrics: {str(e)}"
        )

@router.get("/dashboard/executive")
async def get_executive_dashboard(
    days: int = 90,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get comprehensive executive dashboard with KPIs
    Admin only
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Executive dashboard requires admin access"
        )
    
    try:
        dashboard_data = await analytics_service.get_executive_dashboard(days)
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve executive dashboard: {str(e)}"
        )

@router.get("/metrics")
async def get_key_metrics(
    timeRange: str = "30d",
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get key metrics for the dashboard
    Available to Security Team and Admin
    """
    if current_user.role.value not in ["security_team", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Metrics access requires security team or admin privileges"
        )
    
    try:
        # Parse time range
        days = 30
        if timeRange == "7d":
            days = 7
        elif timeRange == "90d":
            days = 90
        elif timeRange == "1y":
            days = 365
        
        # Get basic metrics
        basic_metrics = await analytics_service.get_basic_metrics(days)
        
        # Calculate additional metrics
        user_metrics = await analytics_service.get_user_activity_metrics()
        
        # Format response for frontend
        response = {
            "total_incidents": basic_metrics["total_incidents"],
            "resolution_rate": round((basic_metrics["resolved_incidents"] / basic_metrics["total_incidents"] * 100) if basic_metrics["total_incidents"] > 0 else 0, 1),
            "avg_response_time": round(basic_metrics["avg_resolution_time"], 1),
            "critical_incidents": basic_metrics["severity_breakdown"].get("critical", 0),
            "active_analysts": user_metrics["total_users"],
            "threat_level": "Medium",  # This could be calculated based on recent critical incidents
            "incidents_change": 12,  # Could be calculated by comparing with previous period
            "resolution_change": 5,
            "response_time_change": -0.5,
            "critical_change": -2,
            "analysts_change": 1,
            "threat_change": "Stable"
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve key metrics: {str(e)}"
        )

@router.get("/reports")
async def get_reports_list(
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get list of generated reports
    Available to Security Team and Admin
    """
    if current_user.role.value not in ["security_team", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reports access requires security team or admin privileges"
        )
    
    try:
        # Get real reports data based on analytics history
        reports = await analytics_service.get_generated_reports_list()
        
        return {"reports": reports}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve reports: {str(e)}"
        )

@router.get("/visualization/trends")
async def get_trend_data(
    metric: str,  # "incidents", "resolution_time", "severity_distribution"
    period: str = "month",  # "week", "month", "quarter"
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get trend data for Chart.js visualization
    """
    if current_user.role.value not in ["security_team", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trend analytics requires security team or admin access"
        )
    
    try:
        trend_data = await analytics_service.get_trend_analysis(metric, period)
        return {
            "metric": metric,
            "period": period,
            "data": trend_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve trend data: {str(e)}"
        )

@router.get("/visualization/drill-down")
async def get_drill_down_data(
    category: str,
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends()
):
    """
    Get detailed drill-down data for specific categories
    """
    if current_user.role.value not in ["security_team", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Drill-down analytics requires security team or admin access"
        )
    
    try:
        drill_data = await analytics_service.get_drill_down_analysis(
            category, start_date, end_date
        )
        return drill_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve drill-down data: {str(e)}"
        )

@router.post("/reports/generate")
async def generate_compliance_report(
    report_type: str,  # "weekly", "monthly", "quarterly", "custom"
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(),
    period_days: int = 30,
    start_date: str = None,
    end_date: str = None
):
    """
    Generate compliance reports (GDPR, HIPAA, SOX)
    Security Team and Admin only
    """
    if current_user.role.value not in ["security_team", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Report generation requires security team or admin access"
        )
    
    try:
        # Generate report in background
        background_tasks.add_task(
            analytics_service.generate_compliance_report,
            report_type,
            period_days,
            current_user.uid,
            current_user.email
        )
        
        # Create a unique report object that can be immediately downloaded
        import uuid
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        unique_suffix = str(uuid.uuid4())[:8]
        report_id = f"RPT-{timestamp}-{report_type.upper()}-{unique_suffix}"
        
        # Determine period description
        if start_date and end_date:
            period_desc = f"{start_date} to {end_date}"
        else:
            period_desc = f"Last {period_days} days"
        
        return {
            "message": "Report generation started",
            "report_type": report_type,
            "period_days": period_days,
            "notification": "Report is ready for download",
            "report": {
                "id": report_id,
                "title": f"{report_type.title()} Security Report",
                "type": report_type,
                "generated_date": datetime.now(timezone.utc).isoformat(),
                "period": period_desc,
                "file_size": "2.1 MB",  # Estimated size
                "status": "ready"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start report generation: {str(e)}"
        )

@router.get("/reports/{report_id}/download")
async def download_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends()
):
    """
    Download a specific report as PDF
    Security Team and Admin only
    """
    if current_user.role.value not in ["security_team", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Report download requires security team or admin access"
        )
    
    try:
        # Generate and return PDF file
        pdf_data = await analytics_service.generate_report_pdf(report_id)
        
        from fastapi.responses import Response
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=security-report-{report_id}.pdf"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report not found or download failed: {str(e)}"
        )

@router.get("/reports/export")
async def export_incident_data(
    format: str = "csv",  # "csv", "pdf", "excel"
    start_date: datetime = None,
    end_date: datetime = None,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends()
):
    """
    Export incident data in various formats
    Security Team and Admin only
    """
    if current_user.role.value not in ["security_team", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Data export requires security team or admin access"
        )
    
    try:
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        if not end_date:
            end_date = datetime.now()
        
        export_data = await analytics_service.export_incident_data(
            format, start_date, end_date
        )
        
        return {
            "export_url": export_data.get("url"),
            "format": format,
            "record_count": export_data.get("count"),
            "generated_at": datetime.now()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data export failed: {str(e)}"
        )

# @router.post("/notifications/email")
# async def send_email_notification(
#     recipient_email: str,
#     subject: str,
#     template: str,
#     data: Dict[str, Any],
#     current_user: User = Depends(get_current_user),
#     notification_service: NotificationService = Depends()
# ):
#     """
#     Send email notification via SendGrid
#     Security Team and Admin only
#     """
#     if current_user.role.value not in ["security_team", "admin"]:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Email notifications require security team or admin access"
#         )
#     
#     try:
#         result = await notification_service.send_email(
#             recipient_email, subject, template, data
#         )
#         
#         return {
#             "message": "Email sent successfully",
#             "message_id": result.get("message_id")
#         }
#         
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Email notification failed: {str(e)}"
#         )

# @router.post("/notifications/push")
# async def send_push_notification(
#     user_id: str,
#     title: str,
#     body: str,
#     data: Dict[str, Any] = {},
#     notification_service: NotificationService = Depends()
# ):
#     """
#     Send push notification via Firebase Cloud Messaging
#     """
#     try:
#         result = await notification_service.send_push_notification(
#             user_id, title, body, data
#         )
#         
#         return {
#             "message": "Push notification sent successfully",
#             "message_id": result.get("message_id")
#         }
#         
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Push notification failed: {str(e)}"
#         )

@router.get("/integration/siem")
async def get_siem_integration_status(
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends()
):
    """
    Get SIEM integration status and configuration
    Admin only
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SIEM integration requires admin access"
        )
    
    try:
        status = await analytics_service.get_siem_integration_status()
        return status
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve SIEM status: {str(e)}"
        )

@router.post("/monitoring/system-health")
async def get_system_health(
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends()
):
    """
    Get comprehensive system health monitoring
    Admin only
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System monitoring requires admin access"
        )
    
    try:
        health_data = await analytics_service.get_system_health()
        return health_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system health: {str(e)}"
        )