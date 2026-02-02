from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import sys

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.auth import routes as auth_routes
from app.api.admin import routes as admin_routes
from app.api.incidents import routes as incident_routes
from app.api.ai import routes as ai_routes
from app.api.analytics import routes as analytics_routes
from app.api.security_applications import routes as security_app_routes
from app.api.messaging import routes as messaging_routes
from app.api.system import routes as system_routes
from app.api.user_activity import routes as user_activity_routes
from app.core.firebase_config import FirebaseConfig
from app.services.background.background_tasks import background_service

# Load environment variables
load_dotenv()

# Initialize Firebase
FirebaseConfig.initialize_firebase()

app = FastAPI(
    title="Secura API",
    description="AI-Powered Cyber Incident Reporting Platform",
    version="1.0.0"
)

# IMPORTANT: Add CORS middleware FIRST, before any other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])
app.include_router(incident_routes.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(ai_routes.router, prefix="/api/ai", tags=["AI"])
app.include_router(analytics_routes.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(security_app_routes.router, prefix="/api/security-applications", tags=["Security Applications"])
app.include_router(messaging_routes.router, prefix="/api/messaging", tags=["Messaging"])
app.include_router(system_routes.router, prefix="/api/system", tags=["System Configuration"])
app.include_router(user_activity_routes.router, prefix="/api/user-activity", tags=["User Activity"])

# Startup event to initialize background tasks
@app.on_event("startup")
async def startup_event():
    await background_service.start_background_tasks()

# Shutdown event to clean up background tasks
@app.on_event("shutdown")
async def shutdown_event():
    await background_service.stop_background_tasks()

@app.get("/")
async def root():
    return {"message": "Secura API is running!", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Secura Backend"}

if __name__ == "__main__":
    import uvicorn
    # Using reload=True will restart the server automatically when code changes
    # Using host="0.0.0.0" allows external connections
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)