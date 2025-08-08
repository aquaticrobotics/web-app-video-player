const https = require('http');

const data = JSON.stringify({
  accessCode: "1776"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing backend authentication with access code "1776"...');
console.log('Request:', JSON.stringify({accessCode: "1776"}, null, 2));

const req = https.request(options, (res) => {
  console.log('\n--- RESPONSE ---');
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();