/**
 * JT808 Message Validation and Serialization/Deserialization utilities
 */

const BufferParser = require('./buffer-parser');
const { MESSAGE_IDS, MESSAGE_STRUCTURES, ALARM_FLAGS, STATUS_FLAGS } = require('../models/jt808-messages');

/**
 * Message validation schemas
 */
class MessageValidator {
  /**
   * Validate message structure against schema
   * @param {number} messageId - Message ID
   * @param {Buffer} messageBody - Message body data
   * @returns {Object} Validation result
   */
  static validateMessage(messageId, messageBody) {
    const structure = MESSAGE_STRUCTURES[messageId];
    
    if (!structure) {
      return {
        valid: false,
        error: `Unknown message ID: 0x${messageId.toString(16).padStart(4, '0')}`
      };
    }

    try {
      const parsedData = MessageSerializer.deserialize(messageId, messageBody);
      const validationResult = MessageValidator.validateFields(structure.fields, parsedData);
      
      return {
        valid: validationResult.valid,
        error: validationResult.error,
        data: parsedData,
        structure: structure
      };
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Validate individual fields against schema
   * @param {Array} fieldSchema - Field schema definitions
   * @param {Object} data - Parsed data object
   * @returns {Object} Validation result
   */
  static validateFields(fieldSchema, data) {
    for (const field of fieldSchema) {
      const value = data[field.name];
      
      // Check required fields
      if (value === undefined || value === null) {
        if (!field.optional) {
          return {
            valid: false,
            error: `Missing required field: ${field.name}`
          };
        }
        continue;
      }

      // Validate field type
      const typeValidation = MessageValidator.validateFieldType(field, value);
      if (!typeValidation.valid) {
        return {
          valid: false,
          error: `Field ${field.name}: ${typeValidation.error}`
        };
      }

      // Validate field constraints
      const constraintValidation = MessageValidator.validateFieldConstraints(field, value);
      if (!constraintValidation.valid) {
        return {
          valid: false,
          error: `Field ${field.name}: ${constraintValidation.error}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate field type
   * @param {Object} field - Field schema
   * @param {*} value - Field value
   * @returns {Object} Validation result
   */
  static validateFieldType(field, value) {
    switch (field.type) {
      case 'uint8':
        if (!Number.isInteger(value) || value < 0 || value > 255) {
          return { valid: false, error: 'Must be integer between 0-255' };
        }
        break;
      
      case 'uint16':
        if (!Number.isInteger(value) || value < 0 || value > 65535) {
          return { valid: false, error: 'Must be integer between 0-65535' };
        }
        break;
      
      case 'uint32':
        if (!Number.isInteger(value) || value < 0 || value > 4294967295) {
          return { valid: false, error: 'Must be integer between 0-4294967295' };
        }
        break;
      
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Must be string' };
        }
        if (field.length && value.length > field.length) {
          return { valid: false, error: `String too long, max length: ${field.length}` };
        }
        break;
      
      case 'bcd':
        if (typeof value !== 'string' || !/^\d+$/.test(value)) {
          return { valid: false, error: 'Must be numeric string for BCD' };
        }
        if (field.length && value.length !== field.length * 2) {
          return { valid: false, error: `BCD string length must be ${field.length * 2} digits` };
        }
        break;
      
      case 'bytes':
        if (!Buffer.isBuffer(value)) {
          return { valid: false, error: 'Must be Buffer' };
        }
        break;
      
      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, error: 'Must be array' };
        }
        break;
      
      case 'location':
        if (typeof value !== 'object' || value === null) {
          return { valid: false, error: 'Must be location object' };
        }
        break;
      
      default:
        return { valid: false, error: `Unknown field type: ${field.type}` };
    }

    return { valid: true };
  }

  /**
   * Validate field constraints
   * @param {Object} field - Field schema
   * @param {*} value - Field value
   * @returns {Object} Validation result
   */
  static validateFieldConstraints(field, value) {
    // Check minimum value
    if (field.min !== undefined && value < field.min) {
      return { valid: false, error: `Value must be >= ${field.min}` };
    }

    // Check maximum value
    if (field.max !== undefined && value > field.max) {
      return { valid: false, error: `Value must be <= ${field.max}` };
    }

    // Check enum values
    if (field.enum && !field.enum.includes(value)) {
      return { valid: false, error: `Value must be one of: ${field.enum.join(', ')}` };
    }

    // Check string pattern
    if (field.pattern && typeof value === 'string' && !field.pattern.test(value)) {
      return { valid: false, error: `Value does not match required pattern` };
    }

    return { valid: true };
  }
}

/**
 * Message serialization and deserialization
 */
class MessageSerializer {
  /**
   * Deserialize message body based on message ID
   * @param {number} messageId - Message ID
   * @param {Buffer} messageBody - Message body buffer
   * @returns {Object} Deserialized data
   */
  static deserialize(messageId, messageBody) {
    const structure = MESSAGE_STRUCTURES[messageId];
    
    if (!structure) {
      throw new Error(`Unknown message ID: 0x${messageId.toString(16).padStart(4, '0')}`);
    }

    const parser = new BufferParser(messageBody);
    const data = {};

    for (const field of structure.fields) {
      try {
        data[field.name] = MessageSerializer.deserializeField(field, parser);
      } catch (error) {
        throw new Error(`Error deserializing field ${field.name}: ${error.message}`);
      }
    }

    return data;
  }

  /**
   * Deserialize individual field
   * @param {Object} field - Field schema
   * @param {BufferParser} parser - Buffer parser
   * @returns {*} Deserialized field value
   */
  static deserializeField(field, parser) {
    switch (field.type) {
      case 'uint8':
        return parser.readUInt8();
      
      case 'uint16':
        return parser.readUInt16BE();
      
      case 'uint32':
        return parser.readUInt32BE();
      
      case 'string':
        if (field.variable) {
          return parser.readASCII(parser.remaining());
        } else {
          return parser.readASCII(field.length);
        }
      
      case 'bcd':
        return parser.readBCD(field.length);
      
      case 'bytes':
        if (field.variable) {
          return parser.readBytes(parser.remaining());
        } else {
          return parser.readBytes(field.length);
        }
      
      case 'location':
        return MessageSerializer.deserializeLocation(parser);
      
      case 'array':
        return MessageSerializer.deserializeArray(field, parser);
      
      default:
        throw new Error(`Unknown field type: ${field.type}`);
    }
  }

  /**
   * Deserialize location data
   * @param {BufferParser} parser - Buffer parser
   * @returns {Object} Location data
   */
  static deserializeLocation(parser) {
    return {
      alarmFlag: parser.readUInt32BE(),
      statusFlag: parser.readUInt32BE(),
      latitude: parser.readUInt32BE(),
      longitude: parser.readUInt32BE(),
      altitude: parser.readUInt16BE(),
      speed: parser.readUInt16BE(),
      direction: parser.readUInt16BE(),
      timestamp: parser.readBCD(6)
    };
  }

  /**
   * Deserialize array field
   * @param {Object} field - Field schema
   * @param {BufferParser} parser - Buffer parser
   * @returns {Array} Array of deserialized items
   */
  static deserializeArray(field, parser) {
    const items = [];
    
    if (field.itemType === 'location') {
      // For location arrays, we need to know the count
      const itemCount = field.countField ? parser.readUInt16BE() : 1;
      
      for (let i = 0; i < itemCount; i++) {
        items.push(MessageSerializer.deserializeLocation(parser));
      }
    } else if (field.itemType === 'parameter') {
      // For parameter arrays, read until end of buffer
      while (parser.remaining() >= 5) { // Minimum parameter size
        const parameterId = parser.readUInt32BE();
        const parameterLength = parser.readUInt8();
        const parameterValue = parser.readBytes(parameterLength);
        
        items.push({
          id: parameterId,
          length: parameterLength,
          value: parameterValue
        });
      }
    }
    
    return items;
  }

  /**
   * Serialize data to message body
   * @param {number} messageId - Message ID
   * @param {Object} data - Data to serialize
   * @returns {Buffer} Serialized message body
   */
  static serialize(messageId, data) {
    const structure = MESSAGE_STRUCTURES[messageId];
    
    if (!structure) {
      throw new Error(`Unknown message ID: 0x${messageId.toString(16).padStart(4, '0')}`);
    }

    const buffers = [];

    for (const field of structure.fields) {
      const value = data[field.name];
      
      if (value !== undefined && value !== null) {
        const fieldBuffer = MessageSerializer.serializeField(field, value);
        buffers.push(fieldBuffer);
      } else if (!field.optional) {
        throw new Error(`Missing required field: ${field.name}`);
      }
    }

    return Buffer.concat(buffers);
  }

  /**
   * Serialize individual field
   * @param {Object} field - Field schema
   * @param {*} value - Field value
   * @returns {Buffer} Serialized field buffer
   */
  static serializeField(field, value) {
    switch (field.type) {
      case 'uint8':
        const uint8Buffer = Buffer.alloc(1);
        uint8Buffer.writeUInt8(value, 0);
        return uint8Buffer;
      
      case 'uint16':
        const uint16Buffer = Buffer.alloc(2);
        uint16Buffer.writeUInt16BE(value, 0);
        return uint16Buffer;
      
      case 'uint32':
        const uint32Buffer = Buffer.alloc(4);
        uint32Buffer.writeUInt32BE(value, 0);
        return uint32Buffer;
      
      case 'string':
        if (field.variable) {
          return Buffer.from(value, 'ascii');
        } else {
          const stringBuffer = Buffer.alloc(field.length);
          Buffer.from(value, 'ascii').copy(stringBuffer, 0, 0, Math.min(value.length, field.length));
          return stringBuffer;
        }
      
      case 'bcd':
        return MessageSerializer.stringToBCD(value, field.length);
      
      case 'bytes':
        return Buffer.isBuffer(value) ? value : Buffer.from(value);
      
      case 'location':
        return MessageSerializer.serializeLocation(value);
      
      case 'array':
        return MessageSerializer.serializeArray(field, value);
      
      default:
        throw new Error(`Unknown field type: ${field.type}`);
    }
  }

  /**
   * Serialize location data
   * @param {Object} location - Location data
   * @returns {Buffer} Serialized location buffer
   */
  static serializeLocation(location) {
    const buffer = Buffer.alloc(28); // 28 bytes for location data
    let offset = 0;

    buffer.writeUInt32BE(location.alarmFlag || 0, offset);
    offset += 4;
    buffer.writeUInt32BE(location.statusFlag || 0, offset);
    offset += 4;
    buffer.writeUInt32BE(location.latitude || 0, offset);
    offset += 4;
    buffer.writeUInt32BE(location.longitude || 0, offset);
    offset += 4;
    buffer.writeUInt16BE(location.altitude || 0, offset);
    offset += 2;
    buffer.writeUInt16BE(location.speed || 0, offset);
    offset += 2;
    buffer.writeUInt16BE(location.direction || 0, offset);
    offset += 2;
    
    const timestampBCD = MessageSerializer.stringToBCD(location.timestamp || '000000000000', 6);
    timestampBCD.copy(buffer, offset);

    return buffer;
  }

  /**
   * Serialize array field
   * @param {Object} field - Field schema
   * @param {Array} items - Array items
   * @returns {Buffer} Serialized array buffer
   */
  static serializeArray(field, items) {
    const buffers = [];

    if (field.itemType === 'location') {
      for (const item of items) {
        buffers.push(MessageSerializer.serializeLocation(item));
      }
    } else if (field.itemType === 'parameter') {
      for (const param of items) {
        const paramBuffer = Buffer.alloc(5 + param.value.length);
        let offset = 0;
        
        paramBuffer.writeUInt32BE(param.id, offset);
        offset += 4;
        paramBuffer.writeUInt8(param.length, offset);
        offset += 1;
        param.value.copy(paramBuffer, offset);
        
        buffers.push(paramBuffer);
      }
    }

    return Buffer.concat(buffers);
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

/**
 * Message factory for creating common messages
 */
class MessageFactory {
  /**
   * Create terminal registration response message
   * @param {number} sequenceNumber - Original message sequence
   * @param {number} result - Registration result
   * @param {string} authCode - Authentication code (optional)
   * @returns {Buffer} Message body buffer
   */
  static createRegistrationResponse(sequenceNumber, result, authCode = '') {
    const data = {
      sequenceNumber,
      result,
      authCode: result === 0 ? authCode : ''
    };

    return MessageSerializer.serialize(MESSAGE_IDS.TERMINAL_REGISTRATION_RESPONSE, data);
  }

  /**
   * Create general response message
   * @param {number} sequenceNumber - Original message sequence
   * @param {number} messageId - Original message ID
   * @param {number} result - Processing result
   * @returns {Buffer} Message body buffer
   */
  static createGeneralResponse(sequenceNumber, messageId, result) {
    const data = {
      sequenceNumber,
      messageId,
      result
    };

    return MessageSerializer.serialize(MESSAGE_IDS.PLATFORM_GENERAL_RESPONSE, data);
  }

  /**
   * Create terminal parameter setting message
   * @param {Array} parameters - Array of parameter objects
   * @returns {Buffer} Message body buffer
   */
  static createParameterSetting(parameters) {
    const data = {
      parameterCount: parameters.length,
      parameters
    };

    return MessageSerializer.serialize(MESSAGE_IDS.SET_TERMINAL_PARAMETERS, data);
  }

  /**
   * Create camera shot command message
   * @param {Object} shotParams - Camera shot parameters
   * @returns {Buffer} Message body buffer
   */
  static createCameraShotCommand(shotParams) {
    return MessageSerializer.serialize(MESSAGE_IDS.CAMERA_SHOT_COMMAND, shotParams);
  }
}

module.exports = {
  MessageValidator,
  MessageSerializer,
  MessageFactory
};