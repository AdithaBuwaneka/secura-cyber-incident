# Secura RAG Chatbot - Setup Guide

## 🚀 Quick Setup

### 1. Install New Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New packages added:
- `pinecone-client==3.0.0` - Vector database
- `slowapi==0.1.9` - Rate limiting
- `google-generativeai` (already included)

### 2. Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Google AI / Gemini (for LLM and embeddings)
GOOGLE_API_KEY=your_google_api_key_here

# Pinecone Vector Database
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=secura-chatbot
```

#### Getting API Keys:

**Google AI API Key:**
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy and add to `.env`

**Pinecone API Key:**
1. Visit: https://www.pinecone.io/
2. Sign up for free (Starter plan - free forever)
3. Create new project
4. Go to "API Keys" → Copy your key
5. Note your environment (e.g., `us-east-1`)

### 3. Populate Vector Database

Run the initialization script to load Secura documentation:

```bash
cd backend
python scripts/populate_pinecone.py
```

This will:
- Create Pinecone index (if not exists)
- Generate embeddings for 30+ documentation chunks
- Upload to Pinecone vector database
- Display confirmation

To test the setup:

```bash
python scripts/populate_pinecone.py --test
```

### 4. Start Backend Server

```bash
cd backend
python run.py
```

API will be available at:
- Chatbot endpoint: `http://127.0.0.1:8000/api/chatbot/chat`
- Health check: `http://127.0.0.1:8000/api/chatbot/health`
- API docs: `http://127.0.0.1:8000/docs`

### 5. Add Chatbot Widget to Frontend

The chatbot widget has been created at:
`frontend/src/components/chatbot/ChatbotWidget.tsx`

**To add to any page:**

```tsx
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function YourPage() {
  return (
    <>
      {/* Your page content */}
      
      {/* Add chatbot widget */}
      <ChatbotWidget 
        pageContext="home"  // or "incidents", "dashboard", etc.
      />
    </>
  );
}
```

**Example - Add to Home Page:**

Edit `frontend/src/app/page.tsx`:

```tsx
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function HomePage() {
  return (
    <div>
      {/* Existing home page content */}
      
      {/* Chatbot widget - bottom right corner */}
      <ChatbotWidget pageContext="home" position="bottom-right" />
    </div>
  );
}
```

**Example - Add to Dashboard:**

Edit `frontend/src/app/dashboard/page.tsx`:

```tsx
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function Dashboard() {
  return (
    <div>
      {/* Dashboard content */}
      
      <ChatbotWidget pageContext="dashboard" />
    </div>
  );
}
```

## 🧪 Testing the Chatbot

### 1. Test Backend API

```bash
# Health check
curl http://127.0.0.1:8000/api/chatbot/health

# Test chat (using PowerShell)
$body = @{
    message = "How do I report an incident?"
    session_id = "test-session-123"
    page_context = "home"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/chatbot/chat" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### 2. Test Frontend Widget

1. Start frontend: `cd frontend && npm run dev`
2. Navigate to page with chatbot widget
3. Click blue chat button (bottom right)
4. Ask questions:
   - ✅ "How do I report an incident?"
   - ✅ "What are the user roles?"
   - ✅ "How does AI categorization work?"
   - ❌ "What's the weather?" (should refuse politely)

## 📚 How It Works

### RAG Pipeline:

1. **User asks question** → Frontend sends to `/api/chatbot/chat`

2. **Scope Classification** → Gemini determines if question is website-related
   - ✅ In-scope: Continue to RAG
   - ❌ Out-of-scope: Return polite refusal

3. **Generate Embedding** → Convert question to 768-dim vector

4. **Vector Search** → Query Pinecone for top 5 similar documents (threshold: 0.7)

5. **Context Building** → Retrieved docs become context for LLM

6. **LLM Generation** → Gemini 2.0 Flash generates answer using ONLY retrieved context

7. **Response** → Return answer with sources and suggested pages

### Security Features:

- ✅ Rate limiting: 20 requests/minute per IP
- ✅ Input validation: Pydantic models
- ✅ Output sanitization: Prevents injection
- ✅ API key protection: Environment variables
- ✅ CORS configured
- ✅ Error handling with graceful fallbacks

## 🎯 Key Features

### Backend:
- ✅ Semantic question classification (not keyword matching)
- ✅ Vector similarity search with Pinecone
- ✅ Context-grounded responses (no hallucinations)
- ✅ Source attribution
- ✅ Page suggestions
- ✅ Confidence scoring
- ✅ Health monitoring

### Frontend:
- ✅ Clean, modern UI
- ✅ Real-time message streaming
- ✅ Loading states
- ✅ Source display
- ✅ Suggested page links
- ✅ Mobile responsive
- ✅ Keyboard shortcuts (Enter to send)
- ✅ Auto-scroll to latest message

## 📁 File Structure

```
backend/
├── app/
│   ├── api/
│   │   └── chatbot/
│   │       ├── __init__.py
│   │       └── routes.py              # Main chat endpoint
│   ├── models/
│   │   └── chatbot.py                 # Pydantic models
│   └── services/
│       └── chatbot/
│           ├── __init__.py
│           ├── pinecone_service.py    # Vector database
│           ├── embedding_service.py   # Text embeddings
│           ├── gemini_service.py      # LLM integration
│           ├── scope_classifier.py    # Question classification
│           └── rag_service.py         # Main RAG orchestrator
├── scripts/
│   └── populate_pinecone.py           # DB initialization
└── requirements.txt                    # Updated dependencies

frontend/
└── src/
    └── components/
        └── chatbot/
            └── ChatbotWidget.tsx       # React component
```

## 🔧 Configuration

### Adjust RAG Parameters:

Edit `backend/app/services/chatbot/rag_service.py`:

```python
self.top_k = 5  # Number of documents to retrieve
self.similarity_threshold = 0.7  # Minimum similarity (0-1)
```

### Adjust Rate Limiting:

Edit `backend/app/api/chatbot/routes.py`:

```python
@limiter.limit("20/minute")  # Change rate limit
```

## 🐛 Troubleshooting

### "PINECONE_API_KEY not set"
- Add API key to `.env` file
- Restart backend server

### "No relevant documents found"
- Run `python scripts/populate_pinecone.py`
- Check Pinecone index stats
- Lower similarity threshold (0.5 instead of 0.7)

### "Google API error"
- Verify GOOGLE_API_KEY in `.env`
- Check API quota: https://console.cloud.google.com/

### Chatbot not appearing
- Check React component import
- Verify API URL in widget props
- Check browser console for errors

## 🚀 Production Deployment

### Environment Variables (Vercel/Production):

```env
GOOGLE_API_KEY=your_production_key
PINECONE_API_KEY=your_production_key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=secura-chatbot-prod
```

### Re-populate Production Database:

```bash
# Set production env vars, then:
python scripts/populate_pinecone.py
```

## 📊 Monitoring

Check chatbot health:

```bash
curl http://127.0.0.1:8000/api/chatbot/health
```

Returns status of:
- RAG service
- Embedding service
- Pinecone connection
- Gemini LLM

## 🎉 You're Done!

The RAG chatbot is now fully integrated into your Secura platform with:
- ✅ Smart question classification
- ✅ Vector-based semantic search
- ✅ Context-grounded answers
- ✅ Production-ready security
- ✅ Clean UI widget

Ask the chatbot anything about Secura! 🤖
