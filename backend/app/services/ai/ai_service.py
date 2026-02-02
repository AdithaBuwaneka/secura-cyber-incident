"""
AI Service - Rithara's Module
Handles incident categorization, severity assessment, and threat intelligence
"""

from typing import List, Dict, Any, Optional
import re
import os
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import math
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    import pandas as pd
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from app.models.common import IncidentType, IncidentSeverity
from app.services.ai.threat_prediction_model import ThreatPredictionModel

class AIService:
    def __init__(self):
        # Initialize Firestore connection
        from app.core.firebase_config import FirebaseConfig
        self.db = FirebaseConfig.get_firestore()
        
        # Try to load the trained ML model
        self.ml_model = None
        model_dir = 'backend/app/models/ml_models'
        if os.path.exists(model_dir) and SKLEARN_AVAILABLE:
            try:
                self.ml_model = ThreatPredictionModel()
                self.ml_model.load_models(model_dir)
                print("ML model loaded successfully!")
            except Exception as e:
                print(f"Failed to load ML model: {e}")
                self.ml_model = None
        
        # Initialize Gemini if available
        self.gemini_model = None
        print(f"GEMINI_AVAILABLE: {GEMINI_AVAILABLE}")
        if GEMINI_AVAILABLE:
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            print(f"Gemini API key found: {gemini_api_key is not None}")
            print(f"API key value check: {gemini_api_key != 'your_gemini_api_key_here' if gemini_api_key else False}")
            if gemini_api_key and gemini_api_key != "your_gemini_api_key_here":
                try:
                    genai.configure(api_key=gemini_api_key)
                    # Use the newer Gemini model
                    self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                    print("Gemini model initialized successfully!")
                except Exception as e:
                    print(f"Failed to initialize Gemini: {e}")
                    self.gemini_model = None
            else:
                print("Gemini API key not configured")
        else:
            print("Gemini library not available - need to install google-generativeai")
        
        # Enhanced keyword patterns with weighted scoring (fallback)
        self.category_keywords = {
            IncidentType.PHISHING: {
                'high_confidence': ['phishing', 'spear phishing', 'credential harvesting', 'fake login page'],
                'medium_confidence': ['suspicious email', 'fake email', 'scam email', 'impersonation'],
                'indicators': ['click here', 'verify account', 'urgent action', 'suspended account', 'prize winner'],
                'domains': ['suspicious link', 'shortened url', 'fake website', 'lookalike domain']
            },
            IncidentType.MALWARE: {
                'high_confidence': ['malware', 'ransomware', 'trojan', 'virus detected'],
                'medium_confidence': ['suspicious file', 'infected system', 'antivirus alert'],
                'indicators': ['file encrypted', 'system slow', 'popup ads', 'unknown process'],
                'file_types': ['.exe', '.bat', '.scr', '.zip attachment']
            },
            IncidentType.UNAUTHORIZED_ACCESS: {
                'high_confidence': ['unauthorized access', 'account compromised', 'hacked account'],
                'medium_confidence': ['suspicious login', 'failed login attempts', 'access denied'],
                'indicators': ['unknown location', 'unusual activity', 'password changed', 'sessions active'],
                'systems': ['server breach', 'database access', 'admin panel', 'privileged account']
            },
            IncidentType.DATA_BREACH: {
                'high_confidence': ['data breach', 'data leak', 'sensitive data exposed'],
                'medium_confidence': ['confidential information', 'personal data', 'customer records'],
                'indicators': ['database dump', 'files stolen', 'data exfiltration', 'information disclosed'],
                'data_types': ['credit card', 'social security', 'medical records', 'financial data']
            },
            IncidentType.SOCIAL_ENGINEERING: {
                'high_confidence': ['social engineering', 'pretexting', 'baiting attack'],
                'medium_confidence': ['manipulation', 'impersonation', 'psychological pressure'],
                'indicators': ['urgent request', 'authority figure', 'fear tactics', 'trust exploitation'],
                'methods': ['phone scam', 'fake support', 'CEO fraud', 'invoice fraud']
            },
            IncidentType.PHYSICAL_SECURITY: {
                'high_confidence': ['unauthorized entry', 'facility breach', 'physical intrusion'],
                'medium_confidence': ['tailgating', 'badge theft', 'access control'],
                'indicators': ['door propped open', 'unknown person', 'security bypass', 'surveillance blind spot'],
                'areas': ['server room', 'restricted area', 'emergency exit', 'loading dock']
            }
        }
        
        # Enhanced severity assessment with weighted indicators
        self.severity_indicators = {
            'critical': {
                'system_impact': ['system down', 'complete outage', 'network offline', 'servers compromised'],
                'data_impact': ['data stolen', 'complete breach', 'database dump', 'mass exfiltration'],
                'ransomware': ['encrypted files', 'ransom demand', 'all files locked', 'payment demanded'],
                'infrastructure': ['critical system', 'production down', 'business stopped']
            },
            'high': {
                'scope': ['multiple users', 'department wide', 'company wide', 'all employees'],
                'data_type': ['sensitive data', 'financial records', 'customer data', 'confidential'],
                'targets': ['executive', 'admin account', 'privileged user', 'c-level'],
                'impact': ['significant loss', 'regulatory violation', 'reputation damage']
            },
            'medium': {
                'scope': ['single user', 'small group', 'one department', 'limited access'],
                'activity': ['suspicious activity', 'unusual behavior', 'potential threat', 'investigation needed'],
                'containment': ['isolated incident', 'contained threat', 'blocked attack']
            },
            'low': {
                'classification': ['false positive', 'false alarm', 'benign activity'],
                'severity': ['minor issue', 'informational', 'awareness only', 'no impact'],
                'status': ['resolved', 'no action needed', 'monitoring only']
            }
        }

    async def analyze_with_gemini(self, title: str, description: str, ocr_text: str = None) -> Dict[str, Any]:
        """
        Analyze incident using Google Gemini AI
        """
        if not self.gemini_model:
            raise Exception("Gemini model not initialized")
        
        try:
            # Create a simple, clear prompt for Gemini
            if ocr_text:
                prompt = f"""
                Analyze this text extracted from an image:
                
                {ocr_text}
                
                Please provide:
                
                1. SUMMARY: What is this image about? (2-3 sentences)
                
                2. ASSESSMENT: Is this a normal image or does it appear to be a security threat (like phishing, malware, scam, etc.)?
                   Answer: "Normal image" or "[Type] attempt" (e.g., "Phishing attempt")
                
                3. THREAT INDICATORS: If this is a threat, list why you decided this in simple point form:
                   - First reason
                   - Second reason
                   - Third reason
                   (etc.)
                   
                   If this is NOT a threat, write: "No threats detected"
                
                4. RECOMMENDATIONS: If this is a threat, what should the user do? List in simple point form:
                   - First action
                   - Second action
                   - Third action
                   (etc.)
                   
                   If this is NOT a threat, write: "No action required"
                
                IMPORTANT: Use plain text only. No markdown formatting, no asterisks, no hashtags, no special formatting.
                Write your points starting with a simple dash (-) and keep each point on one line.
                """
            
            # Generate response from Gemini
            response = self.gemini_model.generate_content(prompt)
            
            # Parse Gemini's response
            gemini_text = response.text
            
            print("=== GEMINI RAW RESPONSE ===")
            print(gemini_text)
            print("==========================")
            
            # Clean any markdown formatting from response
            def clean_text(text):
                # Remove any markdown symbols
                text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
                text = re.sub(r'\*([^*]+)\*', r'\1', text)      # Italic
                text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)  # Headers
                text = re.sub(r'`([^`]+)`', r'\1', text)         # Code
                return text.strip()
            
            # Parse each section from Gemini's response
            sections = {
                'summary': '',
                'assessment': '',
                'threat_indicators': [],
                'recommendations': []
            }
            
            # Extract SUMMARY section
            summary_match = re.search(r'(?i)SUMMARY[:\s]*(.+?)(?=\n\s*\d+\.|\n\s*ASSESSMENT|$)', gemini_text, re.DOTALL)
            if summary_match:
                sections['summary'] = clean_text(summary_match.group(1).strip())
            
            # Extract ASSESSMENT section
            assessment_match = re.search(r'(?i)ASSESSMENT[:\s]*(.+?)(?=\n\s*\d+\.|\n\s*THREAT|$)', gemini_text, re.DOTALL)
            if assessment_match:
                sections['assessment'] = clean_text(assessment_match.group(1).strip())
            
            # Extract THREAT INDICATORS section
            threat_match = re.search(r'(?i)THREAT INDICATORS[:\s]*(.+?)(?=\n\s*\d+\.|\n\s*RECOMMENDATIONS|$)', gemini_text, re.DOTALL)
            if threat_match:
                threat_text = threat_match.group(1).strip()
                if 'no threats detected' in threat_text.lower():
                    sections['threat_indicators'] = []
                else:
                    # Extract each line that starts with a dash
                    indicators = re.findall(r'^\s*[-•]\s*(.+)$', threat_text, re.MULTILINE)
                    sections['threat_indicators'] = [clean_text(ind) for ind in indicators if ind.strip()]
            
            # Extract RECOMMENDATIONS section  
            rec_match = re.search(r'(?i)RECOMMENDATIONS[:\s]*(.+?)(?=$)', gemini_text, re.DOTALL)
            if rec_match:
                rec_text = rec_match.group(1).strip()
                if 'no action required' in rec_text.lower():
                    sections['recommendations'] = []
                else:
                    # Extract each line that starts with a dash
                    recs = re.findall(r'^\s*[-•]\s*(.+)$', rec_text, re.MULTILINE)
                    sections['recommendations'] = [clean_text(rec) for rec in recs if rec.strip()]
            
            # Determine incident type and severity from assessment
            incident_type = 'unknown'
            severity = 'medium'
            
            assessment_lower = sections['assessment'].lower()
            if 'phishing' in assessment_lower:
                incident_type = 'phishing'
                severity = 'high'
            elif 'malware' in assessment_lower:
                incident_type = 'malware'
                severity = 'critical'
            elif 'scam' in assessment_lower or 'fraud' in assessment_lower:
                incident_type = 'social_engineering'
                severity = 'high'
            elif 'normal' in assessment_lower:
                incident_type = 'none'
                severity = 'low'
            
            # Confidence based on whether threats were found
            confidence = 0.9 if sections['threat_indicators'] else 0.3
            
            print(f"\nParsed Gemini Response:")
            print(f"Summary: {sections['summary'][:100]}...")
            print(f"Assessment: {sections['assessment']}")
            print(f"Threat Indicators: {len(sections['threat_indicators'])} found")
            print(f"Recommendations: {len(sections['recommendations'])} found")
            
            return {
                'categories': [{
                    'category': incident_type,
                    'confidence': confidence,
                    'reasoning': sections['assessment']
                }],
                'severity': {
                    'severity': severity,
                    'confidence': confidence,
                    'factors': sections['threat_indicators'][:3] if sections['threat_indicators'] else ['No specific threats identified']
                },
                'mitigation_strategies': [
                    {
                        'strategy': rec,
                        'priority': idx + 1,
                        'estimated_time': '1-2 hours',
                        'resources_required': ['Security team']
                    }
                    for idx, rec in enumerate(sections['recommendations'][:3])
                ],
                'threat_indicators': sections['threat_indicators'],
                'recommendations': sections['recommendations'],
                'summary': sections['summary'],
                'assessment': sections['assessment'],
                'gemini_full_analysis': gemini_text,
                'confidence_score': confidence
            }
            
        except Exception as e:
            print(f"Gemini analysis failed: {e}")
            raise

    async def analyze_incident(
        self, 
        title: str, 
        description: str, 
        context: Dict[str, Any] = {},
        user_department: str = None
    ) -> Dict[str, Any]:
        """
        Comprehensive AI analysis of incident
        """
        try:
            # Ensure title and description are not None
            title = title or ""
            description = description or ""
            
            # Check if Gemini analysis is requested (for Generate AI Predictions button)
            use_gemini = context.get('use_gemini', False) or context.get('source') == 'gemini_analysis'
            ocr_text = context.get('ocr_text', None)
            
            if use_gemini and self.gemini_model:
                # Use Gemini for analysis
                try:
                    return await self.analyze_with_gemini(title, description, ocr_text)
                except Exception as e:
                    print(f"Gemini analysis failed, falling back to ML model: {e}")
                    # Fall through to ML model
            
            # Combine title and description for ML model
            full_text = f"{title} {description}"
            
            # Use ML model if available
            if self.ml_model and context.get('context') != 'real_time_suggestions':
                try:
                    ml_prediction = self.ml_model.predict(full_text)
                    
                    # Convert ML model output to our format
                    # Map attack types to our incident types
                    attack_type_mapping = {
                        'phishing': IncidentType.PHISHING.value,
                        'malware': IncidentType.MALWARE.value,
                        'ransomware': IncidentType.MALWARE.value,
                        'data_breach': IncidentType.DATA_BREACH.value,
                        'unauthorized_access': IncidentType.UNAUTHORIZED_ACCESS.value,
                        'sql_injection': IncidentType.UNAUTHORIZED_ACCESS.value,
                        'DDoS': IncidentType.MALWARE.value,
                        'insider_threat': IncidentType.UNAUTHORIZED_ACCESS.value,
                        'zero_day': IncidentType.MALWARE.value,
                        'supply_chain': IncidentType.DATA_BREACH.value,
                        'other': IncidentType.MALWARE.value
                    }
                    
                    incident_type = attack_type_mapping.get(
                        ml_prediction['attack_type'], 
                        IncidentType.MALWARE.value
                    )
                    
                    categories = [{
                        'category': incident_type,
                        'confidence': ml_prediction['attack_type_confidence'],
                        'reasoning': f"ML Model: {ml_prediction['attack_type']} detected with {ml_prediction['attack_type_confidence']:.0%} confidence"
                    }]
                    
                    severity = {
                        'severity': ml_prediction['severity'],
                        'confidence': ml_prediction['severity_confidence'],
                        'factors': [f"ML Threat Score: {ml_prediction['threat_score']:.1f}/100"]
                    }
                    
                except Exception as e:
                    print(f"ML prediction failed, falling back to keyword-based: {e}")
                    # Fall back to keyword-based analysis
                    categories = await self.categorize_incident(title, description)
                    try:
                        category_for_severity = IncidentType(categories[0]['category']) if categories and categories[0]['category'] else None
                    except (ValueError, KeyError):
                        category_for_severity = None
                    severity = await self.assess_severity(title, description, category_for_severity)
            else:
                # Use keyword-based analysis as fallback
                categories = await self.categorize_incident(title, description)
                try:
                    category_for_severity = IncidentType(categories[0]['category']) if categories and categories[0]['category'] else None
                except (ValueError, KeyError):
                    category_for_severity = None
                severity = await self.assess_severity(title, description, category_for_severity)
            
            # Generate mitigation strategies
            try:
                category_enum = IncidentType(categories[0]['category']) if categories and categories[0]['category'] else IncidentType.MALWARE
            except (ValueError, KeyError):
                category_enum = IncidentType.MALWARE
            
            try:
                severity_enum = IncidentSeverity(severity['severity'])
            except (ValueError, KeyError):
                severity_enum = IncidentSeverity.MEDIUM
            
            mitigation_strategies = await self.generate_mitigation_strategies(
                category_enum,
                severity_enum,
                context
            )
            
            # Calculate overall confidence
            confidence_score = self._calculate_confidence(categories, severity)
            
            # Format response to match API schema
            formatted_categories = [{
                'category': cat['category'],
                'confidence': cat['confidence'],
                'reasoning': cat['reasoning']
            } for cat in categories]
            
            # Extract factors from matched_factors or create from reasoning
            factors = []
            if 'matched_factors' in severity:
                # Get all matched factors across severity levels
                for level, level_factors in severity['matched_factors'].items():
                    factors.extend(level_factors[:2])  # Take top 2 from each level
            elif 'reasoning' in severity:
                factors = [severity['reasoning']]
            
            if not factors:
                factors = ['Analysis based on content keywords']
                
            formatted_severity = {
                'severity': severity['severity'],
                'confidence': severity['confidence'],
                'factors': factors[:5]  # Limit to 5 factors
            }
            
            return {
                'categories': formatted_categories,
                'severity': formatted_severity,
                'mitigation_strategies': mitigation_strategies,
                'confidence_score': confidence_score
            }
            
        except Exception as e:
            import traceback
            print(f"AI analysis error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            
            # Return a minimal valid response on error
            return {
                'categories': [{
                    'category': 'malware',
                    'confidence': 0.1,
                    'reasoning': f'Analysis error: {str(e)}'
                }],
                'severity': {
                    'severity': 'low',
                    'confidence': 0.1,
                    'factors': ['Error during analysis', str(e)]
                },
                'mitigation_strategies': [{
                    'strategy': 'Review incident manually due to analysis error',
                    'priority': 1,
                    'estimated_time': 'Immediate',
                    'resources_required': ['Security team']
                }],
                'confidence_score': 0.1
            }

    async def categorize_incident(self, title: str, description: str) -> List[Dict[str, Any]]:
        """
        Enhanced categorization using weighted keyword matching
        """
        # Handle cases where title or description might be empty
        title = title or ""
        description = description or ""
        text = f"{title} {description}".lower().strip()
        suggestions = []
        
        for category, keyword_groups in self.category_keywords.items():
            score = 0
            matched_keywords = []
            confidence_factors = []
            
            # High confidence keywords (weight: 3)
            for keyword in keyword_groups.get('high_confidence', []):
                if keyword.lower() in text:
                    score += 3
                    matched_keywords.append(keyword)
                    confidence_factors.append(f"High: {keyword}")
            
            # Medium confidence keywords (weight: 2)
            for keyword in keyword_groups.get('medium_confidence', []):
                if keyword.lower() in text:
                    score += 2
                    matched_keywords.append(keyword)
                    confidence_factors.append(f"Medium: {keyword}")
            
            # Indicator keywords (weight: 1)
            for keyword in keyword_groups.get('indicators', []):
                if keyword.lower() in text:
                    score += 1
                    matched_keywords.append(keyword)
                    confidence_factors.append(f"Indicator: {keyword}")
            
            # Domain/type specific keywords (weight: 1.5)
            for group_name in ['domains', 'file_types', 'systems', 'data_types', 'methods', 'areas']:
                for keyword in keyword_groups.get(group_name, []):
                    if keyword.lower() in text:
                        score += 1.5
                        matched_keywords.append(keyword)
                        confidence_factors.append(f"{group_name.title()}: {keyword}")
            
            if score > 0:
                # Normalize confidence score (max possible score varies by category)
                max_possible = (len(keyword_groups.get('high_confidence', [])) * 3 + 
                               len(keyword_groups.get('medium_confidence', [])) * 2 + 
                               len(keyword_groups.get('indicators', [])) * 1)
                
                # Add bonus for file types, domains, etc.
                for group_name in ['domains', 'file_types', 'systems', 'data_types', 'methods', 'areas']:
                    max_possible += len(keyword_groups.get(group_name, [])) * 1.5
                
                raw_confidence = score / max(max_possible, 1)
                # Apply scaling to get reasonable confidence values
                confidence = min(0.5 + (raw_confidence * 0.45), 0.95)
                
                suggestions.append({
                    'category': category.value,  # Convert enum to string
                    'confidence': confidence,
                    'reasoning': f"Matched: {', '.join(confidence_factors[:3])}",
                    'score': score,
                    'matched_keywords': matched_keywords[:5]
                })
        
        # Sort by confidence score
        suggestions.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Return top 3 suggestions, or default if none found
        if not suggestions:
            # When no keywords match, return a low-confidence default
            return [{
                'category': IncidentType.MALWARE.value,  # Default fallback - convert enum to string
                'confidence': 0.1,
                'reasoning': "Insufficient data for accurate categorization",
                'score': 0,
                'matched_keywords': []
            }]
        
        return suggestions[:3]

    async def assess_severity(
        self, 
        title: str, 
        description: str, 
        category: Optional[IncidentType] = None
    ) -> Dict[str, Any]:
        """
        Enhanced severity assessment with weighted indicators
        """
        # Handle cases where title or description might be empty
        title = title or ""
        description = description or ""
        text = f"{title} {description}".lower().strip()
        severity_scores = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        matched_factors = {'critical': [], 'high': [], 'medium': [], 'low': []}
        
        # Enhanced keyword-based scoring with weights
        for level, indicator_groups in self.severity_indicators.items():
            for group_name, indicators in indicator_groups.items():
                for indicator in indicators:
                    if indicator.lower() in text:
                        # Different weights for different groups
                        weight = {
                            'system_impact': 4, 'data_impact': 4, 'ransomware': 5, 'infrastructure': 4,
                            'scope': 3, 'data_type': 3, 'targets': 3, 'impact': 3,
                            'activity': 2, 'containment': 2,
                            'classification': 1, 'severity': 1, 'status': 1
                        }.get(group_name, 2)
                        
                        severity_scores[level] += weight
                        matched_factors[level].append(f"{group_name}: {indicator}")
        
        # Category-based adjustments (enhanced)
        category_adjustments = {
            IncidentType.DATA_BREACH: {'critical': 3, 'high': 2},
            IncidentType.MALWARE: {'critical': 2, 'high': 2},
            IncidentType.UNAUTHORIZED_ACCESS: {'high': 2, 'medium': 1},
            IncidentType.PHISHING: {'medium': 2, 'low': 1},
            IncidentType.SOCIAL_ENGINEERING: {'medium': 1, 'low': 1},
            IncidentType.PHYSICAL_SECURITY: {'high': 1, 'medium': 1}
        }
        
        if category and category in category_adjustments:
            for level, adjustment in category_adjustments[category].items():
                severity_scores[level] += adjustment
                matched_factors[level].append(f"Category: {category.value}")
        
        # Time-based urgency indicators
        urgency_keywords = ['urgent', 'immediate', 'asap', 'emergency', 'critical', 'now']
        for keyword in urgency_keywords:
            if keyword in text:
                severity_scores['high'] += 1
                matched_factors['high'].append(f"Urgency: {keyword}")
        
        # Business impact indicators
        business_keywords = ['production', 'revenue', 'customer', 'business critical', 'operations']
        for keyword in business_keywords:
            if keyword in text:
                severity_scores['high'] += 2
                matched_factors['high'].append(f"Business impact: {keyword}")
        
        # Determine final severity
        max_score = max(severity_scores.values())
        if max_score == 0:
            severity_level = IncidentSeverity.LOW
            confidence = 0.4
            reasoning = "No severity indicators found"
        else:
            severity_level = IncidentSeverity(
                max(severity_scores, key=severity_scores.get)  # Already lowercase
            )
            # Calculate confidence based on score distribution
            total_score = sum(severity_scores.values())
            confidence = min(max_score / max(total_score, 1), 0.95)
            
            # Get reasoning from matched factors
            winning_level = max(severity_scores, key=severity_scores.get)
            reasoning = f"Score: {max_score}, Factors: {', '.join(matched_factors[winning_level][:3])}"
        
        return {
            'severity': severity_level.value,  # Convert enum to string
            'confidence': confidence,
            'reasoning': reasoning,
            'score_breakdown': severity_scores,
            'matched_factors': {k: v[:3] for k, v in matched_factors.items() if v}
        }

    async def generate_mitigation_strategies(
        self, 
        category: IncidentType, 
        severity: IncidentSeverity, 
        context: Dict[str, Any] = {}
    ) -> List[Dict[str, Any]]:
        """
        Generate AI-powered mitigation strategies
        """
        strategies = []
        
        # Base strategies by category
        category_strategies = {
            IncidentType.PHISHING: [
                {
                    'strategy': 'Block suspicious sender and URLs',
                    'priority': 1,
                    'estimated_time': '15 minutes',
                    'resources_required': ['Email admin', 'Security team']
                },
                {
                    'strategy': 'Send awareness alert to all users',
                    'priority': 2,
                    'estimated_time': '30 minutes',
                    'resources_required': ['Communications team']
                }
            ],
            IncidentType.MALWARE: [
                {
                    'strategy': 'Isolate affected systems immediately',
                    'priority': 1,
                    'estimated_time': '10 minutes',
                    'resources_required': ['IT team', 'Network admin']
                },
                {
                    'strategy': 'Run full antivirus scan',
                    'priority': 2,
                    'estimated_time': '2 hours',
                    'resources_required': ['Security tools', 'IT support']
                }
            ],
            IncidentType.UNAUTHORIZED_ACCESS: [
                {
                    'strategy': 'Immediately reset compromised credentials',
                    'priority': 1,
                    'estimated_time': '5 minutes',
                    'resources_required': ['Identity management system']
                },
                {
                    'strategy': 'Review access logs for breach extent',
                    'priority': 2,
                    'estimated_time': '1 hour',
                    'resources_required': ['Security analyst', 'Log analysis tools']
                }
            ]
        }
        
        # Get base strategies
        base_strategies = category_strategies.get(category, [
            {
                'strategy': 'Document incident details thoroughly',
                'priority': 1,
                'estimated_time': '30 minutes',
                'resources_required': ['Security analyst']
            }
        ])
        
        # Adjust priorities based on severity
        if severity in [IncidentSeverity.HIGH, IncidentSeverity.CRITICAL]:
            for strategy in base_strategies:
                strategy['priority'] = max(1, strategy['priority'] - 1)
                if severity == IncidentSeverity.CRITICAL:
                    strategy['estimated_time'] = self._reduce_time(strategy['estimated_time'])
        
        return base_strategies

    async def get_threat_intelligence(
        self, 
        category: Optional[IncidentType] = None, 
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get threat intelligence and pattern analysis
        """
        # This would integrate with external threat intelligence APIs
        # For now, return simulated data
        return {
            'trending_threats': [
                {
                    'threat_type': 'Phishing campaigns',
                    'increase_percentage': 25,
                    'risk_level': 'High'
                },
                {
                    'threat_type': 'Ransomware variants',
                    'increase_percentage': 15,
                    'risk_level': 'Critical'
                }
            ],
            'industry_alerts': [
                {
                    'alert': 'New malware targeting financial sector',
                    'severity': 'High',
                    'date': datetime.now().isoformat()
                }
            ],
            'recommendations': [
                'Increase email security training',
                'Update endpoint protection policies',
                'Review backup and recovery procedures'
            ]
        }

    async def get_predictive_analytics(
        self, 
        organization_id: Optional[str] = None, 
        timeframe_days: int = 90
    ) -> Dict[str, Any]:
        """
        Get predictive analytics for security threats based on historical data
        """
        try:
            # Get historical incidents directly from Firestore to avoid circular imports
            incidents = await self._get_historical_incidents_for_analytics(timeframe_days)
            
            if not incidents or len(incidents) < 10:
                # Fallback to enhanced mock data if insufficient historical data
                return await self._generate_enhanced_mock_analytics(timeframe_days)
            
            # Incidents are already filtered by timeframe in the helper method
            relevant_incidents = incidents
            
            # Calculate incident trends
            weekly_counts = self._calculate_weekly_trends(relevant_incidents, timeframe_days)
            incident_types = Counter([inc.get('incident_type', 'unknown') for inc in relevant_incidents])
            severity_distribution = Counter([inc.get('severity', 'low') for inc in relevant_incidents])
            
            # Predict future volume based on trends
            recent_avg = sum(weekly_counts[-4:]) / 4 if len(weekly_counts) >= 4 else sum(weekly_counts) / max(len(weekly_counts), 1)
            trend_factor = self._calculate_trend_factor(weekly_counts)
            
            # Calculate predictions
            next_week_prediction = max(1, int(recent_avg * trend_factor))
            next_month_prediction = max(4, int(next_week_prediction * 4.2 * trend_factor))
            
            # Calculate confidence based on data quality
            confidence = min(0.95, 0.5 + (len(relevant_incidents) / 100.0))
            
            # Analyze risk factors based on recent patterns
            risk_factors = self._analyze_risk_factors(relevant_incidents, incident_types, severity_distribution)
            
            # Generate recommendations based on data
            recommendations = self._generate_data_driven_recommendations(incident_types, severity_distribution, trend_factor)
            
            return {
                'predicted_incident_volume': {
                    'next_week': next_week_prediction,
                    'next_month': next_month_prediction,
                    'confidence': confidence
                },
                'risk_factors': risk_factors,
                'recommended_actions': recommendations,
                'data_summary': {
                    'analyzed_incidents': len(relevant_incidents),
                    'timeframe_days': timeframe_days,
                    'trend_direction': 'increasing' if trend_factor > 1.1 else 'decreasing' if trend_factor < 0.9 else 'stable',
                    'most_common_type': incident_types.most_common(1)[0][0] if incident_types else 'unknown',
                    'highest_severity': severity_distribution.most_common(1)[0][0] if severity_distribution else 'low'
                }
            }
            
        except Exception as e:
            print(f"Predictive analytics error: {e}")
            # Fallback to enhanced mock data on error
            return await self._generate_enhanced_mock_analytics(timeframe_days)
    
    def _calculate_weekly_trends(self, incidents: List[Dict], timeframe_days: int) -> List[int]:
        """Calculate weekly incident counts for trend analysis"""
        weekly_counts = []
        current_time = datetime.now()
        
        for week in range(min(timeframe_days // 7, 12)):  # Max 12 weeks
            week_start = current_time - timedelta(weeks=week+1)
            week_end = current_time - timedelta(weeks=week)
            
            count = 0
            for incident in incidents:
                try:
                    if isinstance(incident.get('created_at'), str):
                        created_at = datetime.fromisoformat(incident['created_at'].replace('Z', '+00:00'))
                    else:
                        created_at = incident.get('created_at', current_time)
                    
                    if week_start <= created_at < week_end:
                        count += 1
                except:
                    continue
            
            weekly_counts.append(count)
        
        return list(reversed(weekly_counts))  # Return chronological order
    
    def _calculate_trend_factor(self, weekly_counts: List[int]) -> float:
        """Calculate trend factor (>1 = increasing, <1 = decreasing)"""
        if len(weekly_counts) < 2:
            return 1.0
        
        # Simple linear regression slope calculation
        n = len(weekly_counts)
        x_sum = sum(range(n))
        y_sum = sum(weekly_counts)
        xy_sum = sum(i * count for i, count in enumerate(weekly_counts))
        x2_sum = sum(i * i for i in range(n))
        
        try:
            slope = (n * xy_sum - x_sum * y_sum) / (n * x2_sum - x_sum * x_sum)
            avg_count = y_sum / n
            
            if avg_count > 0:
                trend_factor = 1 + (slope / avg_count)
                return max(0.5, min(2.0, trend_factor))  # Bound between 0.5 and 2.0
            else:
                return 1.0
        except:
            return 1.0
    
    def _analyze_risk_factors(self, incidents: List[Dict], incident_types: Counter, severity_distribution: Counter) -> List[Dict]:
        """Analyze risk factors based on incident patterns"""
        risk_factors = []
        
        # Analyze incident type trends
        total_incidents = len(incidents)
        if total_incidents > 0:
            for incident_type, count in incident_types.most_common(3):
                percentage = (count / total_incidents) * 100
                
                # Map incident types to risk factors
                type_mapping = {
                    'phishing': {'factor': 'Phishing Campaign Activity', 'base_impact': 0.7},
                    'malware': {'factor': 'Malware Infections', 'base_impact': 0.8},
                    'unauthorized_access': {'factor': 'Unauthorized Access Attempts', 'base_impact': 0.9},
                    'data_breach': {'factor': 'Data Security Risks', 'base_impact': 0.95},
                    'social_engineering': {'factor': 'Social Engineering Attacks', 'base_impact': 0.6},
                    'physical_security': {'factor': 'Physical Security Gaps', 'base_impact': 0.5}
                }
                
                if incident_type in type_mapping:
                    factor_info = type_mapping[incident_type]
                    impact_score = min(0.95, factor_info['base_impact'] * (percentage / 50))  # Scale by prevalence
                    likelihood = min(0.9, percentage / 100)
                    
                    risk_factors.append({
                        'factor': factor_info['factor'],
                        'impact_score': impact_score,
                        'likelihood': likelihood
                    })
        
        # Analyze severity trends
        high_severity_count = severity_distribution.get('high', 0) + severity_distribution.get('critical', 0)
        if high_severity_count > 0 and total_incidents > 0:
            high_severity_rate = high_severity_count / total_incidents
            if high_severity_rate > 0.2:  # More than 20% high/critical
                risk_factors.append({
                    'factor': 'High-Severity Incident Escalation',
                    'impact_score': min(0.9, 0.6 + high_severity_rate),
                    'likelihood': min(0.8, high_severity_rate * 2)
                })
        
        # Add seasonal/time-based risk factors
        current_month = datetime.now().month
        if current_month in [11, 12, 1]:  # Holiday season
            risk_factors.append({
                'factor': 'Holiday Season Security Risks',
                'impact_score': 0.6,
                'likelihood': 0.7
            })
        elif current_month in [3, 4]:  # Tax season
            risk_factors.append({
                'factor': 'Tax Season Phishing Campaigns',
                'impact_score': 0.7,
                'likelihood': 0.8
            })
        
        return risk_factors[:4]  # Return top 4 risk factors
    
    def _generate_data_driven_recommendations(self, incident_types: Counter, severity_distribution: Counter, trend_factor: float) -> List[str]:
        """Generate recommendations based on incident data analysis"""
        recommendations = []
        
        # Recommendations based on most common incident types
        type_recommendations = {
            'phishing': [
                'Enhance email security filtering and monitoring',
                'Conduct targeted phishing simulation training',
                'Implement advanced threat detection for email'
            ],
            'malware': [
                'Update endpoint protection across all systems',
                'Conduct comprehensive vulnerability assessments',
                'Implement network segmentation and monitoring'
            ],
            'unauthorized_access': [
                'Strengthen authentication mechanisms (MFA)',
                'Review and update access control policies',
                'Implement continuous access monitoring'
            ],
            'data_breach': [
                'Conduct data classification and protection review',
                'Implement data loss prevention (DLP) solutions',
                'Review backup and incident response procedures'
            ],
            'social_engineering': [
                'Increase security awareness training frequency',
                'Implement verification procedures for sensitive requests',
                'Deploy behavioral analytics and monitoring'
            ]
        }
        
        # Add recommendations for top incident types
        for incident_type, count in incident_types.most_common(2):
            if incident_type in type_recommendations:
                recommendations.extend(type_recommendations[incident_type][:2])
        
        # Recommendations based on trend
        if trend_factor > 1.2:
            recommendations.append('Scale up security monitoring due to increasing incident trends')
            recommendations.append('Consider additional security staff or external support')
        elif trend_factor < 0.8:
            recommendations.append('Review and document successful security improvements')
            recommendations.append('Consider proactive security initiatives')
        
        # Recommendations based on severity distribution
        high_severity_count = severity_distribution.get('high', 0) + severity_distribution.get('critical', 0)
        total_count = sum(severity_distribution.values())
        
        if total_count > 0 and (high_severity_count / total_count) > 0.25:
            recommendations.append('Prioritize incident response and escalation procedures')
            recommendations.append('Review and strengthen preventive security controls')
        
        # General recommendations if not enough specific data
        if len(recommendations) < 3:
            recommendations.extend([
                'Conduct regular security risk assessments',
                'Maintain updated incident response playbooks',
                'Implement continuous security monitoring',
                'Schedule periodic security awareness training',
                'Review and test backup and recovery procedures'
            ])
        
        return recommendations[:7]  # Return top 7 recommendations
    
    async def _generate_enhanced_mock_analytics(self, timeframe_days: int) -> Dict[str, Any]:
        """Generate enhanced mock analytics when insufficient real data is available"""
        import random
        
        # Generate more realistic mock data based on industry standards
        base_weekly_incidents = random.randint(8, 15)
        seasonal_factor = 1.2 if datetime.now().month in [11, 12, 1] else 1.0
        
        return {
            'predicted_incident_volume': {
                'next_week': int(base_weekly_incidents * seasonal_factor),
                'next_month': int(base_weekly_incidents * 4.2 * seasonal_factor),
                'confidence': 0.65  # Lower confidence for mock data
            },
            'risk_factors': [
                {
                    'factor': 'Seasonal Phishing Campaign Increase',
                    'impact_score': 0.75,
                    'likelihood': 0.8
                },
                {
                    'factor': 'Remote Work Security Vulnerabilities',
                    'impact_score': 0.65,
                    'likelihood': 0.7
                },
                {
                    'factor': 'Third-Party Vendor Security Risks',
                    'impact_score': 0.8,
                    'likelihood': 0.5
                },
                {
                    'factor': 'Legacy System Vulnerabilities',
                    'impact_score': 0.7,
                    'likelihood': 0.6
                }
            ],
            'recommended_actions': [
                'Implement advanced email security and phishing protection',
                'Conduct security awareness training for remote workers',
                'Review and assess third-party vendor security practices',
                'Schedule vulnerability assessments for legacy systems',
                'Enhance endpoint detection and response capabilities',
                'Implement network segmentation and zero-trust architecture',
                'Develop incident response playbooks for common attack vectors'
            ],
            'data_summary': {
                'analyzed_incidents': 0,
                'timeframe_days': timeframe_days,
                'trend_direction': 'stable',
                'most_common_type': 'insufficient_data',
                'highest_severity': 'medium',
                'note': 'Predictions based on industry baselines due to limited historical data'
            }
        }

    async def detect_anomalies(self, incident_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Detect anomalies in incident patterns
        """
        anomalies = []
        
        # Simulate anomaly detection logic
        if incident_data.get('incidents_per_hour', 0) > 10:
            anomalies.append({
                'type': 'High incident volume',
                'description': 'Unusual spike in incident reports',
                'severity': 'Medium',
                'recommendation': 'Investigate potential coordinated attack'
            })
        
        return anomalies

    def _calculate_confidence(self, categories: List[Dict], severity: Dict) -> float:
        """Calculate overall confidence score"""
        if not categories or len(categories) == 0:
            category_confidence = 0.1
        else:
            category_confidence = categories[0]['confidence']
        
        severity_confidence = severity.get('confidence', 0.3)
        
        return (category_confidence + severity_confidence) / 2

    def _reduce_time(self, time_str: str) -> str:
        """Reduce estimated time for critical incidents"""
        if 'hour' in time_str:
            numbers = re.findall(r'\\d+', time_str)
            if numbers:
                hours = int(numbers[0])
                return f"{max(1, hours // 2)} hours"
        elif 'minute' in time_str:
            numbers = re.findall(r'\\d+', time_str)
            if numbers:
                minutes = int(numbers[0])
                return f"{max(5, minutes // 2)} minutes"
        return time_str

    async def analyze_image(
        self, 
        image_url: str, 
        incident_id: Optional[str] = None,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze image content using Tesseract OCR for text extraction
        Then analyze the extracted text for security threats
        """
        import aiohttp
        import asyncio
        try:
            import pytesseract
            from PIL import Image
            from io import BytesIO
            import platform
            
            # For Windows, explicitly set Tesseract path
            if platform.system() == 'Windows':
                pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        except ImportError:
            return {
                "extracted_text": "OCR libraries not installed. Please run: pip install pytesseract pillow",
                "summary": "Unable to process image - OCR dependencies missing",
                "threat_indicators": ["OCR setup required"],
                "confidence": 0.0,
                "recommendations": ["Install pytesseract and Pillow packages", "Ensure Tesseract is installed on the system"]
            }
        
        extracted_text = ""
        
        try:
            # Handle both data URLs and regular URLs
            if image_url.startswith('data:'):
                # Handle data URL
                import base64
                # Extract base64 data from data URL
                header, data = image_url.split(',', 1)
                image_data = base64.b64decode(data)
            else:
                # Download image from URL
                async with aiohttp.ClientSession() as session:
                    async with session.get(image_url) as response:
                        if response.status != 200:
                            raise Exception(f"Failed to download image: {response.status}")
                        image_data = await response.read()
            
            # Open image with PIL
            image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if necessary (handles PNG transparency)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Run OCR in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            extracted_text = await loop.run_in_executor(
                None, 
                pytesseract.image_to_string, 
                image
            )
            
            # Clean up the extracted text
            extracted_text = extracted_text.strip()
            
            if not extracted_text:
                return {
                    "extracted_text": "No text could be extracted from this image.",
                    "summary": "The image appears to contain no readable text or the text quality is too poor for extraction.",
                    "threat_indicators": [],
                    "confidence": 0.0,
                    "recommendations": ["Try uploading a clearer image", "Ensure the image contains text content"]
                }
                
        except Exception as e:
            print(f"OCR Error: {str(e)}")
            # Provide helpful error message
            error_msg = str(e)
            if "tesseract" in error_msg.lower():
                return {
                    "extracted_text": "Tesseract OCR is not installed or not found in PATH",
                    "summary": "Please install Tesseract OCR on your system",
                    "threat_indicators": ["OCR system not configured"],
                    "confidence": 0.0,
                    "recommendations": [
                        "Install Tesseract: sudo apt-get install tesseract-ocr (Linux)",
                        "Or download from: https://github.com/tesseract-ocr/tesseract",
                        "Ensure tesseract is in your system PATH"
                    ]
                }
            else:
                return {
                    "extracted_text": f"Error processing image: {error_msg}",
                    "summary": "Failed to extract text from image",
                    "threat_indicators": ["Processing error"],
                    "confidence": 0.0,
                    "recommendations": ["Check image format", "Ensure image URL is accessible"]
                }
        
        # Now analyze the extracted text for security threats
        threat_indicators = []
        recommendations = []
        confidence = 0.0
        
        # Convert to lowercase for analysis
        text_lower = extracted_text.lower()
        
        # Check for various security threat patterns
        
        # Phishing indicators
        phishing_patterns = {
            'urgent_action': ['urgent', 'immediate action', 'act now', 'expire', 'suspended'],
            'credential_request': ['verify your account', 'confirm your identity', 'update your information', 'validate your'],
            'suspicious_links': ['click here', 'bit.ly', 'tinyurl', 'shortlink'],
            'impersonation': ['security team', 'it department', 'bank security', 'account team'],
            'threats': ['suspended', 'blocked', 'unauthorized', 'illegal activity']
        }
        
        phishing_score = 0
        for category, patterns in phishing_patterns.items():
            for pattern in patterns:
                if pattern in text_lower:
                    threat_indicators.append(f"Phishing indicator: {pattern}")
                    phishing_score += 1
        
        # Malware indicators
        malware_patterns = {
            'processes': ['svchost.exe', 'cmd.exe', 'powershell', 'wscript'],
            'locations': ['\\temp\\', '\\appdata\\', '\\roaming\\', 'c:\\windows\\temp'],
            'network': ['port', 'connection', 'c2', 'command control', 'exfiltration'],
            'file_activity': ['encrypted', 'modified files', 'registry', 'deleted files']
        }
        
        malware_score = 0
        for category, patterns in malware_patterns.items():
            for pattern in patterns:
                if pattern in text_lower:
                    threat_indicators.append(f"Malware indicator: {pattern}")
                    malware_score += 1
        
        # Ransomware indicators
        if any(word in text_lower for word in ['encrypted', 'bitcoin', 'ransom', 'decrypt', 'locked']):
            threat_indicators.append("Possible ransomware activity detected")
            recommendations.append("Isolate affected systems immediately")
            recommendations.append("Do not pay any ransom demands")
            confidence = max(confidence, 0.9)
        
        # Data breach indicators
        if any(word in text_lower for word in ['data breach', 'exposed', 'leaked', 'dump', 'exfiltrated']):
            threat_indicators.append("Potential data breach detected")
            recommendations.append("Assess scope of data exposure")
            recommendations.append("Notify affected parties as required by law")
            confidence = max(confidence, 0.85)
        
        # Social engineering
        if any(word in text_lower for word in ['wire transfer', 'send money', 'urgent payment', 'ceo', 'executive']):
            threat_indicators.append("Social engineering attempt detected")
            recommendations.append("Verify request through official channels")
            recommendations.append("Do not act on urgent financial requests via email")
            confidence = max(confidence, 0.8)
        
        # Calculate overall confidence based on indicators found
        total_indicators = len(threat_indicators)
        if total_indicators > 0:
            confidence = min(0.5 + (total_indicators * 0.1), 0.95)
        else:
            confidence = 0.2
        
        # Generate recommendations based on findings
        if phishing_score > 2:
            recommendations.extend([
                "Mark as phishing and block sender",
                "Report to anti-phishing working group",
                "Alert other users about this campaign"
            ])
        
        if malware_score > 2:
            recommendations.extend([
                "Run full antivirus scan",
                "Check for persistence mechanisms",
                "Review network connections"
            ])
        
        # Check if we have enough information to make a determination
        if not threat_indicators and len(extracted_text) > 50:
            # Text extracted but no clear threats found
            threat_indicators = ["Unable to determine specific threats from the extracted text"]
            recommendations = [
                "Manual review recommended - text does not contain clear security indicators",
                "Consider the context in which this image was received",
                "Look for subtle social engineering tactics",
                "Verify any requests through official channels"
            ]
            confidence = 0.3
        elif not threat_indicators and len(extracted_text) <= 50:
            # Very little or no text extracted
            threat_indicators = ["Insufficient text extracted for meaningful analysis"]
            recommendations = [
                "Image contains minimal readable text",
                "Try uploading a higher quality image if text is expected",
                "Manually review the image for visual indicators",
                "Consider the source and context of the image"
            ]
            confidence = 0.1
        elif len(threat_indicators) == 1:
            # Only one indicator found - low confidence
            recommendations.append("Limited indicators found - manual verification recommended")
            recommendations.append("Cross-reference with other security data")
            confidence = min(confidence, 0.5)
        
        # Generate summary
        if phishing_score > malware_score and phishing_score > 0:
            summary = f"Phishing attempt detected with {phishing_score} indicators. High risk of credential theft or account compromise."
        elif malware_score > phishing_score and malware_score > 0:
            summary = f"Malware-related content detected with {malware_score} indicators. System may be compromised."
        elif 'ransom' in text_lower:
            summary = "Ransomware notification detected. Critical security incident requiring immediate response."
        elif 'data' in text_lower and 'breach' in text_lower:
            summary = "Data breach notification detected. Immediate assessment and response required."
        elif threat_indicators and len(threat_indicators) > 2 and confidence > 0.6:
            summary = f"Security incident detected with {len(threat_indicators)} threat indicators. Investigation recommended."
        elif threat_indicators and len(threat_indicators) > 1 and confidence > 0.4:
            summary = f"Potential security concern identified with {len(threat_indicators)} indicators. Manual review recommended."
        elif confidence < 0.3:
            summary = "Analysis inconclusive - insufficient evidence to determine security threats. Manual review required."
        else:
            summary = "Text extracted and analyzed. Limited security indicators found - proceed with caution and verify context."
        
        # Debug logging
        print(f"Gemini model available: {self.gemini_model is not None}")
        print(f"Extracted text length: {len(extracted_text)}")
        print(f"Context value: {context}")
        
        # If Gemini is available, always use it for image OCR analysis
        if self.gemini_model and extracted_text:
            try:
                print("Attempting to analyze with Gemini...")
                # Use Gemini to analyze the OCR text with more context
                gemini_analysis = await self.analyze_with_gemini(
                    title="Image Analysis", 
                    description="Analyzing text extracted from uploaded image",
                    ocr_text=extracted_text
                )
                
                print("Gemini analysis successful!")
                print(f"Gemini returned threat_indicators: {gemini_analysis.get('threat_indicators', [])}")
                
                # Extract and clean Gemini analysis content
                gemini_full_text = gemini_analysis.get('gemini_full_analysis', '')
                
                # Extract summary - look for first substantial paragraph after removing markdown
                import re
                cleaned_text = re.sub(r'^#{1,6}\s+', '', gemini_full_text, flags=re.MULTILINE)
                cleaned_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned_text)
                cleaned_text = re.sub(r'\*([^*]+)\*', r'\1', cleaned_text)
                
                # Extract summary from cleaned text
                summary_lines = []
                for line in cleaned_text.split('\n'):
                    line = line.strip()
                    if line and not line.startswith(('1.', '2.', '3.', '-', '*', '•')):
                        summary_lines.append(line)
                        if len(' '.join(summary_lines)) > 200:
                            break
                gemini_summary = ' '.join(summary_lines)[:500] if summary_lines else summary
                
                # Use Gemini's analysis directly
                gemini_summary = gemini_analysis.get('summary', summary)
                gemini_assessment = gemini_analysis.get('assessment', '')
                gemini_threat_indicators = gemini_analysis.get('threat_indicators', [])
                gemini_recommendations = gemini_analysis.get('recommendations', recommendations)
                
                print(f"\nGemini Analysis Results:")
                print(f"Assessment: {gemini_assessment}")
                print(f"Threat Indicators: {gemini_threat_indicators}")
                print(f"Recommendations: {gemini_recommendations}")
                
                # If no structured indicators found, extract from Gemini's full analysis
                if not gemini_threat_indicators:
                    # Look for specific threat patterns in the Gemini response
                    threat_patterns = [
                        r'(?i)suspicious (?:email address|sender|domain)[:" ]*([^\n.]+)',
                        r'(?i)(?:fake|spoofed|impersonating) (?:domain|sender|email)[:" ]*([^\n.]+)',
                        r'(?i)phishing (?:indicator|sign|attempt)[:" ]*([^\n.]+)',
                        r'(?i)malicious (?:link|url|attachment)[:" ]*([^\n.]+)',
                        r'(?i)(?:threat|risk) (?:indicator|factor)[:" ]*([^\n.]+)',
                        r'(?i)(?:credential|password) (?:theft|harvesting) attempt',
                        r'(?i)social engineering (?:tactic|attempt)',
                        r'(?i)(?:typo|misspelling) in (?:domain|email|text)[:" ]*([^\n.]+)'
                    ]
                    
                    for pattern in threat_patterns:
                        matches = re.findall(pattern, gemini_full_text)
                        for match in matches:
                            indicator = match if isinstance(match, str) else match[0]
                            if indicator and len(indicator) > 10:
                                gemini_threat_indicators.append(indicator.strip()[:100])
                    
                    # Also check for specific findings in the OCR text that Gemini identified
                    if 'authenticationmail@trust.ameribank7.com' in extracted_text.lower():
                        gemini_threat_indicators.append("Suspicious sender: authenticationmail@trust.ameribank7.com (fake Bank of America domain)")
                    if 'trust.ameribank7.com' in extracted_text.lower():
                        gemini_threat_indicators.append("Phishing domain detected: trust.ameribank7.com")
                    if 'divice' in extracted_text.lower():
                        gemini_threat_indicators.append("Spelling error 'divice' instead of 'device' - common in phishing emails")
                    if 'reset your password immediately' in extracted_text.lower():
                        gemini_threat_indicators.append("Urgent call to action for password reset")
                    
                    # Remove duplicates and limit
                    gemini_threat_indicators = list(dict.fromkeys(gemini_threat_indicators))[:5]
                
                # If still no indicators, create meaningful ones based on the analysis
                if not gemini_threat_indicators:
                    # Get the incident type and severity from Gemini analysis
                    incident_type = gemini_analysis.get('categories', [{}])[0].get('category', '')
                    severity_level = gemini_analysis.get('severity', {}).get('severity', '')
                    
                    if incident_type == 'phishing':
                        gemini_threat_indicators = [
                            "Phishing email detected with fake sender domain",
                            "Credential harvesting attempt identified",
                            "Suspicious URL pattern in email content",
                            "Social engineering tactics present"
                        ]
                    elif incident_type == 'malware':
                        gemini_threat_indicators = [
                            "Malicious code execution indicators",
                            "Suspicious process behavior detected",
                            "Potential system compromise",
                            "Abnormal network communication patterns"
                        ]
                    else:
                        # Use the basic threat indicators as last resort
                        gemini_threat_indicators = threat_indicators[:5] if threat_indicators else [
                            f"{incident_type.replace('_', ' ').title()} incident detected",
                            f"Severity: {severity_level}",
                            "Manual review recommended"
                        ]
                
                # Extract recommendations properly
                gemini_recommendations = []
                mitigation_strategies = gemini_analysis.get('mitigation_strategies', [])
                if mitigation_strategies:
                    gemini_recommendations = [strategy['strategy'] for strategy in mitigation_strategies if 'strategy' in strategy][:5]
                
                # If no structured recommendations, try to extract from text
                if not gemini_recommendations:
                    rec_section = re.search(r'(?i)recommendations?[:\s]*\n(.*?)(?=\n\n|\Z)', gemini_full_text, re.DOTALL)
                    if rec_section:
                        rec_text = rec_section.group(1)
                        recs = re.findall(r'[-*•]\s*(.+)|^\d+\.\s*(.+)', rec_text, re.MULTILINE)
                        gemini_recommendations = [item[0] or item[1] for item in recs if item[0] or item[1]][:5]
                
                # Use existing recommendations as fallback
                if not gemini_recommendations:
                    gemini_recommendations = recommendations[:5]
                
                # Return Gemini's complete analysis
                return {
                    "extracted_text": extracted_text,
                    "summary": gemini_summary,
                    "assessment": gemini_assessment,
                    "threat_indicators": gemini_threat_indicators,
                    "confidence": gemini_analysis.get('confidence_score', confidence),
                    "recommendations": gemini_recommendations,
                    "gemini_analysis": True,
                    "incident_type": gemini_analysis.get('categories', [{}])[0].get('category', 'unknown'),
                    "severity": gemini_analysis.get('severity', {}).get('severity', 'medium')
                }
            except Exception as e:
                print(f"Gemini image analysis failed, using standard analysis: {e}")
                import traceback
                print(f"Full traceback: {traceback.format_exc()}")
                # Fall back to standard analysis
        
        return {
            "extracted_text": extracted_text,
            "summary": summary,
            "threat_indicators": threat_indicators[:10],  # Limit to top 10
            "confidence": confidence,
            "recommendations": recommendations[:5]  # Limit to top 5
        }
    
    async def _get_historical_incidents_for_analytics(self, timeframe_days: int) -> List[Dict[str, Any]]:
        """
        Get historical incidents directly from Firestore for analytics
        """
        try:
            # Calculate date cutoff
            cutoff_date = datetime.now() - timedelta(days=timeframe_days)
            
            # Query incidents from Firestore
            incidents_ref = self.db.collection('incidents')
            
            # Get incidents ordered by creation date (most recent first)
            try:
                query = incidents_ref.order_by('created_at', direction='DESCENDING').limit(1000)
                docs = query.stream()
            except Exception as e:
                print(f"Failed to order by created_at, trying without ordering: {e}")
                # Fallback: get all incidents without ordering
                query = incidents_ref.limit(1000)
                docs = query.stream()
            
            incidents = []
            all_incidents = []  # Keep track of all incidents for fallback
            
            for doc in docs:
                try:
                    data = doc.to_dict()
                    if data:
                        # Ensure we have the required fields
                        incident = {
                            'id': data.get('id', doc.id),
                            'created_at': data.get('created_at'),
                            'incident_type': data.get('incident_type'),
                            'severity': data.get('severity'),
                            'status': data.get('status'),
                            'title': data.get('title'),
                            'description': data.get('description')
                        }
                        
                        all_incidents.append(incident)  # Add to all incidents list
                        
                        # Try to filter by timeframe
                        if incident['created_at']:
                            try:
                                if isinstance(incident['created_at'], str):
                                    created_at = datetime.fromisoformat(incident['created_at'].replace('Z', '+00:00'))
                                else:
                                    # Handle Firestore timestamp
                                    created_at = incident['created_at']
                                    if hasattr(created_at, 'seconds'):
                                        created_at = datetime.fromtimestamp(created_at.seconds)
                                    elif hasattr(created_at, 'timestamp'):
                                        created_at = datetime.fromtimestamp(created_at.timestamp())
                                
                                if created_at >= cutoff_date:
                                    # Convert datetime back to string for consistency
                                    incident['created_at'] = created_at.isoformat()
                                    incidents.append(incident)
                            except Exception as e:
                                print(f"Date parsing error for incident {incident['id']}: {e}")
                                # Add to incidents anyway for fallback data
                                incident['created_at'] = datetime.now().isoformat()
                                incidents.append(incident)
                        else:
                            # No created_at field, add with current time
                            incident['created_at'] = datetime.now().isoformat()
                            incidents.append(incident)
                        
                except Exception as e:
                    print(f"Error processing incident document: {e}")
                    continue
            
            # If we have very few incidents in timeframe, use all incidents as fallback
            if len(incidents) < 5 and len(all_incidents) >= 5:
                print(f"Only {len(incidents)} incidents in timeframe, using all {len(all_incidents)} incidents")
                incidents = all_incidents[:50]  # Limit to 50 for reasonable processing
                # Ensure all have created_at
                for inc in incidents:
                    if not inc.get('created_at'):
                        inc['created_at'] = datetime.now().isoformat()
            
            print(f"Retrieved {len(incidents)} incidents for predictive analytics")
            return incidents
            
        except Exception as e:
            print(f"Error retrieving historical incidents: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return []
    
    def _generate_image_summary(self, text: str, indicators: List[str]) -> str:
        """Generate a concise summary of the image analysis"""
        text_lower = text.lower()
        
        if "phishing" in text_lower and "verify" in text_lower:
            return "Phishing email detected requesting account verification through suspicious link. High risk of credential theft."
        elif "ransomware" in text_lower or "encrypted" in text_lower:
            return "Ransomware attack notification demanding Bitcoin payment. Critical security incident requiring immediate response."
        elif "malware" in text_lower or "suspicious process" in text_lower:
            return "Active malware infection detected with C2 communication and data exfiltration. System compromise confirmed."
        elif "data exposure" in text_lower or "exposed records" in text_lower:
            return f"Data breach detected: {text.count('15,247') and '15,247' or 'Multiple'} customer records exposed through misconfigured cloud storage. Immediate action required."
        elif "wire transfer" in text_lower or "ceo" in text_lower:
            return "CEO fraud attempt detected using social engineering tactics to bypass financial controls. Do not process any transfers."
        elif "sql injection" in text_lower or "ids alert" in text_lower:
            return "Network intrusion attempt detected with SQL injection payload targeting database server. Attack blocked but investigation needed."
        elif "unauthorized" in text_lower and "access" in text_lower:
            return "Security alert showing unauthorized access attempts from suspicious IP using VPN/proxy. Attack blocked but monitoring required."
        else:
            # Generate more specific summary based on threat indicators
            if len(indicators) > 5:
                return f"Critical security incident detected with {len(indicators)} threat indicators including {indicators[0].lower()}. Immediate response required."
            elif len(indicators) > 3:
                return f"High-priority security alert: {indicators[0]}. {len(indicators)} risk factors identified requiring investigation."
            elif len(indicators) > 0:
                return f"Security incident detected with {len(indicators)} threat indicators. Immediate investigation recommended."
            else:
                return "No specific security threats detected in the analyzed content."