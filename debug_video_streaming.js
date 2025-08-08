const axios = require('axios');
const fs = require('fs');

// Test configuration
const API_BASE_URL = 'http://localhost:3001';
const TEST_VIDEO_IDS = ['VkVPMy1RdWFsaXR5', 'VGhlX2ZvbGxvd2lu', 'ZHJlYW1pbmEtMjAy'];
const ACCESS_CODE = '1776';

let authToken = null;

async function runDiagnostics() {
    console.log('🔧 Starting Video Streaming Diagnostics...\n');
    
    try {
        // Test 1: Authentication
        console.log('📋 TEST 1: Authentication Flow');
        await testAuthentication();
        
        // Test 2: Video List API
        console.log('\n📋 TEST 2: Video List API');
        await testVideoListAPI();
        
        // Test 3: Stream Info API
        console.log('\n📋 TEST 3: Stream Info API');
        await testStreamInfoAPI();
        
        // Test 4: Direct Streaming Test
        console.log('\n📋 TEST 4: Direct Streaming Test');
        await testDirectStreaming();
        
        // Test 5: CORS Headers Test
        console.log('\n📋 TEST 5: CORS Configuration Test');
        await testCORSHeaders();
        
    } catch (error) {
        console.error('❌ Diagnostics failed:', error.message);
    }
    
    console.log('\n🏁 Diagnostics Complete');
}

async function testAuthentication() {
    try {
        console.log('  ➤ Testing login with access code:', ACCESS_CODE);
        
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            accessCode: ACCESS_CODE
        });
        
        if (response.data.token) {
            authToken = response.data.token;
            console.log('  ✅ Authentication successful');
            console.log('  📋 Token received:', authToken.substring(0, 20) + '...');
            
            // Set default authorization header for subsequent requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        } else {
            console.log('  ❌ No token in response:', response.data);
        }
        
    } catch (error) {
        console.log('  ❌ Authentication failed:', error.response?.data || error.message);
        throw new Error('Authentication required for further tests');
    }
}

async function testVideoListAPI() {
    try {
        console.log('  ➤ Testing video list API...');
        
        const response = await axios.get(`${API_BASE_URL}/api/videos`);
        
        if (response.data.videos && Array.isArray(response.data.videos)) {
            console.log('  ✅ Video list API working');
            console.log('  📋 Found videos:', response.data.videos.length);
            
            response.data.videos.forEach(video => {
                console.log(`    - ${video.id}: ${video.title}`);
            });
        } else {
            console.log('  ❌ Unexpected video list response:', response.data);
        }
        
    } catch (error) {
        console.log('  ❌ Video list API failed:', error.response?.status, error.response?.data || error.message);
    }
}

async function testStreamInfoAPI() {
    try {
        console.log('  ➤ Testing stream info API for each video...');
        
        for (const videoId of TEST_VIDEO_IDS) {
            try {
                console.log(`    Testing video: ${videoId}`);
                
                const response = await axios.get(`${API_BASE_URL}/api/stream/${videoId}/info`);
                
                if (response.data.success && response.data.info) {
                    console.log(`    ✅ Stream info for ${videoId}: ${response.data.info.title}`);
                    console.log(`      Size: ${(response.data.info.size / 1024 / 1024).toFixed(2)} MB`);
                    console.log(`      Duration: ${response.data.info.duration}s`);
                    console.log(`      Stream URL: ${response.data.info.streamUrl}`);
                } else {
                    console.log(`    ❌ Invalid stream info response for ${videoId}:`, response.data);
                }
                
            } catch (error) {
                console.log(`    ❌ Stream info failed for ${videoId}:`, error.response?.status, error.response?.data || error.message);
            }
        }
        
    } catch (error) {
        console.log('  ❌ Stream info API test failed:', error.message);
    }
}

async function testDirectStreaming() {
    try {
        console.log('  ➤ Testing direct streaming endpoints...');
        
        for (const videoId of TEST_VIDEO_IDS) {
            try {
                console.log(`    Testing streaming for: ${videoId}`);
                
                // Test with range request (typical for video streaming)
                const response = await axios.get(`${API_BASE_URL}/api/stream/${videoId}`, {
                    headers: {
                        'Range': 'bytes=0-1023'  // Request first 1KB
                    },
                    validateStatus: (status) => status < 500  // Allow 206, 401, etc.
                });
                
                console.log(`    📋 Response status: ${response.status}`);
                console.log(`    📋 Content-Type: ${response.headers['content-type']}`);
                console.log(`    📋 Content-Length: ${response.headers['content-length']}`);
                console.log(`    📋 Accept-Ranges: ${response.headers['accept-ranges']}`);
                
                if (response.status === 206) {
                    console.log(`    ✅ Streaming working for ${videoId} (partial content)`);
                } else if (response.status === 200) {
                    console.log(`    ✅ Streaming working for ${videoId} (full content)`);
                } else if (response.status === 401) {
                    console.log(`    ❌ Authentication required for streaming ${videoId}`);
                } else {
                    console.log(`    ⚠️  Unexpected status for ${videoId}: ${response.status}`);
                }
                
            } catch (error) {
                console.log(`    ❌ Streaming failed for ${videoId}:`, error.response?.status, error.response?.data || error.message);
            }
        }
        
    } catch (error) {
        console.log('  ❌ Direct streaming test failed:', error.message);
    }
}

async function testCORSHeaders() {
    try {
        console.log('  ➤ Testing CORS headers...');
        
        // Test preflight request
        const preflightResponse = await axios.options(`${API_BASE_URL}/api/stream/${TEST_VIDEO_IDS[0]}`, {
            headers: {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Range, Authorization'
            },
            validateStatus: () => true
        });
        
        console.log('    📋 Preflight response status:', preflightResponse.status);
        console.log('    📋 Access-Control-Allow-Origin:', preflightResponse.headers['access-control-allow-origin']);
        console.log('    📋 Access-Control-Allow-Methods:', preflightResponse.headers['access-control-allow-methods']);
        console.log('    📋 Access-Control-Allow-Headers:', preflightResponse.headers['access-control-allow-headers']);
        
        if (preflightResponse.headers['access-control-allow-origin'] === '*' || 
            preflightResponse.headers['access-control-allow-origin'] === 'http://localhost:3000') {
            console.log('    ✅ CORS configuration appears correct');
        } else {
            console.log('    ❌ CORS may be blocking requests from frontend');
        }
        
    } catch (error) {
        console.log('  ❌ CORS test failed:', error.message);
    }
}

// Run diagnostics
runDiagnostics().catch(console.error);