import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://${window.location.hostname}:3001`;
const TOKEN_KEY = 'video_streaming_token';

class AuthService {
  constructor() {
    this.setupAxiosInterceptors();
  }

  // Setup axios interceptors for automatic token handling
  setupAxiosInterceptors() {
    // Request interceptor to add token to headers
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token expiration
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.removeToken();
          // Redirect to login if not already there
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Login with access code
  async login(accessCode) {
    try {
      console.log('🔐 DEBUG: Attempting login with access code:', accessCode);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        accessCode
      });

      console.log('🔐 DEBUG: Login response received:', response.data);
      
      // FIXED: Store the token in localStorage
      if (response.data.token) {
        this.setToken(response.data.token);
        console.log('🔐 DEBUG: Token successfully stored:', response.data.token);
        console.log('🔐 DEBUG: Verified stored token:', this.getToken());
      }

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Verify token with server
  async verifyToken(token) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify`, {
        token
      });

      return response.data.valid;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  // Logout
  async logout() {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Token management
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  }
}

export const authService = new AuthService();