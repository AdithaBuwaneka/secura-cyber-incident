"""
Gemini LLM Service for RAG
Handles question classification and answer generation with context grounding
"""
import os
from typing import Dict, Any, List, Optional, Tuple
import google.generativeai as genai
from app.utils.logging import get_logger
import asyncio
import json

logger = get_logger(__name__)


class GeminiService:
    """
    Gemini 2.5 Flash integration for:
    - Question scope classification
    - RAG-based answer generation
    - Context-grounded responses
    """
    
    def __init__(self):
        """Initialize Gemini API"""
        self.api_key = os.getenv("GEMINI_API_KEY")

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        # Configure Google AI
        genai.configure(api_key=self.api_key)
        
        # Use Gemini 2.5 Flash for fast, reliable responses
        self.model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Safety settings to prevent harmful content
        self.safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
        
        logger.info("GeminiService initialized with Gemini 2.5 Flash")
    
    async def classify_question_scope(
        self,
        question: str,
        page_context: Optional[str] = None
    ) -> Tuple[bool, float]:
        """
        Classify if question is about the Secura website
        
        Args:
            question: User's question
            page_context: Current page (home, incidents, etc.)
        
        Returns:
            (is_in_scope, confidence_score)
        """
        try:
            # Build classification prompt
            prompt = f"""You are a question classifier for the Secura cybersecurity incident management platform.

Your task: Determine if the user's question is about using the Secura website, its features, or functionality.

**IN-SCOPE questions** (about Secura website):
- How to report incidents
- Dashboard features and navigation
- User roles and permissions
- AI analysis features
- Security application process
- Analytics and reporting
- System functionality
- Real-time messaging
- File uploads and management
- Account management

**OUT-OF-SCOPE questions** (NOT about Secura):
- General cybersecurity advice
- Personal technical support
- Other websites or products
- General knowledge questions
- Programming help
- News and current events

Current page context: {page_context or "unknown"}
User question: "{question}"

Respond ONLY with a JSON object:
{{"is_in_scope": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation"}}"""

            # Generate response
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(
                    prompt,
                    safety_settings=self.safety_settings,
                    generation_config={"temperature": 0.1}  # Low temperature for consistency
                )
            )
            
            # Parse JSON response
            response_text = response.text.strip()
            
            # Extract JSON from markdown code blocks if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(response_text)
            
            is_in_scope = result.get("is_in_scope", False)
            confidence = float(result.get("confidence", 0.5))
            
            logger.info(f"Classification: in_scope={is_in_scope}, confidence={confidence}")
            logger.debug(f"Reasoning: {result.get('reasoning', 'N/A')}")
            
            return is_in_scope, confidence
            
        except Exception as e:
            logger.error(f"Error classifying question: {str(e)}")
            # Default to in-scope with low confidence if classification fails
            return True, 0.5
    
    async def generate_rag_response(
        self,
        question: str,
        context_chunks: List[Dict[str, Any]],
        page_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate answer using RAG with retrieved context
        
        Args:
            question: User's question
            context_chunks: Retrieved relevant documents from Pinecone
            page_context: Current page context
        
        Returns:
            Dict with answer, sources, suggested_pages
        """
        try:
            # Build context from retrieved chunks
            context_text = self._build_context_text(context_chunks)
            
            # Build RAG prompt
            prompt = self._build_rag_prompt(question, context_text, page_context)
            
            # Generate response
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(
                    prompt,
                    safety_settings=self.safety_settings,
                    generation_config={
                        "temperature": 0.3,  # Slightly higher for natural responses
                        "top_p": 0.95,
                        "top_k": 40
                    }
                )
            )
            
            answer = response.text.strip()
            
            # Extract sources and suggested pages
            sources = self._extract_sources(context_chunks)
            suggested_pages = self._extract_suggested_pages(context_chunks, question)
            
            return {
                "answer": answer,
                "sources": sources,
                "suggested_pages": suggested_pages,
                "confidence_score": self._calculate_confidence(context_chunks)
            }
            
        except Exception as e:
            logger.error(f"Error generating RAG response: {str(e)}")
            raise
    
    def _build_context_text(self, chunks: List[Dict[str, Any]]) -> str:
        """Build formatted context from retrieved chunks"""
        if not chunks:
            return "No relevant documentation found."
        
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            metadata = chunk.get("metadata", {})
            text = chunk.get("text", "")
            page = metadata.get("page", "unknown")
            section = metadata.get("section", "")
            
            context_parts.append(
                f"[Source {i} - Page: {page}, Section: {section}]\n{text}"
            )
        
        return "\n\n".join(context_parts)
    
    def _build_rag_prompt(
        self,
        question: str,
        context: str,
        page_context: Optional[str]
    ) -> str:
        """Build RAG prompt template"""
        return f"""You are the Secura Assistant, a helpful AI guide for the Secura cybersecurity incident management platform.

**CRITICAL RULES:**
1. Answer ONLY using information from the provided context below
2. If the context doesn't contain the answer, say "I don't have that information in my knowledge base"
3. Never make up or hallucinate information
4. Provide step-by-step guidance when explaining how to do something
5. Be concise but complete
6. Use friendly, professional tone
7. Reference specific pages or features when relevant

**CONTEXT FROM DOCUMENTATION:**
{context}

**USER'S CURRENT PAGE:** {page_context or "unknown"}

**USER'S QUESTION:** {question}

**YOUR ANSWER:**
Provide a clear, helpful answer with step-by-step instructions if needed. If you suggest visiting a page, mention the page name clearly."""

    def _extract_sources(self, chunks: List[Dict[str, Any]]) -> List[str]:
        """Extract unique source pages from chunks"""
        sources = set()
        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            page = metadata.get("page", "")
            if page:
                sources.add(page)
        return sorted(list(sources))
    
    def _extract_suggested_pages(
        self,
        chunks: List[Dict[str, Any]],
        question: str
    ) -> List[str]:
        """Extract suggested pages based on relevance"""
        page_scores = {}
        
        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            page = metadata.get("page", "")
            score = chunk.get("score", 0.0)
            
            if page and score > 0.75:  # High relevance threshold
                if page not in page_scores or score > page_scores[page]:
                    page_scores[page] = score
        
        # Sort by score and return top 3
        suggested = sorted(page_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        return [page for page, _ in suggested]
    
    def _calculate_confidence(self, chunks: List[Dict[str, Any]]) -> float:
        """Calculate confidence score based on retrieval quality"""
        if not chunks:
            return 0.0
        
        # Average of top 3 similarity scores
        top_scores = [chunk.get("score", 0.0) for chunk in chunks[:3]]
        return sum(top_scores) / len(top_scores) if top_scores else 0.0
    
    async def health_check(self) -> Dict[str, str]:
        """Health check for Gemini service"""
        try:
            # Test with simple generation
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.model.generate_content(
                    "Say 'OK' if you're working",
                    generation_config={"temperature": 0.0}
                )
            )
            
            if response.text:
                return {
                    "status": "healthy",
                    "model": "gemini-2.5-flash"
                }
            else:
                return {
                    "status": "unhealthy",
                    "error": "No response from model"
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }


# Singleton instance
from functools import lru_cache

@lru_cache(maxsize=1)
def get_gemini_service() -> GeminiService:
    """Get or create GeminiService singleton"""
    return GeminiService()
