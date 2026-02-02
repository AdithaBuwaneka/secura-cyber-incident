import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AuthState } from '@/types';

// API base URL - use port 8000 to match backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

interface LoginData {
  email: string;
  password: string;
}

// Async thunks
export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      // 1. Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      
      // 2. Get ID token
      const idToken = await userCredential.user.getIdToken();
      
      // 3. Create user profile in backend
      const phoneNumber = data.phoneNumber && data.phoneNumber.trim() !== '' ? data.phoneNumber.trim() : null;
      
      const requestBody = {
        email: data.email,
        full_name: data.fullName,
        phone_number: phoneNumber,
        country: null,
        city: null,
        home_number: null
      };
      
      console.log('DEBUG: Phone number processing:', {
        original: data.phoneNumber,
        processed: phoneNumber,
        requestBody: requestBody
      });
      
      console.log('Sending to create-profile:', requestBody);
      console.log('ID Token:', idToken ? 'present' : 'missing');
      console.log('API URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/auth/create-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Create-profile error response:', errorData);
        console.log('Response status:', response.status);
        
        // Since Firebase user is already created, we should still consider this successful
        // The profile creation might have failed due to validation but user exists
        console.log('Profile creation failed but Firebase user exists - treating as partial success');
        
        // Return the Firebase user data even if profile creation failed
        return {
          firebaseUser: {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            emailVerified: userCredential.user.emailVerified
          },
          userProfile: {
            message: "User created successfully, profile setup may be incomplete",
            uid: userCredential.user.uid,
            email: userCredential.user.email
          },
          idToken
        };
      }
      
      const createProfileResponse = await response.json();
      console.log('Create profile response:', createProfileResponse);
      
      // After creating profile, fetch the complete user profile
      const profileResponse = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      let userProfile;
      if (profileResponse.ok) {
        userProfile = await profileResponse.json();
        console.log('Complete user profile fetched:', userProfile);
      } else {
        // Fallback to the create response if profile fetch fails
        userProfile = createProfileResponse;
        console.log('Using create profile response as fallback:', userProfile);
      }
      
      return {
        firebaseUser: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          emailVerified: userCredential.user.emailVerified
        },
        userProfile,
        idToken
      };
    } catch (error) {
      console.log('Auth slice registration error:', error);
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      } else if (typeof error === 'string') {
        return rejectWithValue(error);
      } else if (error && typeof error === 'object') {
        const errorObj = error as { message?: string; detail?: string };
        return rejectWithValue(errorObj.message || errorObj.detail || 'Registration failed. Please try again.');
      } else {
        return rejectWithValue('Registration failed. Please try again.');
      }
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (data: LoginData, { rejectWithValue }) => {
    try {
      // 1. Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      
      // 2. Get ID token
      const idToken = await userCredential.user.getIdToken();
      
      // 3. Get user profile from backend
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get user profile');
      }
      
      const userProfile = await response.json();
      
      return {
        firebaseUser: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          emailVerified: userCredential.user.emailVerified
        },
        userProfile,
        idToken
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth);
      return null;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Logout failed');
    }
  }
);

export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (idToken: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-token`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Token verification failed');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Token verification failed');
    }
  }
);

interface UpdateProfileData {
  full_name?: string;
  phone_number?: string;
  current_password?: string;
  new_password?: string;
}

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: UpdateProfileData, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { idToken: string | null } };
      const idToken = state.auth.idToken;
      
      if (!idToken) {
        return rejectWithValue('No authentication token');
      }
      
      const response = await fetch(`${API_URL}/api/auth/update-profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.detail || 'Failed to update profile');
      }
      
      const updatedProfile = await response.json();
      return updatedProfile;
    } catch {
      return rejectWithValue('Failed to update profile');
    }
  }
);

export const uploadProfilePicture = createAsyncThunk(
  'auth/uploadProfilePicture',
  async (file: File, { getState, rejectWithValue }) => {
    try {
      console.log('DEBUG: Starting uploadProfilePicture thunk');
      const state = getState() as { auth: { idToken: string | null } };
      const idToken = state.auth.idToken;
      
      console.log('DEBUG: API_URL:', API_URL);
      console.log('DEBUG: idToken exists:', !!idToken);
      
      if (!idToken) {
        console.log('DEBUG: No authentication token');
        return rejectWithValue('No authentication token');
      }

      const formData = new FormData();
      formData.append('file', file);
      console.log('DEBUG: FormData created with file:', file.name);

      console.log('DEBUG: Making request to:', `${API_URL}/api/auth/upload-profile-picture`);
      const response = await fetch(`${API_URL}/api/auth/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData
      });

      console.log('DEBUG: Response status:', response.status);
      console.log('DEBUG: Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('DEBUG: Error response:', errorData);
        return rejectWithValue(errorData.detail || 'Failed to upload profile picture');
      }

      const result = await response.json();
      console.log('DEBUG: Success response:', result);
      return result;
    } catch (error) {
      console.error('DEBUG: Exception in uploadProfilePicture:', error);
      return rejectWithValue('Failed to upload profile picture');
    }
  }
);

// Initial state
const initialState: AuthState & { 
  loading: boolean; 
  error: string | null;
  isAuthenticated: boolean;
} = {
  user: null,
  userProfile: null,
  loading: true, // Start with loading true to prevent premature redirects
  idToken: null,
  error: null,
  isAuthenticated: false,
  isInitialized: false // Track if Firebase auth has initialized
};

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFirebaseUser: (state, action: PayloadAction<FirebaseUser | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isInitialized = true; // Mark as initialized when we get auth state
      state.loading = false; // Stop loading when auth state is determined
    },
    setIdToken: (state, action: PayloadAction<string | null>) => {
      state.idToken = action.payload;
    },
    setUserProfile: (state, action: PayloadAction<AuthState['userProfile']>) => {
      state.userProfile = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.userProfile = null;
      state.idToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.loading = false;
      // Keep isInitialized true so we don't show loading again
    }
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.firebaseUser;
        state.userProfile = action.payload.userProfile;
        state.idToken = action.payload.idToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.firebaseUser;
        state.userProfile = action.payload.userProfile;
        state.idToken = action.payload.idToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
    // Logout
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.userProfile = null;
        state.idToken = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      
    // Update Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
    // Upload Profile Picture
    builder
      .addCase(uploadProfilePicture.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadProfilePicture.fulfilled, (state, action) => {
        state.loading = false;
        console.log('DEBUG: Redux state updated with new user profile:', action.payload.user);
        state.userProfile = action.payload.user;
        state.error = null;
      })
      .addCase(uploadProfilePicture.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearError, setFirebaseUser, setIdToken, setUserProfile, clearAuth } = authSlice.actions;
export default authSlice.reducer;