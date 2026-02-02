// Firebase User (from Firebase Auth)
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

// Our User Profile (stored in Firestore)
export interface User {
  uid: string;  // Firebase UID
  email: string;
  full_name: string;
  role: 'employee' | 'security_team' | 'admin';
  phone_number?: string;
  country?: string;
  city?: string;
  home_number?: string;
  created_at: Date;
  last_login?: Date;
  is_active: boolean;
}

// Auth Context State
export interface AuthState {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  idToken: string | null;
  isInitialized: boolean; // Track if Firebase auth has initialized
}

export interface Incident {
  id: string;
  incident_type: 'malware' | 'phishing' | 'data_breach' | 'unauthorized_access' | 'social_engineering' | 'physical_security';
  subject: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'investigating' | 'resolved' | 'closed';
  reporter_uid: string;  // Firebase UID instead of reporter_id
  assigned_to?: string;
  ai_category?: string;
  ai_confidence?: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  files: string[];
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
}

export interface Message {
  id: string;
  incident_id: string;
  sender_uid: string;  // Firebase UID
  sender_name: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  created_at: Date;
  is_encrypted: boolean;
}