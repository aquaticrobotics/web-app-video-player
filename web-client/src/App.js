import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Home from './pages/Home';
import VideoDetail from './pages/VideoDetail';
import Header from './components/Layout/Header';
import LoadingSpinner from './components/Common/LoadingSpinner';
import ErrorBoundary, { VideoPlayerErrorBoundary, VideoGridErrorBoundary } from './components/Common/ErrorBoundary';
import './styles/global.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to home if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app">
      {isAuthenticated && <Header />}
      <main className={isAuthenticated ? "main-content" : "main-content-full"}>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <VideoGridErrorBoundary>
                  <Home />
                </VideoGridErrorBoundary>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/video/:id"
            element={
              <ProtectedRoute>
                <VideoPlayerErrorBoundary>
                  <VideoDetail />
                </VideoPlayerErrorBoundary>
              </ProtectedRoute>
            }
          />
          
          {/* Catch all route */}
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      title="Application Error"
      description="The video streaming application encountered an unexpected error. Please refresh the page or try again later."
    >
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;