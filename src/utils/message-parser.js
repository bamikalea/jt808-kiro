/**
 * JT808 Message parser with protocol version detection and raw data logging
 */

const BufferParser = require('./buffer-parser');
const { unwrapMessage } = require('./checksum');

/**
 * JT808 Protocol versions
 */
const PROTOCOL_VERSIONS = {
  JT808_2011: '2011',
  JT808_2013: '2013', 
  JT808_2019: '2019'
};

/**
 * JT808 Message header structure
 */
class MessageHeader {
  constructor() {
    this.messageId = 0;
    this.messageProperties = 0;
    this.protocolVersion = null;
    this.deviceId = '';
    this.messageSequence = 0;
    this.messagePackage = null; // For fragmented messages
    this.encryptionType = 0;
    this.messageLength = 0;
  }
}

/**
 * Raw message logger for debugging
 */
class RawMessageLogger {
  static logRawMessage(buffer, deviceId = 'unknown', direction = 'received') {
    const timestamp = new Date().toISOString();
    const hexData = buffer.toString('hex').toUpperCase();
    const hexFormatted = hexData.match(/.{1,2}/g).join(' ');
    
    console.log(`\n=== RAW MESSAGE LOG ===`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Device ID: ${deviceId}`);
    console.log(`Direction: ${direction}`);
    console.log(`Length: ${buffer.length} bytes`);
    console.log(`Hex Data: ${hexFormatted}`);
    console.log(`ASCII: ${buffer.toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);
    console.log(`========================\n`);
  }

  static logParsedHeader(header, deviceId = 'unknown') {
    console.log(`\n=== PARSED HEADER ===`);
    console.log(`Device ID: ${deviceId}`);
    console.log(`Message ID: 0x${header.messageId.toString(16).padStart(4, '0').toUpperCase()}`);
    console.log(`Protocol Version: ${header.protocolVersion || 'Unknown'}`);
    console.log(`Message Length: ${header.messageLength}`);
    console.log(`Sequence: ${header.messageSequence}`);
    console.log(`Device ID (from header): ${header.deviceId}`);
    if (header.messagePackage) {
      console.log(`Package Info: ${header.messagePackage.total} total, ${header.messagePackage.current} current`);
    }
    console.log(`====================\n`);
  }
}

/**
 * JT808 Message Parser
 */
class MessageParser {
  /**
   * Parse JT808 message and detect protocol version
   * @param {Buffer} rawBuffer - Raw message buffer
   * @param {string} deviceId - Device identifier for logging
   * @returns {Object} Parsed message object
   */
  static parseMessage(rawBuffer, deviceId = 'unknown') {
    // Log raw message data
    RawMessageLogger.logRawMessage(rawBuffer, deviceId, 'received');

    try {
      // Unwrap message (remove flags and validate checksum)
      const { messageData, isValid, error } = unwrapMessage(rawBuffer);
      
      if (!isValid) {
        return {
          success: false,
          error: error || 'Invalid checksum',
          rawData: rawBuffer
        };
      }

      // Parse message header
      const header = MessageParser.parseHeader(messageData);
      
      // Log parsed header
      RawMessageLogger.logParsedHeader(header, deviceId);

      // Extract message body
      const bodyLength = messageData.length - MessageParser.getHeaderLength(header);
      const messageBody = messageData.slice(MessageParser.getHeaderLength(header), MessageParser.getHeaderLength(header) + bodyLength);

      return {
        success: true,
        header,
        body: messageBody,
        rawData: rawBuffer,
        protocolVersion: header.protocolVersion
      };

    } catch (error) {
      console.error(`Message parsing error for device ${deviceId}:`, error.message);
      return {
        success: false,
        error: error.message,
        rawData: rawBuffer
      };
    }
  }

  /**
   * Parse JT808 message header
   * @param {Buffer} messageData - Message data without flags
   * @returns {MessageHeader} Parsed header
   */
  static parseHeader(messageData) {
    const parser = new BufferParser(messageData);
    const header = new MessageHeader();

    // Message ID (2 bytes)
    header.messageId = parser.readUInt16BE();

    // Message Properties (2 bytes)
    header.messageProperties = parser.readUInt16BE();
    
    // Extract properties
    const messageLength = header.messageProperties & 0x03FF; // Bits 0-9
    const encryptionType = (header.messageProperties >> 10) & 0x07; // Bits 10-12
    const isFragmented = (header.messageProperties >> 13) & 0x01; // Bit 13
    const reserved = (header.messageProperties >> 14) & 0x03; // Bits 14-15

    header.messageLength = messageLength;
    header.encryptionType = encryptionType;

    // Detect protocol version based on header structure and reserved bits
    header.protocolVersion = MessageParser.detectProtocolVersion(header.messageId, reserved, messageData.length);

    // Device ID - format depends on protocol version
    if (header.protocolVersion === PROTOCOL_VERSIONS.JT808_2019) {
      // JT808-2019: Device ID can be variable length, but typically 6 bytes BCD
      header.deviceId = parser.readBCD(6);
    } else {
      // JT808-2011/2013: Device ID is 6 bytes BCD
      header.deviceId = parser.readBCD(6);
    }

    // Message Sequence Number (2 bytes)
    header.messageSequence = parser.readUInt16BE();

    // Message Package Info (optional, 4 bytes if fragmented)
    if (isFragmented) {
      header.messagePackage = {
        total: parser.readUInt16BE(),
        current: parser.readUInt16BE()
      };
    }

    return header;
  }

  /**
   * Detect JT808 protocol version
   * @param {number} messageId - Message ID
   * @param {number} reserved - Reserved bits from message properties
   * @param {number} messageLength - Total message length
   * @returns {string} Protocol version
   */
  static detectProtocolVersion(messageId, reserved, messageLength) {
    // JT808-2019 detection
    if (reserved !== 0) {
      return PROTOCOL_VERSIONS.JT808_2019;
    }

    // Check for JT808-2019 specific message IDs
    const jt808_2019_messages = [0x0001, 0x8001, 0x0102, 0x8103, 0x8104, 0x8106, 0x8107];
    if (jt808_2019_messages.includes(messageId)) {
      return PROTOCOL_VERSIONS.JT808_2019;
    }

    // JT808-2013 vs 2011 detection (harder to distinguish)
    // For now, default to 2013 as it's more common
    return PROTOCOL_VERSIONS.JT808_2013;
  }

  /**
   * Get header length based on message structure
   * @param {MessageHeader} header - Parsed header
   * @returns {number} Header length in bytes
   */
  static getHeaderLength(header) {
    let length = 12; // Base header: messageId(2) + properties(2) + deviceId(6) + sequence(2)
    
    if (header.messagePackage) {
      length += 4; // Package info: total(2) + current(2)
    }

    return length;
  }

  /**
   * Create response message with proper header
   * @param {number} messageId - Response message ID
   * @param {string} deviceId - Target device ID
   * @param {Buffer} bodyData - Message body data
   * @param {number} sequenceNumber - Message sequence number
   * @returns {Buffer} Complete response message
   */
  static createResponseMessage(messageId, deviceId, bodyData = Buffer.alloc(0), sequenceNumber = 1) {
    const bodyLength = bodyData.length;
    const headerLength = 12; // Standard header without fragmentation
    
    // Create header
    const header = Buffer.alloc(headerLength);
    let offset = 0;

    // Message ID
    header.writeUInt16BE(messageId, offset);
    offset += 2;

    // Message Properties (length in bits 0-9, no encryption, no fragmentation)
    header.writeUInt16BE(bodyLength, offset);
    offset += 2;

    // Device ID (6 bytes BCD)
    const deviceIdBuffer = MessageParser.stringToBCD(deviceId, 6);
    deviceIdBuffer.copy(header, offset);
    offset += 6;

    // Sequence Number
    header.writeUInt16BE(sequenceNumber, offset);

    // Combine header and body
    const messageData = Buffer.concat([header, bodyData]);
    
    return messageData;
  }

  /**
   * Convert string to BCD format
   * @param {string} str - String to convert
   * @param {number} length - Target BCD length in bytes
   * @returns {Buffer} BCD encoded buffer
   */
  static stringToBCD(str, length) {
    const buffer = Buffer.alloc(length);
    const paddedStr = str.padStart(length * 2, '0');
    
    for (let i = 0; i < length; i++) {
      const high = parseInt(paddedStr[i * 2], 10);
      const low = parseInt(paddedStr[i * 2 + 1], 10);
      buffer[i] = (high << 4) | low;
    }
    
    return buffer;
  }
}

module.exports = {
  MessageParser,
  MessageHeader,
  RawMessageLogger,
  PROTOCOL_VERSIONS
};