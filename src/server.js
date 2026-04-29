/**
 * Main Express.js Server
 * Provides HTTP API endpoint for smart devices
 * Uses HTTP Pull pattern: device queries /api/boiler/status periodically
 */

const express = require('express');
const config = require('./config');
const priceService = require('./priceService');
const logger = require('./logger');

const app = express();

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
