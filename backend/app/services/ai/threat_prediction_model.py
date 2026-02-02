import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
import joblib
import os
import re
from typing import Tuple, Dict, Any, List
import warnings
warnings.filterwarnings('ignore')

class ThreatPredictionModel:
    def __init__(self):
        # TF-IDF Vectorizer with optimized parameters
        self.vectorizer = TfidfVectorizer(
            max_features=2000,
            stop_words='english',
            ngram_range=(1, 3),  # Unigrams, bigrams, and trigrams
            min_df=2,
            max_df=0.95,
            sublinear_tf=True
        )
        
        # Initialize multiple classifiers
        self.classifiers = {
            'logistic': LogisticRegression(
                C=1.0,
                max_iter=1000,
                class_weight='balanced',
                random_state=42
            ),
            'svm': SVC(
                kernel='rbf',
                C=1.0,
                gamma='scale',
                probability=True,
                class_weight='balanced',
                random_state=42
            ),
            'random_forest': RandomForestClassifier(
                n_estimators=200,
                max_depth=10,
                class_weight='balanced',
                random_state=42
            )
        }
        
        # Ensemble classifier
        self.ensemble_classifier = VotingClassifier(
            estimators=[
                ('lr', self.classifiers['logistic']),
                ('svm', self.classifiers['svm']),
                ('rf', self.classifiers['random_forest'])
            ],
            voting='soft'
        )
        
        self.severity_encoder = LabelEncoder()
        self.attack_type_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        
        # Define attack type keywords with weights
        self.attack_keywords = {
            'phishing': {
                'keywords': ['phishing', 'fake email', 'suspicious email', 'verify account', 
                           'click link', 'credential', 'spoof', 'impersonat'],
                'weight': 2.0
            },
            'ransomware': {
                'keywords': ['ransomware', 'encrypt', 'bitcoin', 'payment', 'locked files',
                           'decrypt', 'ransom', 'extortion'],
                'weight': 2.5
            },
            'malware': {
                'keywords': ['malware', 'virus', 'trojan', 'worm', 'spyware', 'keylogger',
                           'backdoor', 'rootkit', 'infected', 'malicious'],
                'weight': 1.5
            },
            'DDoS': {
                'keywords': ['ddos', 'denial of service', 'traffic spike', 'flood', 'overload',
                           'bandwidth', 'amplification', 'botnet'],
                'weight': 2.0
            },
            'data_breach': {
                'keywords': ['data breach', 'leak', 'exposed', 'stolen', 'exfiltrat',
                           'unauthoriz', 'compromis', 'dark web'],
                'weight': 2.5
            },
            'unauthorized_access': {
                'keywords': ['unauthorized', 'suspicious login', 'brute force', 'credential stuff',
                           'privilege escalation', 'bypass', 'intrusion'],
                'weight': 1.8
            },
            'sql_injection': {
                'keywords': ['sql injection', 'database', 'query', 'sqli', 'union select',
                           'drop table', 'or 1=1', 'escape character'],
                'weight': 2.0
            },
            'insider_threat': {
                'keywords': ['insider', 'employee', 'internal', 'staff', 'disgruntled',
                           'sabotage', 'theft', 'misuse'],
                'weight': 2.2
            },
            'zero_day': {
                'keywords': ['zero day', '0day', 'unknown vulnerability', 'new exploit',
                           'unpatched', 'novel attack', 'advanced persistent'],
                'weight': 3.0
            },
            'supply_chain': {
                'keywords': ['supply chain', 'third party', 'vendor', 'supplier', 'partner',
                           'software update', 'dependency', 'upstream'],
                'weight': 2.3
            },
            'other': {
                'keywords': ['unknown', 'suspicious', 'anomaly', 'unusual', 'investigate'],
                'weight': 1.0
            }
        }
        
    def extract_keyword_features(self, texts: List[str]) -> np.ndarray:
        """Extract keyword-based features from text."""
        features = []
        
        for text in texts:
            text_lower = text.lower()
            text_features = []
            
            for attack_type, info in self.attack_keywords.items():
                # Count keyword matches
                keyword_count = sum(1 for keyword in info['keywords'] 
                                  if keyword in text_lower)
                # Apply weight
                weighted_score = keyword_count * info['weight']
                text_features.append(weighted_score)
            
            features.append(text_features)
        
        return np.array(features)
    
    def extract_additional_features(self, texts: List[str]) -> np.ndarray:
        """Extract additional text features."""
        features = []
        
        for text in texts:
            text_features = [
                len(text),  # Text length
                len(text.split()),  # Word count
                text.count('!'),  # Exclamation marks (urgency)
                text.count('$'),  # Dollar signs (financial)
                len(re.findall(r'\b[A-Z]{2,}\b', text)),  # All caps words
                len(re.findall(r'\d+\.\d+\.\d+\.\d+', text)),  # IP addresses
                len(re.findall(r'https?://', text)),  # URLs
                len(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text))  # Emails
            ]
            features.append(text_features)
        
        return np.array(features)
    
    def combine_features(self, tfidf_features: np.ndarray, keyword_features: np.ndarray, 
                        additional_features: np.ndarray) -> np.ndarray:
        """Combine all feature types."""
        # Convert sparse matrix to dense if needed
        if hasattr(tfidf_features, 'toarray'):
            tfidf_features = tfidf_features.toarray()
        
        # Scale additional features
        additional_features_scaled = self.scaler.fit_transform(additional_features)
        
        # Combine all features
        return np.hstack([tfidf_features, keyword_features, additional_features_scaled])
    
    def load_and_preprocess_data(self, file_path: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Load and preprocess the security incidents dataset."""
        df = pd.read_csv(file_path)
        
        # Clean text
        df['Incident_Description'] = df['Incident_Description'].str.strip()
        
        # Encode labels
        df['severity_encoded'] = self.severity_encoder.fit_transform(df['Severity'])
        df['attack_type_encoded'] = self.attack_type_encoder.fit_transform(df['Attack_Type'])
        
        # Calculate threat scores
        severity_mapping = {'low': 0.3, 'medium': 0.6, 'high': 0.9}
        attack_type_weights = {
            'zero_day': 0.95,
            'ransomware': 0.9,
            'data_breach': 0.85,
            'supply_chain': 0.85,
            'insider_threat': 0.8,
            'DDoS': 0.75,
            'phishing': 0.7,
            'sql_injection': 0.7,
            'malware': 0.65,
            'unauthorized_access': 0.6,
            'other': 0.5
        }
        
        df['threat_score'] = df.apply(
            lambda row: (severity_mapping.get(row['Severity'], 0.5) * 0.6 + 
                        attack_type_weights.get(row['Attack_Type'], 0.5) * 0.4) * 100,
            axis=1
        )
        
        metadata = {
            'severity_classes': self.severity_encoder.classes_.tolist(),
            'attack_types': self.attack_type_encoder.classes_.tolist(),
            'attack_type_weights': attack_type_weights
        }
        
        return df, metadata
    
    def train_models(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train classification models."""
        # Extract features
        texts = df['Incident_Description'].tolist()
        tfidf_features = self.vectorizer.fit_transform(texts)
        keyword_features = self.extract_keyword_features(texts)
        additional_features = self.extract_additional_features(texts)
        
        # Combine features
        X = self.combine_features(tfidf_features, keyword_features, additional_features)
        
        # Prepare targets
        y_severity = df['severity_encoded']
        y_attack_type = df['attack_type_encoded']
        y_threat_score = df['threat_score']
        
        # Split data
        X_train, X_test, y_sev_train, y_sev_test, y_att_train, y_att_test, y_threat_train, y_threat_test = \
            train_test_split(X, y_severity, y_attack_type, y_threat_score, 
                           test_size=0.2, random_state=42, stratify=y_severity)
        
        results = {}
        
        # Train individual classifiers for severity
        for name, clf in self.classifiers.items():
            clf.fit(X_train, y_sev_train)
            y_pred = clf.predict(X_test)
            accuracy = accuracy_score(y_sev_test, y_pred)
            results[f'{name}_severity_accuracy'] = accuracy
            print(f"{name} Severity Accuracy: {accuracy:.3f}")
        
        # Train ensemble for severity
        self.ensemble_classifier.fit(X_train, y_sev_train)
        y_pred_ensemble = self.ensemble_classifier.predict(X_test)
        ensemble_accuracy = accuracy_score(y_sev_test, y_pred_ensemble)
        results['ensemble_severity_accuracy'] = ensemble_accuracy
        
        # Decode predictions for report
        y_test_decoded = self.severity_encoder.inverse_transform(y_sev_test)
        y_pred_decoded = self.severity_encoder.inverse_transform(y_pred_ensemble)
        
        results['severity_report'] = classification_report(y_test_decoded, y_pred_decoded)
        results['confusion_matrix'] = confusion_matrix(y_test_decoded, y_pred_decoded)
        
        # Train attack type classifier
        self.attack_type_classifier = RandomForestClassifier(
            n_estimators=200,
            class_weight='balanced',
            random_state=42
        )
        self.attack_type_classifier.fit(X_train, y_att_train)
        
        # Train threat score regressor
        from sklearn.ensemble import RandomForestRegressor
        self.threat_score_regressor = RandomForestRegressor(
            n_estimators=200,
            random_state=42
        )
        self.threat_score_regressor.fit(X_train, y_threat_train)
        
        # Cross-validation scores
        cv_scores = cross_val_score(self.ensemble_classifier, X, y_severity, cv=5)
        results['cv_mean'] = cv_scores.mean()
        results['cv_std'] = cv_scores.std()
        
        return results
    
    def predict(self, description: str) -> Dict[str, Any]:
        """Predict severity, attack type, and threat score."""
        # Extract features
        tfidf_features = self.vectorizer.transform([description])
        keyword_features = self.extract_keyword_features([description])
        additional_features = self.extract_additional_features([description])
        
        # Combine features
        X = self.combine_features(tfidf_features, keyword_features, additional_features)
        
        # Get predictions from all models
        predictions = {}
        for name, clf in self.classifiers.items():
            pred_proba = clf.predict_proba(X)[0]
            predictions[name] = pred_proba
        
        # Ensemble prediction
        severity_encoded = self.ensemble_classifier.predict(X)[0]
        severity_proba = self.ensemble_classifier.predict_proba(X)[0]
        severity = self.severity_encoder.inverse_transform([severity_encoded])[0]
        
        # Attack type prediction
        attack_type_encoded = self.attack_type_classifier.predict(X)[0]
        attack_type_proba = self.attack_type_classifier.predict_proba(X)[0]
        attack_type = self.attack_type_encoder.inverse_transform([attack_type_encoded])[0]
        
        # Threat score prediction
        threat_score = self.threat_score_regressor.predict(X)[0]
        threat_score = max(0, min(100, threat_score))
        
        # Keyword-based confidence boost
        keyword_confidence = self._calculate_keyword_confidence(description, attack_type)
        
        return {
            'severity': severity,
            'severity_confidence': float(max(severity_proba)),
            'severity_probabilities': {
                cls: float(prob) for cls, prob in 
                zip(self.severity_encoder.classes_, severity_proba)
            },
            'attack_type': attack_type,
            'attack_type_confidence': float(max(attack_type_proba)),
            'attack_type_probabilities': {
                self.attack_type_encoder.inverse_transform([i])[0]: float(prob) 
                for i, prob in enumerate(attack_type_proba)
            },
            'threat_score': float(threat_score),
            'keyword_confidence_boost': keyword_confidence,
            'model_predictions': {
                name: {self.severity_encoder.inverse_transform([i])[0]: float(p) 
                      for i, p in enumerate(probs)}
                for name, probs in predictions.items()
            }
        }
    
    def _calculate_keyword_confidence(self, description: str, predicted_type: str) -> float:
        """Calculate confidence boost based on keyword matches."""
        text_lower = description.lower()
        
        if predicted_type in self.attack_keywords:
            keywords = self.attack_keywords[predicted_type]['keywords']
            matches = sum(1 for kw in keywords if kw in text_lower)
            return min(0.2, matches * 0.05)  # Max 20% boost
        
        return 0.0
    
    def save_models(self, model_dir: str = 'backend/app/models/ml_models'):
        """Save all trained models and components."""
        os.makedirs(model_dir, exist_ok=True)
        
        # Save models
        joblib.dump(self.vectorizer, os.path.join(model_dir, 'tfidf_vectorizer.pkl'))
        joblib.dump(self.ensemble_classifier, os.path.join(model_dir, 'ensemble_classifier.pkl'))
        joblib.dump(self.classifiers, os.path.join(model_dir, 'individual_classifiers.pkl'))
        joblib.dump(self.attack_type_classifier, os.path.join(model_dir, 'attack_type_classifier.pkl'))
        joblib.dump(self.threat_score_regressor, os.path.join(model_dir, 'threat_score_regressor.pkl'))
        
        # Save encoders and scaler
        joblib.dump(self.severity_encoder, os.path.join(model_dir, 'severity_encoder.pkl'))
        joblib.dump(self.attack_type_encoder, os.path.join(model_dir, 'attack_type_encoder.pkl'))
        joblib.dump(self.scaler, os.path.join(model_dir, 'feature_scaler.pkl'))
        
        # Save metadata
        metadata = {
            'attack_keywords': self.attack_keywords,
            'feature_names': ['tfidf', 'keywords', 'additional']
        }
        joblib.dump(metadata, os.path.join(model_dir, 'model_metadata.pkl'))
    
    def load_models(self, model_dir: str = 'backend/app/models/ml_models'):
        """Load saved models and components."""
        self.vectorizer = joblib.load(os.path.join(model_dir, 'tfidf_vectorizer.pkl'))
        self.ensemble_classifier = joblib.load(os.path.join(model_dir, 'ensemble_classifier.pkl'))
        self.classifiers = joblib.load(os.path.join(model_dir, 'individual_classifiers.pkl'))
        self.attack_type_classifier = joblib.load(os.path.join(model_dir, 'attack_type_classifier.pkl'))
        self.threat_score_regressor = joblib.load(os.path.join(model_dir, 'threat_score_regressor.pkl'))
        
        self.severity_encoder = joblib.load(os.path.join(model_dir, 'severity_encoder.pkl'))
        self.attack_type_encoder = joblib.load(os.path.join(model_dir, 'attack_type_encoder.pkl'))
        self.scaler = joblib.load(os.path.join(model_dir, 'feature_scaler.pkl'))


if __name__ == "__main__":
    # Train the model
    model = ThreatPredictionModel()
    
    # Load and preprocess data
    print("Loading dataset...")
    df, metadata = model.load_and_preprocess_data('security_incidents_dataset_1000.csv')
    print(f"Loaded {len(df)} incidents")
    print(f"Attack types: {metadata['attack_types']}")
    print(f"Severity classes: {metadata['severity_classes']}")
    
    # Train models
    print("\nTraining models...")
    results = model.train_models(df)
    
    print("\nTraining Results:")
    print(f"Ensemble Severity Accuracy: {results['ensemble_severity_accuracy']:.3f}")
    print(f"Cross-validation Mean: {results['cv_mean']:.3f} (±{results['cv_std']:.3f})")
    print("\nSeverity Classification Report:")
    print(results['severity_report'])
    
    # Save models
    model.save_models()
    print("\nModels saved successfully!")
    
    # Test predictions
    print("\n" + "="*50)
    print("Testing Predictions:")
    print("="*50)
    
    test_cases = [
        "Employee received email with suspicious attachment claiming to be invoice from unknown sender",
        "Multiple failed login attempts detected from IP address 192.168.1.100 trying to access admin panel",
        "Server performance degraded significantly, unknown processes consuming high CPU",
        "Customer database found for sale on dark web marketplace",
        "Strange network traffic patterns detected during off-hours"
    ]
    
    for test_description in test_cases:
        prediction = model.predict(test_description)
        print(f"\nIncident: '{test_description[:80]}...'" if len(test_description) > 80 else f"\nIncident: '{test_description}'")
        print(f"Severity: {prediction['severity']} (confidence: {prediction['severity_confidence']:.2%})")
        print(f"Attack Type: {prediction['attack_type']} (confidence: {prediction['attack_type_confidence']:.2%})")
        print(f"Threat Score: {prediction['threat_score']:.1f}/100")
        if prediction['keyword_confidence_boost'] > 0:
            print(f"Keyword Match Boost: +{prediction['keyword_confidence_boost']:.2%}")