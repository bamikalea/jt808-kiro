/**
 * Checksum calculation and validation utilities for JT808 protocol
 */

/**
 * Calculate XOR checksum for JT808 messages
 * @param {Buffer} buffer - Buffer to calculate checksum for
 * @param {number} start - Start position (default: 0)
 * @param {number} end - End position (default: buffer.length)
 * @returns {number} XOR checksum value
 */
function calculateChecksum(buffer, start = 0, end = buffer.length) {
  let checksum = 0;
  for (let i = start; i < end; i++) {
    checksum ^= buffer[i];
  }
  return checksum;
}

/**
 * Validate JT808 message checksum
 * @param {Buffer} messageBuffer - Complete message buffer including checksum
 * @returns {boolean} True if checksum is valid
 */
function validateMessageChecksum(messageBuffer) {
  if (messageBuffer.length < 3) {
    return false; // Message too short to have valid checksum
  }

  // JT808 message format: [0x7E] [message data] [checksum] [0x7E]
  // Find the actual message boundaries
  const startFlag = messageBuffer.indexOf(0x7E);
  const endFlag = messageBuffer.lastIndexOf(0x7E);
  
  if (startFlag === -1 || endFlag === -1 || startFlag === endFlag) {
    return false; // Invalid message format
  }

  // Extract message data (excluding start flag, checksum, and end flag)
  const messageData = messageBuffer.slice(startFlag + 1, endFlag - 1);
  const receivedChecksum = messageBuffer[endFlag - 1];
  
  // Calculate expected checksum
  const calculatedChecksum = calculateChecksum(messageData);
  
  return calculatedChecksum === receivedChecksum;
}

/**
 * Add checksum to message data and wrap with flags
 * @param {Buffer} messageData - Raw message data without flags or checksum
 * @returns {Buffer} Complete message with flags and checksum
 */
function wrapMessage(messageData) {
  const checksum = calculateChecksum(messageData);
  const wrappedMessage = Buffer.alloc(messageData.length + 3);
  
  wrappedMessage[0] = 0x7E; // Start flag
  messageData.copy(wrappedMessage, 1);
  wrappedMessage[wrappedMessage.length - 2] = checksum;
  wrappedMessage[wrappedMessage.length - 1] = 0x7E; // End flag
  
  return wrappedMessage;
}

/**
 * Extract message data from wrapped message
 * @param {Buffer} wrappedMessage - Complete message with flags and checksum
 * @returns {Object} Object containing messageData and isValid
 */
function unwrapMessage(wrappedMessage) {
  const startFlag = wrappedMessage.indexOf(0x7E);
  const endFlag = wrappedMessage.lastIndexOf(0x7E);
  
  if (startFlag === -1 || endFlag === -1 || startFlag === endFlag) {
    return { messageData: null, isValid: false, error: 'Invalid message format' };
  }

  const messageData = wrappedMessage.slice(startFlag + 1, endFlag - 1);
  const isValid = validateMessageChecksum(wrappedMessage);
  
  return { messageData, isValid };
}

module.exports = {
  calculateChecksum,
  validateMessageChecksum,
  wrapMessage,
  unwrapMessage
};