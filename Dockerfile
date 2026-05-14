# Multi-stage Dockerfile for Node.js power-bot application
# Stage 1: Builder - Install dependencies
FROM node:18-slim AS builder

WORKDIR /build

# Install OpenSSL, Python, and build tools needed for bcrypt compilation
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files (do this before source code for Docker layer caching)
COPY package*.json ./
COPY prisma/ ./prisma/

# Install production dependencies (skip postinstall scripts to avoid premature generation)
RUN npm install --omit=dev --ignore-scripts

# Rebuild bcrypt for Linux platform (required for native module)
RUN npm rebuild bcrypt --build-from-source

# Generate Prisma client with correct binaryTargets after schema is ready
RUN npx prisma generate

# Stage 2.5: Frontend builder
FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 3: Runtime - Final image
FROM node:18-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash nodejs

# Copy installed node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules

# Copy Prisma schema (needed for migrations and client)
COPY --chown=nodejs:nodejs prisma/ ./prisma/

# Copy application source code
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs package*.json ./

# Copy built frontend so backend can serve SPA on the same domain
COPY --from=frontend-builder --chown=nodejs:nodejs /frontend/dist ./public

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
