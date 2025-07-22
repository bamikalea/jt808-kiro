/**
 * Unit tests for Message Validator and Serializer
 */

import { describe, it, expect } from 'vitest';
const { MessageValidator, MessageSerializer, MessageFactory } = require('../src/utils/message-validator');
const { MESSAGE_IDS } = require('../src/models/jt808-messages');

describe('MessageValidator', () => {
  describe('validateMessage', () => {
    it('should validate terminal registration message', () => {
      // Create a valid registration message body
      const bodyData = Buffer.concat([
        Buffer.from([0x00, 0x01]), // Province ID
        Buffer.from([0x00, 0x02]), // City ID
        Buffer.from('TESTM', 'ascii'), // Manufacturer ID (5 bytes)
        Buffer.from('MODEL123', 'ascii'), // Device Model (8 bytes)
        Buffer.from('SN12345', 'ascii'), // Device ID (7 bytes)
        Buffer.from([0x01]), // Plate color
        Buffer.from('京A12345', 'utf8') // Plate number
      ]);

      const result = MessageValidator.validateMessage(MESSAGE_IDS.TERMINAL_REGISTRATION, bodyData);
      
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.provinceId).toBe(1);
      expect(result.data.cityId).toBe(2);
      expect(result.data.manufacturerId).toBe('TESTM');
      expect(result.data.plateColor).toBe(1);
    });

    it('should validate heartbeat message (empty body)', () => {
      const emptyBody = Buffer.alloc(0);
      
      const result = MessageValidator.validateMessage(MESSAGE_IDS.TERMINAL_HEARTBEAT, emptyBody);
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject unknown message ID', () => {
      const result = MessageValidator.validateMessage(0xFFFF, Buffer.alloc(0));
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown message ID');
    });

    it('should validate location report message', () => {
      // Create location report message body
      const bodyData = Buffer.alloc(28 + 4); // 28 bytes location + 4 bytes additional
      let offset = 0;

      // Alarm flag
      bodyData.writeUInt32BE(0x00000001, offset); // Emergency alarm
      offset += 4;

      // Status flag
      bodyData.writeUInt32BE(0x00000003, offset); // ACC on + positioning
      offset += 4;

      // Latitude (39.9042 * 10^6)
      bodyData.writeUInt32BE(39904200, offset);
      offset += 4;

      // Longitude (116.4074 * 10^6)
      bodyData.writeUInt32BE(116407400, offset);
      offset += 4;

      // Altitude (100m)
      bodyData.writeUInt16BE(100, offset);
      offset += 2;

      // Speed (60.5 km/h = 605 * 0.1)
      bodyData.writeUInt16BE(605, offset);
      offset += 2;

      // Direction (90 degrees)
      bodyData.writeUInt16BE(90, offset);
      offset += 2;

      // Timestamp (BCD: 231222143000 = 2023-12-22 14:30:00)
      const timestampBCD = Buffer.from([0x23, 0x12, 0x22, 0x14, 0x30, 0x00]);
      timestampBCD.copy(bodyData, offset);
      offset += 6;

      // Additional info (4 bytes)
      bodyData.writeUInt32BE(0x12345678, offset);

      const result = MessageValidator.validateMessage(MESSAGE_IDS.LOCATION_REPORT, bodyData);
      
      expect(result.valid).toBe(true);
      expect(result.data.alarmFlag).toBe(1);
      expect(result.data.statusFlag).toBe(3);
      expect(result.data.latitude).toBe(39904200);
      expect(result.data.longitude).toBe(116407400);
      expect(result.data.altitude).toBe(100);
      expect(result.data.speed).toBe(605);
      expect(result.data.direction).toBe(90);
      expect(result.data.timestamp).toBe('231222143000');
    });
  });

  describe('validateFields', () => {
    it('should validate uint8 field', () => {
      const fields = [{ name: 'test', type: 'uint8' }];
      const data = { test: 255 };
      
      const result = MessageValidator.validateFields(fields, data);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid uint8 value', () => {
      const fields = [{ name: 'test', type: 'uint8' }];
      const data = { test: 256 };
      
      const result = MessageValidator.validateFields(fields, data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Must be integer between 0-255');
    });

    it('should validate string field with length constraint', () => {
      const fields = [{ name: 'test', type: 'string', length: 5 }];
      const data = { test: 'HELLO' };
      
      const result = MessageValidator.validateFields(fields, data);
      expect(result.valid).toBe(true);
    });

    it('should reject string that is too long', () => {
      const fields = [{ name: 'test', type: 'string', length: 5 }];
      const data = { test: 'TOOLONG' };
      
      const result = MessageValidator.validateFields(fields, data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('String too long');
    });

    it('should validate BCD field', () => {
      const fields = [{ name: 'test', type: 'bcd', length: 3 }];
      const data = { test: '123456' };
      
      const result = MessageValidator.validateFields(fields, data);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid BCD format', () => {
      const fields = [{ name: 'test', type: 'bcd', length: 3 }];
      const data = { test: 'ABC123' };
      
      const result = MessageValidator.validateFields(fields, data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Must be numeric string for BCD');
    });

    it('should validate optional fields', () => {
      const fields = [{ name: 'test', type: 'uint8', optional: true }];
      const data = {};
      
      const result = MessageValidator.validateFields(fields, data);
      expect(result.valid).toBe(true);
    });

    it('should reject missing required fields', () => {
      const fields = [{ name: 'test', type: 'uint8' }];
      const data = {};
      
      const result = MessageValidator.validateFields(fields, data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field');
    });
  });
});

describe('MessageSerializer', () => {
  describe('serialize and deserialize', () => {
    it('should serialize and deserialize registration response', () => {
      const originalData = {
        sequenceNumber: 1,
        result: 0,
        authCode: 'AUTH123'
      };

      const serialized = MessageSerializer.serialize(MESSAGE_IDS.TERMINAL_REGISTRATION_RESPONSE, originalData);
      const deserialized = MessageSerializer.deserialize(MESSAGE_IDS.TERMINAL_REGISTRATION_RESPONSE, serialized);

      expect(deserialized.sequenceNumber).toBe(originalData.sequenceNumber);
      expect(deserialized.result).toBe(originalData.result);
      expect(deserialized.authCode).toBe(originalData.authCode);
    });

    it('should serialize and deserialize general response', () => {
      const originalData = {
        sequenceNumber: 5,
        messageId: 0x0100,
        result: 0
      };

      const serialized = MessageSerializer.serialize(MESSAGE_IDS.PLATFORM_GENERAL_RESPONSE, originalData);
      const deserialized = MessageSerializer.deserialize(MESSAGE_IDS.PLATFORM_GENERAL_RESPONSE, serialized);

      expect(deserialized.sequenceNumber).toBe(originalData.sequenceNumber);
      expect(deserialized.messageId).toBe(originalData.messageId);
      expect(deserialized.result).toBe(originalData.result);
    });

    it('should handle empty message body (heartbeat)', () => {
      const originalData = {};

      const serialized = MessageSerializer.serialize(MESSAGE_IDS.TERMINAL_HEARTBEAT, originalData);
      const deserialized = MessageSerializer.deserialize(MESSAGE_IDS.TERMINAL_HEARTBEAT, serialized);

      expect(serialized.length).toBe(0);
      expect(deserialized).toEqual({});
    });

    it('should serialize and deserialize location data', () => {
      const locationData = {
        alarmFlag: 0x00000001,
        statusFlag: 0x00000003,
        latitude: 39904200,
        longitude: 116407400,
        altitude: 100,
        speed: 605,
        direction: 90,
        timestamp: '231222143000',
        additionalInfo: Buffer.from([0x01, 0x02, 0x03, 0x04])
      };

      const serialized = MessageSerializer.serialize(MESSAGE_IDS.LOCATION_REPORT, locationData);
      const deserialized = MessageSerializer.deserialize(MESSAGE_IDS.LOCATION_REPORT, serialized);

      expect(deserialized.alarmFlag).toBe(locationData.alarmFlag);
      expect(deserialized.statusFlag).toBe(locationData.statusFlag);
      expect(deserialized.latitude).toBe(locationData.latitude);
      expect(deserialized.longitude).toBe(locationData.longitude);
      expect(deserialized.altitude).toBe(locationData.altitude);
      expect(deserialized.speed).toBe(locationData.speed);
      expect(deserialized.direction).toBe(locationData.direction);
      expect(deserialized.timestamp).toBe(locationData.timestamp);
      expect(deserialized.additionalInfo).toEqual(locationData.additionalInfo);
    });
  });

  describe('field serialization', () => {
    it('should serialize uint8 field', () => {
      const field = { name: 'test', type: 'uint8' };
      const buffer = MessageSerializer.serializeField(field, 255);
      
      expect(buffer.length).toBe(1);
      expect(buffer[0]).toBe(255);
    });

    it('should serialize uint16 field', () => {
      const field = { name: 'test', type: 'uint16' };
      const buffer = MessageSerializer.serializeField(field, 65535);
      
      expect(buffer.length).toBe(2);
      expect(buffer.readUInt16BE(0)).toBe(65535);
    });

    it('should serialize uint32 field', () => {
      const field = { name: 'test', type: 'uint32' };
      const buffer = MessageSerializer.serializeField(field, 4294967295);
      
      expect(buffer.length).toBe(4);
      expect(buffer.readUInt32BE(0)).toBe(4294967295);
    });

    it('should serialize fixed-length string field', () => {
      const field = { name: 'test', type: 'string', length: 8 };
      const buffer = MessageSerializer.serializeField(field, 'HELLO');
      
      expect(buffer.length).toBe(8);
      expect(buffer.toString('ascii', 0, 5)).toBe('HELLO');
      expect(buffer[5]).toBe(0); // Null padding
    });

    it('should serialize variable-length string field', () => {
      const field = { name: 'test', type: 'string', variable: true };
      const buffer = MessageSerializer.serializeField(field, 'VARIABLE');
      
      expect(buffer.length).toBe(8);
      expect(buffer.toString('ascii')).toBe('VARIABLE');
    });

    it('should serialize BCD field', () => {
      const field = { name: 'test', type: 'bcd', length: 3 };
      const buffer = MessageSerializer.serializeField(field, '123456');
      
      expect(buffer.length).toBe(3);
      expect(buffer[0]).toBe(0x12);
      expect(buffer[1]).toBe(0x34);
      expect(buffer[2]).toBe(0x56);
    });

    it('should serialize bytes field', () => {
      const field = { name: 'test', type: 'bytes' };
      const testData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const buffer = MessageSerializer.serializeField(field, testData);
      
      expect(buffer).toEqual(testData);
    });
  });

  describe('stringToBCD', () => {
    it('should convert string to BCD correctly', () => {
      const result = MessageSerializer.stringToBCD('123456', 3);
      expect(result).toEqual(Buffer.from([0x12, 0x34, 0x56]));
    });

    it('should pad string with leading zeros', () => {
      const result = MessageSerializer.stringToBCD('1234', 3);
      expect(result).toEqual(Buffer.from([0x00, 0x12, 0x34]));
    });

    it('should handle empty string', () => {
      const result = MessageSerializer.stringToBCD('', 2);
      expect(result).toEqual(Buffer.from([0x00, 0x00]));
    });
  });

  describe('error handling', () => {
    it('should throw error for unknown message ID in serialize', () => {
      expect(() => {
        MessageSerializer.serialize(0xFFFF, {});
      }).toThrow('Unknown message ID');
    });

    it('should throw error for unknown message ID in deserialize', () => {
      expect(() => {
        MessageSerializer.deserialize(0xFFFF, Buffer.alloc(0));
      }).toThrow('Unknown message ID');
    });

    it('should throw error for missing required field in serialize', () => {
      expect(() => {
        MessageSerializer.serialize(MESSAGE_IDS.PLATFORM_GENERAL_RESPONSE, {
          sequenceNumber: 1
          // Missing messageId and result
        });
      }).toThrow('Missing required field');
    });

    it('should throw error for unknown field type', () => {
      const field = { name: 'test', type: 'unknown' };
      
      expect(() => {
        MessageSerializer.serializeField(field, 'test');
      }).toThrow('Unknown field type');
    });
  });
});

describe('MessageFactory', () => {
  describe('createRegistrationResponse', () => {
    it('should create successful registration response', () => {
      const buffer = MessageFactory.createRegistrationResponse(1, 0, 'AUTH123');
      const deserialized = MessageSerializer.deserialize(MESSAGE_IDS.TERMINAL_REGISTRATION_RESPONSE, buffer);
      
      expect(deserialized.sequenceNumber).toBe(1);
      expect(deserialized.result).toBe(0);
      expect(deserialized.authCode).toBe('AUTH123');
    });

    it('should create failed registration response', () => {
      const buffer = MessageFactory.createRegistrationResponse(1, 1);
      const deserialized = MessageSerializer.deserialize(MESSAGE_IDS.TERMINAL_REGISTRATION_RESPONSE, buffer);
      
      expect(deserialized.sequenceNumber).toBe(1);
      expect(deserialized.result).toBe(1);
      expect(deserialized.authCode).toBe('');
    });
  });

  describe('createGeneralResponse', () => {
    it('should create general response message', () => {
      const buffer = MessageFactory.createGeneralResponse(5, 0x0100, 0);
      const deserialized = MessageSerializer.deserialize(MESSAGE_IDS.PLATFORM_GENERAL_RESPONSE, buffer);
      
      expect(deserialized.sequenceNumber).toBe(5);
      expect(deserialized.messageId).toBe(0x0100);
      expect(deserialized.result).toBe(0);
    });
  });

  describe('createParameterSetting', () => {
    it('should create parameter setting message', () => {
      const parameters = [
        { id: 0x0001, length: 4, value: Buffer.from([0x00, 0x00, 0x00, 0x3C]) }, // Heartbeat interval: 60s
        { id: 0x0020, length: 4, value: Buffer.from([0x00, 0x00, 0x00, 0x01]) }  // Position report strategy
      ];

      const buffer = MessageFactory.createParameterSetting(parameters);
      const deserialized = MessageSerializer.deserialize(MESSAGE_IDS.SET_TERMINAL_PARAMETERS, buffer);
      
      expect(deserialized.parameterCount).toBe(2);
      expect(deserialized.parameters).toHaveLength(2);
      expect(deserialized.parameters[0].id).toBe(0x0001);
      expect(deserialized.parameters[0].length).toBe(4);
      expect(deserialized.parameters[1].id).toBe(0x0020);
      expect(deserialized.parameters[1].length).toBe(4);
    });
  });

  describe('createCameraShotCommand', () => {
    it('should create camera shot command message', () => {
      const shotParams = {
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

      const buffer = MessageFactory.createCameraShotCommand(shotParams);
      const deserialized = MessageSerializer.deserialize(MESSAGE_IDS.CAMERA_SHOT_COMMAND, buffer);
      
      expect(deserialized.channelId).toBe(shotParams.channelId);
      expect(deserialized.shotCommand).toBe(shotParams.shotCommand);
      expect(deserialized.shotInterval).toBe(shotParams.shotInterval);
      expect(deserialized.shotCount).toBe(shotParams.shotCount);
      expect(deserialized.saveFlag).toBe(shotParams.saveFlag);
      expect(deserialized.resolution).toBe(shotParams.resolution);
      expect(deserialized.quality).toBe(shotParams.quality);
      expect(deserialized.brightness).toBe(shotParams.brightness);
      expect(deserialized.contrast).toBe(shotParams.contrast);
      expect(deserialized.saturation).toBe(shotParams.saturation);
      expect(deserialized.chroma).toBe(shotParams.chroma);
    });
  });
});