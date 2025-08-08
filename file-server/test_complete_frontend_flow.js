const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

async function testCompleteFrontendFlow() {
  try {
    console.log('🔍 TESTING COMPLETE FRONTEND FLOW\n');
    
    // Test 1: Verify frontend is running
    console.log('1. Testing frontend server...');
    try {
      const frontendResponse = await axios.get(FRONTEND_URL);
      console.log('✅ Frontend server running on port 3000');
    } catch (error) {
      console.log('❌ Frontend server not accessible:', error.message);
      return;
    }
    
    // Test 2: Login flow simulation (exactly as frontend does)
    console.log('\n2. Simulating exact frontend login flow...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        accessCode: '1776'
      });
      
      console.log('✅ Login successful');
      console.log('Response structure:', {
        success: loginResponse.data.success,
        hasToken: !!loginResponse.data.token,
        expiresIn: loginResponse.data.expiresIn,
        message: loginResponse.data.message
      });
      
      const token = loginResponse.data.token;
      
      // Test 3: Token verification (exactly as AuthContext does)
      console.log('\n3. Testing token verification (AuthContext simulation)...');
      try {
        const verifyResponse = await axios.post(`${API_BASE_URL}/auth/verify`, {
          token: token
        });
        
        console.log('✅ Token verification successful');
        console.log('Valid:', verifyResponse.data.valid);
        
        // Test 4: API requests with and without interceptors
        console.log('\n4. Testing API requests (with Authorization header)...');
        
        // Create axios instance exactly like frontend api.js
        const frontendApiInstance = axios.create();
        frontendApiInstance.defaults.baseURL = API_BASE_URL;
        frontendApiInstance.defaults.timeout = 30000;
        
        // Add interceptor exactly like frontend auth.js
        frontendApiInstance.interceptors.request.use(
          (config) => {
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
          },
          (error) => {
            return Promise.reject(error);
          }
        );
        
        // Test videos endpoint like frontend does
        const videosResponse = await frontendApiInstance.get('/api/videos');
        console.log('✅ Videos API call successful');
        console.log('Videos found:', videosResponse.data.videos?.length || 0);
        
        // Test categories endpoint
        const categoriesResponse = await frontendApiInstance.get('/api/videos/categories/all');
        console.log('✅ Categories API call successful');
        console.log('Categories:', Object.keys(categoriesResponse.data.categories || {}));
        
        // Test stats endpoint
        const statsResponse = await frontendApiInstance.get('/api/videos/stats/overview');
        console.log('✅ Stats API call successful');
        console.log('Stats available:', !!statsResponse.data.stats);
        
        console.log('\n🎉 ALL TESTS PASSED! Frontend authentication flow should work correctly.');
        console.log('\nIf frontend is still showing issues, try:');
        console.log('1. Clear browser cache and localStorage');
        console.log('2. Restart React dev server');
        console.log('3. Check browser console for specific errors');
        
      } catch (verifyError) {
        console.log('❌ Token verification failed:', verifyError.message);
        if (verifyError.response) {
          console.log('Status:', verifyError.response.status);
          console.log('Data:', verifyError.response.data);
        }
      }
      
    } catch (loginError) {
      console.log('❌ Login failed:', loginError.message);
      if (loginError.response) {
        console.log('Status:', loginError.response.status);
        console.log('Data:', loginError.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

// Additional test for CORS headers
async function testCorsHeaders() {
  console.log('\n🌐 TESTING CORS CONFIGURATION...');
  
  try {
    // Test preflight request (OPTIONS)
    const corsResponse = await axios.options(`${API_BASE_URL}/auth/login`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    
    console.log('✅ CORS preflight successful');
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': corsResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': corsResponse.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': corsResponse.headers['access-control-allow-headers']
    });
    
  } catch (corsError) {
    console.log('⚠️ CORS test failed:', corsError.message);
  }
}

async function runAllTests() {
  await testCompleteFrontendFlow();
  await testCorsHeaders();
}

runAllTests();