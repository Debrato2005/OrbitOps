import { useState, useEffect, useCallback } from 'react';
import { notificationManager } from './NotificationSystem';
import { BACKEND_URL } from '../constants';

const networkErrorStyles = {
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#f44336',
  color: 'white',
  padding: '12px 20px',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
  fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
  fontSize: '0.9em',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  animation: 'slideUp 0.3s ease-out',
};

const retryButtonStyles = {
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  padding: '6px 12px',
  borderRadius: '4px',
  fontSize: '0.8em',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};

const dismissButtonStyles = {
  backgroundColor: 'transparent',
  color: 'white',
  border: 'none',
  fontSize: '16px',
  cursor: 'pointer',
  padding: '0 4px',
  opacity: 0.7,
  transition: 'opacity 0.2s ease',
};

const slideUpKeyframes = `
  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('slideup-keyframes')) {
  const style = document.createElement('style');
  style.id = 'slideup-keyframes';
  style.textContent = slideUpKeyframes;
  document.head.appendChild(style);
}

class NetworkErrorHandler {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.maxRetryDelay = 30000;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  handleOnline() {
    this.isOnline = true;
    this.notifyListeners({ type: 'online' });
    
    notificationManager.success('Connection restored', {
      duration: 3000,
    });

    this.processRetryQueue();
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyListeners({ type: 'offline' });
    
    notificationManager.error('Connection lost. Please check your internet connection.', {
      duration: 0,
    });
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners(event) {
    this.listeners.forEach(listener => listener(event));
  }

  async handleNetworkError(error, originalRequest, retryCount = 0) {
    console.error('Network error:', error);

    const isNetworkError = 
      error.name === 'TypeError' ||
      error.message.includes('fetch') ||
      error.message.includes('Network') ||
      !navigator.onLine;

    if (!isNetworkError) {
      throw error;
    }

    if (!this.isOnline) {
      this.addToRetryQueue(originalRequest);
      throw new Error('Network unavailable. Request queued for retry.');
    }

    if (retryCount < this.maxRetries) {
      const delay = Math.min(
        this.retryDelay * Math.pow(2, retryCount),
        this.maxRetryDelay
      );

      notificationManager.warning(
        `Connection issue. Retrying in ${Math.ceil(delay / 1000)} seconds... (${retryCount + 1}/${this.maxRetries})`,
        { duration: delay }
      );

      await this.delay(delay);

      try {
        return await this.executeRequest(originalRequest);
      } catch (retryError) {
        return this.handleNetworkError(retryError, originalRequest, retryCount + 1);
      }
    }

    notificationManager.error(
      'Unable to connect. Please check your internet connection and try again.',
      { duration: 0 }
    );

    throw new Error('Network request failed after maximum retries');
  }

  addToRetryQueue(request) {
    this.retryQueue.push({
      request,
      timestamp: Date.now(),
    });
  }

  async processRetryQueue() {
    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const item of queue) {
      try {
        await this.executeRequest(item.request);
      } catch (error) {
        console.error('Failed to retry queued request:', error);
        this.addToRetryQueue(item.request);
      }
    }
  }

  async executeRequest(request) {
    if (typeof request === 'function') {
      return await request();
    }
    
    throw new Error('Invalid request format');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, options = {}) {
    const request = () => fetch(url, {
      ...options,
      credentials: options.credentials || 'include',
    });

    try {
      return await request();
    } catch (error) {
      return await this.handleNetworkError(error, request);
    }
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.retryQueue.length,
    };
  }
}

export const networkErrorHandler = new NetworkErrorHandler();

function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const unsubscribe = networkErrorHandler.subscribe((event) => {
      setIsOnline(event.type === 'online');
      setShowOfflineMessage(event.type === 'offline');
    });

    return unsubscribe;
  }, []);

  const handleRetry = useCallback(() => {
    fetch(`${BACKEND_URL}/auth/validate`, { 
      method: 'HEAD',
      credentials: 'include',
    })
    .then(() => {
      setShowOfflineMessage(false);
      notificationManager.success('Connection test successful');
    })
    .catch(() => {
      notificationManager.error('Still unable to connect');
    });
  }, []);

  const handleDismiss = useCallback(() => {
    setShowOfflineMessage(false);
  }, []);

  if (!showOfflineMessage || isOnline) {
    return null;
  }

  return (
    <div style={networkErrorStyles}>
      <span>⚠️ No internet connection</span>
      
      <button
        style={retryButtonStyles}
        onClick={handleRetry}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        Retry
      </button>

      <button
        style={dismissButtonStyles}
        onClick={handleDismiss}
        onMouseEnter={(e) => {
          e.target.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = '0.7';
        }}
      >
        ×
      </button>
    </div>
  );
}

export default NetworkStatus;