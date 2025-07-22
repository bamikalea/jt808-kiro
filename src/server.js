const net = require("net");
const http = require("http");
const path = require("path");
const fs = require("fs");

// Configuration - Use environment variables for Render deployment
const CONFIG = {
  TCP_PORT: parseInt(process.env.PORT, 10) || 7001,
  HOST: "0.0.0.0",
  LOG_DIR: process.env.LOG_DIR || "logs",
};

// Debug logging for Render deployment
console.log("Environment PORT:", process.env.PORT);
console.log("Parsed TCP_PORT:", CONFIG.TCP_PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);

// Ensure logs directory exists
if (!fs.existsSync(CONFIG.LOG_DIR)) {
  try {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    console.log(`Created logs directory: ${CONFIG.LOG_DIR}`);
  } catch (error) {
    console.warn(`Could not create logs directory: ${error.message}`);
  }
}

// Simple logger
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    console.log(logEntry);
    if (data) {
      console.log("Data:", data);
    }

    // Only write to file in development mode
    if (process.env.NODE_ENV !== "production") {
      try {
        const logFile = path.join(
          CONFIG.LOG_DIR,
          `server-${new Date().toISOString().split("T")[0]}.log`
        );
        const logLine = data
          ? `${logEntry} | Data: ${JSON.stringify(data)}\n`
          : `${logEntry}\n`;
        fs.appendFileSync(logFile, logLine);
      } catch (error) {
        console.warn(`Failed to write to log file: ${error.message}`);
      }
    }
  }

  static info(message, data) {
    this.log("info", message, data);
  }
  static warn(message, data) {
    this.log("warn", message, data);
  }
  static error(message, data) {
    this.log("error", message, data);
  }
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

    this.server.on("error", (err) => {
      Logger.error("Server error", { error: err.message, stack: err.stack });
    });

    this.server.listen(this.port, this.host, () => {
      Logger.info(
        `JT808/JT1078 Dashcam Server listening on ${this.host}:${this.port}`
      );
      Logger.info("Server ready to accept dashcam connections");
    });
  }

  handleConnection(socket) {
    const connectionId = ++connectionCounter;
    const clientInfo = {
      id: connectionId,
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort,
      connectedAt: new Date(),
      deviceId: null, // Will be set during registration
    };

    connections.set(connectionId, {
      socket,
      info: clientInfo,
    });

    // Always log new connections from external IPs (real dashcams)
    const isExternalConnection = clientInfo.remoteAddress !== "127.0.0.1";
    if (process.env.NODE_ENV !== "production" || isExternalConnection) {
      Logger.info("New dashcam connection established", {
        connectionId,
        remoteAddress: clientInfo.remoteAddress,
        remotePort: clientInfo.remotePort,
        totalConnections: connections.size,
        isExternal: isExternalConnection,
      });
    }

    // Handle incoming data
    socket.on("data", (data) => {
      this.handleData(connectionId, data);
    });

    // Handle connection close
    socket.on("close", () => {
      // Only log connection closures in development
      if (process.env.NODE_ENV !== "production") {
        Logger.info("Dashcam connection closed", {
          connectionId,
          remoteAddress: clientInfo.remoteAddress,
          deviceId: clientInfo.deviceId,
          duration: Date.now() - clientInfo.connectedAt.getTime(),
        });
      }
      connections.delete(connectionId);
    });

    // Handle connection errors
    socket.on("error", (err) => {
      // Only log connection errors in development or for non-health check related errors
      if (
        process.env.NODE_ENV !== "production" ||
        !err.message.includes("ECONNRESET")
      ) {
        Logger.error("Connection error", {
          connectionId,
          remoteAddress: clientInfo.remoteAddress,
          error: err.message,
        });
      }
      connections.delete(connectionId);
    });

    // Send welcome message (for testing purposes)
    socket.write(Buffer.from("Server ready\n"));
  }

  handleData(connectionId, data) {
    const connection = connections.get(connectionId);
    if (!connection) return;

    // Check if this is a health check request (HTTP HEAD request)
    const dataStr = data.toString("ascii");
    const isHealthCheck =
      dataStr.includes("HEAD /") || dataStr.includes("GET /health");

    // Always log real dashcam messages (non-health checks)
    if (!isHealthCheck) {
      Logger.info("🚗 REAL DASHCAM DATA RECEIVED", {
        connectionId,
        remoteAddress: connection.info.remoteAddress,
        dataLength: data.length,
        dataHex: data.toString("hex"),
        dataPreview: data.toString("ascii").replace(/[^\x20-\x7E]/g, "."),
        isJT808: data[0] === 0x7e && data[data.length - 1] === 0x7e,
      });
    }

    // For now, just echo back a simple response
    // This will be replaced with proper JT808 protocol handling in later tasks
    const response = Buffer.from([
      0x7e, 0x80, 0x01, 0x00, 0x05, 0x01, 0x23, 0x45, 0x67, 0x89, 0x00, 0x01,
      0x00, 0x7e,
    ]);
    connection.socket.write(response);

    // Only log response for non-health checks
    if (!isHealthCheck) {
      Logger.info("Sent response to dashcam", {
        connectionId,
        responseLength: response.length,
        responseHex: response.toString("hex"),
      });
    }
  }

  getConnections() {
    return Array.from(connections.values()).map((conn) => conn.info);
  }

  stop() {
    if (this.server) {
      Logger.info("Shutting down server...");

      // Close all connections
      connections.forEach((conn, id) => {
        conn.socket.destroy();
        connections.delete(id);
      });

      this.server.close(() => {
        Logger.info("Server stopped");
      });
    }
  }
}

// Health check HTTP server for Render
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "JT808/JT1078 Dashcam Server",
        timestamp: new Date().toISOString(),
        connections: connections.size,
        uptime: process.uptime(),
      })
    );
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

// Start health check server on a different port
const healthPort = parseInt(process.env.HEALTH_PORT, 10) || CONFIG.TCP_PORT + 1;
healthServer.listen(healthPort, () => {
  Logger.info(`Health check server listening on port ${healthPort}`);
});

// Create and start main TCP server
const server = new DashcamTCPServer();

// Graceful shutdown
process.on("SIGINT", () => {
  Logger.info("Received SIGINT, shutting down gracefully...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  Logger.info("Received SIGTERM, shutting down gracefully...");
  server.stop();
  process.exit(0);
});

// Start the server
server.start();

module.exports = { DashcamTCPServer, Logger };
