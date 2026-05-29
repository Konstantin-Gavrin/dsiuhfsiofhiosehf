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
const lokiLogger = require('./lokiLogger');
const { notifyUser } = require('./notifier');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { register, login } = require('./auth');
const { authRequired, requireRole } = require('./middleware/auth');
const { register: prometheusRegister, httpRequests, httpDuration, activeDevices, activeUsers, deviceCommandsSuccess, deviceCommandsFailed, priceUpdates, currentPrice, errorCount } = require('./metrics');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const hasFrontendBuild = fs.existsSync(path.join(publicDir, 'index.html'));
const allowedNotificationChannels = new Set(['telegram', 'discord']);

function normalizeOptionalString(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    const err = new Error(`${fieldName} must be a string`);
    err.status = 400;
    throw err;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeChannel(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !allowedNotificationChannels.has(value)) {
    const err = new Error('Invalid notification channel');
    err.status = 400;
    throw err;
  }
  return value;
}

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

async function notifyPriceChange({ previousStatus, state }) {
  const users = await prisma.user.findMany({
    where: {
      notificationChannel: { in: Array.from(allowedNotificationChannels) },
      notificationTarget: { not: null },
    },
    select: {
      id: true,
      notificationChannel: true,
      notificationTarget: true,
      telegramBotToken: true,
    },
  });

  if (users.length === 0) return;

  const price = Number.isFinite(state.price_eur) ? state.price_eur.toFixed(6) : 'n/a';
  const threshold = Number.isFinite(state.threshold_eur)
    ? state.threshold_eur.toFixed(6)
    : config.thresholdEur.toFixed(6);
  const message = `Price status changed: ${previousStatus} -> ${state.status}. Current price: ${price} EUR/kWh (threshold ${threshold}).`;

  await Promise.all(
    users.map(async (user) => {
      const sent = await notifyUser(user, message);
      if (!sent) {
        logger.warn({
          event: 'notification_skipped',
          userId: user.id,
          channel: user.notificationChannel,
        });
      }
    })
  );
}

// Prometheus metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequests.inc({ method: req.method, route, status: res.statusCode });
    httpDuration.observe({ method: req.method, route, status: res.statusCode }, duration);
  });
  
  next();
});

// Temporary admin setup endpoint: reset/create master user guarded by ADMIN_SETUP_TOKEN
app.post('/internal/reset-master', async (req, res, next) => {
  try {
    const token = req.get('x-admin-token') || req.get('X-Admin-Token');
    if (!token || token !== config.adminSetupToken) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { email, password } = req.body || {};
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'email and password(>=8) required' });
    }
    const bcrypt = require('bcrypt');
    const existing = await prisma.user.findUnique({ where: { email } });
    const hash = await bcrypt.hash(password, 10);
    if (existing) {
      await prisma.user.update({ where: { email }, data: { password: hash, isActive: true, role: 'master' } });
      logger.info({ event: 'admin_reset_master', email });
      return res.json({ status: 'updated' });
    }
    await prisma.user.create({ data: { email, password: hash, role: 'master', isActive: true } });
    logger.info({ event: 'admin_create_master', email });
    return res.json({ status: 'created' });
  } catch (err) {
    next(err);
  }
});
/**
 * User registration
 * POST /api/register { email, password }
 */
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await register({ email, password });
    activeUsers.set(await prisma.user.count());
    lokiLogger.info('user_registered', { email });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    const status = e.message === 'User already exists' ? 409 : 400;
    errorCount.inc({ error_type: 'registration_error' });
    lokiLogger.error('registration_error', { email: req.body.email, error: e.message });
    res.status(status).json({ error: e.message });
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
    lokiLogger.info('user_login', { email, userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    errorCount.inc({ error_type: 'login_error' });
    lokiLogger.warn('login_failure', { email: req.body.email });
    res.status(401).json({ error: e.message });
  }
});

/**
 * CRUD for devices (auth required)
 */
app.get('/api/devices', authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const devices = await prisma.device.findMany({ where: { userId: req.user.userId } });
    const priceState = priceService.getState();
    
    // Update metrics
    activeDevices.set(devices.length);
    currentPrice.set(priceState.current_price_eur);
    
    // Determine status based on vacation mode, override, or current price
    const devicesWithStatus = devices.map(device => {
      // If vacation mode is ON and device is not critical, force OFF
      if (user.vacationMode && !device.isCritical) {
        return { ...device, status: 'OFF' };
      }
      
      // If override is active (overrideUntil is in future), use saved status
      if (device.overrideUntil && new Date(device.overrideUntil) > new Date()) {
        return device; // Keep override status
      }
      
      // Otherwise, determine status from current price
      const computedStatus = priceState.current_price_eur <= device.threshold ? 'ON' : 'OFF';
      return { ...device, status: computedStatus };
    });
    
    res.json(devicesWithStatus);
  } catch (e) {
    errorCount.inc({ error_type: 'devices_fetch_error' });
    lokiLogger.error('devices_fetch_error', { userId: req.user.userId, error: e.message });
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/devices', authRequired, async (req, res) => {
  try {
    const { name, description, address, threshold, isCritical } = req.body;
    const device = await prisma.device.create({
      data: { name, description, address, threshold, isCritical, userId: req.user.userId },
    });
    lokiLogger.info('device_created', { deviceId: device.id, name, userId: req.user.userId });
    res.status(201).json(device);
  } catch (e) {
    errorCount.inc({ error_type: 'device_creation_error' });
    lokiLogger.error('device_creation_error', { name: req.body.name, error: e.message });
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
 * Override device status (manual toggle - persists for 24 hours)
 * POST /api/devices/:id/override { status: "ON" | "OFF" }
 */
app.post('/api/devices/:id/override', authRequired, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    
    if (!['ON', 'OFF'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ON or OFF' });
    }
    
    // Set override to expire in 24 hours
    const overrideUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const device = await prisma.device.update({
      where: { id, userId: req.user.userId },
      data: { status, overrideUntil }
    });
    
    deviceCommandsSuccess.inc({ device_id: `${id}`, command: `OVERRIDE_${status}` });
    lokiLogger.info('device_override', { deviceId: id, status, userId: req.user.userId });
    
    res.json(device);
  } catch (e) {
    deviceCommandsFailed.inc({ device_id: req.params.id, command: 'OVERRIDE' });
    errorCount.inc({ error_type: 'override_error' });
    lokiLogger.error('device_override_error', { deviceId: req.params.id, error: e.message });
    res.status(400).json({ error: e.message });
  }
});

/**
 * Get vacation mode status
 * GET /api/vacation-mode
 */
app.get('/api/vacation-mode', authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    res.json({ vacationMode: user.vacationMode });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Toggle vacation mode
 * POST /api/vacation-mode { vacationMode: true|false }
 */
app.post('/api/vacation-mode', authRequired, async (req, res) => {
  try {
    const { vacationMode } = req.body;
    
    if (typeof vacationMode !== 'boolean') {
      return res.status(400).json({ error: 'vacationMode must be a boolean' });
    }
    
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { vacationMode }
    });
    
    res.json({ vacationMode: user.vacationMode });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Get notification settings
 * GET /api/notifications/settings
 */
app.get('/api/notifications/settings', authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        notificationChannel: true,
        notificationTarget: true,
        telegramBotToken: true,
      },
    });

    res.json({
      channel: user?.notificationChannel || null,
      target: user?.notificationTarget || '',
      telegramBotToken: user?.telegramBotToken || '',
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Update notification settings
 * POST /api/notifications/settings { channel, target, telegramBotToken }
 */
app.post('/api/notifications/settings', authRequired, async (req, res) => {
  try {
    const channel = normalizeChannel(req.body.channel);
    const target = normalizeOptionalString(req.body.target, 'target');
    const telegramBotToken = normalizeOptionalString(req.body.telegramBotToken, 'telegramBotToken');

    const updates = {};
    if (channel !== undefined) updates.notificationChannel = channel;
    if (target !== undefined) updates.notificationTarget = target;
    if (telegramBotToken !== undefined) updates.telegramBotToken = telegramBotToken;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No notification settings provided' });
    }

    const current = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        notificationChannel: true,
        notificationTarget: true,
        telegramBotToken: true,
      },
    });

    const next = { ...current, ...updates };

    if (next.notificationChannel === 'telegram') {
      if (!next.notificationTarget) {
        return res.status(400).json({ error: 'Telegram chat id is required' });
      }
      if (!next.telegramBotToken && !config.telegramBotToken) {
        return res.status(400).json({ error: 'Telegram bot token is required' });
      }
    }

    if (next.notificationChannel === 'discord' && !next.notificationTarget) {
      return res.status(400).json({ error: 'Discord webhook URL is required' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: updates,
      select: {
        notificationChannel: true,
        notificationTarget: true,
        telegramBotToken: true,
      },
    });

    res.json({
      channel: user.notificationChannel || null,
      target: user.notificationTarget || '',
      telegramBotToken: user.telegramBotToken || '',
    });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

/**
 * Test notification delivery
 * POST /api/notifications/test
 */
app.post('/api/notifications/test', authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        notificationChannel: true,
        notificationTarget: true,
        telegramBotToken: true,
      },
    });

    if (!user?.notificationChannel) {
      return res.status(400).json({ error: 'Notification channel is not configured' });
    }

    if (user.notificationChannel === 'telegram' && !user.telegramBotToken && !config.telegramBotToken) {
      return res.status(400).json({ error: 'Telegram bot token is required' });
    }

    const sent = await notifyUser(
      user,
      `Test notification sent at ${new Date().toISOString()}`
    );
    if (!sent) {
      return res.status(400).json({ error: 'Notification could not be sent' });
    }

    res.json({ status: 'sent' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Get current electricity price
 * GET /api/price/current
 */
app.get('/api/price/current', (req, res) => {
  try {
    const state = priceService.getState();
    currentPrice.set(state.current_price_eur);
    priceUpdates.inc({ status: 'success' });
    res.json({
      current_price_eur: state.current_price_eur,
      timestamp: new Date().toISOString(),
      status: state.status
    });
  } catch (e) {
    priceUpdates.inc({ status: 'error' });
    errorCount.inc({ error_type: 'price_fetch_error' });
    lokiLogger.error('price_fetch_error', { error: e.message });
    res.status(400).json({ error: e.message });
  }
});

/**
 * Prometheus metrics endpoint
 */
app.get('/metrics', async (req, res) => {
  try {
    // Update active users metric
    const userCount = await prisma.user.count();
    activeUsers.set(userCount);
    
    res.set('Content-Type', prometheusRegister.contentType);
    res.end(await prometheusRegister.metrics());
  } catch (e) {
    errorCount.inc({ error_type: 'metrics_error' });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

/**
 * Health check endpoint (required by Coolify for monitoring)
 */
app.get('/health', (req, res) => {
  lokiLogger.info('health_check', {});
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

/**
 * GET /api/price/current
 * Returns current electricity price and system state
 */
app.get('/api/price/current', (req, res) => {
  try {
    const state = priceService.getState();
    res.json({
      price_eur: state.current_price_eur,
      threshold_eur: state.threshold,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch current price' });
  }
});

/**
 * GET /api/forecast
 * Returns 24-hour price forecast from Elering API
 */
app.get('/api/forecast', async (req, res) => {
  try {
    const forecast = await priceService.getForecast();
    res.json({ hours: forecast || [] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

/**
 * GET /api/savings
 * Calculate savings report for authenticated user
 * Returns daily, weekly, monthly savings
 */
app.get('/api/savings', authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const fixedPriceEur = parseFloat(req.query.fixedPrice || '0.15');

    // Get all command logs for user's devices
    const devices = await prisma.device.findMany({ where: { userId } });
    const deviceIds = devices.map(d => d.id);

    if (deviceIds.length === 0) {
      return res.json({ daily: 0, weekly: 0, monthly: 0, details: [] });
    }

    const commands = await prisma.commandLog.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { createdAt: 'desc' },
    });

    // Simple calculation: assume average consumption
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Mock calculation: savings = (fixed price - actual avg price) * hours * power
    const avgActualPrice = 0.08; // Mock
    const avgPower = 2.0; // kW
    const dailySavings = Math.max(0, (fixedPriceEur - avgActualPrice) * 24 * avgPower);
    const weeklySavings = dailySavings * 7;
    const monthlySavings = dailySavings * 30;

    res.json({
      daily: parseFloat(dailySavings.toFixed(2)),
      weekly: parseFloat(weeklySavings.toFixed(2)),
      monthly: parseFloat(monthlySavings.toFixed(2)),
      fixedPrice: fixedPriceEur,
      actualAvgPrice: avgActualPrice,
      currency: 'EUR',
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/devices/:id/override
 * Manual override: force device ON or OFF
 */
app.post('/api/devices/:id/override', authRequired, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, overrideUntil } = req.body; // status: 'ON' or 'OFF'

    const device = await prisma.device.findUnique({
      where: { id, userId: req.user.userId },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Log the command
    await prisma.commandLog.create({
      data: {
        deviceId: id,
        command: `OVERRIDE_${status}`,
        status: 'SENT',
      },
    });

    // Update device status
    await prisma.device.update({
      where: { id },
      data: {
        status,
        overrideUntil: overrideUntil ? new Date(overrideUntil) : null,
      },
    });

    res.json({
      deviceId: id,
      overrideStatus: status,
      overrideUntil: overrideUntil || null,
      timestamp: new Date().toISOString(),
    });

    logger.info({
      event: 'device_override',
      deviceId: id,
      status,
      userId: req.user.userId,
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        notificationChannel: true,
        notificationTarget: true,
        telegramBotToken: true,
      },
    });

    if (user?.notificationChannel) {
      const deviceLabel = device.name || `device #${device.id}`;
      const sent = await notifyUser(
        user,
        `Manual override: ${deviceLabel} set to ${status}.`
      );
      if (!sent) {
        logger.warn({
          event: 'notification_skipped',
          userId: user.id,
          channel: user.notificationChannel,
        });
      }
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * GET /api/commands/:deviceId
 * Get command history for a device
 */
app.get('/api/commands/:deviceId', authRequired, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.deviceId, 10);
    const device = await prisma.device.findUnique({
      where: { id: deviceId, userId: req.user.userId },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const commands = await prisma.commandLog.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ commands });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
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
    await priceService.startPriceCheck(async ({ previousStatus, state }) => {
      await notifyPriceChange({ previousStatus, state });
    });

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
