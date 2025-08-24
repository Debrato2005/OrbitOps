import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const notificationContainerStyles = {
  position: "fixed",
  top: "20px",
  right: "20px",
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  maxWidth: "400px",
};

const notificationStyles = {
  padding: "16px 20px",
  borderRadius: "8px",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
  color: "white",
  fontFamily: "system-ui, Avenir, Helvetica, Arial, sans-serif",
  fontSize: "0.9em",
  lineHeight: "1.4",
  position: "relative",
  cursor: "pointer",
  transition: "all 0.3s ease",
  transform: "translateX(0)",
  opacity: 1,
};

const notificationTypeStyles = {
  success: {
    backgroundColor: "#4CAF50",
    borderLeft: "4px solid #45a049",
  },
  error: {
    backgroundColor: "#f44336",
    borderLeft: "4px solid #d32f2f",
  },
  warning: {
    backgroundColor: "#ff9800",
    borderLeft: "4px solid #f57c00",
  },
  info: {
    backgroundColor: "#2196F3",
    borderLeft: "4px solid #1976D2",
  },
};

const closeButtonStyles = {
  position: "absolute",
  top: "8px",
  right: "12px",
  background: "none",
  border: "none",
  color: "white",
  fontSize: "18px",
  cursor: "pointer",
  opacity: 0.7,
  transition: "opacity 0.2s ease",
};

const progressBarStyles = {
  position: "absolute",
  bottom: 0,
  left: 0,
  height: "3px",
  backgroundColor: "rgba(255, 255, 255, 0.3)",
  transition: "width linear",
};

// Global notification manager
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.nextId = 1;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.notifications));
  }

  add(notification) {
    const id = this.nextId++;
    const newNotification = {
      id,
      ...notification,
      timestamp: Date.now(),
    };

    this.notifications.push(newNotification);
    this.notify();

    // Auto-remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        this.remove(id);
      }, notification.duration || 5000);
    }

    return id;
  }

  remove(id) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  clear() {
    this.notifications = [];
    this.notify();
  }

  success(message, options = {}) {
    return this.add({
      type: "success",
      message,
      ...options,
    });
  }

  error(message, options = {}) {
    return this.add({
      type: "error",
      message,
      duration: options.duration || 8000, // Longer duration for errors
      ...options,
    });
  }

  warning(message, options = {}) {
    return this.add({
      type: "warning",
      message,
      ...options,
    });
  }

  info(message, options = {}) {
    return this.add({
      type: "info",
      message,
      ...options,
    });
  }
}

// Global instance
export const notificationManager = new NotificationManager();

// Notification component
function Notification({ notification, onRemove }) {
  const [progress, setProgress] = useState(100);
  const [isRemoving, setIsRemoving] = useState(false);

  const { id, type, message, title, duration = 5000 } = notification;

  useEffect(() => {
    if (duration === 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const progressPercent = (remaining / duration) * 100;

      setProgress(progressPercent);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(id);
    }, 300);
  }, [id, onRemove]);

  const notificationStyle = {
    ...notificationStyles,
    ...notificationTypeStyles[type],
    ...(isRemoving
      ? {
          transform: "translateX(100%)",
          opacity: 0,
        }
      : {}),
  };

  return (
    <div style={notificationStyle} onClick={handleRemove}>
      {title && (
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>{title}</div>
      )}
      <div>{message}</div>

      <button
        style={closeButtonStyles}
        onClick={handleRemove}
        onMouseEnter={(e) => {
          e.target.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = "0.7";
        }}
      >
        ×
      </button>

      {duration > 0 && (
        <div
          style={{
            ...progressBarStyles,
            width: `${progress}%`,
          }}
        />
      )}
    </div>
  );
}

// Notification system component
function NotificationSystem() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const handleRemove = useCallback((id) => {
    notificationManager.remove(id);
  }, []);

  if (notifications.length === 0) {
    return null;
  }

  return createPortal(
    <div style={notificationContainerStyles}>
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onRemove={handleRemove}
        />
      ))}
    </div>,
    document.body
  );
}

export default NotificationSystem;
