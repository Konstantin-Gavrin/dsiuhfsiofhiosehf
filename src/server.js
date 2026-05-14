/**
 * Main Express.js Server
 * Provides HTTP API endpoint for smart devices
 * Uses HTTP Pull pattern: device queries /api/boiler/status periodically
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const priceService = require('./priceService');
const logger = require('./logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { register, login } = require('./auth');
const { authRequired, requireRole } = require('./middleware/auth');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const hasFrontendBuild = fs.existsSync(path.join(publicDir, 'index.html'));

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
/**
 * User registration
 * POST /api/register { email, password }
 */
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await register({ email, password });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * User login
 * POST /api/login { email, password }
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await login({ email, password });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

/**
 * CRUD for devices (auth required)
 */
app.get('/api/devices', authRequired, async (req, res) => {
  const devices = await prisma.device.findMany({ where: { userId: req.user.userId } });
  res.json(devices);
});

app.post('/api/devices', authRequired, async (req, res) => {
  try {
    const { name, description, address, threshold, isCritical } = req.body;
    const device = await prisma.device.create({
      data: { name, description, address, threshold, isCritical, userId: req.user.userId },
    });
    res.status(201).json(device);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/devices/:id', authRequired, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const device = await prisma.device.update({
      where: { id, userId: req.user.userId },
      data: req.body,
    });
    res.json(device);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/devices/:id', authRequired, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.device.delete({ where: { id, userId: req.user.userId } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Middleware: structured request/response logging
 */
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      event: 'http_request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
    });
  });

  next();
});

/**
 * Health check endpoint (required by Coolify for monitoring)
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (!hasFrontendBuild) {
  app.get('/', (req, res) => {
    res.status(200).json({ service: 'power-bot', status: 'running', message: 'Backend is active. Use /api/* endpoints.' });
  });
}

/**
 * Main API endpoint for smart devices
 * Returns JSON with device status, current price, and threshold
 *
 * Request: GET /api/boiler/status
 * Response: {
 *   "status": "ON" | "OFF",
 *   "current_price_eur": 0.061234,
 *   "threshold": 0.10
 * }
 */
app.get('/api/boiler/status', (req, res) => {
  try {
    const state = priceService.getState();

    res.status(200).json({
      status: state.status,
      current_price_eur: state.current_price_eur,
      threshold: state.threshold,
    });
  } catch (error) {
    logger.error({
      event: 'endpoint_error',
      path: '/api/boiler/status',
      message: error.message,
    });

    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Convenience alias for boiler status
 */
app.get('/api/boiler', (req, res) => {
  try {
    const state = priceService.getState();

    res.status(200).json({
      status: state.status,
      current_price_eur: state.current_price_eur,
      threshold: state.threshold,
    });
  } catch (error) {
    logger.error({
      event: 'endpoint_error',
      path: '/api/boiler',
      message: error.message,
    });

    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Optional: Status endpoint for debugging
 */
app.get('/api/status', (req, res) => {
  const state = priceService.getState();
  res.status(200).json({
    service: 'power-bot',
    state: state,
    config: {
      checkIntervalMs: config.checkIntervalMs,
      eleringApiUrl: config.eleringApiUrl,
    },
  });
});

if (hasFrontendBuild) {
  app.use(express.static(publicDir));
  app.get(/^\/(?!api|health).*/, (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  logger.error({
    event: 'unhandled_error',
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: 'Internal server error',
  });
});

/**
 * Start server and background services
 */
const startServer = async () => {
  try {
    // Start the background price checking service
    await priceService.startPriceCheck();

    // Start Express server
    app.listen(config.port, config.host, () => {
      logger.info({
        event: 'server_started',
        host: config.host,
        port: config.port,
        endpoints: ['/api/boiler/status', '/api/status', '/health'],
      });
    });
  } catch (error) {
    logger.error({
      event: 'startup_failure',
      message: error.message,
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info({
    event: 'shutdown_signal_received',
    signal: 'SIGTERM',
  });
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info({
    event: 'shutdown_signal_received',
    signal: 'SIGINT',
  });
  process.exit(0);
});

startServer();
