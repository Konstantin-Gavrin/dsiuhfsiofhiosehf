/**
 * Configuration module
 * Manages environment variables and application settings
 */

require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',

  // API configuration
  eleringApiUrl:
    process.env.ELERING_API_URL ||
    'https://dashboard.elering.ee/api/nps/price',

  // Threshold configuration (in EUR per kWh)
  // Default: 0.10 EUR/kWh (10 cents)
  thresholdEur: parseFloat(process.env.THRESHOLD_EUR || '0.10'),

  // VAT rate for Estonia (22%)
  vatRate: 1.22,

  // Price check interval (in milliseconds)
  checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '300000', 10), // 5 minutes

  // Health check port (for Coolify)
  healthCheckEnabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
};

module.exports = config;
