import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { loginUser, clearError, selectAuth } from '../store/authSlice';

const loginContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundImage: "url('/landing-background.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  position: 'relative',
  fontFamily: '"Exo 2", sans-serif',
};

const overlayStyles = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'black',
  opacity: 0.5,
};

const formContainerStyles = {
  flexGrow: 1,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  position: 'relative',
  zIndex: 1,
};

const formStyles = {
  backgroundColor: '#1a1a1a',
  padding: '40px',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
  width: '100%',
  maxWidth: '400px',
  color: 'white',
  fontFamily: '"Exo 2", sans-serif',
};

const titleStyles = {
  textAlign: 'center',
  marginBottom: '30px',
  fontSize: '1.5em',
  fontWeight: 600,
  color: 'white',
  fontFamily: '"Exo 2", sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const inputGroupStyles = {
  marginBottom: '20px',
};

const labelStyles = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '0.9em',
  fontWeight: 500,
  color: '#cccccc',
  fontFamily: '"Exo 2", sans-serif',
};

const inputStyles = {
  width: '100%',
  padding: '12px',
  fontSize: '1em',
  border: '1px solid #333',
  borderRadius: '4px',
  backgroundColor: '#2a2a2a',
  color: 'white',
  outline: 'none',
  transition: 'border-color 0.3s ease',
  boxSizing: 'border-box',
  fontFamily: '"Exo 2", sans-serif',
};

const inputFocusStyles = {
  borderColor: '#4a9eff',
};

const buttonStyles = {
  width: '100%',
  padding: '12px',
  fontSize: '1em',
  fontWeight: 600,
  color: 'white',
  backgroundColor: '#4a9eff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontFamily: '"Exo 2", sans-serif',
};

const buttonHoverStyles = {
  backgroundColor: '#3a8eef',
};

const buttonDisabledStyles = {
  backgroundColor: '#666',
  cursor: 'not-allowed',
};

const errorStyles = {
  color: '#ff6b6b',
  fontSize: '0.9em',
  marginTop: '8px',
  textAlign: 'center',
};

const fieldErrorStyles = {
  color: '#ff6b6b',
  fontSize: '0.8em',
  marginTop: '4px',
};

function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector(selectAuth);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.getElementById('root').style.height = '100%';

    return () => {
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        if (!value.trim()) {
          return 'Email is required';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        return '';
      case 'password':
        if (!value.trim()) {
          return 'Password is required';
        }
        if (value.length < 6) {
          return 'Password must be at least 6 characters';
        }
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    if (error) {
      dispatch(clearError());
    }
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    const fieldError = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      [name]: fieldError,
    }));
    setFocusedField(null);
  };

  const handleInputFocus = (e) => {
    setFocusedField(e.target.name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = {};
    Object.keys(formData).forEach(field => {
      const fieldError = validateField(field, formData[field]);
      if (fieldError) {
        errors[field] = fieldError;
      }
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length === 0) {
      dispatch(loginUser({
        email: formData.email.trim(),
        password: formData.password,
      }));
    }
  };

  const getInputStyle = (fieldName) => ({
    ...inputStyles,
    ...(focusedField === fieldName ? inputFocusStyles : {}),
    ...(fieldErrors[fieldName] ? { borderColor: '#ff6b6b' } : {}),
  });

  const getButtonStyle = () => ({
    ...buttonStyles,
    ...(loading ? buttonDisabledStyles : {}),
  });

  return (
    <div style={loginContainerStyles}>
      <div style={overlayStyles} />
      <Header showContinueButton={false} />
      <div style={formContainerStyles}>
        <form style={formStyles} onSubmit={handleSubmit}>
          <h2 style={titleStyles}>Login</h2>
          
          <div style={inputGroupStyles}>
            <label htmlFor="email" style={labelStyles}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onFocus={handleInputFocus}
              style={getInputStyle('email')}
              disabled={loading}
              autoComplete="email"
              required
            />
            {fieldErrors.email && (
              <div style={fieldErrorStyles}>{fieldErrors.email}</div>
            )}
          </div>

          <div style={inputGroupStyles}>
            <label htmlFor="password" style={labelStyles}>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onFocus={handleInputFocus}
              style={getInputStyle('password')}
              disabled={loading}
              autoComplete="current-password"
              required
            />
            {fieldErrors.password && (
              <div style={fieldErrorStyles}>{fieldErrors.password}</div>
            )}
          </div>

          {error && (
            <div style={errorStyles}>
              {typeof error === 'string' ? error : 'Login failed. Please try again.'}
            </div>
          )}

          <button
            type="submit"
            style={getButtonStyle()}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = buttonHoverStyles.backgroundColor;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = buttonStyles.backgroundColor;
              }
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginForm;
