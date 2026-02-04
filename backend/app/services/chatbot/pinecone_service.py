"""
Pinecone Vector Database Service
Handles vector storage, retrieval, and similarity search
"""
import os
from typing import List, Dict, Any, Optional
from pinecone import Pinecone, ServerlessSpec
from app.utils.logging import get_logger
import asyncio
from functools import lru_cache

logger = get_logger(__name__)


class PineconeService:
    """
    Manages Pinecone vector database operations
    - Index creation and management
    - Vector upsert with metadata
    - Similarity search with filtering
    """
    
    def __init__(self):
        """Initialize Pinecone client and index"""
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.environment = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "secura-chatbot")
        self.dimension = 768  # Standard embedding dimension for text-embedding models
        
        if not self.api_key:
            raise ValueError("PINECONE_API_KEY environment variable not set")
        
        # Initialize Pinecone client
        self.pc = Pinecone(api_key=self.api_key)
        self.index = None
        
        # Initialize index
        self._initialize_index()
    
    def _initialize_index(self):
        """Create or connect to Pinecone index"""
        try:
            # Check if index exists
            existing_indexes = self.pc.list_indexes()
            index_names = [idx.name for idx in existing_indexes]
            
            if self.index_name not in index_names:
                logger.info(f"Creating new Pinecone index: {self.index_name}")
                
                # Create serverless index
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric="cosine",  # cosine similarity for text embeddings
                    spec=ServerlessSpec(
                        cloud="aws",
                        region=self.environment
                    )
                )
                logger.info(f"Index '{self.index_name}' created successfully")
            else:
                logger.info(f"Connecting to existing index: {self.index_name}")
            
            # Connect to index
            self.index = self.pc.Index(self.index_name)
            
            # Wait for index to be ready
            import time
            time.sleep(1)
            
            logger.info(f"Connected to Pinecone index: {self.index_name}")
            
        except Exception as e:
            logger.error(f"Error initializing Pinecone index: {str(e)}")
            raise
    
    async def upsert_vectors(
        self,
        vectors: List[Dict[str, Any]],
        namespace: str = "default"
    ) -> Dict[str, Any]:
        """
        Upsert vectors to Pinecone index
        
        Args:
            vectors: List of dicts with 'id', 'values', and 'metadata'
            namespace: Namespace for organizing vectors
        
        Returns:
            Upsert statistics
        
        Example:
            vectors = [
                {
                    "id": "doc1",
                    "values": [0.1, 0.2, ...],  # embedding vector
                    "metadata": {
                        "page": "home",
                        "section": "features",
                        "text": "Secura is a cybersecurity platform..."
                    }
                }
            ]
        """
        try:
            logger.info(f"Upserting {len(vectors)} vectors to namespace '{namespace}'")
            
            # Run blocking Pinecone operation in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.index.upsert(
                    vectors=vectors,
                    namespace=namespace
                )
            )
            
            logger.info(f"Successfully upserted {result.upserted_count} vectors")
            return {
                "upserted_count": result.upserted_count,
                "namespace": namespace
            }
            
        except Exception as e:
            logger.error(f"Error upserting vectors: {str(e)}")
            raise
    
    async def query_similar(
        self,
        query_vector: List[float],
        top_k: int = 5,
        namespace: str = "default",
        filter_metadata: Optional[Dict[str, Any]] = None,
        min_score: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Query for similar vectors
        
        Args:
            query_vector: Query embedding vector
            top_k: Number of results to return
            namespace: Namespace to query
            filter_metadata: Optional metadata filter (e.g., {"page": "incidents"})
            min_score: Minimum similarity score threshold (0-1)
        
        Returns:
            List of matches with id, score, metadata, and text
        """
        try:
            logger.info(f"Querying Pinecone - top_k: {top_k}, namespace: {namespace}")
            
            # Prepare query parameters
            query_params = {
                "vector": query_vector,
                "top_k": top_k,
                "namespace": namespace,
                "include_metadata": True
            }
            
            if filter_metadata:
                query_params["filter"] = filter_metadata
            
            # Run blocking query in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.index.query(**query_params)
            )
            
            # Filter by similarity threshold and extract results
            matches = []
            for match in result.matches:
                if match.score >= min_score:
                    matches.append({
                        "id": match.id,
                        "score": float(match.score),
                        "metadata": match.metadata,
                        "text": match.metadata.get("text", "")
                    })
            
            logger.info(f"Found {len(matches)} matches above threshold {min_score}")
            return matches
            
        except Exception as e:
            logger.error(f"Error querying vectors: {str(e)}")
            raise
    
    async def delete_namespace(self, namespace: str):
        """Delete all vectors in a namespace"""
        try:
            logger.info(f"Deleting namespace: {namespace}")
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.index.delete(delete_all=True, namespace=namespace)
            )
            
            logger.info(f"Namespace '{namespace}' deleted")
            
        except Exception as e:
            logger.error(f"Error deleting namespace: {str(e)}")
            raise
    
    async def get_index_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        try:
            loop = asyncio.get_event_loop()
            stats = await loop.run_in_executor(
                None,
                lambda: self.index.describe_index_stats()
            )
            
            return {
                "total_vector_count": stats.total_vector_count,
                "dimension": stats.dimension,
                "namespaces": stats.namespaces
            }
            
        except Exception as e:
            logger.error(f"Error getting index stats: {str(e)}")
            raise
    
    async def health_check(self) -> Dict[str, str]:
        """Health check for Pinecone service"""
        try:
            stats = await self.get_index_stats()
            return {
                "status": "healthy",
                "index": self.index_name,
                "vector_count": stats["total_vector_count"]
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }


# Singleton instance
@lru_cache(maxsize=1)
def get_pinecone_service() -> PineconeService:
    """Get or create Pinecone service singleton"""
    return PineconeService()
