/**
 * Unit tests for checksum utilities
 */

import { describe, it, expect } from 'vitest';
const { calculateChecksum, validateMessageChecksum, wrapMessage, unwrapMessage } = require('../src/utils/checksum');

describe('Checksum utilities', () => {
  describe('calculateChecksum', () => {
    it('should calculate XOR checksum correctly', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const checksum = calculateChecksum(buffer);
      
      // XOR: 0x01 ^ 0x02 ^ 0x03 ^ 0x04 = 0x04
      expect(checksum).toBe(0x04);
    });

    it('should calculate checksum for empty buffer', () => {
      const buffer = Buffer.alloc(0);
      const checksum = calculateChecksum(buffer);
      
      expect(checksum).toBe(0);
    });

    it('should calculate checksum with start and end positions', () => {
      const buffer = Buffer.from([0xFF, 0x01, 0x02, 0x03, 0xFF]);
      const checksum = calculateChecksum(buffer, 1, 4);
      
      // XOR: 0x01 ^ 0x02 ^ 0x03 = 0x00
      expect(checksum).toBe(0x00);
    });

    it('should handle single byte buffer', () => {
      const buffer = Buffer.from([0xAB]);
      const checksum = calculateChecksum(buffer);
      
      expect(checksum).toBe(0xAB);
    });
  });

  describe('wrapMessage and unwrapMessage', () => {
    it('should wrap and unwrap message correctly', () => {
      const originalData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const wrappedMessage = wrapMessage(originalData);
      
      // Check wrapped message structure: [0x7E] [data] [checksum] [0x7E]
      expect(wrappedMessage[0]).toBe(0x7E); // Start flag
      expect(wrappedMessage[wrappedMessage.length - 1]).toBe(0x7E); // End flag
      expect(wrappedMessage.length).toBe(originalData.length + 3); // +3 for start flag, checksum, end flag
      
      // Unwrap and verify
      const { messageData, isValid } = unwrapMessage(wrappedMessage);
      expect(isValid).toBe(true);
      expect(messageData).toEqual(originalData);
    });

    it('should handle empty message data', () => {
      const originalData = Buffer.alloc(0);
      const wrappedMessage = wrapMessage(originalData);
      
      expect(wrappedMessage.length).toBe(3); // Just flags and checksum
      
      const { messageData, isValid } = unwrapMessage(wrappedMessage);
      expect(isValid).toBe(true);
      expect(messageData.length).toBe(0);
    });
  });

  describe('validateMessageChecksum', () => {
    it('should validate correct checksum', () => {
      const messageData = Buffer.from([0x01, 0x02, 0x03]);
      const wrappedMessage = wrapMessage(messageData);
      
      expect(validateMessageChecksum(wrappedMessage)).toBe(true);
    });

    it('should reject incorrect checksum', () => {
      const messageData = Buffer.from([0x01, 0x02, 0x03]);
      const wrappedMessage = wrapMessage(messageData);
      
      // Corrupt the checksum
      wrappedMessage[wrappedMessage.length - 2] = 0xFF;
      
      expect(validateMessageChecksum(wrappedMessage)).toBe(false);
    });

    it('should reject message without proper flags', () => {
      const invalidMessage = Buffer.from([0x01, 0x02, 0x03]);
      
      expect(validateMessageChecksum(invalidMessage)).toBe(false);
    });

    it('should reject message that is too short', () => {
      const shortMessage = Buffer.from([0x7E, 0x7E]);
      
      expect(validateMessageChecksum(shortMessage)).toBe(false);
    });

    it('should handle message with single flag', () => {
      const singleFlagMessage = Buffer.from([0x7E, 0x01, 0x02]);
      
      expect(validateMessageChecksum(singleFlagMessage)).toBe(false);
    });
  });

  describe('unwrapMessage error handling', () => {
    it('should return error for invalid message format', () => {
      const invalidMessage = Buffer.from([0x01, 0x02, 0x03]);
      
      const result = unwrapMessage(invalidMessage);
      expect(result.isValid).toBe(false);
      expect(result.messageData).toBe(null);
      expect(result.error).toBe('Invalid message format');
    });

    it('should return error for message with single flag', () => {
      const singleFlagMessage = Buffer.from([0x7E, 0x01, 0x02]);
      
      const result = unwrapMessage(singleFlagMessage);
      expect(result.isValid).toBe(false);
      expect(result.messageData).toBe(null);
      expect(result.error).toBe('Invalid message format');
    });
  });

  describe('Real JT808 message examples', () => {
    it('should handle typical JT808 registration message', () => {
      // Simulate a JT808 registration message structure
      const messageId = Buffer.from([0x01, 0x00]); // 0x0100
      const properties = Buffer.from([0x00, 0x20]); // Length = 32
      const deviceId = Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0x01]); // BCD device ID
      const sequence = Buffer.from([0x00, 0x01]); // Sequence 1
      const body = Buffer.from([0x00, 0x01, 0x02, 0x03]); // Sample body data
      
      const messageData = Buffer.concat([messageId, properties, deviceId, sequence, body]);
      const wrappedMessage = wrapMessage(messageData);
      
      expect(validateMessageChecksum(wrappedMessage)).toBe(true);
      
      const { messageData: unwrapped, isValid } = unwrapMessage(wrappedMessage);
      expect(isValid).toBe(true);
      expect(unwrapped).toEqual(messageData);
    });
  });
});