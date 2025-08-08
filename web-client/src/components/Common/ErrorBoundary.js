import React from 'react';
import { FaExclamationTriangle, FaSync, FaHome } from 'react-icons/fa';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Store error details in state
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Send error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // In a real app, you would send this to an error monitoring service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    };
    
    console.log('Error report:', errorReport);
    // Example: errorMonitoringService.logError(errorReport);
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { fallback: CustomFallback, title, description, showDetails = false } = this.props;
      
      // Use custom fallback if provided
      if (CustomFallback) {
        return <CustomFallback 
          error={this.state.error} 
          retry={this.handleRetry}
          goHome={this.handleGoHome}
        />;
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">
              <FaExclamationTriangle />
            </div>
            
            <h2 className="error-title">
              {title || 'Something went wrong'}
            </h2>
            
            <p className="error-description">
              {description || 'An unexpected error occurred. Please try again or return to the home page.'}
            </p>

            {this.state.retryCount > 0 && (
              <p className="retry-count">
                Retry attempts: {this.state.retryCount}
              </p>
            )}
            
            <div className="error-actions">
              <button
                className="btn btn-primary"
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
              >
                <FaSync />
                {this.state.retryCount >= 3 ? 'Max retries reached' : 'Try Again'}
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={this.handleGoHome}
              >
                <FaHome />
                Go Home
              </button>
            </div>

            {(showDetails || process.env.NODE_ENV === 'development') && this.state.error && (
              <details className="error-details">
                <summary>Technical Details</summary>
                <div className="error-stack">
                  <h4>Error Message:</h4>
                  <pre>{this.state.error.message}</pre>
                  
                  <h4>Stack Trace:</h4>
                  <pre>{this.state.error.stack}</pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <h4>Component Stack:</h4>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy error boundary wrapping
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Specialized error boundaries for different sections
export class VideoPlayerErrorBoundary extends ErrorBoundary {
  render() {
    if (this.state.hasError) {
      return (
        <div className="video-player-error">
          <div className="error-content">
            <FaExclamationTriangle />
            <h3>Video Player Error</h3>
            <p>Unable to load the video player. Please try refreshing the page.</p>
            <button className="btn btn-primary" onClick={this.handleRetry}>
              <FaSync />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export class VideoGridErrorBoundary extends ErrorBoundary {
  render() {
    if (this.state.hasError) {
      return (
        <div className="video-grid-error">
          <div className="error-content">
            <FaExclamationTriangle />
            <h3>Unable to Load Videos</h3>
            <p>There was an error loading the video library. Please try again.</p>
            <button className="btn btn-primary" onClick={this.handleRetry}>
              <FaSync />
              Reload Videos
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export class SearchErrorBoundary extends ErrorBoundary {
  render() {
    if (this.state.hasError) {
      return (
        <div className="search-error">
          <p>Search is temporarily unavailable. Please refresh the page.</p>
          <button className="btn btn-sm btn-primary" onClick={this.handleRetry}>
            <FaSync />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;