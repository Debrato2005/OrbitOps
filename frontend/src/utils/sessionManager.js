import { validateSession, handleSessionExpiration } from "../store/authSlice";
import { networkErrorHandler } from "../components/NetworkErrorHandler";
import { notificationManager } from "../components/NotificationSystem";
import { BACKEND_URL } from "../constants";

class SessionManager {
  constructor() {
    this.store = null;
    this.sessionCheckInterval = null;
    this.sessionCheckFrequency = 5 * 60 * 1000;
    this.isInitialized = false;
  }

  init(store) {
    this.store = store;
    this.isInitialized = true;
    this.startSessionMonitoring();
    this.setupVisibilityChangeHandler();
    this.setupStorageEventHandler();
  }

  async restoreSession() {
    if (!this.store) {
      console.warn("SessionManager not initialized with store");
      return false;
    }

    try {
      const result = await this.store.dispatch(validateSession());

      if (validateSession.fulfilled.match(result)) {
        console.log("Session restored successfully");
        return true;
      } else {
        console.log("Session restoration failed:", result.payload);
        return false;
      }
    } catch (error) {
      console.error("Error during session restoration:", error);
      return false;
    }
  }

  startSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    this.sessionCheckInterval = setInterval(async () => {
      await this.checkSessionValidity();
    }, this.sessionCheckFrequency);
  }

  stopSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  async checkSessionValidity() {
    if (!this.store) {
      return false;
    }

    const state = this.store.getState();

    if (!state.auth.isAuthenticated) {
      return false;
    }

    try {
      const response = await networkErrorHandler.fetchWithRetry(
        `${BACKEND_URL}/auth/validate`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.log("Session expired, logging out user");

        notificationManager.warning(
          "Your session has expired. Please log in again.",
          {
            title: "Session Expired",
            duration: 5000,
          }
        );

        await this.handleSessionExpiration();
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking session validity:", error);

      if (
        error.message?.includes("Network") ||
        error.message?.includes("queued")
      ) {
        notificationManager.warning(
          "Unable to verify session due to connection issues. You may need to log in again when connection is restored.",
          {
            title: "Connection Issue",
            duration: 8000,
          }
        );
      }

      return false;
    }
  }

  async handleSessionExpiration() {
    if (!this.store) {
      return;
    }

    try {
      await this.store.dispatch(handleSessionExpiration());

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Error handling session expiration:", error);
    }
  }

  setupVisibilityChangeHandler() {
    document.addEventListener("visibilitychange", async () => {
      if (!document.hidden && this.store) {
        const state = this.store.getState();

        if (state.auth.isAuthenticated) {
          await this.checkSessionValidity();
        }
      }
    });
  }

  setupStorageEventHandler() {
    window.addEventListener("storage", (event) => {
      if (event.key === "orbitops_logout" && event.newValue === "true") {
        this.handleSessionExpiration();
        localStorage.removeItem("orbitops_logout");
      }
    });
  }

  signalLogoutToOtherTabs() {
    localStorage.setItem("orbitops_logout", "true");

    setTimeout(() => {
      localStorage.removeItem("orbitops_logout");
    }, 1000);
  }

  cleanup() {
    this.stopSessionMonitoring();
    this.isInitialized = false;
    this.store = null;
  }

  getSessionStatus() {
    if (!this.store) {
      return {
        isInitialized: false,
        isAuthenticated: false,
        isMonitoring: false,
      };
    }

    const state = this.store.getState();

    return {
      isInitialized: this.isInitialized,
      isAuthenticated: state.auth.isAuthenticated,
      isMonitoring: !!this.sessionCheckInterval,
      user: state.auth.user,
      lastCheck: new Date().toISOString(),
    };
  }
}

const sessionManager = new SessionManager();

export default sessionManager;
