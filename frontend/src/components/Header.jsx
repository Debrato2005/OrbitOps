import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ButtonSpinner } from './LoadingSpinner';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  selectIsAuthenticated,
  selectAuthLoading,
  selectUser,
  validateSession,
  logoutUser,
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
  backgroundColor: '#4a9eff', // Blue color for the continue button
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
  backgroundColor: '#3a8eef', // Darker blue for hover
};

function Header({ showContinueButton = false }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const user = useSelector(selectUser);
  const [isValidating, setIsValidating] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

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

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
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
        <div>
          <Button
            id="user-menu-button"
            aria-controls={open ? 'user-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleMenuClick}
            endIcon={<KeyboardArrowDownIcon sx={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />}
            sx={{
              backgroundColor: '#2a2a2a',
              color: 'white',
              border: '1px solid #444',
              padding: '9px 16px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: '6px',
              textTransform: 'none',
              fontFamily: '"Exo 2", sans-serif',
              '&:hover': {
                backgroundColor: '#3a3a3a',
                borderColor: '#555',
              },
            }}
          >
            <span>{user?.companyName || 'User Menu'}</span>
          </Button>
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            MenuListProps={{
              'aria-labelledby': 'user-menu-button',
            }}
            PaperProps={{
              sx: {
                backgroundColor: '#2a2a2a',
                color: 'white',
                border: '1px solid #444',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                mt: 1.5,
              },
            }}
          >
            <MenuItem
              onClick={handleLogoutClick}
              disabled={isLogoutLoading}
              sx={{
                fontFamily: '"Exo 2", sans-serif',
                '&:hover': {
                  backgroundColor: '#3a3a3a',
                },
              }}
            >
              <LogoutIcon sx={{ mr: 1.5, color: '#ccc' }} />
              {isLogoutLoading ? 'Logging out...' : 'Logout'}
            </MenuItem>
          </Menu>
        </div>
      )}
    </header>
  );
}

export default Header;