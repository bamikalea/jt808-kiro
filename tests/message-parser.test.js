/**
 * Unit tests for MessageParser
 */

import { describe, it, expect, vi } from 'vitest';
const { MessageParser, MessageHeader, RawMessageLogger, PROTOCOL_VERSIONS } = require('../src/utils/message-parser');
const { wrapMessage } = require('../src/utils/checksum');

// Mock console.log for testing
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('MessageParser', () => {
  describe('Protocol version detection', () => {
    it('should detect JT808-2019 from reserved bits', () => {
      const version = MessageParser.detectProtocolVersion(0x0100, 0x01, 20);
      expect(version).toBe(PROTOCOL_VERSIONS.JT808_2019);
    });

    it('should detect JT808-2019 from specific message IDs', () => {
      const version = MessageParser.detectProtocolVersion(0x0102, 0x00, 20);
      expect(version).toBe(PROTOCOL_VERSIONS.JT808_2019);
    });

    it('should default to JT808-2013 for standard messages', () => {
      const version = MessageParser.detectProtocolVersion(0x0100, 0x00, 20);
      expect(version).toBe(PROTOCOL_VERSIONS.JT808_2013);
    });
  });

  describe('Header parsing', () => {
    it('should parse basic message header correctly', () => {
      // Create a test message header
      const messageId = 0x0100; // Registration
      const properties = 0x0020; // Length = 32, no encryption, no fragmentation
      const deviceId = '123456789012'; // 12-digit device ID
      const sequence = 1;

      const headerBuffer = Buffer.alloc(12);
      let offset = 0;

      // Message ID
      headerBuffer.writeUInt16BE(messageId, offset);
      offset += 2;

      // Properties
      headerBuffer.writeUInt16BE(properties, offset);
      offset += 2;

      // Device ID (BCD)
      const deviceIdBCD = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0x12]);
      deviceIdBCD.copy(headerBuffer, offset);
      offset += 6;

      // Sequence
      headerBuffer.writeUInt16BE(sequence, offset);

      const header = MessageParser.parseHeader(headerBuffer);

      expect(header.messageId).toBe(messageId);
      expect(header.messageLength).toBe(32);
      expect(header.encryptionType).toBe(0);
      expect(header.deviceId).toBe('123456789012');
      expect(header.messageSequence).toBe(sequence);
      expect(header.protocolVersion).toBe(PROTOCOL_VERSIONS.JT808_2013);
    });

    it('should parse fragmented message header', () => {
      const messageId = 0x0200;
      const properties = 0x2020; // Length = 32, fragmented (bit 13 set)
      const deviceId = '123456789012';
      const sequence = 1;
      const totalPackages = 3;
      const currentPackage = 1;

      const headerBuffer = Buffer.alloc(16); // 12 + 4 for package info
      let offset = 0;

      // Message ID
      headerBuffer.writeUInt16BE(messageId, offset);
      offset += 2;

      // Properties (with fragmentation bit set)
      headerBuffer.writeUInt16BE(properties, offset);
      offset += 2;

      // Device ID (BCD)
      const deviceIdBCD = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0x12]);
      deviceIdBCD.copy(headerBuffer, offset);
      offset += 6;

      // Sequence
      headerBuffer.writeUInt16BE(sequence, offset);
      offset += 2;

      // Package info
      headerBuffer.writeUInt16BE(totalPackages, offset);
      offset += 2;
      headerBuffer.writeUInt16BE(currentPackage, offset);

      const header = MessageParser.parseHeader(headerBuffer);

      expect(header.messageId).toBe(messageId);
      expect(header.messagePackage).toBeDefined();
      expect(header.messagePackage.total).toBe(totalPackages);
      expect(header.messagePackage.current).toBe(currentPackage);
    });
  });

  describe('Message parsing', () => {
    it('should parse complete valid message', () => {
      // Create a simple registration message
      const messageId = 0x0100;
      const properties = 0x0004; // Length = 4
      const deviceId = '123456789012';
      const sequence = 1;
      const body = Buffer.from([0x01, 0x02, 0x03, 0x04]);

      // Create header
      const headerBuffer = Buffer.alloc(12);
      let offset = 0;

      headerBuffer.writeUInt16BE(messageId, offset);
      offset += 2;
      headerBuffer.writeUInt16BE(properties, offset);
      offset += 2;

      const deviceIdBCD = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0x12]);
      deviceIdBCD.copy(headerBuffer, offset);
      offset += 6;

      headerBuffer.writeUInt16BE(sequence, offset);

      // Combine header and body
      const messageData = Buffer.concat([headerBuffer, body]);
      const wrappedMessage = wrapMessage(messageData);

      const result = MessageParser.parseMessage(wrappedMessage, 'test-device');

      expect(result.success).toBe(true);
      expect(result.header.messageId).toBe(messageId);
      expect(result.header.deviceId).toBe('123456789012');
      expect(result.body).toEqual(body);
      expect(result.protocolVersion).toBe(PROTOCOL_VERSIONS.JT808_2013);
    });

    it('should handle invalid checksum', () => {
      const messageData = Buffer.from([0x01, 0x00, 0x00, 0x04, 0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x00, 0x01]);
      const wrappedMessage = wrapMessage(messageData);
      
      // Corrupt checksum
      wrappedMessage[wrappedMessage.length - 2] = 0xFF;

      const result = MessageParser.parseMessage(wrappedMessage, 'test-device');

      expect(result.success).toBe(false);
      expect(result.error).toContain('checksum');
    });

    it('should handle parsing errors gracefully', () => {
      const invalidMessage = Buffer.from([0x7E, 0x01, 0x7E]); // Too short

      const result = MessageParser.parseMessage(invalidMessage, 'test-device');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Response message creation', () => {
    it('should create response message correctly', () => {
      const messageId = 0x8100;
      const deviceId = '123456789012';
      const bodyData = Buffer.from([0x00, 0x01]); // Success response
      const sequence = 1;

      const responseMessage = MessageParser.createResponseMessage(messageId, deviceId, bodyData, sequence);

      expect(responseMessage.length).toBe(14); // 12 header + 2 body
      
      // Verify message ID
      expect(responseMessage.readUInt16BE(0)).toBe(messageId);
      
      // Verify body length in properties
      expect(responseMessage.readUInt16BE(2) & 0x03FF).toBe(bodyData.length);
      
      // Verify sequence
      expect(responseMessage.readUInt16BE(10)).toBe(sequence);
    });

    it('should create response message with empty body', () => {
      const messageId = 0x8001;
      const deviceId = '123456789012';
      const sequence = 1;

      const responseMessage = MessageParser.createResponseMessage(messageId, deviceId, Buffer.alloc(0), sequence);

      expect(responseMessage.length).toBe(12); // Just header
      expect(responseMessage.readUInt16BE(2) & 0x03FF).toBe(0); // Body length = 0
    });
  });

  describe('BCD conversion', () => {
    it('should convert string to BCD correctly', () => {
      const result = MessageParser.stringToBCD('123456', 3);
      expect(result).toEqual(Buffer.from([0x12, 0x34, 0x56]));
    });

    it('should pad string with leading zeros', () => {
      const result = MessageParser.stringToBCD('1234', 3);
      expect(result).toEqual(Buffer.from([0x00, 0x12, 0x34]));
    });

    it('should handle empty string', () => {
      const result = MessageParser.stringToBCD('', 2);
      expect(result).toEqual(Buffer.from([0x00, 0x00]));
    });
  });

  describe('Header length calculation', () => {
    it('should calculate basic header length', () => {
      const header = new MessageHeader();
      const length = MessageParser.getHeaderLength(header);
      expect(length).toBe(12);
    });

    it('should calculate fragmented header length', () => {
      const header = new MessageHeader();
      header.messagePackage = { total: 3, current: 1 };
      const length = MessageParser.getHeaderLength(header);
      expect(length).toBe(16);
    });
  });

  describe('Raw message logging', () => {
    it('should log raw message data', () => {
      const buffer = Buffer.from([0x7E, 0x01, 0x00, 0x7E]);
      
      RawMessageLogger.logRawMessage(buffer, 'test-device', 'received');
      
      expect(mockConsoleLog).toHaveBeenCalled();
      // Verify that hex data is logged
      const logCalls = mockConsoleLog.mock.calls;
      const hexLogCall = logCalls.find(call => call[0].includes('Hex Data:'));
      expect(hexLogCall).toBeDefined();
    });

    it('should log parsed header data', () => {
      const header = new MessageHeader();
      header.messageId = 0x0100;
      header.protocolVersion = PROTOCOL_VERSIONS.JT808_2013;
      header.messageLength = 32;
      header.messageSequence = 1;
      header.deviceId = '123456789012';
      
      RawMessageLogger.logParsedHeader(header, 'test-device');
      
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});