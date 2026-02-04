"""
Embeddings Service
Generates vector embeddings for text using Google's text-embedding models
"""
import os
from typing import List, Union, Dict
import google.generativeai as genai
from app.utils.logging import get_logger
import asyncio
from functools import lru_cache

logger = get_logger(__name__)


class EmbeddingService:
    """
    Handles text embedding generation using Google's embedding models
    Compatible with Pinecone's vector dimensions
    """
    
    def __init__(self):
        """Initialize Google Generative AI for embeddings"""
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable not set")
        
        # Configure Google AI
        genai.configure(api_key=self.api_key)
        
        # Use text-embedding-004 model (768 dimensions)
        self.model_name = "models/text-embedding-004"
        
        logger.info(f"EmbeddingService initialized with model: {self.model_name}")
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Input text to embed
        
        Returns:
            768-dimensional embedding vector
        """
        try:
            if not text or not text.strip():
                raise ValueError("Text cannot be empty")
            
            # Run blocking embedding generation in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: genai.embed_content(
                    model=self.model_name,
                    content=text,
                    task_type="retrieval_document"  # Optimized for semantic search
                )
            )
            
            embedding = result['embedding']
            logger.debug(f"Generated embedding of dimension: {len(embedding)}")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding optimized for query/search
        
        Args:
            query: User query text
        
        Returns:
            768-dimensional query embedding
        """
        try:
            if not query or not query.strip():
                raise ValueError("Query cannot be empty")
            
            # Run blocking embedding generation in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: genai.embed_content(
                    model=self.model_name,
                    content=query,
                    task_type="retrieval_query"  # Optimized for queries
                )
            )
            
            embedding = result['embedding']
            logger.debug(f"Generated query embedding of dimension: {len(embedding)}")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating query embedding: {str(e)}")
            raise
    
    async def generate_batch_embeddings(
        self,
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batches
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts to process per batch
        
        Returns:
            List of embedding vectors
        """
        try:
            if not texts:
                return []
            
            embeddings = []
            
            # Process in batches to avoid rate limits
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                logger.info(f"Processing batch {i//batch_size + 1} ({len(batch)} texts)")
                
                # Generate embeddings for batch
                batch_embeddings = []
                for text in batch:
                    if text and text.strip():
                        embedding = await self.generate_embedding(text)
                        batch_embeddings.append(embedding)
                    else:
                        # Add zero vector for empty texts
                        batch_embeddings.append([0.0] * 768)
                
                embeddings.extend(batch_embeddings)
                
                # Small delay between batches to respect rate limits
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.1)
            
            logger.info(f"Generated {len(embeddings)} embeddings")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {str(e)}")
            raise
    
    async def health_check(self) -> Dict[str, str]:
        """Health check for embedding service"""
        try:
            # Test with a simple embedding
            test_embedding = await self.generate_embedding("test")
            
            if len(test_embedding) == 768:
                return {
                    "status": "healthy",
                    "model": self.model_name,
                    "dimension": "768"
                }
            else:
                return {
                    "status": "unhealthy",
                    "error": f"Unexpected embedding dimension: {len(test_embedding)}"
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }


# Singleton instance
@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    """Get or create EmbeddingService singleton"""
    return EmbeddingService()
