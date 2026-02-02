import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '@/store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface User {
  uid: string;
  email: string;
  full_name: string;
  role: 'employee' | 'security_team' | 'admin';
  phone_number?: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const idToken = state.auth.idToken;
      
      console.log('Fetching users...');
      console.log('API URL:', `${API_URL}/api/admin/users`);
      console.log('Token present:', !!idToken);
      
      if (!idToken) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`Failed to fetch users: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Users fetched:', data);
      // Extract users array from the response object
      return data.users || data;
    } catch (error) {
      console.error('Fetch users error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch users');
    }
  }
);

export const updateUserRole = createAsyncThunk(
  'users/updateUserRole',
  async ({ uid, newRole }: { uid: string; newRole: 'employee' | 'security_team' }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const idToken = state.auth.idToken;
      
      if (!idToken) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_URL}/api/admin/users/${uid}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      const result = await response.json();
      return { uid, updatedUser: result.user };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update user role');
    }
  }
);

export const toggleUserStatus = createAsyncThunk(
  'users/toggleUserStatus',
  async ({ uid, isActive }: { uid: string; isActive: boolean }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const idToken = state.auth.idToken;
      
      if (!idToken) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_URL}/api/admin/users/${uid}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      const result = await response.json();
      return { uid, updatedUser: result.user };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update user status');
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
        state.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
    // Update user role
    builder
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const { uid, updatedUser } = action.payload;
        const userIndex = state.users.findIndex(user => user.uid === uid);
        if (userIndex !== -1) {
          state.users[userIndex] = updatedUser;
        }
      })
      
    // Toggle user status
    builder
      .addCase(toggleUserStatus.fulfilled, (state, action) => {
        const { uid, updatedUser } = action.payload;
        const userIndex = state.users.findIndex(user => user.uid === uid);
        if (userIndex !== -1) {
          state.users[userIndex] = updatedUser;
        }
      });
  }
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer; 