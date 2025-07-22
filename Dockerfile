# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/
COPY test-parser.js ./

# Create logs directory
RUN mkdir -p /tmp/logs

# Expose the TCP port (Render will assign the actual port)
EXPOSE 7001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${HEALTH_PORT:-7002}/health || exit 1

# Start the server
CMD ["npm", "start"]