const net = require('net');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  TCP_PORT: 7001,
  HOST: '0.0.0.0',
  LOG_DIR: 'logs'
};

// Ensure logs directory exists
if (!fs.existsSync(CONFIG.LOG_DIR)) {
  fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
}

// Simple logger
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    console.log(logEntry);
    if (data) {
      console.log('Data:', data);
    }
    
    // Write to log file
    const logFile = path.join(CONFIG.LOG_DIR, `server-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = data ? `${logEntry} | Data: ${JSON.stringify(data)}\n` : `${logEntry}\n`;
    fs.appendFileSync(logFile, logLine);
  }
  
  static info(message, data) { this.log('info', message, data); }
  static warn(message, data) { this.log('warn', message, data); }
  static error(message, data) { this.log('error', message, data); }
}

// Connection tracking
const connections = new Map();
let connectionCounter = 0;

// Basic TCP Server
class DashcamTCPServer {
  constructor(port = CONFIG.TCP_PORT, host = CONFIG.HOST) {
    this.port = port;
    this.host = host;
    this.server = null;
  }
  
  start() {
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });
    
    this.server.on('error', (err) => {
      Logger.error('Server error', { error: err.message, stack: err.stack });
    });
    
    this.server.listen(this.port, this.host, () => {
      Logger.info(`JT808/JT1078 Dashcam Server listening on ${this.host}:${this.port}`);
      Logger.info('Server ready to accept dashcam connections');
    });
  }
  
  handleConnection(socket) {
    const connectionId = ++connectionCounter;
    const clientInfo = {
      id: connectionId,
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort,
      connectedAt: new Date(),
      deviceId: null // Will be set during registration
    };
    
    connections.set(connectionId, {
      socket,
      info: clientInfo
    });
    
    Logger.info('New dashcam connection established', {
      connectionId,
      remoteAddress: clientInfo.remoteAddress,
      remotePort: clientInfo.remotePort,
      totalConnections: connections.size
    });
    
    // Handle incoming data
    socket.on('data', (data) => {
      this.handleData(connectionId, data);
    });
    
    // Handle connection close
    socket.on('close', () => {
      Logger.info('Dashcam connection closed', {
        connectionId,
        remoteAddress: clientInfo.remoteAddress,
        deviceId: clientInfo.deviceId,
        duration: Date.now() - clientInfo.connectedAt.getTime()
      });
      connections.delete(connectionId);
    });
    
    // Handle connection errors
    socket.on('error', (err) => {
      Logger.error('Connection error', {
        connectionId,
        remoteAddress: clientInfo.remoteAddress,
        error: err.message
      });
      connections.delete(connectionId);
    });
    
    // Send welcome message (for testing purposes)
    socket.write(Buffer.from('Server ready\n'));
  }
  
  handleData(connectionId, data) {
    const connection = connections.get(connectionId);
    if (!connection) return;
    
    Logger.info('Received data from dashcam', {
      connectionId,
      remoteAddress: connection.info.remoteAddress,
      dataLength: data.length,
      dataHex: data.toString('hex'),
      dataPreview: data.toString('ascii').replace(/[^\x20-\x7E]/g, '.')
    });
    
    // For now, just echo back a simple response
    // This will be replaced with proper JT808 protocol handling in later tasks
    const response = Buffer.from([0x7E, 0x80, 0x01, 0x00, 0x05, 0x01, 0x23, 0x45, 0x67, 0x89, 0x00, 0x01, 0x00, 0x7E]);
    connection.socket.write(response);
    
    Logger.info('Sent response to dashcam', {
      connectionId,
      responseLength: response.length,
      responseHex: response.toString('hex')
    });
  }
  
  getConnections() {
    return Array.from(connections.values()).map(conn => conn.info);
  }
  
  stop() {
    if (this.server) {
      Logger.info('Shutting down server...');
      
      // Close all connections
      connections.forEach((conn, id) => {
        conn.socket.destroy();
        connections.delete(id);
      });
      
      this.server.close(() => {
        Logger.info('Server stopped');
      });
    }
  }
}

// Create and start server
const server = new DashcamTCPServer();

// Graceful shutdown
process.on('SIGINT', () => {
  Logger.info('Received SIGINT, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.info('Received SIGTERM, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

// Start the server
server.start();

module.exports = { DashcamTCPServer, Logger };