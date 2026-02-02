#!/usr/bin/env python3
"""
Secura Backend Server
Run this script to start the FastAPI server
"""
import os
import sys
import uvicorn

# Add the app directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.join(backend_dir, 'app')
sys.path.insert(0, app_dir)

if __name__ == "__main__":
    # Change to app directory to ensure proper imports
    os.chdir(app_dir)
    
    # Start the server
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[app_dir]
    )
# Updated Tue, Feb  3, 2026  3:13:00 AM

