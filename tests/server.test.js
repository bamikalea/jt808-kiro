import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'net';
import { DashcamTCPServer, Logger } from '../src/server.js';

describe('DashcamTCPServer', () => {
  let server;
  const TEST_PORT = 7002; // Use different port for testing
  
  beforeAll(async () => {
    server = new DashcamTCPServer(TEST_PORT, '127.0.0.1');
    
    return new Promise((resolve) => {
      server.server = net.createServer((socket) => {
        server.handleConnection(socket);
      });
      
      server.server.listen(TEST_PORT, '127.0.0.1', () => {
        resolve();
      });
    });
  });
  
  afterAll(async () => {
    if (server && server.server) {
      return new Promise((resolve) => {
        server.server.close(() => {
          resolve();
        });
      });
    }
  });
  
  it('should start and listen on specified port', async () => {
    const client = net.createConnection({ port: TEST_PORT, host: '127.0.0.1' });
    
    return new Promise((resolve, reject) => {
      client.on('connect', () => {
        expect(true).toBe(true); // Connection successful
        client.end();
        resolve();
      });
      
      client.on('error', reject);
      
      setTimeout(() => reject(new Error('Connection timeout')), 2000);
    });
  });
  
  it('should handle incoming data and respond', async () => {
    const client = net.createConnection({ port: TEST_PORT, host: '127.0.0.1' });
    
    return new Promise((resolve, reject) => {
      client.on('connect', () => {
        const testData = Buffer.from('TEST_DATA');
        client.write(testData);
      });
      
      client.on('data', (data) => {
        expect(data).toBeDefined();
        expect(data.length).toBeGreaterThan(0);
        client.end();
        resolve();
      });
      
      client.on('error', reject);
      
      setTimeout(() => reject(new Error('Response timeout')), 2000);
    });
  });
  
  it('should track connections', async () => {
    const initialConnections = server.getConnections().length;
    const client = net.createConnection({ port: TEST_PORT, host: '127.0.0.1' });
    
    return new Promise((resolve, reject) => {
      client.on('connect', () => {
        const currentConnections = server.getConnections().length;
        expect(currentConnections).toBe(initialConnections + 1);
        client.end();
        resolve();
      });
      
      client.on('error', reject);
      
      setTimeout(() => reject(new Error('Connection timeout')), 2000);
    });
  });
  
  it('should handle multiple simultaneous connections', async () => {
    const numConnections = 3;
    const clients = [];
    
    return new Promise((resolve, reject) => {
      let connectedCount = 0;
      let responsesReceived = 0;
      
      for (let i = 0; i < numConnections; i++) {
        const client = net.createConnection({ port: TEST_PORT, host: '127.0.0.1' });
        clients.push(client);
        
        client.on('connect', () => {
          connectedCount++;
          client.write(Buffer.from(`TEST_${i}`));
        });
        
        client.on('data', () => {
          responsesReceived++;
          client.end();
          
          if (responsesReceived === numConnections) {
            expect(connectedCount).toBe(numConnections);
            expect(responsesReceived).toBe(numConnections);
            resolve();
          }
        });
        
        client.on('error', reject);
      }
      
      setTimeout(() => {
        clients.forEach(client => client.destroy());
        reject(new Error('Multiple connections test timeout'));
      }, 3000);
    });
  });
});

describe('Logger', () => {
  it('should log messages with timestamp', () => {
    // Test that logger doesn't throw errors
    expect(() => {
      Logger.info('Test message');
      Logger.warn('Test warning');
      Logger.error('Test error');
    }).not.toThrow();
  });
  
  it('should log messages with data', () => {
    expect(() => {
      Logger.info('Test message with data', { key: 'value' });
    }).not.toThrow();
  });
});