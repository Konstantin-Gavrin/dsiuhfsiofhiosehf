/**
 * Configuration module
 * Manages environment variables and application settings
 */

require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  eleringApiUrl:
    process.env.ELERING_API_URL ||
    'https://dashboard.elering.ee/api/nps/price',
  thresholdEur: parseFloat(process.env.THRESHOLD_EUR || '0.10'),
  vatRate: 1.22,
  checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '300000', 10), // 5 minutes
  healthCheckEnabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10),
  alertHighPriceEur: parseFloat(process.env.ALERT_HIGH_PRICE_EUR || '0.25'),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
};

module.exports = config;
