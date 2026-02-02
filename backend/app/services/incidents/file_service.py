"""
File Service - Jayasanka's Module
Handles file uploads with ImageKit integration
"""

from typing import Optional
from datetime import datetime
from uuid import uuid4
from fastapi import UploadFile

from app.models.file import FileAttachment
from app.services.imagekit_service import ImageKitService
from app.core.firebase_config import FirebaseConfig


class FileService:
    def __init__(self):
        self.db = FirebaseConfig.get_firestore()
        self.files_collection = self.db.collection('file_attachments')
        self.imagekit_service = ImageKitService()

    async def upload_file(
        self,
        file: UploadFile,
        incident_id: str,
        uploader_id: str
    ) -> FileAttachment:
        """Upload file using ImageKit and store metadata"""
        file_id = str(uuid4())
        
        # Upload to ImageKit (don't read file content here, let ImageKit service handle it)
        upload_result = await self.imagekit_service.upload_file(
            file=file,
            incident_id=incident_id,
            uploader_id=uploader_id,
            folder="incident-attachments"
        )
        
        print(f"ImageKit upload result: {upload_result}")
        
        # Check if upload was successful
        if not upload_result.get('success', False):
            raise Exception(f"ImageKit upload failed: {upload_result.get('error', 'Unknown error')}")
        
        # Store file metadata in Firestore
        file_doc = {
            'id': file_id,
            'incident_id': incident_id,
            'filename': file.filename,
            'content_type': file.content_type,
            'size': upload_result.get('size', 0),
            'imagekit_file_id': upload_result.get('file_id', ''),
            'imagekit_url': upload_result.get('url', ''),
            'imagekit_thumbnail_url': upload_result.get('thumbnail_url', ''),
            'uploader_id': uploader_id,
            'created_at': datetime.utcnow(),
            'is_scanned': False,  # For virus scanning
            'scan_result': None,
            'scanned_at': None
        }
        
        # Make sure we have required fields
        if not file_doc['imagekit_file_id'] or not file_doc['imagekit_url']:
            # If we're using mock URLs (development mode), accept them
            if not (file_doc['imagekit_url'] and file_doc['imagekit_url'].startswith('https://placeholder.imagekit.io')):
                raise Exception("ImageKit did not return file_id or url")
        
        self.files_collection.document(file_id).set(file_doc)
        
        return FileAttachment(**file_doc)

    async def get_incident_files(self, incident_id: str) -> list[FileAttachment]:
        """Get all files for an incident"""
        query = self.files_collection.where('incident_id', '==', incident_id).order_by('created_at', direction='DESCENDING')
        docs = query.stream()
        
        files = []
        for doc in docs:
            data = doc.to_dict()
            files.append(FileAttachment(**data))
        
        return files

    async def delete_file(self, file_id: str, user_id: str) -> bool:
        """Delete file (only by uploader or admin)"""
        try:
            # Get file document
            doc = self.files_collection.document(file_id).get()
            if not doc.exists:
                return False
            
            file_data = doc.to_dict()
            
            # Check permissions (only uploader can delete)
            if file_data.get('uploader_id') != user_id:
                return False
            
            # Delete from ImageKit
            imagekit_file_id = file_data.get('imagekit_file_id')
            if imagekit_file_id:
                self.imagekit_service.delete_file(imagekit_file_id)
            
            # Delete from Firestore
            self.files_collection.document(file_id).delete()
            
            return True
        except Exception:
            return False

    async def scan_file_for_viruses(self, file_id: str) -> bool:
        """Placeholder for virus scanning integration"""
        # This would integrate with a virus scanning service
        # For now, we'll mark all files as safe
        try:
            self.files_collection.document(file_id).update({
                'is_scanned': True,
                'scan_result': 'safe',
                'scanned_at': datetime.utcnow()
            })
            return True
        except Exception:
            return False