"""
Database Service - Centralized database operations
Handles Firestore operations and data management
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.core.firebase_config import FirebaseConfig

class DatabaseService:
    def __init__(self):
        self.db = FirebaseConfig.get_firestore()
    
    # Generic CRUD operations
    async def create_document(self, collection: str, document_id: str, data: Dict[str, Any]) -> bool:
        """Create a document in collection"""
        try:
            self.db.collection(collection).document(document_id).set(data)
            return True
        except Exception as e:
            print(f"Error creating document: {e}")
            return False
    
    async def get_document(self, collection: str, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID"""
        try:
            doc = self.db.collection(collection).document(document_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Error getting document: {e}")
            return None
    
    async def update_document(self, collection: str, document_id: str, data: Dict[str, Any]) -> bool:
        """Update a document"""
        try:
            self.db.collection(collection).document(document_id).update(data)
            return True
        except Exception as e:
            print(f"Error updating document: {e}")
            return False
    
    async def delete_document(self, collection: str, document_id: str) -> bool:
        """Delete a document"""
        try:
            self.db.collection(collection).document(document_id).delete()
            return True
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
    
    # Query operations
    async def query_collection(
        self, 
        collection: str, 
        filters: List[tuple] = None,
        order_by: str = None,
        order_direction: str = 'asc',
        limit: int = None,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Query collection with filters"""
        try:
            query = self.db.collection(collection)
            
            # Apply filters
            if filters:
                for field, operator, value in filters:
                    query = query.where(field, operator, value)
            
            # Apply ordering
            if order_by:
                direction = 'desc' if order_direction.lower() == 'desc' else 'asc'
                query = query.order_by(order_by, direction=direction)
            
            # Apply pagination
            if offset > 0:
                query = query.offset(offset)
            if limit:
                query = query.limit(limit)
            
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
            
        except Exception as e:
            print(f"Error querying collection: {e}")
            return []
    
    async def get_incident_stats(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, Any]:
        """Get incident statistics"""
        try:
            if not date_from:
                date_from = datetime.now() - timedelta(days=30)
            if not date_to:
                date_to = datetime.now()
            
            # Get all incidents in date range
            query = self.db.collection('incidents').where('created_at', '>=', date_from).where('created_at', '<=', date_to)
            incidents = list(query.stream())
            total_incidents = len(incidents)
            
            # Count by status and severity
            status_counts = {}
            severity_counts = {}
            type_counts = {}
            department_counts = {}
            
            for incident_doc in incidents:
                incident = incident_doc.to_dict()
                
                status = incident.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
                
                severity = incident.get('severity', 'unknown')
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
                
                inc_type = incident.get('incident_type', 'unknown')
                type_counts[inc_type] = type_counts.get(inc_type, 0) + 1
                
                dept = incident.get('reporter_department', 'unknown')
                department_counts[dept] = department_counts.get(dept, 0) + 1
            
            return {
                'total_incidents': total_incidents,
                'open_incidents': status_counts.get('pending', 0) + status_counts.get('investigating', 0),
                'pending': status_counts.get('pending', 0),
                'investigating': status_counts.get('investigating', 0),
                'resolved': status_counts.get('resolved', 0),
                'closed': status_counts.get('closed', 0),
                'critical': severity_counts.get('critical', 0),
                'high': severity_counts.get('high', 0),
                'medium': severity_counts.get('medium', 0),
                'low': severity_counts.get('low', 0),
                'by_type': type_counts,
                'by_department': department_counts,
                'period_start': date_from,
                'period_end': date_to
            }
            
        except Exception as e:
            print(f"Error getting incident stats: {e}")
            return {}
    
    async def test_connection(self):
        """Test Firestore connection"""
        try:
            test_doc = {
                'test': True,
                'timestamp': datetime.now(),
                'message': 'Secura database connection successful'
            }
            
            doc_ref = self.db.collection('test').document('connection_test')
            doc_ref.set(test_doc)
            
            doc = doc_ref.get()
            if doc.exists:
                return {"status": "success", "data": doc.to_dict()}
            else:
                return {"status": "error", "message": "Test document not found"}
                
        except Exception as e:
            return {"status": "error", "message": str(e)}

# Create instance
database_service = DatabaseService()