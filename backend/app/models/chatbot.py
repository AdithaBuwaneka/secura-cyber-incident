"""
Pydantic models for RAG chatbot functionality
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatMessage(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., min_length=1, max_length=1000, description="User's question")
    session_id: str = Field(..., description="Unique session identifier")
    page_context: Optional[str] = Field(None, description="Current page context (e.g., 'home', 'login', 'incidents')")
    
    @validator('message')
    def validate_message(cls, v):
        """Sanitize and validate message input"""
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        # Remove excessive whitespace
        return ' '.join(v.strip().split())
    
    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate session ID format"""
        if len(v) < 10 or len(v) > 100:
            raise ValueError("Invalid session ID format")
        return v


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    answer: str = Field(..., description="Bot's response")
    is_in_scope: bool = Field(..., description="Whether question was about the website")
    confidence_score: Optional[float] = Field(None, description="Confidence score (0-1)")
    sources: Optional[List[str]] = Field(default=[], description="Referenced documentation sources")
    suggested_pages: Optional[List[str]] = Field(default=[], description="Suggested pages to visit")
    session_id: str = Field(..., description="Session identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class VectorDocument(BaseModel):
    """Model for vector database document"""
    id: str = Field(..., description="Unique document ID")
    text: str = Field(..., description="Document text content")
    metadata: Dict[str, Any] = Field(default={}, description="Document metadata (page, section, etc.)")
    embedding: Optional[List[float]] = Field(None, description="Vector embedding")


class SimilarityResult(BaseModel):
    """Model for similarity search result"""
    id: str
    score: float
    text: str
    metadata: Dict[str, Any]
