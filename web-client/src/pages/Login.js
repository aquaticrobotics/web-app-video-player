import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FaPlay, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/Login.css';

const Login = () => {
  const [accessCode, setAccessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const { login, loading, error, clearError } = useAuth();

  // Clear error when component mounts or access code changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [accessCode, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      return;
    }

    const result = await login(accessCode.trim());
    
    if (!result.success) {
      // Error is handled by the auth context
      setAccessCode('');
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and limit to reasonable length
    if (/^\d*$/.test(value) && value.length <= 10) {
      setAccessCode(value);
    }
  };

  const toggleShowCode = () => {
    setShowCode(!showCode);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-overlay"></div>
      </div>
      
      <div className="login-content">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <FaPlay className="logo-icon" />
              <h1>Video Stream</h1>
            </div>
            <p className="login-subtitle">Enter your access code to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="accessCode" className="form-label">
                <FaLock className="label-icon" />
                Access Code
              </label>
              <div className="input-container">
                <input
                  type={showCode ? 'text' : 'password'}
                  id="accessCode"
                  value={accessCode}
                  onChange={handleCodeChange}
                  placeholder="Enter access code"
                  className={`form-input ${error ? 'error' : ''}`}
                  disabled={loading}
                  autoComplete="off"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={toggleShowCode}
                  className="toggle-visibility"
                  disabled={loading}
                  aria-label={showCode ? 'Hide access code' : 'Show access code'}
                >
                  {showCode ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading || !accessCode.trim()}
            >
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <FaPlay className="button-icon" />
                  <span>Access Videos</span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="help-text">
              Need help? Contact your administrator for the access code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;