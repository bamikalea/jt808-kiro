/**
 * Unit tests for BufferParser
 */

import { describe, it, expect } from 'vitest';
const BufferParser = require('../src/utils/buffer-parser');

describe('BufferParser', () => {
  describe('Basic integer reading', () => {
    it('should read UInt8 correctly', () => {
      const buffer = Buffer.from([0xFF, 0x00, 0x7F]);
      const parser = new BufferParser(buffer);
      
      expect(parser.readUInt8()).toBe(255);
      expect(parser.readUInt8()).toBe(0);
      expect(parser.readUInt8()).toBe(127);
    });

    it('should read UInt16BE correctly', () => {
      const buffer = Buffer.from([0xFF, 0xFF, 0x00, 0x01, 0x7F, 0x80]);
      const parser = new BufferParser(buffer);
      
      expect(parser.readUInt16BE()).toBe(65535);
      expect(parser.readUInt16BE()).toBe(1);
      expect(parser.readUInt16BE()).toBe(32640);
    });

    it('should read UInt32BE correctly', () => {
      const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x01]);
      const parser = new BufferParser(buffer);
      
      expect(parser.readUInt32BE()).toBe(4294967295);
      expect(parser.readUInt32BE()).toBe(1);
    });
  });

  describe('BCD reading', () => {
    it('should read BCD correctly', () => {
      // BCD encoding: 0x12 = "12", 0x34 = "34", 0x56 = "56"
      const buffer = Buffer.from([0x12, 0x34, 0x56]);
      const parser = new BufferParser(buffer);
      
      expect(parser.readBCD(3)).toBe('123456');
    });

    it('should handle BCD with leading zeros', () => {
      const buffer = Buffer.from([0x01, 0x23, 0x45]);
      const parser = new BufferParser(buffer);
      
      expect(parser.readBCD(3)).toBe('012345');
    });
  });

  describe('ASCII reading', () => {
    it('should read ASCII string correctly', () => {
      const buffer = Buffer.from('Hello World', 'ascii');
      const parser = new BufferParser(buffer);
      
      expect(parser.readASCII(5)).toBe('Hello');
      expect(parser.readASCII(1)).toBe(' ');
      expect(parser.readASCII(5)).toBe('World');
    });

    it('should handle null terminators in ASCII', () => {
      const buffer = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00, 0x00, 0x00]);
      const parser = new BufferParser(buffer);
      
      expect(parser.readASCII(8)).toBe('Hello');
    });
  });

  describe('Bytes reading', () => {
    it('should read raw bytes correctly', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const parser = new BufferParser(buffer);
      
      const bytes = parser.readBytes(2);
      expect(bytes).toEqual(Buffer.from([0x01, 0x02]));
      
      const remainingBytes = parser.readBytes(2);
      expect(remainingBytes).toEqual(Buffer.from([0x03, 0x04]));
    });
  });

  describe('Buffer navigation', () => {
    it('should track offset correctly', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const parser = new BufferParser(buffer);
      
      expect(parser.tell()).toBe(0);
      parser.readUInt8();
      expect(parser.tell()).toBe(1);
      parser.readUInt8();
      expect(parser.tell()).toBe(2);
    });

    it('should skip bytes correctly', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const parser = new BufferParser(buffer);
      
      parser.skip(2);
      expect(parser.tell()).toBe(2);
      expect(parser.readUInt8()).toBe(0x03);
    });

    it('should seek to position correctly', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const parser = new BufferParser(buffer);
      
      parser.seek(2);
      expect(parser.tell()).toBe(2);
      expect(parser.readUInt8()).toBe(0x03);
    });

    it('should reset offset correctly', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const parser = new BufferParser(buffer);
      
      parser.readUInt16BE();
      expect(parser.tell()).toBe(2);
      parser.reset();
      expect(parser.tell()).toBe(0);
    });

    it('should calculate remaining bytes correctly', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const parser = new BufferParser(buffer);
      
      expect(parser.remaining()).toBe(4);
      parser.readUInt8();
      expect(parser.remaining()).toBe(3);
      parser.readUInt16BE();
      expect(parser.remaining()).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should throw error on buffer overflow for UInt8', () => {
      const buffer = Buffer.from([0x01]);
      const parser = new BufferParser(buffer);
      
      parser.readUInt8(); // This should work
      expect(() => parser.readUInt8()).toThrow('Buffer overflow');
    });

    it('should throw error on buffer overflow for UInt16BE', () => {
      const buffer = Buffer.from([0x01]);
      const parser = new BufferParser(buffer);
      
      expect(() => parser.readUInt16BE()).toThrow('Buffer overflow');
    });

    it('should throw error on buffer overflow for BCD', () => {
      const buffer = Buffer.from([0x01, 0x02]);
      const parser = new BufferParser(buffer);
      
      expect(() => parser.readBCD(3)).toThrow('Buffer overflow');
    });

    it('should throw error on invalid seek position', () => {
      const buffer = Buffer.from([0x01, 0x02]);
      const parser = new BufferParser(buffer);
      
      expect(() => parser.seek(-1)).toThrow('Invalid seek position');
      expect(() => parser.seek(10)).toThrow('Invalid seek position');
    });
  });
});