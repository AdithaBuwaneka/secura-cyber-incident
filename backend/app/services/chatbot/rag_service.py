"""
RAG Service - Main orchestrator for Retrieval-Augmented Generation
Coordinates embedding, retrieval, and generation
"""
from typing import Dict, Any, Optional
from app.services.chatbot.embedding_service import get_embedding_service
from app.services.chatbot.pinecone_service import get_pinecone_service
from app.services.chatbot.gemini_service import get_gemini_service
from app.utils.logging import get_logger

logger = get_logger(__name__)


class RAGService:
    """
    Main RAG pipeline orchestrator:
    1. Generate query embedding
    2. Search Pinecone for relevant context
    3. Generate answer with Gemini using retrieved context
    """
    
    def __init__(self):
        """Initialize all required services"""
        self.embedding_service = get_embedding_service()
        self.pinecone_service = get_pinecone_service()
        self.gemini_service = get_gemini_service()
        
        # Configuration
        self.top_k = 5  # Number of similar documents to retrieve
        self.similarity_threshold = 0.5  # Minimum similarity score (lowered for better recall)
        
        logger.info("RAGService initialized")
    
    async def process_query(
        self,
        message: str,
        page_context: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process user query through complete RAG pipeline
        
        Args:
            message: User's question
            page_context: Current page (for context filtering)
            session_id: Session identifier (for logging/tracking)
        
        Returns:
            Dict with answer, sources, suggested_pages, confidence_score
        """
        try:
            logger.info(f"Processing RAG query - Session: {session_id}")
            
            # Step 1: Generate query embedding
            logger.debug("Step 1: Generating query embedding")
            query_embedding = await self.embedding_service.generate_query_embedding(message)
            
            # Step 2: Search Pinecone for similar documents
            logger.debug(f"Step 2: Searching Pinecone (top_k={self.top_k}, threshold={self.similarity_threshold})")
            
            # Optional: Filter by page context if provided
            filter_metadata = None
            if page_context:
                filter_metadata = {"page": page_context}
            
            similar_docs = await self.pinecone_service.query_similar(
                query_vector=query_embedding,
                top_k=self.top_k,
                namespace="default",
                filter_metadata=filter_metadata,
                min_score=self.similarity_threshold
            )
            
            # Step 3: Check if we have sufficient context
            if not similar_docs:
                logger.warning("No relevant documents found above threshold")
                return {
                    "answer": "I don't have enough information to answer that question. "
                             "Could you please rephrase or ask about a specific Secura feature? "
                             "For example, you can ask about incident reporting, user roles, or analytics.",
                    "sources": [],
                    "suggested_pages": ["home", "dashboard"],
                    "confidence_score": 0.0
                }
            
            logger.info(f"Found {len(similar_docs)} relevant documents")
            
            # Step 4: Generate answer using Gemini with retrieved context
            logger.debug("Step 4: Generating answer with Gemini")
            result = await self.gemini_service.generate_rag_response(
                question=message,
                context_chunks=similar_docs,
                page_context=page_context
            )
            
            logger.info(f"RAG response generated - Confidence: {result.get('confidence_score', 0):.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in RAG pipeline: {str(e)}")
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for RAG service and dependencies"""
        try:
            status = {
                "status": "healthy",
                "components": {}
            }
            
            # Check embedding service
            embedding_status = await self.embedding_service.health_check()
            status["components"]["embedding"] = embedding_status
            
            # Check Pinecone
            pinecone_status = await self.pinecone_service.health_check()
            status["components"]["pinecone"] = pinecone_status
            
            # Check Gemini
            gemini_status = await self.gemini_service.health_check()
            status["components"]["gemini"] = gemini_status
            
            # Check if all components are healthy
            all_healthy = all(
                comp.get("status") == "healthy"
                for comp in status["components"].values()
            )
            
            if not all_healthy:
                status["status"] = "degraded"
            
            return status
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
