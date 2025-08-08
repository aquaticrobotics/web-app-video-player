const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testAuthFlow() {
  try {
    console.log('🔐 Testing authentication flow...\n');
    
    // Step 1: Login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      accessCode: '1776'
    });
    
    console.log('✅ Login successful');
    console.log('Token received:', loginResponse.data.token ? 'YES' : 'NO');
    
    if (!loginResponse.data.token) {
      console.log('❌ No token in login response');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...\n');
    
    // Step 2: Verify token
    console.log('2. Testing token verification...');
    const verifyResponse = await axios.post(`${API_BASE_URL}/auth/verify`, {
      token: token
    });
    
    console.log('✅ Token verification successful');
    console.log('Token valid:', verifyResponse.data.valid);
    console.log('Decoded payload:', verifyResponse.data.decoded);
    
    // Step 3: Test protected endpoint with Authorization header
    console.log('\n3. Testing protected video endpoint with Authorization header...');
    const videoResponse = await axios.get(`${API_BASE_URL}/api/videos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Protected endpoint accessible');
    console.log('Videos count:', videoResponse.data.videos ? videoResponse.data.videos.length : 'N/A');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testAuthFlow();