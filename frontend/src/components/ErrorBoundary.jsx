import { Component } from 'react';

const errorBoundaryStyles = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: '#1a1a1a',
  color: 'white',
  fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
  padding: '20px',
  textAlign: 'center',
};

const errorTitleStyles = {
  fontSize: '2em',
  fontWeight: 600,
  marginBottom: '20px',
  color: '#ff6b6b',
  fontFamily: '"Exo 2", sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const errorMessageStyles = {
  fontSize: '1.1em',
  marginBottom: '30px',
  maxWidth: '600px',
  lineHeight: '1.5',
  color: '#cccccc',
};

const errorDetailsStyles = {
  backgroundColor: '#2a2a2a',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '30px',
  maxWidth: '800px',
  width: '100%',
  textAlign: 'left',
  fontSize: '0.9em',
  color: '#ff9999',
  fontFamily: 'monospace',
  overflow: 'auto',
  maxHeight: '200px',
};

const retryButtonStyles = {
  backgroundColor: '#4a9eff',
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  fontSize: '1em',
  fontWeight: 600,
  borderRadius: '6px',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  transition: 'background-color 0.3s ease',
  marginRight: '10px',
};

const reloadButtonStyles = {
  backgroundColor: '#666',
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  fontSize: '1em',
  fontWeight: 600,
  borderRadius: '6px',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  transition: 'background-color 0.3s ease',
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      const showDetails = process.env.NODE_ENV === 'development';

      return (
        <div style={errorBoundaryStyles}>
          <h1 style={errorTitleStyles}>Something went wrong</h1>
          
          <p style={errorMessageStyles}>
            We encountered an unexpected error. This has been logged and our team will investigate.
            {retryCount > 0 && ` (Retry attempt: ${retryCount})`}
          </p>

          {showDetails && error && (
            <div style={errorDetailsStyles}>
              <strong>Error Details:</strong>
              <br />
              {error.toString()}
              <br />
              <br />
              <strong>Component Stack:</strong>
              <br />
              {errorInfo?.componentStack}
            </div>
          )}

          <div>
            <button
              style={retryButtonStyles}
              onClick={this.handleRetry}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#3a8eef';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#4a9eff';
              }}
            >
              Try Again
            </button>
            
            <button
              style={reloadButtonStyles}
              onClick={this.handleReload}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#777';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#666';
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;