#!/usr/bin/env python3
"""
Script to train the threat prediction model using the security incidents dataset.
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai.threat_prediction_model import ThreatPredictionModel

def main():
    # Initialize model
    model = ThreatPredictionModel()
    
    # Path to dataset (adjust if needed)
    dataset_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                'security_incidents_dataset_1000.csv')
    
    print(f"Dataset path: {dataset_path}")
    
    # Load and preprocess data
    print("\n" + "="*50)
    print("Loading and preprocessing data...")
    print("="*50)
    df, metadata = model.load_and_preprocess_data(dataset_path)
    
    print(f"\nDataset Statistics:")
    print(f"- Total incidents: {len(df)}")
    print(f"- Attack types: {len(metadata['attack_types'])}")
    print(f"- Attack type distribution:")
    print(df['Attack_Type'].value_counts())
    print(f"\n- Severity distribution:")
    print(df['Severity'].value_counts())
    
    # Train models
    print("\n" + "="*50)
    print("Training models...")
    print("="*50)
    results = model.train_models(df)
    
    print("\n" + "="*50)
    print("Training Results Summary")
    print("="*50)
    print(f"\nModel Accuracies:")
    for key, value in results.items():
        if 'accuracy' in key:
            print(f"- {key}: {value:.3f}")
    
    print(f"\nCross-validation: {results['cv_mean']:.3f} (±{results['cv_std']:.3f})")
    
    print("\nDetailed Classification Report:")
    print(results['severity_report'])
    
    print("\nConfusion Matrix:")
    print(results['confusion_matrix'])
    
    # Save models
    print("\n" + "="*50)
    print("Saving models...")
    print("="*50)
    model.save_models()
    print("✓ Models saved successfully to: backend/app/models/ml_models/")
    
    # Demo predictions
    print("\n" + "="*50)
    print("Demo Predictions")
    print("="*50)
    
    demo_incidents = [
        {
            'description': "Employee clicked on malicious link in phishing email and entered credentials",
            'expected_severity': 'high',
            'expected_type': 'phishing'
        },
        {
            'description': "Unusual file access patterns detected from accounting system",
            'expected_severity': 'medium',
            'expected_type': 'other'
        },
        {
            'description': "All files on server encrypted with ransom note demanding bitcoin payment",
            'expected_severity': 'high',
            'expected_type': 'ransomware'
        }
    ]
    
    for incident in demo_incidents:
        prediction = model.predict(incident['description'])
        print(f"\nIncident: {incident['description']}")
        print(f"Expected: Severity={incident['expected_severity']}, Type={incident['expected_type']}")
        print(f"Predicted: Severity={prediction['severity']} ({prediction['severity_confidence']:.2%}), "
              f"Type={prediction['attack_type']} ({prediction['attack_type_confidence']:.2%})")
        print(f"Threat Score: {prediction['threat_score']:.1f}/100")
        
        # Show top 3 attack type predictions
        attack_probs = sorted(prediction['attack_type_probabilities'].items(), 
                            key=lambda x: x[1], reverse=True)[:3]
        print("Top 3 attack type predictions:")
        for attack_type, prob in attack_probs:
            print(f"  - {attack_type}: {prob:.2%}")

if __name__ == "__main__":
    main()