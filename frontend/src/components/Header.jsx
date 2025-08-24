import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ButtonSpinner } from './LoadingSpinner';
import {
  selectIsAuthenticated,
  selectAuthLoading,
  validateSession,
  logoutUser
} from '../store/authSlice';

const headerStyles = {
  backgroundColor: '#1a1a1a',
  padding: '0 28px', // Adjusted horizontal padding
  color: 'white',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  zIndex: 10,
  position: 'relative',
  height: '70px', // Set height to 70px
  boxSizing: 'border-box',
};

const h1Styles = {
  margin: 0,
  fontFamily: '"Exo 2", sans-serif',
  fontSize: '1.7em', // Adjusted font size for the new height
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '2px',
};

const buttonStyles = {
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  padding: '11px 22px', // Adjusted padding
  fontSize: '15px', // Adjusted font size
  fontWeight: 600,
  borderRadius: '6px',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  transition: 'background-color 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '130px', // Adjusted min-width
};

const buttonHoverStyles = {
  backgroundColor: '#45a049',
};

const logoutButtonStyles = {
  ...buttonStyles,
  backgroundColor: '#f44336',
};

const logoutButtonHoverStyles = {
  backgroundColor: '#d32f2f',
};

function Header({ showContinueButton = false }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const [isValidating, setIsValidating] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleContinueClick = async () => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }
    
    setIsValidating(true);
    try {
      await dispatch(validateSession()).unwrap();
      navigate('/');
    } catch (error) {
      navigate('/login');
    } finally {
      setIsValidating(false);
    }
  };

  const handleLogoutClick = () => {
    dispatch(logoutUser());
  };

  const isContinueLoading = authLoading || isValidating;
  const isLogoutLoading = authLoading;

  return (
    <header style={headerStyles}>
      <h1 style={h1Styles}>OrbitOps</h1>
      
      {showContinueButton && (
        <button
          style={{
            ...buttonStyles,
            ...(isContinueLoading ? { ...buttonHoverStyles, cursor: 'not-allowed' } : {}),
          }}
          onClick={handleContinueClick}
          disabled={isContinueLoading}
          onMouseEnter={(e) => {
            if (!isContinueLoading) e.target.style.backgroundColor = buttonHoverStyles.backgroundColor;
          }}
          onMouseLeave={(e) => {
            if (!isContinueLoading) e.target.style.backgroundColor = buttonStyles.backgroundColor;
          }}
        >
          {isContinueLoading ? <ButtonSpinner size="small" /> : 'Continue'}
        </button>
      )}

      {isAuthenticated && !showContinueButton && (
        <button
          style={{
            ...logoutButtonStyles,
            ...(isLogoutLoading ? { ...logoutButtonHoverStyles, cursor: 'not-allowed' } : {}),
          }}
          onClick={handleLogoutClick}
          disabled={isLogoutLoading}
          onMouseEnter={(e) => {
            if (!isLogoutLoading) e.target.style.backgroundColor = logoutButtonHoverStyles.backgroundColor;
          }}
          onMouseLeave={(e) => {
            if (!isLogoutLoading) e.target.style.backgroundColor = logoutButtonStyles.backgroundColor;
          }}
        >
          {isLogoutLoading ? <ButtonSpinner size="small" /> : 'Logout'}
        </button>
      )}
    </header>
  );
}

export default Header;