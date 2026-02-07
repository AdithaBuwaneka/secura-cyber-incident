"""
Question Scope Classifier
Determines if user questions are website-related
"""
from typing import Tuple, Optional
from app.services.chatbot.gemini_service import get_gemini_service
from app.utils.logging import get_logger

logger = get_logger(__name__)


class ScopeClassifier:
    """
    Classifies user questions to determine if they're about the Secura website
    Uses Gemini for semantic understanding (not keyword matching)
    """
    
    def __init__(self):
        """Initialize with Gemini service"""
        self.gemini = get_gemini_service()
    
    async def is_website_related(
        self,
        message: str,
        page_context: Optional[str] = None
    ) -> Tuple[bool, float]:
        """
        Determine if question is about the Secura website
        
        Args:
            message: User's question
            page_context: Current page context
        
        Returns:
            (is_in_scope, confidence_score)
        """
        try:
            # Use Gemini for semantic classification
            is_in_scope, confidence = await self.gemini.classify_question_scope(
                question=message,
                page_context=page_context
            )
            
            return is_in_scope, confidence
            
        except Exception as e:
            logger.error(f"Error in scope classification: {str(e)}")
            # Default to in-scope with medium confidence if error
            return True, 0.6
    
    async def health_check(self) -> dict:
        """Health check for classifier"""
        try:
            # Test classification
            is_in_scope, confidence = await self.is_website_related(
                "How do I report an incident?"
            )
            
            if is_in_scope and confidence > 0.5:
                return {"status": "healthy"}
            else:
                return {
                    "status": "unhealthy",
                    "error": "Unexpected classification result"
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
