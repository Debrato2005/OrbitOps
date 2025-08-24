import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectAuthLoading } from '../store/authSlice';
import { LoadingOverlay } from './LoadingSpinner';

const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);

  // While the authentication status is being checked, show a loading screen.
  // This prevents a flash of the login page before the session is validated.
  if (loading) {
    return <LoadingOverlay message="Checking authentication..." />;
  }

  // If the check is complete and the user is not authenticated, redirect.
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If the check is complete and the user is authenticated, render the protected content.
  return children;
};

export default ProtectedRoute;