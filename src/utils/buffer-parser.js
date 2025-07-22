/**
 * Buffer parsing utilities for JT808 protocol
 * Handles different data types: BCD, ASCII, integers, etc.
 */

class BufferParser {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  /**
   * Read unsigned 8-bit integer
   */
  readUInt8() {
    if (this.offset >= this.buffer.length) {
      throw new Error(`Buffer overflow: trying to read at offset ${this.offset}, buffer length ${this.buffer.length}`);
    }
    const value = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  /**
   * Read unsigned 16-bit integer (big-endian)
   */
  readUInt16BE() {
    if (this.offset + 1 >= this.buffer.length) {
      throw new Error(`Buffer overflow: trying to read at offset ${this.offset}, buffer length ${this.buffer.length}`);
    }
    const value = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    return value;
  }

  /**
   * Read unsigned 32-bit integer (big-endian)
   */
  readUInt32BE() {
    if (this.offset + 3 >= this.buffer.length) {
      throw new Error(`Buffer overflow: trying to read at offset ${this.offset}, buffer length ${this.buffer.length}`);
    }
    const value = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  /**
   * Read BCD (Binary Coded Decimal) encoded data
   * Each byte represents two decimal digits
   */
  readBCD(length) {
    if (this.offset + length - 1 >= this.buffer.length) {
      throw new Error(`Buffer overflow: trying to read BCD at offset ${this.offset}, buffer length ${this.buffer.length}`);
    }
    
    let result = '';
    for (let i = 0; i < length; i++) {
      const byte = this.buffer.readUInt8(this.offset + i);
      const high = (byte >> 4) & 0x0F;
      const low = byte & 0x0F;
      result += high.toString() + low.toString();
    }
    this.offset += length;
    return result;
  }

  /**
   * Read ASCII string
   */
  readASCII(length) {
    if (this.offset + length - 1 >= this.buffer.length) {
      throw new Error(`Buffer overflow: trying to read ASCII at offset ${this.offset}, buffer length ${this.buffer.length}`);
    }
    
    const value = this.buffer.toString('ascii', this.offset, this.offset + length);
    this.offset += length;
    return value.replace(/\0/g, ''); // Remove null terminators
  }

  /**
   * Read raw bytes
   */
  readBytes(length) {
    if (this.offset + length - 1 >= this.buffer.length) {
      throw new Error(`Buffer overflow: trying to read bytes at offset ${this.offset}, buffer length ${this.buffer.length}`);
    }
    
    const value = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  /**
   * Skip bytes
   */
  skip(length) {
    this.offset += length;
  }

  /**
   * Get remaining bytes count
   */
  remaining() {
    return this.buffer.length - this.offset;
  }

  /**
   * Reset offset to beginning
   */
  reset() {
    this.offset = 0;
  }

  /**
   * Set offset to specific position
   */
  seek(position) {
    if (position < 0 || position >= this.buffer.length) {
      throw new Error(`Invalid seek position: ${position}, buffer length ${this.buffer.length}`);
    }
    this.offset = position;
  }

  /**
   * Get current offset
   */
  tell() {
    return this.offset;
  }
}

module.exports = BufferParser;