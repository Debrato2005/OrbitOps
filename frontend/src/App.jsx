import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore, useSelector } from 'react-redux';
import MainApp from './MainApp';
import LandingPage from './components/LandingPage';
import LoginForm from './components/LoginForm';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationSystem from './components/NotificationSystem';
import NetworkStatus from './components/NetworkErrorHandler';
import { LoadingOverlay } from './components/LoadingSpinner';
import sessionManager from './utils/sessionManager';
import { selectIsAuthenticated } from './store/authSlice';

const Root = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return isAuthenticated ? <MainApp /> : <LandingPage />;
};

function App() {
  const store = useStore();
  const [sessionInitialized, setSessionInitialized] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        sessionManager.init(store);
        await sessionManager.restoreSession();
        setSessionInitialized(true);
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setSessionInitialized(true);
      }
    };
    initializeSession();
    return () => {
      sessionManager.cleanup();
    };
  }, [store]);

  if (!sessionInitialized) {
    return (
      <LoadingOverlay 
        message={'Initializing session...'}
      />
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<LoginForm />} />
        </Routes>
        <NotificationSystem />
        <NetworkStatus />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;