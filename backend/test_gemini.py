import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

# Test if google-generativeai is installed
try:
    import google.generativeai as genai
    print("✓ google-generativeai is installed")
    GEMINI_AVAILABLE = True
except ImportError:
    print("✗ google-generativeai is NOT installed")
    print("Run: pip install google-generativeai")
    GEMINI_AVAILABLE = False
    exit(1)

# Check API key
api_key = os.getenv("GEMINI_API_KEY")
print(f"\n✓ API key found: {api_key is not None}")
print(f"✓ API key configured: {api_key != 'your_gemini_api_key_here' if api_key else False}")

if api_key:
    print(f"✓ API key starts with: {api_key[:10]}...")
    
# Try to initialize Gemini
if GEMINI_AVAILABLE and api_key and api_key != "your_gemini_api_key_here":
    try:
        genai.configure(api_key=api_key)
        
        # List available models
        print("\nAvailable models:")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"  - {m.name}")
        
        # Try different model names
        model_names = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
        model = None
        
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(model_name)
                print(f"\n✓ Successfully initialized with model: {model_name}")
                break
            except Exception as e:
                print(f"✗ Failed with {model_name}: {str(e)[:50]}...")
        
        if model:
            # Test with a simple prompt
            print("\nTesting Gemini with a simple prompt...")
            response = model.generate_content("Say 'Hello, Gemini is working!'")
            print(f"Response: {response.text}")
        else:
            print("\n✗ Could not initialize any Gemini model")
        
    except Exception as e:
        print(f"\n✗ Failed to initialize Gemini: {e}")
else:
    print("\n✗ Cannot initialize Gemini - missing requirements")

print("\nIf Gemini is not working, check:")
print("1. Is google-generativeai installed? Run: pip install google-generativeai")
print("2. Is your API key correct in .env file?")
print("3. Is the API key valid and has quota?")