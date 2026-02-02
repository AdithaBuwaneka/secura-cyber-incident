import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

class FirebaseConfig:
    _db = None
    _app = None
    
    @classmethod
    def initialize_firebase(cls):
        """Initialize Firebase Admin SDK"""
        if not firebase_admin._apps:
            try:
                # Create credentials from environment variables
                cred_dict = {
                    "type": "service_account",
                    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                    "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
                    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                    "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
                    "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
                }
                
                cred = credentials.Certificate(cred_dict)
                cls._app = firebase_admin.initialize_app(cred)
                cls._db = firestore.client()
                
                print("Firebase initialized successfully")
                return cls._db
                
            except Exception as e:
                print(f"Firebase initialization failed: {e}")
                cls._db = None
                return None
        else:
            if cls._db is None:
                cls._db = firestore.client()
            return cls._db
    
    @classmethod
    def get_firestore(cls):
        """Get Firestore database client"""
        if cls._db is None:
            return cls.initialize_firebase()
        return cls._db
    
    @classmethod
    def verify_id_token(cls, id_token: str) -> Optional[dict]:
        """Verify Firebase ID token and return user data"""
        try:
            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            print(f"Token verification failed: {e}")
            return None
    
    @classmethod
    def get_user_by_uid(cls, uid: str) -> Optional[dict]:
        """Get user data from Firestore by UID"""
        try:
            db = cls.get_firestore()
            if db:
                user_ref = db.collection('users').document(uid)
                user_doc = user_ref.get()
                if user_doc.exists:
                    return user_doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user data: {e}")
            return None

# Initialize Firebase when module is imported
firebase_db = FirebaseConfig.initialize_firebase()