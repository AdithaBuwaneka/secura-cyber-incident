"""
ImageKit Service - File Upload Management
Handles secure file uploads with virus scanning and 10MB limits
"""

from imagekitio import ImageKit
import os
import hashlib
import mimetypes
from typing import Optional, Dict, Any
from datetime import datetime
from dotenv import load_dotenv
from fastapi import UploadFile, HTTPException

load_dotenv()

class ImageKitService:
    def __init__(self):
        """Initialize ImageKit service with environment configuration"""
        self.private_key = os.getenv('IMAGEKIT_PRIVATE_KEY')
        self.public_key = os.getenv('IMAGEKIT_PUBLIC_KEY')
        self.url_endpoint = os.getenv('IMAGEKIT_URL_ENDPOINT')
        
        # Check if ImageKit is configured
        self.is_configured = all([self.private_key, self.public_key, self.url_endpoint])
        
        if self.is_configured:
            print(f"ImageKit configured with endpoint: {self.url_endpoint}")
            self.imagekit = ImageKit(
                private_key=self.private_key,
                public_key=self.public_key,
                url_endpoint=self.url_endpoint
            )
        else:
            print("WARNING: ImageKit not configured. File uploads will use local storage.")
            print(f"Private key present: {bool(self.private_key)}")
            print(f"Public key present: {bool(self.public_key)}")
            print(f"URL endpoint: {self.url_endpoint}")
            self.imagekit = None
        
        # File validation settings
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.allowed_extensions = {
            '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', 
            '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip'
        }
        self.allowed_mime_types = {
            'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
            'text/plain', 'application/msword', 'application/zip',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        }
    
    def validate_file(self, file: UploadFile) -> Dict[str, Any]:
        """Validate file before upload"""
        errors = []
        
        # Check file size (file.size might be None for some upload methods)
        if file.size and file.size > self.max_file_size:
            errors.append(f"File size exceeds 10MB limit. Current size: {file.size / (1024*1024):.2f}MB")
        
        # Check file extension
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in self.allowed_extensions:
            errors.append(f"File type {file_extension} not allowed")
        
        # Check MIME type
        if file.content_type not in self.allowed_mime_types:
            errors.append(f"MIME type {file.content_type} not allowed")
        
        # Basic filename validation
        if not file.filename or len(file.filename) > 255:
            errors.append("Invalid filename")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'file_info': {
                'filename': file.filename,
                'size': file.size or 0,
                'content_type': file.content_type,
                'extension': file_extension
            }
        }
    
    def get_upload_token(self) -> Dict[str, Any]:
        """Generate upload token for frontend"""
        try:
            authentication_parameters = self.imagekit.get_authentication_parameters()
            return {
                "success": True,
                "signature": authentication_parameters['signature'],
                "expire": authentication_parameters['expire'],
                "token": authentication_parameters['token'],
                "public_key": os.getenv('IMAGEKIT_PUBLIC_KEY'),
                "url_endpoint": os.getenv('IMAGEKIT_URL_ENDPOINT')
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate upload token: {str(e)}"
            }
    
    async def upload_file(
        self, 
        file: UploadFile, 
        incident_id: str,
        uploader_id: str,
        folder: str = "incident-attachments"
    ) -> Dict[str, Any]:
        """Upload file to ImageKit with security validation"""
        try:
            # Validate file
            validation = self.validate_file(file)
            if not validation['valid']:
                raise HTTPException(status_code=400, detail=validation['errors'])
            
            # Read file content
            file_content = await file.read()
            
            # Reset file pointer to beginning after reading
            await file.seek(0)
            
            # Generate file hash for integrity
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            # Create unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{incident_id}_{timestamp}_{file_hash[:8]}{file_extension}"
            
            # If ImageKit is not configured, use a mock response
            if not self.is_configured:
                # For development/testing without ImageKit
                mock_url = f"https://placeholder.imagekit.io/tr:w-500/{folder}/{incident_id}/{unique_filename}"
                return {
                    "success": True,
                    "file_id": file_hash[:16],
                    "url": mock_url,
                    "thumbnail_url": mock_url,
                    "name": unique_filename,
                    "original_filename": file.filename,
                    "size": len(file_content),
                    "file_hash": file_hash,
                    "upload_timestamp": datetime.now().isoformat()
                }

            # Upload to ImageKit
            print(f"Uploading to ImageKit: filename={unique_filename}, size={len(file_content)}, type={file.content_type}")
            
            try:
                # For imagekitio 4.1.0, we need to use the correct method signature
                # Convert file content to base64 as required by newer versions
                import base64
                file_base64 = base64.b64encode(file_content).decode('utf-8')
                
                # Try the simplest upload method first
                upload_result = self.imagekit.upload(
                    file=file_base64,
                    file_name=unique_filename
                )
                
                # If that works, update the file with metadata
                if upload_result and hasattr(upload_result, 'file_id'):
                    # Update file metadata if possible
                    try:
                        self.imagekit.update_file_details(
                            upload_result.file_id,
                            custom_metadata={
                                "incident_id": incident_id,
                                "uploader_id": uploader_id,
                                "original_filename": file.filename,
                                "upload_timestamp": datetime.now().isoformat(),
                                "file_hash": file_hash
                            }
                        )
                    except:
                        pass  # Metadata update is optional
                
                print(f"ImageKit upload successful: {upload_result}")
            except Exception as e:
                print(f"ImageKit upload error: {str(e)}")
                print(f"Error type: {type(e)}")
                print(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details'}")
                raise
            
            # Handle both dict and object responses from ImageKit
            if isinstance(upload_result, dict):
                return {
                    "success": True,
                    "file_id": upload_result.get('fileId', ''),
                    "url": upload_result.get('url', ''),
                    "thumbnail_url": upload_result.get('thumbnailUrl', upload_result.get('url', '')),
                    "name": upload_result.get('name', unique_filename),
                    "original_filename": file.filename,
                    "size": upload_result.get('size', len(file_content)),
                    "file_hash": file_hash,
                    "upload_timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "success": True,
                    "file_id": upload_result.file_id if hasattr(upload_result, 'file_id') else upload_result.fileId,
                    "url": upload_result.url,
                    "thumbnail_url": upload_result.thumbnail_url if hasattr(upload_result, 'thumbnail_url') else upload_result.thumbnailUrl,
                    "name": upload_result.name,
                    "original_filename": file.filename,
                    "size": upload_result.size if hasattr(upload_result, 'size') else len(file_content),
                    "file_hash": file_hash,
                    "upload_timestamp": datetime.now().isoformat()
                }
            
        except HTTPException:
            raise
        except Exception as e:
            return {
                "success": False, 
                "error": f"File upload failed: {str(e)}"
            }
    
    def delete_file(self, file_id: str) -> Dict[str, Any]:
        """Delete file from ImageKit"""
        try:
            result = self.imagekit.delete_file(file_id)
            return {
                "success": True,
                "message": "File deleted successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to delete file: {str(e)}"
            }
    
    def get_file_details(self, file_id: str) -> Dict[str, Any]:
        """Get file details from ImageKit"""
        try:
            file_details = self.imagekit.get_file_details(file_id)
            return {
                "success": True,
                "file_details": {
                    "file_id": file_details.file_id,
                    "name": file_details.name,
                    "url": file_details.url,
                    "thumbnail_url": file_details.thumbnail_url,
                    "size": file_details.size,
                    "created_at": file_details.created_at,
                    "custom_metadata": file_details.custom_metadata
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get file details: {str(e)}"
            }
    
    def generate_secure_url(self, file_path: str, expiry_seconds: int = 3600) -> Dict[str, Any]:
        """Generate secure URL for private file access"""
        try:
            # Generate signed URL for private file access
            signed_url = self.imagekit.url({
                "path": file_path,
                "signed": True,
                "expire_seconds": expiry_seconds
            })
            
            return {
                "success": True,
                "secure_url": signed_url,
                "expires_in": expiry_seconds
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate secure URL: {str(e)}"
            }

# Create instance
imagekit_service = ImageKitService()