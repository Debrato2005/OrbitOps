const spinnerContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '16px',
};

const spinnerStyles = {
  width: '40px',
  height: '40px',
  border: '4px solid #333',
  borderTop: '4px solid #4a9eff',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

const spinnerTextStyles = {
  color: '#cccccc',
  fontSize: '0.9em',
  fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
  textAlign: 'center',
};

// Add keyframes for spinner animation
const spinnerKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject keyframes into document head if not already present
if (typeof document !== 'undefined' && !document.getElementById('spinner-keyframes')) {
  const style = document.createElement('style');
  style.id = 'spinner-keyframes';
  style.textContent = spinnerKeyframes;
  document.head.appendChild(style);
}

function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'medium',
  color = '#4a9eff',
  className = '',
  style = {} 
}) {
  const sizeMap = {
    small: { width: '24px', height: '24px', borderWidth: '3px' },
    medium: { width: '40px', height: '40px', borderWidth: '4px' },
    large: { width: '60px', height: '60px', borderWidth: '5px' },
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  const customSpinnerStyles = {
    ...spinnerStyles,
    ...spinnerSize,
    borderColor: '#333',
    borderTopColor: color,
  };

  return (
    <div 
      className={className}
      style={{
        ...spinnerContainerStyles,
        ...style,
      }}
    >
      <div style={customSpinnerStyles} />
      {message && (
        <div style={spinnerTextStyles}>
          {message}
        </div>
      )}
    </div>
  );
}

// Full-screen loading overlay
export function LoadingOverlay({ 
  message = 'Loading...', 
  backgroundColor = 'rgba(26, 26, 26, 0.9)',
  zIndex = 9998 
}) {
  const overlayStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex,
  };

  return (
    <div style={overlayStyles}>
      <LoadingSpinner message={message} size="large" />
    </div>
  );
}

// Inline loading state for buttons
export function ButtonSpinner({ size = 'small', color = 'white' }) {
  const buttonSpinnerStyles = {
    display: 'inline-block',
    marginRight: '8px',
    verticalAlign: 'middle',
  };

  return (
    <div style={buttonSpinnerStyles}>
      <LoadingSpinner 
        size={size} 
        color={color} 
        message=""
        style={{ gap: '0' }}
      />
    </div>
  );
}

export default LoadingSpinner;