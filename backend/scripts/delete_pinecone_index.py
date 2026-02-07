"""
Delete Pinecone index to recreate with new dimensions
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from pinecone import Pinecone

api_key = os.getenv("PINECONE_API_KEY")
index_name = os.getenv("PINECONE_INDEX_NAME", "secura-chatbot")

if not api_key:
    print("ERROR: PINECONE_API_KEY not found in .env file")
    sys.exit(1)

try:
    pc = Pinecone(api_key=api_key)
    
    # Check if index exists
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    
    if index_name in existing_indexes:
        print(f"Deleting index: {index_name}")
        pc.delete_index(index_name)
        print(f"✅ Index '{index_name}' deleted successfully!")
    else:
        print(f"⚠️ Index '{index_name}' does not exist")
        
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
