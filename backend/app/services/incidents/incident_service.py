"""
Incident Service - Jayasanka's Module
Handles CRUD operations for security incidents
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from uuid import uuid4
import asyncio
from functools import lru_cache
import time

from app.models.incident import IncidentCreate, IncidentUpdate, IncidentResponse
from app.models.common import IncidentType, IncidentStatus, IncidentSeverity
from app.core.firebase_config import FirebaseConfig
from app.services.incidents.file_service import FileService


# Simple in-memory cache for incidents
class IncidentCache:
    def __init__(self, ttl_seconds: int = 30):
        self._cache: Dict[str, Any] = {}
        self._timestamps: Dict[str, float] = {}
        self._ttl = ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            if time.time() - self._timestamps[key] < self._ttl:
                return self._cache[key]
            else:
                del self._cache[key]
                del self._timestamps[key]
        return None

    def set(self, key: str, value: Any):
        self._cache[key] = value
        self._timestamps[key] = time.time()

    def invalidate(self, key: str = None):
        if key:
            self._cache.pop(key, None)
            self._timestamps.pop(key, None)
        else:
            self._cache.clear()
            self._timestamps.clear()


# Global cache instance
_incident_cache = IncidentCache(ttl_seconds=30)


class IncidentService:
    def __init__(self):
        self.db = FirebaseConfig.get_firestore()
        self.incidents_collection = self.db.collection('incidents')
        self.file_service = FileService()
        self.cache = _incident_cache

    async def _batch_get_attachments(self, incident_ids: List[str]) -> Dict[str, List]:
        """Batch fetch attachments for multiple incidents - fixes N+1 query problem"""
        if not incident_ids:
            return {}

        attachments_map = {}
        try:
            # Fetch all attachments in one query
            files_collection = self.db.collection('file_attachments')
            all_files = list(files_collection.where('incident_id', 'in', incident_ids[:10]).stream())

            # If more than 10 incidents, batch the queries (Firestore 'in' limit is 10)
            if len(incident_ids) > 10:
                for i in range(10, len(incident_ids), 10):
                    batch_ids = incident_ids[i:i+10]
                    batch_files = list(files_collection.where('incident_id', 'in', batch_ids).stream())
                    all_files.extend(batch_files)

            # Group by incident_id
            for doc in all_files:
                data = doc.to_dict()
                inc_id = data.get('incident_id')
                if inc_id not in attachments_map:
                    attachments_map[inc_id] = []
                attachments_map[inc_id].append({
                    'file_id': data.get('id', doc.id),
                    'filename': data.get('filename', ''),
                    'original_filename': data.get('filename', ''),
                    'file_size': data.get('size', 0),
                    'file_type': data.get('content_type', ''),
                    'file_url': data.get('imagekit_url', ''),
                    'thumbnail_url': data.get('imagekit_thumbnail_url', ''),
                    'uploader_id': data.get('uploader_id', '')
                })
        except Exception as e:
            print(f"Error batch fetching attachments: {e}")

        return attachments_map

    async def create_incident(
        self, 
        incident_data: IncidentCreate, 
        reporter_id: str,
        reporter_email: str,
        reporter_name: str = None,
        reporter_department: str = None
    ) -> IncidentResponse:
        """Create a new security incident"""
        incident_id = str(uuid4())
        
        incident_doc = {
            'id': incident_id,
            'title': incident_data.title,
            'incident_type': incident_data.incident_type.value if incident_data.incident_type else None,
            'description': incident_data.description,
            'severity': incident_data.severity.value if incident_data.severity else IncidentSeverity.LOW.value,
            'status': IncidentStatus.PENDING.value,
            'reporter_id': reporter_id,
            'reporter_name': reporter_name or 'Unknown',
            'reporter_email': reporter_email,
            'reporter_department': reporter_department,
            'assigned_to': None,
            'assigned_to_name': None,
            'assigned_at': None,
            'assigned_by': None,
            'ai_analysis': None,
            'location': incident_data.location.dict() if incident_data.location else None,
            'attachments': incident_data.attachments or [],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'resolved_at': None,
            'resolved_by': None,
            'closed_at': None,
            'additional_context': incident_data.additional_context or {},
            'last_activity': datetime.utcnow(),
            'priority_score': None
        }
        
        self.incidents_collection.document(incident_id).set(incident_doc)
        
        # Convert string values back to enums for the response
        response_data = incident_doc.copy()
        response_data['status'] = IncidentStatus(incident_doc['status'])
        response_data['severity'] = IncidentSeverity(incident_doc['severity'])
        if incident_doc['incident_type']:
            response_data['incident_type'] = IncidentType(incident_doc['incident_type'])
        
        # Ensure attachments is an empty list (not string list)
        response_data['attachments'] = []
        
        return IncidentResponse(**response_data)

    async def create_incident_with_id(
        self,
        incident_id: str,
        incident_data: IncidentCreate,
        reporter_id: str,
        reporter_email: str,
        reporter_name: str = None,
        reporter_department: str = None
    ) -> IncidentResponse:
        """Create a new security incident with a specific ID"""
        incident_doc = {
            'id': incident_id,
            'title': incident_data.title,
            'incident_type': incident_data.incident_type.value if incident_data.incident_type else None,
            'description': incident_data.description,
            'severity': incident_data.severity.value if incident_data.severity else IncidentSeverity.LOW.value,
            'status': IncidentStatus.PENDING.value,
            'reporter_id': reporter_id,
            'reporter_name': reporter_name or 'Unknown',
            'reporter_email': reporter_email,
            'reporter_department': reporter_department,
            'assigned_to': None,
            'assigned_to_name': None,
            'assigned_at': None,
            'assigned_by': None,
            'ai_analysis': None,
            'location': incident_data.location.dict() if incident_data.location else None,
            'attachments': incident_data.attachments or [],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'resolved_at': None,
            'resolved_by': None,
            'closed_at': None,
            'additional_context': incident_data.additional_context or {},
            'last_activity': datetime.utcnow(),
            'priority_score': None
        }

        self.incidents_collection.document(incident_id).set(incident_doc)

        return IncidentResponse(**incident_doc)

    async def get_incident(self, incident_id: str) -> Optional[dict]:
        """Get incident by ID with attachments"""
        doc = self.incidents_collection.document(incident_id).get()
        
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        # Convert string values back to enums
        try:
            if data.get('status') and isinstance(data['status'], str):
                data['status'] = IncidentStatus(data['status'])
            if data.get('severity') and isinstance(data['severity'], str):
                data['severity'] = IncidentSeverity(data['severity'])
            if data.get('incident_type') and isinstance(data['incident_type'], str):
                data['incident_type'] = IncidentType(data['incident_type'])
        except ValueError as e:
            print(f"Error converting enum values: {e}")
            # Set defaults if enum conversion fails
            if 'status' in data and isinstance(data['status'], str):
                data['status'] = IncidentStatus.PENDING
            if 'severity' in data and isinstance(data['severity'], str):
                data['severity'] = IncidentSeverity.LOW
            if 'incident_type' in data and isinstance(data['incident_type'], str):
                data['incident_type'] = None
        
        # Create incident response
        incident = IncidentResponse(**data)
        incident_dict = incident.dict()
        
        # Fetch attachments
        try:
            attachments = await self.file_service.get_incident_files(incident_id)
            if attachments:
                print(f"Found {len(attachments)} attachments for incident {incident_id}")
                incident_dict['attachments'] = [
                    {
                        'file_id': att.id,
                        'filename': att.filename,
                        'original_filename': att.filename,
                        'file_size': att.size,
                        'file_type': att.content_type,
                        'file_url': att.imagekit_url,
                        'thumbnail_url': att.imagekit_thumbnail_url,
                        'uploader_id': att.uploader_id
                    } for att in attachments
                ]
            else:
                incident_dict['attachments'] = []
        except Exception as e:
            print(f"Error fetching attachments for incident {incident_id}: {str(e)}")
            incident_dict['attachments'] = []
        
        return incident_dict

    async def get_all_incidents(
        self, 
        status_filter: Optional[IncidentStatus] = None,
        severity_filter: Optional[str] = None,
        type_filter: Optional[str] = None,
        search: Optional[str] = None,
        date_range: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> dict:
        """Get all incidents (Security Team/Admin view) with pagination info"""
        # To avoid Firestore composite index requirements, we'll fetch all incidents
        # and apply all filtering in memory. This works well for moderate data sizes.
        
        # Get all incidents ordered by creation date
        try:
            if status_filter:
                # If there's a status filter, try to use it (might require simple index)
                try:
                    base_query = self.incidents_collection.where('status', '==', status_filter.value).order_by('created_at', direction='DESCENDING')
                    all_docs = list(base_query.stream())
                except Exception as e:
                    print(f"Status filter query failed, falling back to get all: {e}")
                    # Fallback: get all incidents and filter in memory
                    base_query = self.incidents_collection.order_by('created_at', direction='DESCENDING')
                    all_docs = list(base_query.stream())
            else:
                # No status filter, just get all incidents
                base_query = self.incidents_collection.order_by('created_at', direction='DESCENDING')
                all_docs = list(base_query.stream())
        except Exception as e:
            print(f"Error fetching all incidents: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            all_docs = []
        
        # Apply additional filters in memory
        filtered_docs = []
        for doc in all_docs:
            data = doc.to_dict()
            
            # Apply status filter (in case database filter failed)
            if status_filter and str(data.get('status', '') or '').lower() != status_filter.value.lower():
                continue
            
            # Apply severity filter
            if severity_filter and str(data.get('severity', '') or '').lower() != severity_filter.lower():
                continue
            
            # Apply type filter  
            if type_filter and str(data.get('incident_type', '') or '').lower() != type_filter.lower():
                continue
            
            # Apply date range filter
            if date_range:
                from datetime import datetime, timedelta
                now = datetime.utcnow()
                created_at = data.get('created_at')
                
                if created_at:
                    # Handle Firestore timestamp
                    if hasattr(created_at, 'seconds'):
                        created_date = datetime.fromtimestamp(created_at.seconds)
                    else:
                        created_date = created_at
                    
                    if date_range == 'today':
                        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                        if created_date < start_date:
                            continue
                    elif date_range == 'yesterday':
                        yesterday = now - timedelta(days=1)
                        start_date = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
                        end_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                        if not (start_date <= created_date < end_date):
                            continue
                    elif date_range == 'last_7_days':
                        start_date = now - timedelta(days=7)
                        if created_date < start_date:
                            continue
                    elif date_range == 'last_30_days':
                        start_date = now - timedelta(days=30)
                        if created_date < start_date:
                            continue
                    elif date_range == 'last_90_days':
                        start_date = now - timedelta(days=90)
                        if created_date < start_date:
                            continue
            
            # Apply search filter
            if search:
                search_lower = search.lower()
                searchable_text = ' '.join([
                    str(data.get('title', '') or ''),
                    str(data.get('description', '') or ''),
                    str(data.get('reporter_name', '') or ''),
                    str(data.get('incident_type', '') or ''),
                    str(data.get('reporter_email', '') or '')
                ]).lower()
                
                if search_lower not in searchable_text:
                    continue
            
            filtered_docs.append(doc)
        
        # Calculate pagination info
        total_incidents = len(filtered_docs)
        total_pages = max(1, (total_incidents + limit - 1) // limit)
        current_page = (offset // limit) + 1
        
        # Apply pagination
        paginated_docs = filtered_docs[offset:offset + limit]
        
        incidents = []
        for doc in paginated_docs:
            data = doc.to_dict()
            print(f"Processing incident {data.get('id', 'unknown')}")
            
            # Convert string values back to enums
            try:
                if data.get('status') and isinstance(data['status'], str):
                    # Handle case-insensitive conversion
                    status_str = data['status'].lower()
                    data['status'] = IncidentStatus(status_str)
                if data.get('severity') and isinstance(data['severity'], str):
                    # Handle case-insensitive conversion
                    severity_str = data['severity'].lower()
                    data['severity'] = IncidentSeverity(severity_str)
                if data.get('incident_type') and isinstance(data['incident_type'], str):
                    # Handle case-insensitive conversion
                    type_str = data['incident_type'].lower()
                    data['incident_type'] = IncidentType(type_str)
            except ValueError as e:
                print(f"Error converting enum values for incident {data.get('id', 'unknown')}: {e}")
                print(f"Status: {data.get('status')}, Severity: {data.get('severity')}, Type: {data.get('incident_type')}")
                # Set defaults if enum conversion fails
                if 'status' in data and isinstance(data['status'], str):
                    data['status'] = IncidentStatus.PENDING
                if 'severity' in data and isinstance(data['severity'], str):
                    data['severity'] = IncidentSeverity.LOW
                if 'incident_type' in data and isinstance(data['incident_type'], str):
                    data['incident_type'] = None
            
            # Ensure attachments is a list (it might be stored as strings)
            if 'attachments' in data and isinstance(data['attachments'], list):
                # If attachments are stored as strings (file IDs), keep them as empty list for now
                # The IncidentResponse expects IncidentAttachment objects
                if data['attachments'] and isinstance(data['attachments'][0], str):
                    data['attachments'] = []
            else:
                # Make sure attachments is always a list
                data['attachments'] = []
            
            # Convert location dict to IncidentLocation object if needed
            if data.get('location') and isinstance(data['location'], dict):
                # Location is already a dict, which should work with Pydantic
                pass
            
            # Convert datetime fields from Firestore Timestamp to datetime
            for field in ['created_at', 'updated_at', 'last_activity', 'resolved_at', 'closed_at', 'assigned_at']:
                if field in data and data[field] is not None:
                    # Firestore timestamps are already datetime objects
                    pass
            
            # Ensure resolved_by field exists (for backwards compatibility)
            if 'resolved_by' not in data:
                data['resolved_by'] = None
            
            try:
                incident = IncidentResponse(**data)
                incident_dict = incident.dict()
                
                # Don't fetch attachments individually here - we'll batch load them below
                incident_dict['attachments'] = []
                incidents.append(incident_dict)

            except Exception as e:
                print(f"Error creating IncidentResponse for incident {data.get('id', 'unknown')}: {e}")
                # Skip this incident if we can't create a valid response
                continue

        # PERFORMANCE FIX: Batch load all attachments in ONE query instead of N+1
        incident_ids = [inc['id'] for inc in incidents]
        attachments_map = await self._batch_get_attachments(incident_ids)

        # Assign attachments to incidents
        for incident in incidents:
            incident['attachments'] = attachments_map.get(incident['id'], [])

        # Return response with pagination info
        return {
            "incidents": incidents,
            "pagination": {
                "current_page": current_page,
                "total_pages": total_pages,
                "total_incidents": total_incidents,
                "incidents_per_page": limit
            }
        }

    async def get_user_incidents(
        self, 
        user_id: str,
        status_filter: Optional[IncidentStatus] = None,
        severity_filter: Optional[str] = None,
        type_filter: Optional[str] = None,
        search: Optional[str] = None,
        date_range: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[IncidentResponse]:
        """Get incidents for specific user (Employee view)"""
        # Simplified approach: get all user incidents and filter in memory
        try:
            # Simple query without ordering to avoid index issues
            query = self.incidents_collection.where('reporter_id', '==', user_id)
            all_docs = list(query.stream())
            
            # Sort by created_at in descending order
            from datetime import datetime
            all_docs.sort(key=lambda doc: doc.to_dict().get('created_at', datetime.min), reverse=True)
            
        except Exception as e:
            print(f"Error fetching user incidents: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            all_docs = []
        
        # Apply filters in memory (all_docs is already populated above)
        
        # Apply additional filters in memory
        if status_filter or severity_filter or type_filter or date_range or search:
            filtered_docs = []
            for doc in all_docs:
                data = doc.to_dict()
                
                # Apply status filter
                if status_filter and str(data.get('status', '') or '').lower() != status_filter.value.lower():
                    continue
                
                # Apply severity filter
                if severity_filter and str(data.get('severity', '') or '').lower() != severity_filter.lower():
                    continue
                
                # Apply type filter  
                if type_filter and str(data.get('incident_type', '') or '').lower() != type_filter.lower():
                    continue
                
                # Apply date range filter
                if date_range:
                    from datetime import datetime, timedelta
                    now = datetime.utcnow()
                    created_at = data.get('created_at')
                    
                    if created_at:
                        # Handle Firestore timestamp
                        if hasattr(created_at, 'seconds'):
                            created_date = datetime.fromtimestamp(created_at.seconds)
                        else:
                            created_date = created_at
                        
                        if date_range == 'today':
                            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                            if created_date < start_date:
                                continue
                        elif date_range == 'yesterday':
                            yesterday = now - timedelta(days=1)
                            start_date = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
                            end_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                            if not (start_date <= created_date < end_date):
                                continue
                        elif date_range == 'last_7_days':
                            start_date = now - timedelta(days=7)
                            if created_date < start_date:
                                continue
                        elif date_range == 'last_30_days':
                            start_date = now - timedelta(days=30)
                            if created_date < start_date:
                                continue
                        elif date_range == 'last_90_days':
                            start_date = now - timedelta(days=90)
                            if created_date < start_date:
                                continue
                
                # Apply search filter
                if search:
                    search_lower = search.lower()
                    searchable_text = ' '.join([
                        str(data.get('title', '') or ''),
                        str(data.get('description', '') or ''),
                        str(data.get('reporter_name', '') or ''),
                        str(data.get('incident_type', '') or ''),
                        str(data.get('reporter_email', '') or '')
                    ]).lower()
                    
                    if search_lower not in searchable_text:
                        continue
                
                filtered_docs.append(doc)
            
            all_docs = filtered_docs
        
        incidents = []
        for doc in all_docs:
            data = doc.to_dict()
            print(f"Processing incident {data.get('id', 'unknown')}")
            
            # Convert string values back to enums
            try:
                if data.get('status') and isinstance(data['status'], str):
                    # Handle case-insensitive conversion
                    status_str = data['status'].lower()
                    data['status'] = IncidentStatus(status_str)
                if data.get('severity') and isinstance(data['severity'], str):
                    # Handle case-insensitive conversion
                    severity_str = data['severity'].lower()
                    data['severity'] = IncidentSeverity(severity_str)
                if data.get('incident_type') and isinstance(data['incident_type'], str):
                    # Handle case-insensitive conversion
                    type_str = data['incident_type'].lower()
                    data['incident_type'] = IncidentType(type_str)
            except ValueError as e:
                print(f"Error converting enum values for incident {data.get('id', 'unknown')}: {e}")
                print(f"Status: {data.get('status')}, Severity: {data.get('severity')}, Type: {data.get('incident_type')}")
                # Set defaults if enum conversion fails
                if 'status' in data and isinstance(data['status'], str):
                    data['status'] = IncidentStatus.PENDING
                if 'severity' in data and isinstance(data['severity'], str):
                    data['severity'] = IncidentSeverity.LOW
                if 'incident_type' in data and isinstance(data['incident_type'], str):
                    data['incident_type'] = None
            
            # Ensure attachments is a list (it might be stored as strings)
            if 'attachments' in data and isinstance(data['attachments'], list):
                # If attachments are stored as strings (file IDs), keep them as empty list for now
                # The IncidentResponse expects IncidentAttachment objects
                if data['attachments'] and isinstance(data['attachments'][0], str):
                    data['attachments'] = []
            else:
                # Make sure attachments is always a list
                data['attachments'] = []
            
            # Convert location dict to IncidentLocation object if needed
            if data.get('location') and isinstance(data['location'], dict):
                # Location is already a dict, which should work with Pydantic
                pass
            
            # Convert datetime fields from Firestore Timestamp to datetime
            for field in ['created_at', 'updated_at', 'last_activity', 'resolved_at', 'closed_at', 'assigned_at']:
                if field in data and data[field] is not None:
                    # Firestore timestamps are already datetime objects
                    pass
            
            # Ensure resolved_by field exists (for backwards compatibility)
            if 'resolved_by' not in data:
                data['resolved_by'] = None
            
            try:
                incident = IncidentResponse(**data)
                incident_dict = incident.dict()
                incident_dict['attachments'] = []
                incidents.append(incident_dict)

            except Exception as e:
                print(f"Error creating IncidentResponse for incident {data.get('id', 'unknown')}: {e}")
                continue

        # PERFORMANCE FIX: Batch load all attachments in ONE query
        incident_ids = [inc['id'] for inc in incidents]
        attachments_map = await self._batch_get_attachments(incident_ids)

        for incident in incidents:
            incident['attachments'] = attachments_map.get(incident['id'], [])

        return incidents

    async def update_incident(
        self, 
        incident_id: str, 
        incident_data: IncidentUpdate,
        updated_by: str
    ) -> IncidentResponse:
        """Update incident details"""
        update_data = {
            'updated_at': datetime.utcnow(),
            'updated_by': updated_by
        }
        
        if incident_data.title:
            update_data['title'] = incident_data.title
        if incident_data.description:
            update_data['description'] = incident_data.description
        if incident_data.severity:
            update_data['severity'] = incident_data.severity.value
        if incident_data.status:
            update_data['status'] = incident_data.status.value
            if incident_data.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
                update_data['resolved_at'] = datetime.utcnow()
                update_data['resolved_by'] = updated_by
        if incident_data.assigned_to:
            update_data['assigned_to'] = incident_data.assigned_to
        
        self.incidents_collection.document(incident_id).update(update_data)
        
        return await self.get_incident(incident_id)

    async def assign_incident(
        self, 
        incident_id: str, 
        assignee_id: str,
        assigned_by: str
    ) -> IncidentResponse:
        """Assign incident to security team member"""
        
        # Get assignee information from users collection
        assignee_name = "Unknown User"
        try:
            users_collection = self.db.collection('users')
            assignee_doc = users_collection.document(assignee_id).get()
            if assignee_doc.exists:
                assignee_data = assignee_doc.to_dict()
                assignee_name = assignee_data.get('full_name', 'Unknown User')
        except Exception as e:
            print(f"Warning: Could not get assignee name: {e}")
        
        update_data = {
            'assigned_to': assignee_id,
            'assigned_to_name': assignee_name,
            'assigned_at': datetime.utcnow(),
            'status': IncidentStatus.INVESTIGATING.value,
            'updated_at': datetime.utcnow(),
            'assigned_by': assigned_by
        }
        
        self.incidents_collection.document(incident_id).update(update_data)
        
        return await self.get_incident(incident_id)

    async def unassign_incident(
        self, 
        incident_id: str,
        unassigned_by: str
    ) -> IncidentResponse:
        """Unassign incident (remove assignee)"""
        update_data = {
            'assigned_to': None,
            'assigned_to_name': None,
            'assigned_at': None,
            'status': IncidentStatus.PENDING.value,
            'updated_at': datetime.utcnow(),
            'unassigned_by': unassigned_by,
            'unassigned_at': datetime.utcnow()
        }
        
        self.incidents_collection.document(incident_id).update(update_data)
        
        return await self.get_incident(incident_id)

    async def update_ai_analysis(
        self,
        incident_id: str,
        ai_category: str,
        ai_confidence: float,
        suggested_severity: IncidentSeverity = None
    ) -> IncidentResponse:
        """Update incident with AI analysis results"""
        update_data = {
            'ai_category': ai_category,
            'ai_confidence': ai_confidence,
            'updated_at': datetime.utcnow()
        }

        if suggested_severity:
            update_data['severity'] = suggested_severity.value

        self.incidents_collection.document(incident_id).update(update_data)

        return await self.get_incident(incident_id)

    async def get_dashboard_incidents(self, limit: int = 10) -> List[Dict]:
        """
        FAST: Get recent incidents for dashboard WITHOUT attachments
        Optimized for speed - no N+1 queries
        """
        # Check cache first
        cache_key = f"dashboard_incidents_{limit}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        try:
            # Get only limited recent incidents
            query = self.incidents_collection.order_by(
                'created_at', direction='DESCENDING'
            ).limit(limit)

            docs = list(query.stream())
            incidents = []

            for doc in docs:
                data = doc.to_dict()

                # Fast enum conversion
                try:
                    if data.get('status') and isinstance(data['status'], str):
                        data['status'] = data['status'].lower()
                    if data.get('severity') and isinstance(data['severity'], str):
                        data['severity'] = data['severity'].lower()
                    if data.get('incident_type') and isinstance(data['incident_type'], str):
                        data['incident_type'] = data['incident_type'].lower()
                except:
                    pass

                # Return minimal data for dashboard (no attachments)
                incidents.append({
                    'id': data.get('id'),
                    'title': data.get('title'),
                    'status': data.get('status'),
                    'severity': data.get('severity'),
                    'incident_type': data.get('incident_type'),
                    'reporter_name': data.get('reporter_name'),
                    'assigned_to_name': data.get('assigned_to_name'),
                    'created_at': data.get('created_at'),
                    'updated_at': data.get('updated_at')
                })

            # Cache for 30 seconds
            self.cache.set(cache_key, incidents)
            return incidents

        except Exception as e:
            print(f"Error getting dashboard incidents: {e}")
            return []

    async def get_incident_stats(self) -> Dict[str, Any]:
        """
        FAST: Get incident statistics without loading full documents
        Uses aggregation for counts only
        """
        cache_key = "incident_stats"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        try:
            # Get all incidents (but only count them, don't process)
            all_docs = list(self.incidents_collection.stream())

            stats = {
                'total': len(all_docs),
                'pending': 0,
                'investigating': 0,
                'resolved': 0,
                'closed': 0,
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0
            }

            for doc in all_docs:
                data = doc.to_dict()
                status = str(data.get('status', '')).lower()
                severity = str(data.get('severity', '')).lower()

                # Count by status
                if status in stats:
                    stats[status] += 1

                # Count by severity
                if severity in stats:
                    stats[severity] += 1

            # Calculate derived stats
            stats['open'] = stats['pending'] + stats['investigating']
            stats['closed_total'] = stats['resolved'] + stats['closed']

            # Count critical/high severity open incidents (for alert banner)
            critical_high_open = 0
            for doc in all_docs:
                data = doc.to_dict()
                status = str(data.get('status', '')).lower()
                severity = str(data.get('severity', '')).lower()
                if severity in ['critical', 'high'] and status not in ['resolved', 'closed']:
                    critical_high_open += 1
            stats['critical_high_open'] = critical_high_open

            self.cache.set(cache_key, stats)
            return stats

        except Exception as e:
            print(f"Error getting incident stats: {e}")
            return {'total': 0, 'open': 0, 'closed_total': 0}

    async def get_assigned_incidents_fast(self, user_id: str, limit: int = 20) -> List[Dict]:
        """
        FAST: Get assigned incidents for a user without N+1 queries
        """
        try:
            # Direct query with filter (no order_by to avoid index requirement)
            query = self.incidents_collection.where(
                'assigned_to', '==', user_id
            ).limit(limit * 2)  # Get more to account for filtering

            docs = list(query.stream())
            incidents = []

            for doc in docs:
                data = doc.to_dict()
                status = str(data.get('status', '')).lower()

                # Skip resolved/closed
                if status in ['resolved', 'closed']:
                    continue

                incidents.append({
                    'id': data.get('id'),
                    'title': data.get('title'),
                    'status': status,
                    'severity': str(data.get('severity', '')).lower(),
                    'incident_type': str(data.get('incident_type', '')).lower(),
                    'reporter_name': data.get('reporter_name'),
                    'created_at': data.get('created_at'),
                    'assigned_at': data.get('assigned_at')
                })

            # Sort by created_at in Python
            incidents.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            return incidents[:limit]

        except Exception as e:
            print(f"Error getting assigned incidents: {e}")
            return []

    async def get_resolved_incidents_fast(self, user_id: str, limit: int = 20) -> List[Dict]:
        """
        FAST: Get resolved incidents for a user without N+1 queries
        """
        try:
            # Query resolved incidents (no order_by to avoid index requirement)
            query = self.incidents_collection.where(
                'status', 'in', ['resolved', 'closed']
            ).limit(limit * 3)  # Get more to account for filtering

            docs = list(query.stream())
            incidents = []

            for doc in docs:
                data = doc.to_dict()

                # Filter by user (assigned_to or resolved_by)
                if data.get('assigned_to') != user_id and data.get('resolved_by') != user_id:
                    continue

                incidents.append({
                    'id': data.get('id'),
                    'title': data.get('title'),
                    'status': str(data.get('status', '')).lower(),
                    'severity': str(data.get('severity', '')).lower(),
                    'incident_type': str(data.get('incident_type', '')).lower(),
                    'reporter_name': data.get('reporter_name'),
                    'resolved_at': data.get('resolved_at'),
                    'resolved_by': data.get('resolved_by'),
                    'assigned_at': data.get('assigned_at'),
                    'created_at': data.get('created_at')
                })

            # Sort by resolved_at in Python
            incidents.sort(key=lambda x: x.get('resolved_at', ''), reverse=True)
            return incidents[:limit]

        except Exception as e:
            print(f"Error getting resolved incidents: {e}")
            return []