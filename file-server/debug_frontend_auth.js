const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function debugFrontendAuth() {
  try {
    console.log('🔍 DEBUGGING FRONTEND AUTH FLOW\n');
    
    // Simulate the exact frontend auth flow
    console.log('1. Simulating frontend login process...');
    
    // Step 1: Login (same as frontend)
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      accessCode: '1776'
    });
    
    console.log('✅ Login Response:', {
      success: loginResponse.data.success,
      hasToken: !!loginResponse.data.token,
      tokenLength: loginResponse.data.token ? loginResponse.data.token.length : 0
    });
    
    const token = loginResponse.data.token;
    
    // Step 2: Test token verification (as frontend does)
    console.log('\n2. Testing token verification (frontend method)...');
    try {
      const verifyResponse = await axios.post(`${API_BASE_URL}/auth/verify`, {
        token: token
      });
      
      console.log('✅ Verification Response:', {
        valid: verifyResponse.data.valid,
        decoded: verifyResponse.data.decoded
      });
    } catch (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
      if (verifyError.response) {
        console.log('Status:', verifyError.response.status);
        console.log('Data:', verifyError.response.data);
      }
    }
    
    // Step 3: Test video request WITHOUT Authorization header
    console.log('\n3. Testing video request WITHOUT Authorization header...');
    try {
      const videoResponseNoAuth = await axios.get(`${API_BASE_URL}/api/videos`);
      console.log('✅ Video request without auth succeeded (unexpected!)');
    } catch (error) {
      console.log('❌ Video request without auth failed (expected):', error.response?.status, error.response?.data?.error?.message);
    }
    
    // Step 4: Test video request WITH Authorization header (axios interceptor simulation)
    console.log('\n4. Testing video request WITH Authorization header...');
    try {
      const videoResponse = await axios.get(`${API_BASE_URL}/api/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Video request with auth succeeded');
      console.log('Video count:', videoResponse.data.videos?.length || 0);
    } catch (error) {
      console.log('❌ Video request with auth failed:', error.response?.status, error.response?.data?.error?.message);
    }
    
    // Step 5: Test if axios global interceptor is working (simulate frontend issue)
    console.log('\n5. Testing if frontend axios interceptor setup works...');
    
    // Create axios instance like frontend might
    const frontendAxios = axios.create();
    
    // Setup interceptor like frontend
    frontendAxios.interceptors.request.use(
      (config) => {
        console.log('🔧 Interceptor adding token...');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    try {
      const interceptorResponse = await frontendAxios.get(`${API_BASE_URL}/api/videos`);
      console.log('✅ Axios interceptor worked correctly');
      console.log('Video count via interceptor:', interceptorResponse.data.videos?.length || 0);
    } catch (error) {
      console.log('❌ Axios interceptor failed:', error.response?.status, error.response?.data?.error?.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

debugFrontendAuth();