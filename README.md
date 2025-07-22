# JT808/JT1078 Dashcam Server

A Node.js TCP server implementation for handling JT808/JT1078 protocol communication with vehicle dashcams and GPS tracking devices.

## Features

- **JT808 Protocol Support**: Complete implementation of JT808 protocol parser
- **Raw Message Logging**: Detailed hex dump logging for debugging
- **Protocol Version Detection**: Auto-detection of JT808-2011/2013/2019 versions
- **Message Validation**: Schema-based message validation and serialization
- **TCP Server**: Persistent TCP connections for real-time communication
- **Health Monitoring**: Built-in health check endpoint for monitoring

## Architecture

```
├── src/
│   ├── server.js              # Main TCP server
│   ├── models/
│   │   └── jt808-messages.js  # Protocol message definitions
│   └── utils/
│       ├── buffer-parser.js   # Binary data parsing utilities
│       ├── checksum.js        # Message checksum validation
│       ├── message-parser.js  # Protocol message parser
│       └── message-validator.js # Message validation & serialization
├── tests/                     # Unit tests
├── render.yaml               # Render deployment configuration
└── Dockerfile               # Container configuration
```

## Local Development

### Prerequisites

- Node.js 18+
- npm 8+

### Installation

```bash
npm install
```

### Running Locally

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test
```

### Testing the Parser

```bash
# Test the protocol parser with sample data
node test-parser.js
```

## Deployment on Render

### Option 1: Automatic Deployment (Recommended)

1. **Connect Repository**: Link your GitHub repository to Render
2. **Auto-Deploy**: Render will automatically detect `render.yaml` and deploy as Private Service
3. **Environment Variables**: All required variables are pre-configured in `render.yaml`

### Option 2: Manual Configuration

1. **Create Private Service** on Render dashboard
2. **Configure Settings**:

   - **Runtime**: Node.js
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter (or higher for production)

3. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=7001
   LOG_DIR=/tmp/logs
   ```

### Service Configuration

The server is configured as a **Private Service** on Render with:

- **TCP Support**: Full TCP server functionality
- **Health Checks**: HTTP endpoint at `/health`
- **Auto-scaling**: Based on connection load
- **Persistent Storage**: 1GB disk for logs
- **Region**: Oregon (configurable)

## Protocol Support

### Supported Messages

- **Terminal Registration** (0x0100)
- **Terminal Authentication** (0x0102)
- **Heartbeat** (0x0002)
- **Location Reports** (0x0200)
- **Multimedia Upload** (0x0800/0x0801)
- **Parameter Settings** (0x8103)
- **Camera Control** (0x8801)
- **General Responses** (0x8001)

### Message Features

- **Checksum Validation**: XOR checksum verification
- **Protocol Version Detection**: Automatic version detection
- **Message Serialization**: Bidirectional message conversion
- **Field Validation**: Schema-based validation
- **Error Handling**: Comprehensive error management

## API Endpoints

### Health Check

```
GET /health
```

Returns server status and connection metrics.

### TCP Connection

```
TCP Port: 7001 (configurable via PORT env var)
Protocol: JT808/JT1078
```

## Monitoring

The server provides detailed logging for:

- **Connection Events**: New connections, disconnections
- **Message Processing**: Raw hex dumps, parsed data
- **Protocol Analysis**: Version detection, validation results
- **Error Tracking**: Connection errors, parsing failures

## Environment Variables

| Variable      | Default     | Description         |
| ------------- | ----------- | ------------------- |
| `PORT`        | 7001        | TCP server port     |
| `NODE_ENV`    | development | Runtime environment |
| `LOG_DIR`     | logs        | Log directory path  |
| `HEALTH_PORT` | PORT+1      | Health check port   |

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npx vitest run tests/buffer-parser.test.js
npx vitest run tests/message-validator.test.js

# Test with sample data
node test-parser.js
```

## Production Considerations

- **Connection Limits**: Monitor concurrent connections
- **Log Rotation**: Implement log rotation for production
- **Security**: Add authentication for sensitive operations
- **Monitoring**: Set up alerts for connection failures
- **Scaling**: Consider load balancing for high traffic

## License

MIT License - see LICENSE file for details.
