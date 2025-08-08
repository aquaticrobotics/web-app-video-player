const axios = require('axios');
const fs = require('fs');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const ACCESS_CODE = '1776';

// Test data storage
let authToken = null;
let testVideoId = null;

console.log('🔍 COMPLETE VIDEO STREAMING DEBUG TEST');
console.log('=====================================\n');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Authentication
async function testAuthentication() {
  console.log('1️⃣ Testing Authentication...');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      accessCode: ACCESS_CODE
    });
    
    console.log('✅ Auth Success:', response.data);
    authToken = response.data.token;
    
    if (!authToken) {
      throw new Error('No token received in response');
    }
    
    console.log('🔑 Token stored:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('❌ Auth Failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 2: Token Verification
async function testTokenVerification() {
  console.log('\n2️⃣ Testing Token Verification...');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/verify`, {
      token: authToken
    });
    
    console.log('✅ Token Valid:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Token Invalid:', error.response?.data || error.message);
    return false;
  }
}

// Test 3: Video List API
async function testVideoListAPI() {
  console.log('\n3️⃣ Testing Video List API...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/videos`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ Video List Success');
    console.log('📊 Response structure:', Object.keys(response.data));
    
    if (response.data.videos && response.data.videos.length > 0) {
      const firstVideo = response.data.videos[0];
      testVideoId = firstVideo.id;
      console.log('🎬 First video:', {
        id: firstVideo.id,
        title: firstVideo.title,
        duration: firstVideo.duration,
        width: firstVideo.width,
        height: firstVideo.height,
        filename: firstVideo.filename
      });
      
      // Check for zero duration issue
      if (firstVideo.duration === 0) {
        console.log('⚠️  WARNING: Video has zero duration - this will block playback!');
      }
      
      return true;
    } else {
      console.log('⚠️  No videos found in response');
      return false;
    }
  } catch (error) {
    console.error('❌ Video List Failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 4: Stream Info API
async function testStreamInfoAPI() {
  if (!testVideoId) {
    console.log('\n4️⃣ Skipping Stream Info API (no video ID)');
    return false;
  }
  
  console.log('\n4️⃣ Testing Stream Info API...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/stream/${testVideoId}/info`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ Stream Info Success');
    console.log('📊 Stream info response:', response.data);
    
    // Check if the fallback metadata is working
    if (response.data.info) {
      const info = response.data.info;
      console.log('🎬 Stream metadata:', {
        duration: info.duration,
        width: info.width,
        height: info.height,
        format: info.format,
        hasVideo: info.hasVideo,
        hasAudio: info.hasAudio
      });
      
      if (info.duration === 0) {
        console.log('❌ CRITICAL: Stream info still shows zero duration!');
        console.log('🔧 This indicates the fallback metadata fix is not working');
        return false;
      } else {
        console.log('✅ Duration is non-zero:', info.duration);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Stream Info Failed:', error.response?.data || error.message);
    console.error('📍 Status:', error.response?.status);
    console.error('📍 Headers:', error.response?.headers);
    return false;
  }
}

// Test 5: Direct Stream URL Test
async function testDirectStreamURL() {
  if (!testVideoId) {
    console.log('\n5️⃣ Skipping Direct Stream URL Test (no video ID)');
    return false;
  }
  
  console.log('\n5️⃣ Testing Direct Stream URL...');
  try {
    const streamUrl = `${API_BASE_URL}/api/stream/${testVideoId}`;
    console.log('🔗 Stream URL:', streamUrl);
    
    // Test HEAD request to check if stream is accessible
    const response = await axios.head(streamUrl, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      timeout: 10000
    });
    
    console.log('✅ Stream URL Accessible');
    console.log('📊 Response headers:', {
      'content-type': response.headers['content-type'],
      'content-length': response.headers['content-length'],
      'accept-ranges': response.headers['accept-ranges']
    });
    
    return true;
  } catch (error) {
    console.error('❌ Stream URL Failed:', error.response?.data || error.message);
    console.error('📍 Status:', error.response?.status);
    return false;
  }
}

// Test 6: Backend FFprobe Error Analysis
async function analyzeBackendLogs() {
  console.log('\n6️⃣ Analyzing Backend Status...');
  
  // Check if video folder exists and has files
  try {
    const config = require('./file-server/config/config.json');
    const videoFolder = config.videoFolder;
    
    console.log('📁 Video folder configured:', videoFolder);
    
    if (fs.existsSync(videoFolder)) {
      const files = fs.readdirSync(videoFolder);
      const videoFiles = files.filter(file => 
        config.supportedFormats.some(format => 
          file.toLowerCase().endsWith(format.toLowerCase())
        )
      );
      
      console.log('📹 Video files found:', videoFiles.length);
      if (videoFiles.length > 0) {
        console.log('🎬 Sample files:', videoFiles.slice(0, 3));
        
        // Check file sizes
        videoFiles.slice(0, 1).forEach(file => {
          const filePath = require('path').join(videoFolder, file);
          const stats = fs.statSync(filePath);
          console.log(`📊 ${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        });
      }
    } else {
      console.log('❌ Video folder does not exist!');
    }
  } catch (error) {
    console.error('❌ Backend analysis failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  const results = {
    auth: false,
    tokenVerify: false,
    videoList: false,
    streamInfo: false,
    streamURL: false
  };
  
  // Run tests sequentially
  results.auth = await testAuthentication();
  
  if (results.auth) {
    results.tokenVerify = await testTokenVerification();
    results.videoList = await testVideoListAPI();
    
    if (results.videoList) {
      results.streamInfo = await testStreamInfoAPI();
      results.streamURL = await testDirectStreamURL();
    }
  }
  
  await analyzeBackendLogs();
  
  // Final analysis
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('=======================');
  console.log('🔐 Authentication:', results.auth ? '✅ PASS' : '❌ FAIL');
  console.log('🎫 Token Verification:', results.tokenVerify ? '✅ PASS' : '❌ FAIL');
  console.log('📝 Video List API:', results.videoList ? '✅ PASS' : '❌ FAIL');
  console.log('🎬 Stream Info API:', results.streamInfo ? '✅ PASS' : '❌ FAIL');
  console.log('🔗 Stream URL Access:', results.streamURL ? '✅ PASS' : '❌ FAIL');
  
  // Diagnosis
  console.log('\n🔍 DIAGNOSIS');
  console.log('=============');
  
  if (!results.auth) {
    console.log('❌ PRIMARY ISSUE: Authentication is failing');
    console.log('🔧 Check: Frontend auth endpoint URLs, backend auth routes');
  } else if (!results.videoList) {
    console.log('❌ PRIMARY ISSUE: Video list API is failing');
    console.log('🔧 Check: Authorization headers, video scanning, backend errors');
  } else if (!results.streamInfo) {
    console.log('❌ PRIMARY ISSUE: Stream info API is failing');
    console.log('🔧 Check: Video metadata extraction, fallback implementation');
  } else if (!results.streamURL) {
    console.log('❌ PRIMARY ISSUE: Stream URL is not accessible');
    console.log('🔧 Check: Video file paths, streaming routes, file permissions');
  } else {
    console.log('✅ Backend appears functional - issue may be in frontend video player');
    console.log('🔧 Check: Browser console errors, video player configuration');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
});