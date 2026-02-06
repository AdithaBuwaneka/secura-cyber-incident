"""
Utility script to populate Pinecone with Secura documentation
Run this once to initialize the vector database
"""
import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.chatbot.pinecone_service import get_pinecone_service
from app.services.chatbot.embedding_service import get_embedding_service
from app.utils.logging import get_logger

logger = get_logger(__name__)


# Documentation chunks for Secura platform
DOCUMENTATION_CHUNKS = [
    # Home & General
    {
        "id": "home_1",
        "text": "Secura is an AI-powered cybersecurity incident management platform designed to streamline incident reporting, enhance threat analysis, and facilitate real-time collaboration between employees, security teams, and administrators.",
        "metadata": {"page": "home", "section": "overview"}
    },
    {
        "id": "home_2",
        "text": "To access Secura, visit the login page and enter your credentials. If you don't have an account, click 'Register' to create a new employee account. The system has three user roles: Employee, Security Team, and Admin.",
        "metadata": {"page": "home", "section": "getting_started"}
    },
    {
        "id": "login_1",
        "text": "How to login to Secura: 1) Go to the login page at /auth/login, 2) Enter your email address, 3) Enter your password, 4) Click 'Sign In'. If you don't have an account, click 'Register' to create one. After successful login, you'll be redirected to your dashboard based on your role.",
        "metadata": {"page": "login", "section": "authentication"}
    },
    {
        "id": "roles_overview",
        "text": "Secura has three user roles: Employee (can report incidents and track their status), Security Team (can investigate all incidents and use AI tools), and Admin (can manage users, view analytics, and configure the system). Each role has specific permissions and dashboard views.",
        "metadata": {"page": "roles", "section": "overview"}
    },
    {
        "id": "incident_submit",
        "text": "How to submit an incident: After logging in, go to your dashboard and click 'Report New Incident'. Fill in the incident title, describe what happened, select the category if needed, and optionally upload evidence files like screenshots or logs. Click Submit and the AI will automatically analyze and categorize your incident.",
        "metadata": {"page": "incidents", "section": "submit"}
    },
    
    # Incident Reporting
    {
        "id": "incidents_1",
        "text": "To report an incident: 1) Navigate to Dashboard, 2) Click 'Report New Incident', 3) Fill in the incident title and description, 4) Upload any evidence files (screenshots, logs), 5) Click Submit. The AI will automatically categorize and assess severity.",
        "metadata": {"page": "incidents", "section": "reporting"}
    },
    {
        "id": "incidents_2",
        "text": "Incident categories include: Phishing (email attacks), Malware (viruses, trojans), Data Breach (unauthorized access), Physical Security (facility breaches), Social Engineering (manipulation attacks), and Others. The AI categorizes with 85%+ accuracy.",
        "metadata": {"page": "incidents", "section": "categories"}
    },
    {
        "id": "incidents_3",
        "text": "Incident severity levels: Critical (immediate threat, system-wide impact), High (significant risk, multiple systems), Medium (contained threat, single system), Low (minor issue, no immediate risk). AI assesses severity based on multiple factors.",
        "metadata": {"page": "incidents", "section": "severity"}
    },
    {
        "id": "incidents_4",
        "text": "You can track incident status on your dashboard. Statuses include: Open (newly reported), Under Investigation (security team reviewing), Resolved (issue fixed), Closed (completed and documented). Real-time updates via WebSocket.",
        "metadata": {"page": "incidents", "section": "tracking"}
    },
    {
        "id": "incidents_5",
        "text": "File uploads support formats: PNG, JPG, PDF, TXT, CSV, up to 10MB per file. Files are securely stored in ImageKit with encryption. You can upload screenshots, logs, or any evidence related to the incident.",
        "metadata": {"page": "incidents", "section": "file_uploads"}
    },
    
    # User Roles & Permissions
    {
        "id": "roles_1",
        "text": "Employee role: Can report incidents, view own incidents, communicate with security team, apply for security team membership. This is the default role for new registrations.",
        "metadata": {"page": "dashboard", "section": "employee_role"}
    },
    {
        "id": "roles_2",
        "text": "Security Team role: Can view all incidents, use AI analysis tools, investigate incidents, communicate with employees and other team members, update incident status. Apply via Security Team Application form.",
        "metadata": {"page": "dashboard", "section": "security_role"}
    },
    {
        "id": "roles_3",
        "text": "Admin role: Full system access including user management, security team application review, executive analytics, compliance reporting, system health monitoring, and performance metrics.",
        "metadata": {"page": "dashboard", "section": "admin_role"}
    },
    {
        "id": "roles_4",
        "text": "To join the Security Team: 1) Navigate to Dashboard, 2) Click 'Join Security Team', 3) Fill application form with experience and certifications, 4) Upload supporting documents, 5) Submit for admin review. Approval takes 1-3 business days.",
        "metadata": {"page": "applications", "section": "apply_security_team"}
    },
    
    # AI Features
    {
        "id": "ai_1",
        "text": "AI-powered categorization: The system automatically analyzes incident descriptions and categorizes them with 85-92% accuracy. Categories include Phishing, Malware, Data Breach, Physical Security, and Social Engineering.",
        "metadata": {"page": "features", "section": "ai_categorization"}
    },
    {
        "id": "ai_2",
        "text": "AI severity assessment: Multi-factor analysis evaluates incident impact, scope, urgency, and potential damage. Provides severity level (Critical/High/Medium/Low) with confidence score and detailed reasoning.",
        "metadata": {"page": "features", "section": "ai_severity"}
    },
    {
        "id": "ai_3",
        "text": "AI mitigation strategies: For each incident, the AI suggests specific response actions, containment steps, and remediation procedures based on incident type and severity. Security team can view and implement these recommendations.",
        "metadata": {"page": "features", "section": "ai_mitigation"}
    },
    {
        "id": "ai_4",
        "text": "Threat intelligence: Admin users can access predictive analytics that forecast future incident trends based on historical data and industry patterns. Helps in proactive security planning.",
        "metadata": {"page": "analytics", "section": "threat_intelligence"}
    },
    
    # Analytics & Reporting
    {
        "id": "analytics_1",
        "text": "Dashboard metrics include: Total incidents, incident categories breakdown, severity distribution, average response time, resolution rate, team performance, and system uptime. Updated in real-time.",
        "metadata": {"page": "analytics", "section": "metrics"}
    },
    {
        "id": "analytics_2",
        "text": "Compliance reports available: GDPR (data protection), HIPAA (healthcare), SOX (financial), and custom reports. Admins can generate reports from the Analytics page with date range selection and export options (PDF/CSV).",
        "metadata": {"page": "analytics", "section": "compliance"}
    },
    {
        "id": "analytics_3",
        "text": "Performance tracking: View team member performance, incident resolution times, response efficiency, and workload distribution. Available to admins and security team leads.",
        "metadata": {"page": "analytics", "section": "performance"}
    },
    
    # Communication & Collaboration
    {
        "id": "messaging_1",
        "text": "Real-time messaging: Each incident has a dedicated message thread. Click on an incident to view the conversation. Messages are delivered instantly via WebSocket. Supports text messages and file attachments.",
        "metadata": {"page": "incidents", "section": "messaging"}
    },
    {
        "id": "messaging_2",
        "text": "Notifications: You'll receive instant notifications for: new incidents (security team), incident updates (employees), status changes, new messages, and admin actions. Notifications appear in the notification center and via browser alerts.",
        "metadata": {"page": "dashboard", "section": "notifications"}
    },
    
    # Account & Profile
    {
        "id": "profile_1",
        "text": "Update your profile: Navigate to Profile page, edit name/email/department/phone, upload profile photo, change password. All changes are saved immediately and synchronized across the system.",
        "metadata": {"page": "profile", "section": "update_profile"}
    },
    {
        "id": "profile_2",
        "text": "Password requirements: Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character. Use the 'Change Password' section in your profile.",
        "metadata": {"page": "profile", "section": "password"}
    },
    
    # System & Technical
    {
        "id": "system_1",
        "text": "System performance: Average API response time <200ms, AI analysis <500ms, database queries <100ms, system uptime 99.9%. Performance metrics visible in Admin dashboard.",
        "metadata": {"page": "system", "section": "performance"}
    },
    {
        "id": "system_2",
        "text": "Supported browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. Mobile browsers supported. For best experience, use latest browser versions and enable JavaScript.",
        "metadata": {"page": "system", "section": "compatibility"}
    },
    {
        "id": "system_3",
        "text": "Security features: Firebase authentication, role-based access control, encrypted file storage, secure API endpoints, rate limiting, input validation, and audit logging.",
        "metadata": {"page": "system", "section": "security"}
    },
    
    # Troubleshooting
    {
        "id": "help_1",
        "text": "Common issues: Can't login - check credentials and internet; File upload fails - check file size (<10MB) and format; AI not categorizing - wait 3-5 seconds for processing; Messages not sending - check connection.",
        "metadata": {"page": "help", "section": "troubleshooting"}
    },
    {
        "id": "help_2",
        "text": "Contact support: For technical issues, contact your admin or email support@secura.com. Include incident ID, error message, and screenshots if possible. Response within 24 hours.",
        "metadata": {"page": "help", "section": "support"}
    },
    
    # Registration & Getting Started
    {
        "id": "register_1",
        "text": "How to register: 1) Go to /auth/register page, 2) Enter your full name, 3) Enter work email address, 4) Choose a strong password (min 8 chars, uppercase, lowercase, number, special char), 5) Enter your department, 6) Add phone number (optional), 7) Click 'Create Account'. You'll be automatically logged in as an Employee.",
        "metadata": {"page": "register", "section": "registration"}
    },
    {
        "id": "register_2",
        "text": "After registration, you'll receive Employee role by default. You can immediately start reporting incidents. To become a Security Team member, you need to submit an application from your dashboard which requires admin approval.",
        "metadata": {"page": "register", "section": "initial_role"}
    },
    {
        "id": "getting_started_1",
        "text": "First steps after registration: 1) Complete your profile with department and contact info, 2) Upload a profile photo (optional), 3) Familiarize yourself with the dashboard layout, 4) Learn how to report an incident, 5) Check notification settings.",
        "metadata": {"page": "getting_started", "section": "first_steps"}
    },
    
    # Advanced Incident Features
    {
        "id": "incidents_6",
        "text": "Incident search and filtering: Use the search bar to find incidents by title, description, or ID. Filter by status (Open/Under Investigation/Resolved/Closed), category (Phishing/Malware/Data Breach), severity (Critical/High/Medium/Low), or date range.",
        "metadata": {"page": "incidents", "section": "search_filter"}
    },
    {
        "id": "incidents_7",
        "text": "Incident history and audit trail: Every incident maintains a complete history including creation time, status changes, assignments, messages, file uploads, and resolution details. Security team and admins can view full audit logs.",
        "metadata": {"page": "incidents", "section": "audit_trail"}
    },
    {
        "id": "incidents_8",
        "text": "Bulk incident actions: Security team can select multiple incidents to update status in bulk, assign to team members, export to CSV, or mark as resolved. This feature is available in the Security Team dashboard.",
        "metadata": {"page": "incidents", "section": "bulk_actions"}
    },
    {
        "id": "incidents_9",
        "text": "Incident priorities: Beyond severity, incidents can be prioritized based on business impact, affected systems, number of users impacted, and compliance requirements. Priority flags help security team manage workload effectively.",
        "metadata": {"page": "incidents", "section": "priority"}
    },
    
    # Dashboard Features
    {
        "id": "dashboard_1",
        "text": "Employee Dashboard features: View your reported incidents with real-time status updates, quick action buttons for reporting new incidents, notification center showing updates on your cases, recent activity timeline, and direct messaging with security team.",
        "metadata": {"page": "dashboard", "section": "employee_features"}
    },
    {
        "id": "dashboard_2",
        "text": "Security Team Dashboard features: All incidents overview with filtering options, AI-powered prioritization, team workload distribution, quick access to AI analysis tools, incident assignment capabilities, and real-time collaboration features.",
        "metadata": {"page": "dashboard", "section": "security_features"}
    },
    {
        "id": "dashboard_3",
        "text": "Admin Dashboard features: Executive overview with KPIs, user management panel, security team application review queue, system health monitoring, compliance reports, analytics and trends, performance metrics, and audit logs.",
        "metadata": {"page": "dashboard", "section": "admin_features"}
    },
    {
        "id": "dashboard_4",
        "text": "Dashboard customization: Admins can customize dashboard widgets, set default views, configure notification preferences, and create custom reports. Personal dashboard settings are saved per user and sync across devices.",
        "metadata": {"page": "dashboard", "section": "customization"}
    },
    
    # Security Team Features
    {
        "id": "security_team_1",
        "text": "AI threat analysis: Security team can use AI to analyze attack patterns, identify similar historical incidents, predict escalation likelihood, and receive automated response recommendations. AI provides confidence scores and reasoning for each analysis.",
        "metadata": {"page": "security_team", "section": "ai_analysis"}
    },
    {
        "id": "security_team_2",
        "text": "Incident assignment: Team leads can assign incidents to specific security analysts based on expertise, current workload, and incident type. Automated assignment available using AI-based skill matching.",
        "metadata": {"page": "security_team", "section": "assignment"}
    },
    {
        "id": "security_team_3",
        "text": "Investigation tools: Access to AI-powered root cause analysis, timeline reconstruction, affected systems mapping, IOC (Indicators of Compromise) extraction, and integration with external threat intelligence feeds.",
        "metadata": {"page": "security_team", "section": "investigation"}
    },
    {
        "id": "security_team_4",
        "text": "Collaboration features: Tag team members in comments, create sub-tasks, schedule follow-up actions, share investigation notes, and generate incident reports. Real-time collaboration with WebSocket updates.",
        "metadata": {"page": "security_team", "section": "collaboration"}
    },
    
    # Admin Features
    {
        "id": "admin_1",
        "text": "User management: Admins can view all users, modify roles (Employee/Security Team/Admin), activate or deactivate accounts, reset passwords, view user activity logs, and export user lists to CSV.",
        "metadata": {"page": "admin", "section": "user_management"}
    },
    {
        "id": "admin_2",
        "text": "Security team applications: Review applications to join security team, view applicant credentials and experience, check uploaded certifications, approve or reject with comments, and track application history.",
        "metadata": {"page": "admin", "section": "applications"}
    },
    {
        "id": "admin_3",
        "text": "System configuration: Configure email notifications, set AI model parameters, manage API integrations, configure file storage limits, set rate limits, and customize security policies.",
        "metadata": {"page": "admin", "section": "configuration"}
    },
    {
        "id": "admin_4",
        "text": "Audit and compliance: Generate compliance reports (GDPR, HIPAA, SOX), export audit trails, review system access logs, monitor API usage, track data retention policies, and ensure regulatory compliance.",
        "metadata": {"page": "admin", "section": "compliance"}
    },
    
    # AI and Machine Learning
    {
        "id": "ai_5",
        "text": "AI model training: The system continuously learns from resolved incidents to improve categorization accuracy. Security team feedback on AI suggestions helps refine predictions. Model performance metrics available in admin dashboard.",
        "metadata": {"page": "ai", "section": "ml_training"}
    },
    {
        "id": "ai_6",
        "text": "Anomaly detection: AI monitors system patterns to detect unusual activities like spike in incidents, abnormal incident types, suspicious user behavior, or potential coordinated attacks. Alerts sent to admins automatically.",
        "metadata": {"page": "ai", "section": "anomaly_detection"}
    },
    {
        "id": "ai_7",
        "text": "Natural language processing: AI understands incident descriptions in natural language, extracts key entities (IP addresses, URLs, file names), identifies attack vectors, and correlates with known threat databases.",
        "metadata": {"page": "ai", "section": "nlp"}
    },
    
    # Integrations and APIs
    {
        "id": "integrations_1",
        "text": "API access: Developers can integrate Secura with external systems using REST API. Available endpoints for incident creation, status updates, user management, and analytics retrieval. API keys managed in admin panel.",
        "metadata": {"page": "integrations", "section": "api"}
    },
    {
        "id": "integrations_2",
        "text": "Third-party integrations: Secura can integrate with SIEM systems, ticketing platforms (Jira, ServiceNow), communication tools (Slack, Teams), and threat intelligence feeds. Contact admin to enable integrations.",
        "metadata": {"page": "integrations", "section": "third_party"}
    },
    {
        "id": "integrations_3",
        "text": "Email notifications: Automated emails sent for incident creation, status changes, assignments, and resolution. Configure email preferences in profile settings. Admins can customize email templates.",
        "metadata": {"page": "integrations", "section": "email"}
    },
    
    # Best Practices
    {
        "id": "best_practices_1",
        "text": "Reporting best practices: Be specific in incident descriptions, include timestamps when possible, provide step-by-step details of what happened, attach relevant evidence files, and report incidents immediately when discovered.",
        "metadata": {"page": "best_practices", "section": "reporting"}
    },
    {
        "id": "best_practices_2",
        "text": "Security hygiene: Use strong unique passwords, enable browser notifications for urgent alerts, regularly check your dashboard for updates, respond promptly to security team messages, and complete security awareness training.",
        "metadata": {"page": "best_practices", "section": "security"}
    },
    {
        "id": "best_practices_3",
        "text": "Investigation best practices: Document all findings in incident comments, tag evidence files clearly, collaborate with team members, follow established response procedures, escalate critical incidents immediately, and close incidents with detailed resolution notes.",
        "metadata": {"page": "best_practices", "section": "investigation"}
    },
    
    # Mobile and Accessibility
    {
        "id": "mobile_1",
        "text": "Mobile access: Secura is fully responsive and works on smartphones and tablets. Access all features including incident reporting, messaging, notifications, and dashboard views from mobile browsers. No app installation required.",
        "metadata": {"page": "mobile", "section": "access"}
    },
    {
        "id": "mobile_2",
        "text": "Accessibility features: Keyboard navigation support, screen reader compatible, high contrast mode, adjustable font sizes, and WCAG 2.1 AA compliant. Contact admin for accessibility accommodations.",
        "metadata": {"page": "accessibility", "section": "features"}
    },
    
    # Data and Privacy
    {
        "id": "privacy_1",
        "text": "Data privacy: All incident data is encrypted at rest and in transit. Access controlled by role-based permissions. Personal data handled per GDPR requirements. Users can request data export or deletion through admin.",
        "metadata": {"page": "privacy", "section": "data_protection"}
    },
    {
        "id": "privacy_2",
        "text": "Data retention: Resolved incidents retained for 7 years for compliance. User activity logs kept for 2 years. Files stored in ImageKit with automatic backups. Admins can configure custom retention policies.",
        "metadata": {"page": "privacy", "section": "retention"}
    },
    
    # Performance and Limits
    {
        "id": "limits_1",
        "text": "Usage limits: Max 50 incidents per user per day, 10 file uploads per incident (10MB each), 1000 messages per incident thread, 100 API calls per minute per user. Contact admin to increase limits if needed.",
        "metadata": {"page": "limits", "section": "quotas"}
    },
    {
        "id": "limits_2",
        "text": "Performance optimization: System uses caching for faster load times, lazy loading for large lists, real-time updates via WebSocket to reduce polling, and CDN for static assets. Database queries optimized with indexing.",
        "metadata": {"page": "performance", "section": "optimization"}
    }
]


async def populate_pinecone():
    """Populate Pinecone index with documentation"""
    try:
        logger.info("Starting Pinecone population...")
        
        # Initialize services
        pinecone = get_pinecone_service()
        embedding = get_embedding_service()
        
        # Generate embeddings for all chunks
        logger.info(f"Generating embeddings for {len(DOCUMENTATION_CHUNKS)} documents...")
        
        texts = [chunk["text"] for chunk in DOCUMENTATION_CHUNKS]
        embeddings = await embedding.generate_batch_embeddings(texts, batch_size=10)
        
        # Prepare vectors for upsert
        vectors = []
        for chunk, emb in zip(DOCUMENTATION_CHUNKS, embeddings):
            vectors.append({
                "id": chunk["id"],
                "values": emb,
                "metadata": {
                    **chunk["metadata"],
                    "text": chunk["text"]
                }
            })
        
        # Upsert to Pinecone
        logger.info("Upserting vectors to Pinecone...")
        result = await pinecone.upsert_vectors(vectors, namespace="default")
        
        logger.info(f"✅ Successfully populated Pinecone with {result['upserted_count']} documents")
        
        # Verify by checking index stats
        stats = await pinecone.get_index_stats()
        logger.info(f"Index stats: {stats}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error populating Pinecone: {str(e)}")
        raise


async def test_query():
    """Test a sample query"""
    try:
        logger.info("\n--- Testing Sample Query ---")
        
        embedding = get_embedding_service()
        pinecone = get_pinecone_service()
        
        # Test query
        query = "How do I report an incident?"
        logger.info(f"Query: {query}")
        
        # Generate query embedding
        query_emb = await embedding.generate_query_embedding(query)
        
        # Search Pinecone
        results = await pinecone.query_similar(
            query_vector=query_emb,
            top_k=3,
            namespace="default",
            min_score=0.5
        )
        
        logger.info(f"\nFound {len(results)} relevant documents:")
        for i, result in enumerate(results, 1):
            logger.info(f"\n{i}. Score: {result['score']:.3f}")
            logger.info(f"   Page: {result['metadata']['page']}")
            logger.info(f"   Text: {result['text'][:100]}...")
        
    except Exception as e:
        logger.error(f"Error testing query: {str(e)}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Populate Pinecone with Secura documentation")
    parser.add_argument("--test", action="store_true", help="Run test query after population")
    parser.add_argument("--query-only", action="store_true", help="Only run test query")
    
    args = parser.parse_args()
    
    async def main():
        if not args.query_only:
            await populate_pinecone()
        
        if args.test or args.query_only:
            await test_query()
    
    asyncio.run(main())
