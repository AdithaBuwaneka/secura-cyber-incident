import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface ApplicationData {
  reason: string;
  experience: string;  
  certifications?: string;
  proof_documents: string[];
}

interface SecurityApplication {
  id: string;
  applicant_uid: string;
  applicant_name?: string;
  reason: string;
  experience: string;
  certifications?: string;
  proof_documents: string[];
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;  
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

interface ApplicationReview {
  status: 'approved' | 'rejected';
  admin_notes?: string;
}

interface ApplicationState {
  applications: SecurityApplication[];
  pendingApplications: SecurityApplication[];
  allApplications: SecurityApplication[];
  canApply: boolean;
  loading: boolean;
  error: string | null;
  submitting: boolean;
}

// Async thunks
export const submitApplication = createAsyncThunk(
  'applications/submit',
  async (applicationData: ApplicationData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { idToken: string } };
      const response = await fetch(`${API_URL}/api/security-applications/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.auth.idToken}`
        },
        body: JSON.stringify(applicationData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit application');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to submit application');
    }
  }
);

export const fetchMyApplications = createAsyncThunk(
  'applications/fetchMine',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { idToken: string } };
      const response = await fetch(`${API_URL}/api/security-applications/my-applications`, {
        headers: {
          'Authorization': `Bearer ${state.auth.idToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch applications');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch applications');
    }
  }
);

export const checkCanApply = createAsyncThunk(
  'applications/checkCanApply',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { idToken: string } };
      const response = await fetch(`${API_URL}/api/security-applications/can-apply`, {
        headers: {
          'Authorization': `Bearer ${state.auth.idToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to check application eligibility');
      }

      const result = await response.json();
      return result.can_apply;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to check eligibility');
    }
  }
);

export const fetchPendingApplications = createAsyncThunk(
  'applications/fetchPending',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { idToken: string } };
      const response = await fetch(`${API_URL}/api/security-applications/admin/pending`, {
        headers: {
          'Authorization': `Bearer ${state.auth.idToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch pending applications');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch applications');
    }
  }
);

export const fetchAllApplications = createAsyncThunk(
  'applications/fetchAll',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { idToken: string } };
      const response = await fetch(`${API_URL}/api/security-applications/admin/all`, {
        headers: {
          'Authorization': `Bearer ${state.auth.idToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch all applications');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch all applications');
    }
  }
);

export const reviewApplication = createAsyncThunk(
  'applications/review',
  async ({ applicationId, reviewData }: { applicationId: string; reviewData: ApplicationReview }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { idToken: string } };
      const response = await fetch(`${API_URL}/api/security-applications/admin/review/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.auth.idToken}`
        },
        body: JSON.stringify(reviewData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to review application');
      }

      return { applicationId, reviewData };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to review application');
    }
  }
);

// Initial state
const initialState: ApplicationState = {
  applications: [],
  pendingApplications: [],
  allApplications: [],
  canApply: false,
  loading: false,
  error: null,
  submitting: false
};

// Application slice
const applicationSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearApplications: (state) => {
      state.applications = [];
      state.pendingApplications = [];
      state.allApplications = [];
    }
  },
  extraReducers: (builder) => {
    // Submit application
    builder
      .addCase(submitApplication.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitApplication.fulfilled, (state) => {
        state.submitting = false;
        state.canApply = false;
        state.error = null;
      })
      .addCase(submitApplication.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      })

    // Fetch my applications
    builder
      .addCase(fetchMyApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.applications = action.payload;
        state.error = null;
      })
      .addCase(fetchMyApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

    // Check can apply
    builder
      .addCase(checkCanApply.fulfilled, (state, action) => {
        state.canApply = action.payload;
      })
      .addCase(checkCanApply.rejected, (state) => {
        state.canApply = false;
      })

    // Fetch pending applications (admin)
    builder
      .addCase(fetchPendingApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPendingApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingApplications = action.payload;
        state.error = null;
      })
      .addCase(fetchPendingApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

    // Fetch all applications (admin)
    builder
      .addCase(fetchAllApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.allApplications = action.payload;
        state.error = null;
      })
      .addCase(fetchAllApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

    // Review application
    builder
      .addCase(reviewApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reviewApplication.fulfilled, (state, action) => {
        state.loading = false;
        // Remove from pending applications
        state.pendingApplications = state.pendingApplications.filter(
          app => app.id !== action.payload.applicationId
        );
        state.error = null;
      })
      .addCase(reviewApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearError, clearApplications } = applicationSlice.actions;
export default applicationSlice.reducer;