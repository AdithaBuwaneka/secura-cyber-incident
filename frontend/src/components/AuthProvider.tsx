'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setFirebaseUser, setIdToken, setUserProfile, clearAuth } from '@/store/auth/authSlice';
import { AppDispatch } from '@/store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      dispatch(setFirebaseUser(user));
      
      if (user) {
        try {
          // Get fresh ID token
          const idToken = await user.getIdToken();
          dispatch(setIdToken(idToken));
          
          // Fetch user profile from backend
          console.log('AuthProvider fetching profile with token:', idToken ? 'present' : 'missing');
          const response = await fetch(`${API_URL}/api/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          
          console.log('Profile fetch response status:', response.status);
          if (response.ok) {
            const userProfile = await response.json();
            console.log('Profile fetched successfully:', userProfile);
            dispatch(setUserProfile(userProfile));
          } else {
            const errorData = await response.json();
            console.log('Profile fetch failed:', errorData);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        dispatch(setIdToken(null));
        dispatch(clearAuth());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  // Auto-refresh Firebase ID token every 50 minutes (before 1-hour expiry)
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Set up token refresh interval
        refreshInterval = setInterval(async () => {
          try {
            console.log('Auto-refreshing Firebase ID token...');
            const newToken = await user.getIdToken(true); // Force refresh
            dispatch(setIdToken(newToken));
            console.log('Firebase ID token refreshed successfully');
          } catch (error) {
            console.error('Auto token refresh failed:', error);
            // If token refresh fails, user might need to re-authenticate
            dispatch(clearAuth());
          }
        }, 50 * 60 * 1000); // Refresh every 50 minutes (10 minutes before expiry)
        
        console.log('Token auto-refresh enabled (every 50 minutes)');
      } else {
        // Clear interval when user logs out
        if (refreshInterval) {
          clearInterval(refreshInterval);
          console.log('Token auto-refresh disabled');
        }
      }
    });

    return () => {
      unsubscribe();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [dispatch]);

  return <>{children}</>;
}