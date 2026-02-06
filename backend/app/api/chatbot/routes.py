"""
RAG Chatbot API Routes
Handles user queries with semantic search and LLM responses
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from app.models.chatbot import ChatMessage, ChatResponse
from app.services.chatbot.rag_service import RAGService
from app.services.chatbot.scope_classifier import ScopeClassifier
from app.utils.logging import get_logger
from datetime import datetime
import traceback

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])
logger = get_logger(__name__)


def get_rag_service() -> RAGService:
    """Dependency to get RAG service instance - recreated each time to avoid caching issues"""
    try:
        logger.info("Creating RAG service instance...")
        service = RAGService()
        logger.info(f"RAG service created - similarity_threshold={service.similarity_threshold}")
        return service
    except Exception as e:
        logger.error(f"Failed to initialize RAG service: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=503,
            detail=f"Chatbot service initialization failed: {str(e)}"
        )


def get_scope_classifier() -> ScopeClassifier:
    """Dependency to get scope classifier instance - recreated each time"""
    try:
        logger.info("Creating scope classifier instance...")
        classifier = ScopeClassifier()
        logger.info("Scope classifier created successfully")
        return classifier
    except Exception as e:
        logger.error(f"Failed to initialize scope classifier: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=503,
            detail=f"Classifier service initialization failed: {str(e)}"
        )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    chat_message: ChatMessage,
    rag: RAGService = Depends(get_rag_service),
    classifier: ScopeClassifier = Depends(get_scope_classifier)
):
    """
    Main chat endpoint with RAG pipeline
    
    Process:
    1. Validate and sanitize input
    2. Classify if question is website-related
    3. If out-of-scope: return polite refusal
    4. If in-scope:
       - Generate embeddings
       - Query Pinecone for relevant context
       - Build grounded prompt
       - Get LLM response
       - Return structured answer
    """
    try:
        logger.info(f"Chat request - Session: {chat_message.session_id}, Page: {chat_message.page_context}")
        
        # Step 1: Classify question scope
        is_in_scope, confidence = await classifier.is_website_related(
            message=chat_message.message,
            page_context=chat_message.page_context
        )
        
        # Step 2: Handle out-of-scope questions
        if not is_in_scope:
            logger.info(f"Out-of-scope question detected (confidence: {confidence})")
            return ChatResponse(
                answer="I'm the Secura assistant, here to help you navigate and use this cybersecurity platform. "
                       "I can answer questions about incident reporting, security features, dashboard usage, and more. "
                       "However, I'm not able to help with questions outside the scope of this website. "
                       "How can I assist you with Secura today?",
                is_in_scope=False,
                confidence_score=confidence,
                sources=[],
                suggested_pages=[],
                session_id=chat_message.session_id
            )
        
        # Step 3: Process in-scope question with RAG
        logger.info(f"Processing in-scope question (confidence: {confidence})")
        
        result = await rag.process_query(
            message=chat_message.message,
            page_context=chat_message.page_context,
            session_id=chat_message.session_id
        )
        
        # Step 4: Build response
        response = ChatResponse(
            answer=result["answer"],
            is_in_scope=True,
            confidence_score=result.get("confidence_score", confidence),
            sources=result.get("sources", []),
            suggested_pages=result.get("suggested_pages", []),
            session_id=chat_message.session_id
        )
        
        logger.info(f"Chat response generated successfully - Session: {chat_message.session_id}")
        return response
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred processing your request. Please try again."
        )


@router.get("/health")
async def chatbot_health():
    """Health check endpoint for chatbot services"""
    try:
        status = {
            "status": "healthy",
            "service": "RAG Chatbot",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {}
        }
        
        # Check RAG service
        try:
            rag = get_rag_service()
            rag_status = await rag.health_check()
            status["components"]["rag_service"] = rag_status
        except Exception as e:
            status["components"]["rag_service"] = {"status": "unhealthy", "error": str(e)}
        
        # Check classifier
        try:
            classifier = get_scope_classifier()
            classifier_status = await classifier.health_check()
            status["components"]["classifier"] = classifier_status
        except Exception as e:
            status["components"]["classifier"] = {"status": "unhealthy", "error": str(e)}
        
        # Determine overall health
        all_healthy = all(
            comp.get("status") == "healthy" 
            for comp in status["components"].values()
        )
        
        if not all_healthy:
            status["status"] = "degraded"
        
        return status
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )
