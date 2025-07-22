# JT808/JT1078 Dashcam Server

A Node.js-based middleware server that implements JT808 (GPS tracking and command) and JT1078 (multimedia streaming) protocols for Chinese-manufactured dashcams.

## Features

- **TCP Server**: Accepts connections from JT808/JT1078 compliant dashcams
- **Connection Management**: Tracks and manages multiple simultaneous dashcam connections
- **Protocol Logging**: Comprehensive logging of all protocol messages and connection events
- **Real-time Data Processing**: Handles incoming data from dashcams with immediate response
- **Connection Testing**: Built-in test utilities to verify server functionality

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Server

Start the server:

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The server will start listening on:

- **Host**: 0.0.0.0 (all interfaces)
- **Port**: 7001

### Testing the Server

Run the connection test to verify the server is working:

```bash
npm run test:connection
```

Run unit tests:

```bash
npm test
```

## Server Configuration

The server uses the following default configuration:

```javascript
const CONFIG = {
  TCP_PORT: 7001, // Port for dashcam connections
  HOST: "0.0.0.0", // Listen on all interfaces
  LOG_DIR: "logs", // Directory for log files
};
```

## Dashcam Configuration

To connect your dashcam to this server:

1. **Server IP**: Set to your machine's IP address (e.g., 192.168.1.100)
2. **Server Port**: Set to 7001
3. **Protocol**: Ensure dashcam supports JT808/JT1078 protocols

### Example SMS Configuration Commands

For dashcams that support SMS configuration:

```
# Set server IP and port
SERVER,0,192.168.1.100,7001#

# Set APN (if using cellular connection)
APN,your-apn-name,username,password#
```

## Project Structure

```
├── src/
│   ├── components/          # Protocol components (future)
│   ├── models/             # Data models (future)
│   ├── utils/              # Utility functions (future)
│   └── server.js           # Main server implementation
├── tests/
│   └── server.test.js      # Unit tests
├── logs/                   # Server log files
├── test-connection.js      # Connection testing utility
└── package.json
```

## Logging

The server provides comprehensive logging:

- **Console Output**: Real-time logging to console
- **File Logging**: Daily log files in `logs/` directory
- **Connection Events**: New connections, disconnections, data received
- **Protocol Messages**: Hex dump and ASCII preview of all messages

### Log Levels

- **INFO**: General information (connections, responses)
- **WARN**: Warning conditions
- **ERROR**: Error conditions with stack traces

## Testing Your Dashcam Connection

1. Start the server: `npm start`
2. Configure your dashcam with your server's IP and port 7001
3. Monitor the server console for connection logs
4. You should see messages like:
   ```
   [2025-07-22T12:50:18.675Z] INFO: New dashcam connection established
   Data: {
     connectionId: 1,
     remoteAddress: '192.168.1.50',
     remotePort: 12345,
     totalConnections: 1
   }
   ```

## Current Implementation Status

✅ **Completed (Task 1)**:

- Basic TCP server setup
- Connection management and logging
- Data reception and basic response
- Connection testing utilities
- Project structure setup

🚧 **Next Steps**:

- JT808 protocol message parsing
- Device registration handling
- GPS location processing
- Media file handling
- Real-time streaming support

## Protocol Support

Currently implemented:

- Basic TCP connection handling
- Raw data logging and hex dump
- Simple response generation

Planned for future tasks:

- JT808 message parsing (registration, heartbeat, location)
- JT1078 media packet handling
- Device authentication
- Command processing
- Real-time streaming

## Troubleshooting

### Server Won't Start

- Check if port 7001 is already in use: `lsof -i :7001`
- Try a different port by modifying `CONFIG.TCP_PORT` in `src/server.js`

### Dashcam Won't Connect

- Verify dashcam is configured with correct server IP and port
- Check firewall settings on server machine
- Ensure dashcam has network connectivity (WiFi or cellular)
- Monitor server logs for connection attempts

### Connection Test Fails

- Ensure server is running: `npm start`
- Check if server is listening: `netstat -an | grep 7001`
- Try running test with server in different terminal

## Development

### Adding New Features

1. Follow the task list in `.kiro/specs/jt808-jt1078-dashcam-server/tasks.md`
2. Implement one task at a time
3. Test thoroughly before moving to next task
4. Update documentation as needed

### Code Style

- Use clear, descriptive variable names
- Add comprehensive logging for debugging
- Include error handling for all operations
- Write tests for new functionality

## License

MIT License - see package.json for details
