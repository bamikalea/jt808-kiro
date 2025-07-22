#!/usr/bin/env node

const net = require('net');

// Test configuration
const TEST_CONFIG = {
  SERVER_HOST: 'localhost',
  SERVER_PORT: 7001,
  TEST_TIMEOUT: 5000
};

console.log('🧪 JT808/JT1078 Dashcam Server Connection Test');
console.log('='.repeat(50));

// Test 1: Basic connection test
function testBasicConnection() {
  return new Promise((resolve, reject) => {
    console.log(`\n📡 Testing connection to ${TEST_CONFIG.SERVER_HOST}:${TEST_CONFIG.SERVER_PORT}...`);
    
    const client = net.createConnection({
      host: TEST_CONFIG.SERVER_HOST,
      port: TEST_CONFIG.SERVER_PORT,
      family: 4 // Force IPv4
    });
    
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Connection timeout'));
    }, TEST_CONFIG.TEST_TIMEOUT);
    
    client.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ Successfully connected to server');
      
      // Send test data
      const testData = Buffer.from('TEST_DASHCAM_DATA');
      client.write(testData);
      console.log(`📤 Sent test data: ${testData.toString('hex')}`);
    });
    
    client.on('data', (data) => {
      console.log(`📥 Received response: ${data.toString('hex')}`);
      console.log(`📥 Response preview: ${data.toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);
      
      client.end();
      resolve('Connection test passed');
    });
    
    client.on('close', () => {
      console.log('🔌 Connection closed');
    });
    
    client.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Test 2: Multiple connections test
function testMultipleConnections() {
  return new Promise((resolve, reject) => {
    console.log('\n🔄 Testing multiple simultaneous connections...');
    
    const connections = [];
    const numConnections = 3;
    let connectedCount = 0;
    let responsesReceived = 0;
    
    for (let i = 0; i < numConnections; i++) {
      const client = net.createConnection({
        host: TEST_CONFIG.SERVER_HOST,
        port: TEST_CONFIG.SERVER_PORT,
        family: 4 // Force IPv4
      });
      
      connections.push(client);
      
      client.on('connect', () => {
        connectedCount++;
        console.log(`✅ Connection ${i + 1} established`);
        
        // Send test data with connection ID
        const testData = Buffer.from(`TEST_CONN_${i + 1}`);
        client.write(testData);
      });
      
      client.on('data', (data) => {
        responsesReceived++;
        console.log(`📥 Connection ${i + 1} received response`);
        
        client.end();
        
        if (responsesReceived === numConnections) {
          resolve('Multiple connections test passed');
        }
      });
      
      client.on('error', (err) => {
        reject(err);
      });
    }
    
    // Timeout for multiple connections test
    setTimeout(() => {
      connections.forEach(conn => conn.destroy());
      if (responsesReceived < numConnections) {
        reject(new Error(`Only ${responsesReceived}/${numConnections} connections responded`));
      }
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

// Test 3: Server status check
function testServerStatus() {
  return new Promise((resolve, reject) => {
    console.log('\n📊 Testing server status and logging...');
    
    const client = net.createConnection({
      host: TEST_CONFIG.SERVER_HOST,
      port: TEST_CONFIG.SERVER_PORT,
      family: 4 // Force IPv4
    });
    
    client.on('connect', () => {
      console.log('✅ Server is accepting connections');
      console.log('✅ Connection logging should be visible in server console');
      
      // Send a longer test message to verify data handling
      const testMessage = Buffer.from([
        0x7E, // Start flag
        0x01, 0x00, // Message ID (example)
        0x00, 0x0A, // Message length
        0x01, 0x23, 0x45, 0x67, 0x89, 0x01, // Device ID
        0x00, 0x01, // Message sequence
        0x54, 0x45, 0x53, 0x54, // "TEST" data
        0x7E  // End flag
      ]);
      
      client.write(testMessage);
      console.log(`📤 Sent JT808-like test message: ${testMessage.toString('hex')}`);
    });
    
    client.on('data', (data) => {
      console.log('✅ Server processed and responded to test message');
      client.end();
      resolve('Server status test passed');
    });
    
    client.on('error', (err) => {
      reject(err);
    });
    
    setTimeout(() => {
      client.destroy();
      reject(new Error('Server status test timeout'));
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

// Run all tests
async function runTests() {
  const tests = [
    { name: 'Basic Connection', fn: testBasicConnection },
    { name: 'Multiple Connections', fn: testMultipleConnections },
    { name: 'Server Status', fn: testServerStatus }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      console.log(`✅ ${test.name}: ${result}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Server is ready for dashcam connections.');
    console.log('\n💡 Next steps:');
    console.log('   1. Configure your dashcam to connect to this server');
    console.log(`   2. Set dashcam server IP to your machine's IP address`);
    console.log(`   3. Set dashcam server port to ${TEST_CONFIG.SERVER_PORT}`);
    console.log('   4. Monitor server logs for actual dashcam connections');
  } else {
    console.log('⚠️  Some tests failed. Check server status and try again.');
    process.exit(1);
  }
}

// Check if server is running first
console.log('🔍 Checking if server is running...');
const checkClient = net.createConnection({
  host: TEST_CONFIG.SERVER_HOST,
  port: TEST_CONFIG.SERVER_PORT,
  family: 4 // Force IPv4
});

checkClient.on('connect', () => {
  checkClient.end();
  console.log('✅ Server is running, starting tests...');
  runTests();
});

checkClient.on('error', (err) => {
  console.log('❌ Server is not running or not accessible');
  console.log(`   Error: ${err.message}`);
  console.log('\n💡 To start the server, run:');
  console.log('   npm start');
  console.log('   or');
  console.log('   node src/server.js');
  process.exit(1);
});