const http = require('http');
const https = require('https');

// Test configuration
const API_BASE_URL = 'http://localhost:3001';
const TEST_VIDEO_IDS = ['VkVPMy1RdWFsaXR5', 'VGhlX2ZvbGxvd2lu', 'ZHJlYW1pbmEtMjAy'];
const ACCESS_CODE = '1776';

let authToken = null;

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data;
                    resolve({ 
                        status: res.statusCode, 
                        headers: res.headers, 
                        data: parsed 
                    });
                } catch (e) {
                    resolve({ 
                        status: res.statusCode, 
                        headers: res.headers, 
                        data: data 
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function runDiagnostics() {
    console.log('🔧 Starting Video Streaming Diagnostics...\n');
    
    try {
        // Test 1: Authentication
        console.log('📋 TEST 1: Authentication Flow');
        await testAuthentication();
        
        // Test 2: Stream Info API
        console.log('\n📋 TEST 2: Stream Info API');
        await testStreamInfoAPI();
        
        // Test 3: Direct Streaming Test
        console.log('\n📋 TEST 3: Direct Streaming Test');
        await testDirectStreaming();
        
    } catch (error) {
        console.error('❌ Diagnostics failed:', error.message);
    }
    
    console.log('\n🏁 Diagnostics Complete');
}

async function testAuthentication() {
    try {
        console.log('  ➤ Testing login with access code:', ACCESS_CODE);
        
        const response = await makeRequest(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accessCode: ACCESS_CODE })
        });
        
        console.log('  📋 Login response status:', response.status);
        console.log('  📋 Login response data:', response.data);
        
        if (response.status === 200 && response.data.token) {
            authToken = response.data.token;
            console.log('  ✅ Authentication successful');
            console.log('  📋 Token received:', authToken.substring(0, 20) + '...');
        } else {
            console.log('  ❌ Authentication failed:', response.data);
            throw new Error('Authentication required for further tests');
        }
        
    } catch (error) {
        console.log('  ❌ Authentication error:', error.message);
        throw error;
    }
}

async function testStreamInfoAPI() {
    try {
        console.log('  ➤ Testing stream info API for each video...');
        
        for (const videoId of TEST_VIDEO_IDS) {
            try {
                console.log(`    Testing video: ${videoId}`);
                
                const response = await makeRequest(`${API_BASE_URL}/api/stream/${videoId}/info`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`    📋 Response status: ${response.status}`);
                
                if (response.status === 200 && response.data.success) {
                    console.log(`    ✅ Stream info for ${videoId}: ${response.data.info.title}`);
                    console.log(`      Size: ${(response.data.info.size / 1024 / 1024).toFixed(2)} MB`);
                    console.log(`      Duration: ${response.data.info.duration}s`);
                } else {
                    console.log(`    ❌ Failed for ${videoId}:`, response.data);
                }
                
            } catch (error) {
                console.log(`    ❌ Stream info failed for ${videoId}:`, error.message);
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
                
                const response = await makeRequest(`${API_BASE_URL}/api/stream/${videoId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Range': 'bytes=0-1023'  // Request first 1KB
                    }
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
                } else if (response.status === 404) {
                    console.log(`    ❌ Video not found: ${videoId}`);
                } else {
                    console.log(`    ⚠️  Unexpected status for ${videoId}: ${response.status}`);
                    console.log(`    📋 Response:`, response.data);
                }
                
            } catch (error) {
                console.log(`    ❌ Streaming failed for ${videoId}:`, error.message);
            }
        }
        
    } catch (error) {
        console.log('  ❌ Direct streaming test failed:', error.message);
    }
}

// Run diagnostics
runDiagnostics().catch(console.error);