# Multi-stage Dockerfile for Node.js power-bot application
# Stage 1: Builder - Install dependencies
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files (do this before source code for Docker layer caching)
COPY package*.json ./
COPY prisma/ ./prisma/

# Install production dependencies
RUN npm ci --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Runtime - Final image
FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy installed node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules

# Copy Prisma schema (needed for migrations and client)
COPY --chown=nodejs:nodejs prisma/ ./prisma/

# Copy application source code
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Expose port (matches Node.js server default port)
EXPOSE 3000

# Health check for Coolify platform
# Queries the /health endpoint every 30 seconds
# Allows 3 consecutive failures before marking as unhealthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/health || exit 1

# Start application
CMD npx prisma migrate deploy && node src/server.js
