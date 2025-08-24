import { notificationManager } from "../components/NotificationSystem";

/**
 * Centralized error handling utility for the application
 */

// Error types for categorization
export const ERROR_TYPES = {
  NETWORK: "network",
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  VALIDATION: "validation",
  SERVER: "server",
  UNKNOWN: "unknown",
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/**
 * Categorize error based on status code and message
 * @param {Error|Object} error - Error object or response
 * @returns {Object} Error category and severity
 */
export function categorizeError(error) {
  const status = error.status || error.response?.status;
  const message = error.message || error.error || "";

  // Network errors
  if (
    error.name === "TypeError" ||
    message.includes("fetch") ||
    message.includes("Network") ||
    message.includes("connection") ||
    !navigator.onLine
  ) {
    return {
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.HIGH,
    };
  }

  // HTTP status code based categorization
  switch (status) {
    case 400:
      return {
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.MEDIUM,
      };
    case 401:
      return {
        type: ERROR_TYPES.AUTHENTICATION,
        severity: ERROR_SEVERITY.HIGH,
      };
    case 403:
      return {
        type: ERROR_TYPES.AUTHORIZATION,
        severity: ERROR_SEVERITY.HIGH,
      };
    case 404:
      return {
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.MEDIUM,
      };
    case 429:
      return {
        type: ERROR_TYPES.SERVER,
        severity: ERROR_SEVERITY.MEDIUM,
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: ERROR_TYPES.SERVER,
        severity: ERROR_SEVERITY.CRITICAL,
      };
    default:
      return {
        type: ERROR_TYPES.UNKNOWN,
        severity: ERROR_SEVERITY.MEDIUM,
      };
  }
}

/**
 * Get user-friendly error message based on error type and context
 * @param {Error|Object} error - Error object
 * @param {string} context - Context where error occurred (e.g., 'login', 'save')
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyMessage(error, context = "") {
  const { type } = categorizeError(error);
  const status = error.status || error.response?.status;
  const originalMessage = error.message || error.error || "";

  const contextPrefix = context ? `${context}: ` : "";

  switch (type) {
    case ERROR_TYPES.NETWORK:
      return `${contextPrefix}Connection problem. Please check your internet connection and try again.`;

    case ERROR_TYPES.AUTHENTICATION:
      if (originalMessage.includes("expired")) {
        return `${contextPrefix}Your session has expired. Please log in again.`;
      }
      if (originalMessage.includes("invalid")) {
        return `${contextPrefix}Invalid credentials. Please check your email and password.`;
      }
      return `${contextPrefix}Authentication failed. Please log in again.`;

    case ERROR_TYPES.AUTHORIZATION:
      return `${contextPrefix}You don't have permission to perform this action.`;

    case ERROR_TYPES.VALIDATION:
      if (status === 404) {
        return `${contextPrefix}The requested resource was not found.`;
      }
      // Return original message for validation errors as they're usually specific
      return (
        originalMessage ||
        `${contextPrefix}Please check your input and try again.`
      );

    case ERROR_TYPES.SERVER:
      if (status === 429) {
        return `${contextPrefix}Too many requests. Please wait a moment and try again.`;
      }
      return `${contextPrefix}Server error occurred. Please try again later.`;

    default:
      return (
        originalMessage ||
        `${contextPrefix}An unexpected error occurred. Please try again.`
      );
  }
}

/**
 * Handle error with appropriate user feedback
 * @param {Error|Object} error - Error object
 * @param {Object} options - Handling options
 * @param {string} options.context - Context where error occurred
 * @param {boolean} options.showNotification - Whether to show notification (default: true)
 * @param {string} options.notificationTitle - Custom notification title
 * @param {number} options.notificationDuration - Custom notification duration
 * @param {Function} options.onError - Custom error handler
 * @returns {Object} Processed error information
 */
export function handleError(error, options = {}) {
  const {
    context = "",
    showNotification = true,
    notificationTitle,
    notificationDuration,
    onError,
  } = options;

  const category = categorizeError(error);
  const userMessage = getUserFriendlyMessage(error, context);

  // Log error for debugging
  console.error(`Error in ${context || "application"}:`, error);

  // Show notification based on severity and user preference
  if (showNotification) {
    const title =
      notificationTitle || getNotificationTitle(category.type, context);
    const duration =
      notificationDuration || getNotificationDuration(category.severity);

    switch (category.severity) {
      case ERROR_SEVERITY.CRITICAL:
        notificationManager.error(userMessage, { title, duration });
        break;
      case ERROR_SEVERITY.HIGH:
        notificationManager.error(userMessage, { title, duration });
        break;
      case ERROR_SEVERITY.MEDIUM:
        notificationManager.warning(userMessage, { title, duration });
        break;
      case ERROR_SEVERITY.LOW:
        notificationManager.info(userMessage, { title, duration });
        break;
      default:
        notificationManager.error(userMessage, { title, duration });
    }
  }

  // Call custom error handler if provided
  if (onError && typeof onError === "function") {
    onError(error, category, userMessage);
  }

  return {
    error,
    category,
    userMessage,
    handled: true,
  };
}

/**
 * Get appropriate notification title based on error type and context
 * @param {string} errorType - Error type
 * @param {string} context - Error context
 * @returns {string} Notification title
 */
function getNotificationTitle(errorType, context) {
  const contextTitle = context
    ? ` - ${context.charAt(0).toUpperCase() + context.slice(1)}`
    : "";

  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return `Connection Error${contextTitle}`;
    case ERROR_TYPES.AUTHENTICATION:
      return `Authentication Error${contextTitle}`;
    case ERROR_TYPES.AUTHORIZATION:
      return `Permission Error${contextTitle}`;
    case ERROR_TYPES.VALIDATION:
      return `Validation Error${contextTitle}`;
    case ERROR_TYPES.SERVER:
      return `Server Error${contextTitle}`;
    default:
      return `Error${contextTitle}`;
  }
}

/**
 * Get notification duration based on error severity
 * @param {string} severity - Error severity
 * @returns {number} Duration in milliseconds
 */
function getNotificationDuration(severity) {
  switch (severity) {
    case ERROR_SEVERITY.CRITICAL:
      return 0; // Don't auto-dismiss critical errors
    case ERROR_SEVERITY.HIGH:
      return 8000;
    case ERROR_SEVERITY.MEDIUM:
      return 6000;
    case ERROR_SEVERITY.LOW:
      return 4000;
    default:
      return 6000;
  }
}

/**
 * Create a wrapper for async functions that automatically handles errors
 * @param {Function} asyncFn - Async function to wrap
 * @param {Object} errorOptions - Error handling options
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(asyncFn, errorOptions = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      handleError(error, errorOptions);
      throw error; // Re-throw for caller to handle if needed
    }
  };
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of successful execution
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    context = "",
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break; // Don't retry on last attempt
      }

      const { type } = categorizeError(error);

      // Don't retry certain types of errors
      if (
        type === ERROR_TYPES.AUTHENTICATION ||
        type === ERROR_TYPES.AUTHORIZATION
      ) {
        break;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      notificationManager.info(
        `Retrying ${context} in ${Math.ceil(delay / 1000)} seconds... (${
          attempt + 1
        }/${maxRetries})`,
        {
          title: "Retrying",
          duration: delay,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  throw lastError;
}

export default {
  categorizeError,
  getUserFriendlyMessage,
  handleError,
  withErrorHandling,
  retryWithBackoff,
  ERROR_TYPES,
  ERROR_SEVERITY,
};
