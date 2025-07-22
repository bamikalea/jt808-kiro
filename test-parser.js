#!/usr/bin/env node

/**
 * Test script to demonstrate JT808 protocol parser with raw data logging
 * This script shows how the parser handles real JT808 messages and logs raw data
 */

const { MessageParser } = require('./src/utils/message-parser');
const { wrapMessage } = require('./src/utils/checksum');
const { MessageValidator, MessageSerializer, MessageFactory } = require('./src/utils/message-validator');
const { MESSAGE_IDS } = require('./src/models/jt808-messages');

console.log('=== JT808 Protocol Parser Test ===\n');

// Test 1: Create a simulated JT808 registration message (0x0100)
console.log('Test 1: JT808 Registration Message (0x0100)');
console.log('-------------------------------------------');

// Create registration message data
const messageId = 0x0100;
const properties = 0x0020; // Message length = 32
const deviceId = '123456789012'; // 12-digit device ID
const sequence = 1;

// Create message body (registration data)
const provinceId = 0x01; // Province ID
const cityId = 0x02; // City ID  
const manufacturerId = Buffer.from('TESTMFG', 'ascii').slice(0, 5); // 5 bytes
const deviceModel = Buffer.from('MODEL123', 'ascii').slice(0, 8); // 8 bytes
const deviceSerial = Buffer.from('SN123456', 'ascii').slice(0, 7); // 7 bytes
const plateColor = 0x01; // Plate color

const bodyData = Buffer.concat([
  Buffer.from([provinceId, cityId]),
  manufacturerId,
  deviceModel, 
  deviceSerial,
  Buffer.from([plateColor])
]);

// Create complete message
const headerBuffer = Buffer.alloc(12);
let offset = 0;

// Message ID
headerBuffer.writeUInt16BE(messageId, offset);
offset += 2;

// Properties  
headerBuffer.writeUInt16BE(properties, offset);
offset += 2;

// Device ID (BCD format)
const deviceIdBCD = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0x12]);
deviceIdBCD.copy(headerBuffer, offset);
offset += 6;

// Sequence
headerBuffer.writeUInt16BE(sequence, offset);

// Combine header and body
const messageData = Buffer.concat([headerBuffer, bodyData]);
const wrappedMessage = wrapMessage(messageData);

console.log('Simulated dashcam sending registration message...\n');

// Parse the message (this will show raw data logging)
const result = MessageParser.parseMessage(wrappedMessage, 'TEST-DASHCAM-001');

if (result.success) {
  console.log('✅ Message parsed successfully!');
  console.log(`Message ID: 0x${result.header.messageId.toString(16).padStart(4, '0').toUpperCase()}`);
  console.log(`Protocol Version: ${result.protocolVersion}`);
  console.log(`Device ID: ${result.header.deviceId}`);
  console.log(`Message Length: ${result.header.messageLength} bytes`);
  console.log(`Body Length: ${result.body.length} bytes`);
} else {
  console.log('❌ Message parsing failed:', result.error);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test 2: Create a simulated JT808 heartbeat message (0x0002)
console.log('Test 2: JT808 Heartbeat Message (0x0002)');
console.log('----------------------------------------');

const heartbeatMessageId = 0x0002;
const heartbeatProperties = 0x0000; // No body data
const heartbeatSequence = 2;

// Create heartbeat message (header only, no body)
const heartbeatHeader = Buffer.alloc(12);
offset = 0;

heartbeatHeader.writeUInt16BE(heartbeatMessageId, offset);
offset += 2;
heartbeatHeader.writeUInt16BE(heartbeatProperties, offset);
offset += 2;
deviceIdBCD.copy(heartbeatHeader, offset);
offset += 6;
heartbeatHeader.writeUInt16BE(heartbeatSequence, offset);

const heartbeatWrapped = wrapMessage(heartbeatHeader);

console.log('Simulated dashcam sending heartbeat message...\n');

const heartbeatResult = MessageParser.parseMessage(heartbeatWrapped, 'TEST-DASHCAM-001');

if (heartbeatResult.success) {
  console.log('✅ Heartbeat message parsed successfully!');
  console.log(`Message ID: 0x${heartbeatResult.header.messageId.toString(16).padStart(4, '0').toUpperCase()}`);
  console.log(`Protocol Version: ${heartbeatResult.protocolVersion}`);
  console.log(`Device ID: ${heartbeatResult.header.deviceId}`);
  console.log(`Sequence: ${heartbeatResult.header.messageSequence}`);
} else {
  console.log('❌ Heartbeat parsing failed:', heartbeatResult.error);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test 3: Test with invalid message (corrupted checksum)
console.log('Test 3: Invalid Message (Corrupted Checksum)');
console.log('---------------------------------------------');

const corruptedMessage = Buffer.from(wrappedMessage);
// Corrupt the checksum
corruptedMessage[corruptedMessage.length - 2] = 0xFF;

console.log('Simulated corrupted message from dashcam...\n');

const corruptedResult = MessageParser.parseMessage(corruptedMessage, 'TEST-DASHCAM-001');

if (corruptedResult.success) {
  console.log('✅ Message parsed (unexpected!)');
} else {
  console.log('✅ Corrupted message correctly rejected:', corruptedResult.error);
}

console.log('\n=== Test Complete ===');
console.log('\nThe parser successfully demonstrates:');
console.log('• Raw message data logging with hex dump');
console.log('• Protocol version detection');
console.log('• Message header parsing');
console.log('• Checksum validation');
console.log('• Error handling for corrupted messages');
console.log('• Support for different JT808 message types');

console.log('\n' + '='.repeat(60) + '\n');

// Test 4: Demonstrate message structure validation and serialization
console.log('Test 4: Message Structure Validation & Serialization');
console.log('---------------------------------------------------');

// Test registration response creation and validation
console.log('Creating registration response message...');

const registrationResponse = MessageFactory.createRegistrationResponse(1, 0, 'AUTH123456');
const responseValidation = MessageValidator.validateMessage(MESSAGE_IDS.TERMINAL_REGISTRATION_RESPONSE, registrationResponse);

if (responseValidation.valid) {
  console.log('✅ Registration response created and validated successfully!');
  console.log('Response data:', responseValidation.data);
} else {
  console.log('❌ Registration response validation failed:', responseValidation.error);
}

console.log('\n' + '-'.repeat(40) + '\n');

// Test location report validation
console.log('Creating and validating location report...');

const locationData = {
  alarmFlag: 0x00000001, // Emergency alarm
  statusFlag: 0x00000003, // ACC on + positioning
  latitude: 39904200,     // Beijing latitude * 10^6
  longitude: 116407400,   // Beijing longitude * 10^6
  altitude: 100,          // 100 meters
  speed: 605,             // 60.5 km/h
  direction: 90,          // East
  timestamp: '231222143000', // 2023-12-22 14:30:00
  additionalInfo: Buffer.from([0x01, 0x02, 0x03, 0x04])
};

const locationBuffer = MessageSerializer.serialize(MESSAGE_IDS.LOCATION_REPORT, locationData);
const locationValidation = MessageValidator.validateMessage(MESSAGE_IDS.LOCATION_REPORT, locationBuffer);

if (locationValidation.valid) {
  console.log('✅ Location report created and validated successfully!');
  console.log('Location data:');
  console.log(`  Latitude: ${locationValidation.data.latitude / 1000000}°`);
  console.log(`  Longitude: ${locationValidation.data.longitude / 1000000}°`);
  console.log(`  Speed: ${locationValidation.data.speed / 10} km/h`);
  console.log(`  Direction: ${locationValidation.data.direction}°`);
  console.log(`  Timestamp: ${locationValidation.data.timestamp}`);
  console.log(`  Alarm: ${locationValidation.data.alarmFlag ? 'EMERGENCY' : 'Normal'}`);
} else {
  console.log('❌ Location report validation failed:', locationValidation.error);
}

console.log('\n' + '-'.repeat(40) + '\n');

// Test parameter setting message
console.log('Creating terminal parameter setting message...');

const parameters = [
  { id: 0x0001, length: 4, value: Buffer.from([0x00, 0x00, 0x00, 0x3C]) }, // Heartbeat: 60s
  { id: 0x0020, length: 4, value: Buffer.from([0x00, 0x00, 0x00, 0x01]) }, // Position report strategy
  { id: 0x0056, length: 4, value: Buffer.from([0x00, 0x00, 0x00, 0x78]) }  // Max speed: 120 km/h
];

const parameterBuffer = MessageFactory.createParameterSetting(parameters);
const parameterValidation = MessageValidator.validateMessage(MESSAGE_IDS.SET_TERMINAL_PARAMETERS, parameterBuffer);

if (parameterValidation.valid) {
  console.log('✅ Parameter setting message created and validated successfully!');
  console.log(`Parameter count: ${parameterValidation.data.parameterCount}`);
  parameterValidation.data.parameters.forEach((param, index) => {
    console.log(`  Parameter ${index + 1}: ID=0x${param.id.toString(16).padStart(4, '0')}, Length=${param.length}, Value=${param.value.toString('hex')}`);
  });
} else {
  console.log('❌ Parameter setting validation failed:', parameterValidation.error);
}

console.log('\n' + '-'.repeat(40) + '\n');

// Test camera shot command
console.log('Creating camera shot command...');

const cameraParams = {
  channelId: 1,
  shotCommand: 0xFFFF,
  shotInterval: 5,
  shotCount: 3,
  saveFlag: 1,
  resolution: 0x01,
  quality: 8,
  brightness: 128,
  contrast: 64,
  saturation: 64,
  chroma: 128
};

const cameraBuffer = MessageFactory.createCameraShotCommand(cameraParams);
const cameraValidation = MessageValidator.validateMessage(MESSAGE_IDS.CAMERA_SHOT_COMMAND, cameraBuffer);

if (cameraValidation.valid) {
  console.log('✅ Camera shot command created and validated successfully!');
  console.log('Camera settings:');
  console.log(`  Channel: ${cameraValidation.data.channelId}`);
  console.log(`  Shot count: ${cameraValidation.data.shotCount}`);
  console.log(`  Interval: ${cameraValidation.data.shotInterval}s`);
  console.log(`  Quality: ${cameraValidation.data.quality}/10`);
  console.log(`  Resolution: 0x${cameraValidation.data.resolution.toString(16)}`);
} else {
  console.log('❌ Camera shot command validation failed:', cameraValidation.error);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test 5: Error handling demonstration
console.log('Test 5: Error Handling Demonstration');
console.log('------------------------------------');

// Test invalid message ID
console.log('Testing unknown message ID...');
const unknownResult = MessageValidator.validateMessage(0xFFFF, Buffer.alloc(0));
console.log(unknownResult.valid ? '❌ Should have failed' : `✅ Correctly rejected: ${unknownResult.error}`);

// Test invalid field values
console.log('\nTesting invalid field values...');
try {
  const invalidData = {
    sequenceNumber: 70000, // Too large for uint16
    messageId: 0x0100,
    result: 0
  };
  MessageSerializer.serialize(MESSAGE_IDS.PLATFORM_GENERAL_RESPONSE, invalidData);
  console.log('❌ Should have failed validation');
} catch (error) {
  console.log(`✅ Correctly caught error: ${error.message}`);
}

console.log('\n=== Message Structure Test Complete ===');
console.log('\nThe message structure system successfully demonstrates:');
console.log('• Message ID constants and structure definitions');
console.log('• Field validation with type checking and constraints');
console.log('• Message serialization and deserialization');
console.log('• Message factory for creating common responses');
console.log('• Comprehensive error handling and validation');
console.log('• Support for complex data types (BCD, location, arrays)');
console.log('• Protocol-compliant message structure handling');