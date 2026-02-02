#!/usr/bin/env python3
"""
Create Firestore Indexes Script
This script provides the necessary index configurations for Firestore
"""

print("""
=== Firestore Index Configuration ===

The application requires the following composite indexes in Firestore.
Please create them in the Firebase Console:

1. INCIDENTS COLLECTION - User Incidents Query
   Collection: incidents
   Fields:
   - reporter_id (Ascending)
   - created_at (Descending)
   
   Firebase Console URL:
   https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/firestore/indexes

2. INCIDENTS COLLECTION - Status Filter Query
   Collection: incidents
   Fields:
   - reporter_id (Ascending)
   - status (Ascending)
   - created_at (Descending)

3. INCIDENTS COLLECTION - All Incidents Query
   Collection: incidents
   Fields:
   - created_at (Descending)

4. FILE_ATTACHMENTS COLLECTION
   Collection: file_attachments
   Fields:
   - incident_id (Ascending)
   - created_at (Descending)

5. MESSAGES COLLECTION
   Collection: messages
   Fields:
   - incident_id (Ascending)
   - created_at (Ascending)

6. SECURITY_APPLICATIONS COLLECTION
   Collection: security_applications
   Fields:
   - applicant_id (Ascending)
   - created_at (Descending)

To create these indexes:
1. Go to your Firebase Console
2. Navigate to Firestore Database > Indexes
3. Click "Create Index" for each configuration above
4. Select "Collection" scope for all indexes
5. Wait for indexes to build (usually takes a few minutes)

Note: The error message in your console contains a direct link to create the specific index that's missing.
Just click on the link in the error message to create it automatically.
""")

# Alternative: You can also visit the URL from the error message directly
print("""
Based on your error, you can create the required index directly here:
https://console.firebase.google.com/v1/r/project/secura-cyber-incident/firestore/indexes?create_composite=Cldwcm9qZWN0cy9zZWN1cmEtY3liZXItaW5jaWRlbnQvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2luY2lkZW50cy9pbmRleGVzL18QARoPCgtyZXBvcnRlcl9pZBABGg4KCmNyZWF0ZWRfYXQQAhoMCghfX25hbWVfXxAC
""")