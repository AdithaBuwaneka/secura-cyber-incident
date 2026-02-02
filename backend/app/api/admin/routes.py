"""
Admin API Routes - User Management
Handles admin-only operations for user management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from app.models.auth import UserProfile
from app.models.common import UserRole
from app.services.auth.auth_service import AuthService
from app.utils.auth import get_current_user
from app.models.user import User
from app.utils.logging import log_admin_action, log_security_event
from firebase_admin import auth as firebase_auth
from app.services.analytics.analytics_service import AnalyticsService
from fastapi.responses import Response
import io
from datetime import timedelta

router = APIRouter()

@router.get("/test")
async def test_admin_route():
    """Test endpoint to verify admin routes are working"""
    return {"message": "Admin routes are working!", "status": "ok"}

@router.get("/users", response_model=List[dict])
async def get_all_users(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Get all users (Admin only)
    Returns list of all users in the system
    """
    print(f"Admin route called by user: {current_user.email} with role: {current_user.role}")
    
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        print(f"Access denied: User {current_user.email} is not admin")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access user management"
        )
    
    try:
        print("Fetching all users from database...")
        users = await auth_service.get_all_users()
        print(f"Found {len(users)} users in database")
        
        # Convert to response format
        user_list = []
        for user in users:
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "full_name": user.full_name,
                "phone_number": user.phone_number,
                "role": user.role.value,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None
            }
            user_list.append(user_data)
        
        print(f"Returning {len(user_list)} users")
        return user_list
        
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )

@router.patch("/users/{uid}/role")
async def update_user_role(
    uid: str,
    role_data: dict,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Update user role (Admin only)
    Changes user role between employee and security_team
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can modify user roles"
        )
    
    # Prevent admin from modifying their own role
    if uid == current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own role"
        )
    
    new_role = role_data.get("role")
    if new_role not in ["employee", "security_team"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'employee' or 'security_team'"
        )
    
    try:
        # Get the target user
        target_user = await auth_service.get_user_profile(uid)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent modifying admin roles
        if target_user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify admin roles"
            )
        
        # Update the role
        if new_role == "security_team":
            success = await auth_service.assign_security_role(uid)
        else:
            success = await auth_service.remove_security_role(uid)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user role"
            )
        
        # Get updated user
        updated_user = await auth_service.get_user_profile(uid)
        
        # Log admin action
        log_admin_action(
            admin_email=current_user.email,
            action="user_role_change",
            target_user=updated_user.email,
            details=f"Role changed from {target_user.role.value} to {new_role}"
        )
        
        return {
            "message": f"User role updated to {new_role}",
            "user": {
                "uid": updated_user.uid,
                "email": updated_user.email,
                "full_name": updated_user.full_name,
                "phone_number": updated_user.phone_number,
                "role": updated_user.role.value,
                "is_active": updated_user.is_active,
                "created_at": updated_user.created_at.isoformat() if updated_user.created_at else None,
                "last_login": updated_user.last_login.isoformat() if updated_user.last_login else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user role: {str(e)}"
        )

@router.patch("/users/{uid}/status")
async def update_user_status(
    uid: str,
    status_data: dict,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Update user status (Admin only)
    Activates or deactivates user accounts
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can modify user status"
        )
    
    # Prevent admin from modifying their own status
    if uid == current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own status"
        )
    
    is_active = status_data.get("is_active")
    if not isinstance(is_active, bool):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="is_active must be a boolean value"
        )
    
    try:
        # Get the target user
        target_user = await auth_service.get_user_profile(uid)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update user status in Firestore
        await auth_service.update_user_status(uid, is_active)
        
        # Get updated user
        updated_user = await auth_service.get_user_profile(uid)
        
        # Log admin action
        log_admin_action(
            admin_email=current_user.email,
            action="user_status_change",
            target_user=updated_user.email,
            details=f"User {'activated' if is_active else 'deactivated'}"
        )
        
        return {
            "message": f"User {'activated' if is_active else 'deactivated'} successfully",
            "user": {
                "uid": updated_user.uid,
                "email": updated_user.email,
                "full_name": updated_user.full_name,
                "phone_number": updated_user.phone_number,
                "role": updated_user.role.value,
                "is_active": updated_user.is_active,
                "created_at": updated_user.created_at.isoformat() if updated_user.created_at else None,
                "last_login": updated_user.last_login.isoformat() if updated_user.last_login else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user status: {str(e)}"
        )

@router.post("/users/create-security-member")
async def create_security_member(
    member_data: dict,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends()
):
    """
    Create a new security team member (Admin only)
    Creates both Firebase auth account and user profile
    """
    # Check if current user is admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create security team members"
        )
    
    required_fields = ['email', 'full_name', 'phone_number', 'password']
    for field in required_fields:
        if not member_data.get(field):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}"
            )
    
    try:
        # Check if user already exists in Firebase
        try:
            existing_user = firebase_auth.get_user_by_email(member_data['email'])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        except firebase_auth.UserNotFoundError:
            # Good, user doesn't exist yet
            pass
        
        # Create Firebase user
        firebase_user = firebase_auth.create_user(
            email=member_data['email'],
            password=member_data['password'],
            display_name=member_data['full_name']
        )
        
        # Create user profile in Firestore with security_team role
        profile_data = {
            'uid': firebase_user.uid,
            'email': member_data['email'],
            'full_name': member_data['full_name'],
            'phone_number': member_data['phone_number'],
            'role': 'security_team',
            'is_active': True,
            'created_at': datetime.utcnow(),
            'created_by': current_user.uid
        }
        
        # Save to Firestore
        from app.core.firebase_config import FirebaseConfig
        db = FirebaseConfig.get_firestore()
        db.collection('users').document(firebase_user.uid).set(profile_data)
        
        # Log admin action
        log_admin_action(
            admin_email=current_user.email,
            action="create_security_member",
            target_user=member_data['email'],
            details=f"New security team member created: {member_data['full_name']}"
        )
        
        # Log security event
        log_security_event(
            user_email=current_user.email,
            event_type="new_security_member",
            description=f"New security team member created: {member_data['email']}",
            level="info"
        )
        
        return {
            "message": "Security team member created successfully",
            "user": {
                "uid": firebase_user.uid,
                "email": member_data['email'],
                "full_name": member_data['full_name'],
                "phone_number": member_data['phone_number'],
                "role": "security_team",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # If we created Firebase user but failed to create profile, clean up
        try:
            if 'firebase_user' in locals():
                firebase_auth.delete_user(firebase_user.uid)
        except:
            pass
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create security team member: {str(e)}"
        )

@router.post("/reports/executive")
async def generate_executive_report(
    current_user: User = Depends(get_current_user),
    days: int = 90
):
    """
    Generate comprehensive executive report with real data analysis
    Admin only
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Executive report generation requires admin access"
        )
    
    try:
        # Initialize analytics service
        analytics_service = AnalyticsService()
        
        # Get comprehensive analytics data
        executive_data = await analytics_service.get_executive_dashboard(days)
        incident_stats = await analytics_service.get_incident_statistics(days)
        trends = await analytics_service.get_incident_trends(days)
        system_health = await analytics_service.get_system_health()
        
        # Generate PDF report with real data
        pdf_content = await _generate_executive_pdf_report(
            executive_data, incident_stats, trends, system_health, current_user, days
        )
        
        # Log admin action
        log_admin_action(
            admin_email=current_user.email,
            action="executive_report_generated",
            target_user="system",
            details=f"Generated {days}-day executive report with real analytics data"
        )
        
        # Return PDF as response
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=executive-report-{datetime.now().strftime('%Y-%m-%d')}.pdf"
            }
        )
        
    except Exception as e:
        import traceback
        print(f"Executive report generation error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate executive report: {str(e)}"
        )

async def _generate_executive_pdf_report(
    executive_data: dict, 
    incident_stats: dict, 
    trends: dict, 
    system_health: dict,
    generated_by: User,
    days: int
) -> bytes:
    """
    Generate PDF executive report with real data analysis
    """
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        import tempfile
        import os
        
        # Create temporary file for PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            pdf_path = temp_file.name
        
        # Create PDF document
        doc = SimpleDocTemplate(pdf_path, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1f2937')
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.HexColor('#374151')
        )
        
        # Report Header
        story.append(Paragraph("SECURA SECURITY EXECUTIVE REPORT", title_style))
        story.append(Spacer(1, 12))
        
        # Report Metadata
        report_info = [
            ['Report Period:', f'{days} days ending {datetime.now().strftime("%Y-%m-%d")}'],
            ['Generated Date:', datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')],
            ['Generated By:', f'{generated_by.full_name} ({generated_by.email})'],
            ['Report Type:', 'Executive Security Overview'],
        ]
        
        info_table = Table(report_info, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
        ]))
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # Executive Summary
        story.append(Paragraph("EXECUTIVE SUMMARY", heading_style))
        
        # Key metrics summary
        total_incidents = incident_stats.get('total_incidents', 0)
        resolved_rate = (incident_stats.get('status_breakdown', {}).get('resolved', 0) / max(total_incidents, 1)) * 100
        avg_response_time = incident_stats.get('average_response_time_hours', 0)
        critical_incidents = incident_stats.get('severity_breakdown', {}).get('critical', 0)
        
        summary_text = f"""
        During the {days}-day reporting period, our security team managed {total_incidents} security incidents 
        with a resolution rate of {resolved_rate:.1f}%. The average response time was {avg_response_time:.1f} hours. 
        {critical_incidents} critical incidents were identified and addressed.
        
        System uptime maintained at {system_health.get('uptime', 'N/A')} with {system_health.get('active_incidents', 0)} 
        currently active incidents requiring attention.
        """
        
        story.append(Paragraph(summary_text, styles['Normal']))
        story.append(Spacer(1, 15))
        
        # Key Performance Indicators
        story.append(Paragraph("KEY PERFORMANCE INDICATORS", heading_style))
        
        kpi_data = [
            ['Metric', 'Value', 'Status'],
            ['Total Incidents', str(total_incidents), '📊'],
            ['Resolution Rate', f'{resolved_rate:.1f}%', '✅' if resolved_rate > 85 else '⚠️'],
            ['Average Response Time', f'{avg_response_time:.1f} hours', '✅' if avg_response_time < 4 else '⚠️'],
            ['Critical Incidents', str(critical_incidents), '🔴' if critical_incidents > 5 else '✅'],
            ['System Uptime', system_health.get('uptime', 'N/A'), '✅'],
            ['Active Incidents', str(system_health.get('active_incidents', 0)), '✅' if system_health.get('active_incidents', 0) < 10 else '⚠️']
        ]
        
        kpi_table = Table(kpi_data, colWidths=[2.5*inch, 1.5*inch, 1*inch])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 20))
        
        # Incident Analysis
        story.append(Paragraph("INCIDENT ANALYSIS", heading_style))
        
        # Severity breakdown
        severity_breakdown = incident_stats.get('severity_breakdown', {})
        if severity_breakdown:
            severity_data = [['Severity Level', 'Count', 'Percentage']]
            for severity, count in severity_breakdown.items():
                percentage = (count / max(total_incidents, 1)) * 100
                severity_data.append([severity.title(), str(count), f'{percentage:.1f}%'])
            
            severity_table = Table(severity_data, colWidths=[2*inch, 1*inch, 1*inch])
            severity_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fef2f2')]),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#fecaca'))
            ]))
            story.append(severity_table)
            story.append(Spacer(1, 15))
        
        # Incident type breakdown
        type_breakdown = incident_stats.get('type_breakdown', {})
        if type_breakdown:
            story.append(Paragraph("Incident Types Distribution:", styles['Heading3']))
            type_data = [['Incident Type', 'Count', 'Percentage']]
            for inc_type, count in sorted(type_breakdown.items(), key=lambda x: x[1], reverse=True):
                percentage = (count / max(total_incidents, 1)) * 100
                display_type = (inc_type or 'Unknown').replace('_', ' ').title() if inc_type else 'Unknown'
                type_data.append([display_type, str(count), f'{percentage:.1f}%'])
            
            type_table = Table(type_data, colWidths=[2.5*inch, 1*inch, 1*inch])
            type_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#eff6ff')]),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#93c5fd'))
            ]))
            story.append(type_table)
            story.append(Spacer(1, 15))
        
        # Trend Analysis
        story.append(Paragraph("TREND ANALYSIS", heading_style))
        trend_analysis = trends.get('trend_analysis', 'No trend data available')
        story.append(Paragraph(f"Incident Trend: {trend_analysis}", styles['Normal']))
        story.append(Spacer(1, 10))
        
        # Weekly incident counts
        weekly_counts = trends.get('weekly_incident_counts', {})
        if weekly_counts:
            weeks = list(weekly_counts.keys())[-4:]  # Last 4 weeks
            counts = [weekly_counts[week] for week in weeks]
            
            weekly_data = [['Week', 'Incident Count']]
            for week, count in zip(weeks, counts):
                week_display = datetime.fromisoformat(week).strftime('%Y-W%U') if week else 'N/A'
                weekly_data.append([week_display, str(count)])
            
            weekly_table = Table(weekly_data, colWidths=[2*inch, 2*inch])
            weekly_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ecfdf5')]),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#6ee7b7'))
            ]))
            story.append(weekly_table)
        
        story.append(PageBreak())
        
        # Recommendations
        story.append(Paragraph("STRATEGIC RECOMMENDATIONS", heading_style))
        
        # Generate data-driven recommendations
        recommendations = []
        
        if resolved_rate < 90:
            recommendations.append("• Improve incident resolution processes - current rate below target")
        if avg_response_time > 4:
            recommendations.append("• Reduce average response time through automation and process optimization")
        if critical_incidents > 5:
            recommendations.append("• Implement additional preventive measures to reduce critical incident frequency")
        
        # Type-based recommendations
        top_incident_type = max(type_breakdown.items(), key=lambda x: x[1])[0] if type_breakdown else None
        if top_incident_type and top_incident_type is not None:
            type_recommendations = {
                'phishing': '• Enhance email security training and implement advanced phishing detection',
                'malware': '• Strengthen endpoint protection and implement behavioral analysis',
                'unauthorized_access': '• Review access controls and implement multi-factor authentication',
                'data_breach': '• Enhance data loss prevention and implement data classification',
                'social_engineering': '• Increase security awareness training and implement verification procedures'
            }
            if top_incident_type in type_recommendations:
                recommendations.append(type_recommendations[top_incident_type])
        
        # Default recommendations if none generated
        if not recommendations:
            recommendations = [
                "• Continue current security practices - metrics show good performance",
                "• Regular security assessments and penetration testing",
                "• Maintain incident response training and procedures",
                "• Monitor emerging threats and update security policies accordingly"
            ]
        
        for rec in recommendations:
            story.append(Paragraph(rec, styles['Normal']))
            story.append(Spacer(1, 6))
        
        story.append(Spacer(1, 20))
        
        # System Health Status
        story.append(Paragraph("SYSTEM HEALTH STATUS", heading_style))
        
        health_data = [
            ['Component', 'Status', 'Details'],
            ['Overall System', system_health.get('system_status', 'Unknown').title(), f"Uptime: {system_health.get('uptime', 'N/A')}"],
            ['Database', system_health.get('database_health', 'Unknown').title(), f"Response: {system_health.get('response_time', 'N/A')}"],
            ['API Services', system_health.get('api_health', 'Unknown').title(), 'All endpoints operational'],
            ['Active Monitoring', 'Operational', f"{system_health.get('websocket_connections', 0)} active connections"],
        ]
        
        health_table = Table(health_data, colWidths=[2*inch, 1.5*inch, 2*inch])
        health_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16a34a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0fdf4')]),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#86efac'))
        ]))
        story.append(health_table)
        
        # Footer
        story.append(Spacer(1, 30))
        footer_text = f"""
        This report contains confidential security information. Distribution is restricted to authorized personnel only.
        Report generated by Secura Security Platform on {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}.
        For questions regarding this report, contact the Security Operations Center.
        """
        story.append(Paragraph(footer_text, styles['Italic']))
        
        # Build PDF
        doc.build(story)
        
        # Read PDF content
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        # Clean up temporary file
        os.unlink(pdf_path)
        
        return pdf_content
        
    except ImportError:
        # Fallback if reportlab is not available
        return _generate_text_executive_report(executive_data, incident_stats, trends, system_health, generated_by, days)
    except Exception as e:
        print(f"PDF generation error: {e}")
        # Fallback to text report
        return _generate_text_executive_report(executive_data, incident_stats, trends, system_health, generated_by, days)

def _generate_text_executive_report(
    executive_data: dict, 
    incident_stats: dict, 
    trends: dict, 
    system_health: dict,
    generated_by: User,
    days: int
) -> bytes:
    """
    Generate text-based executive report as fallback
    """
    report_content = f"""
SECURA SECURITY EXECUTIVE REPORT
====================================

Report Period: {days} days ending {datetime.now().strftime("%Y-%m-%d")}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
Generated By: {generated_by.full_name} ({generated_by.email})

EXECUTIVE SUMMARY
================

Total Incidents: {incident_stats.get('total_incidents', 0)}
Resolution Rate: {(incident_stats.get('status_breakdown', {}).get('resolved', 0) / max(incident_stats.get('total_incidents', 1), 1)) * 100:.1f}%
Average Response Time: {incident_stats.get('average_response_time_hours', 0):.1f} hours
Critical Incidents: {incident_stats.get('severity_breakdown', {}).get('critical', 0)}

INCIDENT BREAKDOWN BY SEVERITY
==============================
"""
    
    # Add severity breakdown
    severity_breakdown = incident_stats.get('severity_breakdown', {})
    for severity, count in severity_breakdown.items():
        percentage = (count / max(incident_stats.get('total_incidents', 1), 1)) * 100
        report_content += f"{severity.title()}: {count} ({percentage:.1f}%)\n"
    
    report_content += f"""

INCIDENT BREAKDOWN BY TYPE
==========================
"""
    
    # Add type breakdown
    type_breakdown = incident_stats.get('type_breakdown', {})
    for inc_type, count in sorted(type_breakdown.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / max(incident_stats.get('total_incidents', 1), 1)) * 100
        display_type = (inc_type or 'Unknown').replace('_', ' ').title() if inc_type else 'Unknown'
        report_content += f"{display_type}: {count} ({percentage:.1f}%)\n"
    
    report_content += f"""

SYSTEM HEALTH
=============
Overall Status: {system_health.get('system_status', 'Unknown').title()}
Uptime: {system_health.get('uptime', 'N/A')}
Active Incidents: {system_health.get('active_incidents', 0)}
Database Health: {system_health.get('database_health', 'Unknown').title()}

TREND ANALYSIS
==============
{trends.get('trend_analysis', 'No trend data available')}

This report contains confidential security information.
Generated by Secura Security Platform.
"""
    
    return report_content.encode('utf-8') 