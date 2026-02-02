"""
Background Tasks Service - Scheduled maintenance tasks
"""

import asyncio
import logging
from datetime import datetime
from app.services.user_activity.activity_service import UserActivityService

logger = logging.getLogger(__name__)

class BackgroundTaskService:
    def __init__(self):
        self.activity_service = UserActivityService()
        self.running = False
    
    async def start_background_tasks(self):
        """Start all background tasks"""
        if self.running:
            return
        
        self.running = True
        logger.info("Starting background tasks...")
        
        # Start the offline user updater
        asyncio.create_task(self.offline_user_updater())
        
        # Start the activity cleanup task
        asyncio.create_task(self.activity_cleanup_task())
    
    async def stop_background_tasks(self):
        """Stop all background tasks"""
        self.running = False
        logger.info("Stopping background tasks...")
    
    async def offline_user_updater(self):
        """Periodically update offline users (runs every 5 minutes)"""
        while self.running:
            try:
                await self.activity_service.update_offline_users()
                logger.info("Updated offline users")
            except Exception as e:
                logger.error(f"Error updating offline users: {str(e)}")
            
            # Wait 5 minutes before next update
            await asyncio.sleep(300)
    
    async def activity_cleanup_task(self):
        """Clean up old activity records (runs daily at 2 AM)"""
        while self.running:
            try:
                now = datetime.now()
                # Run at 2 AM
                if now.hour == 2 and now.minute < 5:
                    await self.activity_service.cleanup_old_activities(days_to_keep=30)
                    logger.info("Cleaned up old activity records")
                    
                    # Sleep for 1 hour to avoid running multiple times
                    await asyncio.sleep(3600)
                else:
                    # Check every 5 minutes
                    await asyncio.sleep(300)
            except Exception as e:
                logger.error(f"Error in activity cleanup task: {str(e)}")
                await asyncio.sleep(300)

# Global instance
background_service = BackgroundTaskService()