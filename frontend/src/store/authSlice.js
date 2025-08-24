import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { networkErrorHandler } from "../components/NetworkErrorHandler";
import { notificationManager } from "../components/NotificationSystem";
import { BACKEND_URL } from "../constants";

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await networkErrorHandler.fetchWithRetry(
        `${BACKEND_URL}/companies/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Login failed";

        notificationManager.error(errorMessage, {
          title: "Login Failed",
          duration: 6000,
        });

        return rejectWithValue(errorMessage);
      }

      const data = await response.json();

      notificationManager.success(
        `Welcome back, ${data.user?.companyName || "User"}!`,
        {
          title: "Login Successful",
          duration: 4000,
        }
      );

      return data;
    } catch (error) {
      const errorMessage = error.message || "Network error occurred";

      if (
        !error.message?.includes("Network") &&
        !error.message?.includes("queued")
      ) {
        notificationManager.error(errorMessage, {
          title: "Login Error",
          duration: 6000,
        });
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("orbitops_logout", "true");
        setTimeout(() => {
          window.localStorage.removeItem("orbitops_logout");
        }, 1000);
      }

      const response = await networkErrorHandler.fetchWithRetry(
        `${BACKEND_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Logout failed";

        notificationManager.error(errorMessage, {
          title: "Logout Error",
          duration: 5000,
        });

        return rejectWithValue(errorMessage);
      }

      notificationManager.info("You have been logged out successfully", {
        title: "Logged Out",
        duration: 3000,
      });

      return {};
    } catch (error) {
      const errorMessage = error.message || "Network error occurred";

      if (
        error.message?.includes("Network") ||
        error.message?.includes("queued")
      ) {
        notificationManager.warning(
          "Logged out locally. Session will be cleared when connection is restored.",
          {
            title: "Offline Logout",
            duration: 5000,
          }
        );
        return {};
      }

      notificationManager.error(errorMessage, {
        title: "Logout Error",
        duration: 5000,
      });

      return rejectWithValue(errorMessage);
    }
  }
);

export const validateSession = createAsyncThunk(
  "auth/validateSession",
  async (_, { rejectWithValue }) => {
    try {
      const response = await networkErrorHandler.fetchWithRetry(
        `${BACKEND_URL}/auth/validate`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Session validation failed";

        if (
          !errorMessage.includes("expired") &&
          !errorMessage.includes("invalid")
        ) {
          notificationManager.warning(errorMessage, {
            title: "Session Validation Failed",
            duration: 4000,
          });
        }

        return rejectWithValue(errorMessage);
      }

      const data = await response.json();

      return {
        user: data.user,
        token: null,
      };
    } catch (error) {
      const errorMessage = error.message || "Network error occurred";
      return rejectWithValue(errorMessage);
    }
  }
);

export const handleSessionExpiration = createAsyncThunk(
  "auth/handleSessionExpiration",
  async (_, { dispatch }) => {
    dispatch(clearAuth());

    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.warn("Failed to logout during session expiration:", error);
    }

    return {};
  }
);

const initialState = {
  isAuthenticated: false,
  token: null,
  user: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.error = action.payload;
      })
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(validateSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateSession.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(validateSession.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.error = action.payload;
      })
      .addCase(handleSessionExpiration.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.error = null;
      });
  },
});

export const { clearError, clearAuth } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;