import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

import asyncio
import google.generativeai as genai

# Test OCR text from the phishing email
ocr_text = """From: authenticationmail@trust.ameribank7.com
To: johnsmith@email.com
Subject: A new login to your bank account

Bank of America

Dear account holder,

There has been a recent login to your bank account from a new divice:
IP address: 192.168.0.1

Location: Miami, Florida

4 new transactions have been made with this account since your last login.

If this was not you, please reset your password immediately with this link:

https://trust.ameribank7.com/reset-password

Thank you,

Bank America"""

async def test_gemini_analysis():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        print("No valid Gemini API key found")
        return
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    Analyze the following security incident report and provide a structured analysis:
    
    Title: Image Analysis
    Description: Analyzing text extracted from uploaded image
    
    Additional Context - Text extracted from attached image (OCR):
    {ocr_text}
    
    Please pay special attention to the OCR text as it may contain:
    - Email headers showing phishing indicators
    - Error messages revealing vulnerabilities
    - System logs with security events
    - Screenshots of suspicious activities
    
    Please provide:
    1. Incident Type Classification (choose from: phishing, malware, data_breach, unauthorized_access, social_engineering, system_compromise, insider_threat, denial_of_service)
    2. Severity Level (low, medium, high, critical)
    3. Confidence scores for your classifications (0-1)
    4. Detailed reasoning for your analysis
    5. Top 3 recommended mitigation strategies
    6. Potential risk factors and indicators
    7. Specific threat indicators found in the OCR text (if applicable)
    
    Format your response as a structured analysis with clear sections.
    """
    
    try:
        response = model.generate_content(prompt)
        print("=== GEMINI RESPONSE ===")
        print(response.text)
        print("======================")
        
        # Test parsing threat indicators
        import re
        threat_section = re.search(r'(?i)(?:threat indicators?|specific threats?)[:\s]*\n((?:(?:\d+\.?|[-*•])\s*.+\n?)+)', response.text)
        if threat_section:
            print("\n=== PARSED THREAT INDICATORS ===")
            indicators_text = threat_section.group(1)
            indicators = re.findall(r'(?:\d+\.?|[-*•])\s*(.+?)(?=\n|$)', indicators_text)
            for ind in indicators:
                print(f"- {ind.strip()}")
        else:
            print("\nNo threat indicators section found in response")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini_analysis())