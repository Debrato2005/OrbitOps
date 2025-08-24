import { BACKEND_URL } from "../constants";

export class AuthError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

export const cookieUtils = {
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(";").shift();
    }
    return null;
  },

  setCookie(name, value, options = {}) {
    let cookieString = `${name}=${value}`;
    if (options.maxAge) {
      cookieString += `; max-age=${options.maxAge}`;
    }
    if (options.path) {
      cookieString += `; path=${options.path}`;
    }
    if (options.secure) {
      cookieString += "; secure";
    }
    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }
    document.cookie = cookieString;
  },

  removeCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  },

  getSessionToken() {
    return null;
  },

  clearSessionToken() {
    console.log("Session token cleanup handled by server");
  },
};

export const errorHandler = {
  async handleApiError(response) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: { message: "Network error occurred", code: "NETWORK_ERROR" },
      };
    }
    const { error } = errorData;
    const message = error?.message || "An unexpected error occurred";
    const code = error?.code || "UNKNOWN_ERROR";
    throw new AuthError(message, code, response.status);
  },

  handleNetworkError(error) {
    throw new AuthError(
      "Unable to connect to the server. Please check your internet connection.",
      "NETWORK_ERROR",
      0
    );
  },

  isTokenExpired(error) {
    return error.code === "TOKEN_EXPIRED" || error.status === 401;
  },

  requiresReauth(error) {
    return (
      this.isTokenExpired(error) ||
      error.code === "INVALID_TOKEN" ||
      error.code === "SESSION_EXPIRED"
    );
  },
};

export const authApi = {
  async login(email, password) {
    try {
      const response = await fetch(`${BACKEND_URL}/companies/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        await errorHandler.handleApiError(response);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw errorHandler.handleNetworkError(error);
    }
  },

  async logout() {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        await errorHandler.handleApiError(response);
      }
      cookieUtils.clearSessionToken();
    } catch (error) {
      cookieUtils.clearSessionToken();
      if (error instanceof AuthError) {
        throw error;
      }
      throw errorHandler.handleNetworkError(error);
    }
  },

  async validateSession() {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/validate`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        await errorHandler.handleApiError(response);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw errorHandler.handleNetworkError(error);
    }
  },

  async refreshToken() {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        await errorHandler.handleApiError(response);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw errorHandler.handleNetworkError(error);
    }
  },
};

export const tokenManager = {
  refreshTimer: null,
  isRefreshing: false,
  refreshPromise: null,

  startAutoRefresh(refreshInterval = 23 * 60 * 60 * 1000) {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshTokenIfNeeded();
      } catch (error) {
        console.error("Auto token refresh failed:", error);
        this.stopAutoRefresh();
      }
    }, refreshInterval);
  },

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  async refreshTokenIfNeeded() {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }
    this.isRefreshing = true;
    this.refreshPromise = this._performRefresh();
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  },

  async _performRefresh() {
    try {
      const data = await authApi.refreshToken();
      return data;
    } catch (error) {
      if (errorHandler.requiresReauth(error)) {
        console.log("Token refresh failed, session cleanup handled by server");
      }
      throw error;
    }
  },

  async withTokenRefresh(apiCall, maxRetries = 1) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries && errorHandler.requiresReauth(error)) {
          try {
            await this.refreshTokenIfNeeded();
          } catch (refreshError) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  },
};

export const authService = {
  init() {},

  async login(email, password) {
    const userData = await authApi.login(email, password);
    return userData;
  },

  async logout() {
    await authApi.logout();
  },

  async validateSession() {
    return authApi.validateSession();
  },

  async authenticatedCall(apiCall) {
    return tokenManager.withTokenRefresh(apiCall);
  },

  async isAuthenticated() {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/validate`, {
        method: "GET",
        credentials: "include",
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  cleanup() {
    console.log("Authentication service cleanup handled by session manager");
  },
};

export default authService;
