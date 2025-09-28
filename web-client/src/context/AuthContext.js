import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

const AUTH_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  TOKEN_VERIFIED: 'TOKEN_VERIFIED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  NO_AUTH_REQUIRED: 'NO_AUTH_REQUIRED'
};

const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case AUTH_ACTIONS.TOKEN_VERIFIED:
      return {
        ...state,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case AUTH_ACTIONS.TOKEN_INVALID:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    case AUTH_ACTIONS.NO_AUTH_REQUIRED:
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        requiresAuth: false,
        error: null
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  requiresAuth: false  // Default to no auth required
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Test if authentication is required by making a simple API call
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://${window.location.hostname}:3001`;
        const response = await fetch(`${API_BASE_URL}/api/videos`);
        
        if (response.ok) {
          // No auth required - videos endpoint is accessible
          dispatch({ type: AUTH_ACTIONS.NO_AUTH_REQUIRED });
          return;
        }
        
        // Auth is required, check for existing token
        const token = authService.getToken();
        if (token) {
          const isValid = await authService.verifyToken(token);
          if (isValid) {
            dispatch({
              type: AUTH_ACTIONS.TOKEN_VERIFIED,
              payload: { token }
            });
          } else {
            authService.removeToken();
            dispatch({ type: AUTH_ACTIONS.TOKEN_INVALID });
          }
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const response = await authService.login(credentials);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.user,
          token: response.token
        }
      });
      
      return { success: true };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    authService.removeToken();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  const value = {
    ...state,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};