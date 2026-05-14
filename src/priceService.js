/**
 * Price Service - Core business logic
 * Fetches Nord Pool prices from Elering API
 * Calculates device status based on threshold
 */

const axios = require('axios');
const logger = require('./logger');
const config = require('./config');

let lastKnownState = {
  price_eur: null,
  status: 'OFF',
  threshold_eur: config.thresholdEur,
  timestamp: null,
};

/**
 * Convert EUR/MWh to EUR/kWh with VAT
 * Formula: (price_eur_mwh / 1000) * vat_rate
 */
const convertPrice = (priceEurMwh) => {
  const pricePerKwh = priceEurMwh / 1000;
  const priceWithVat = pricePerKwh * config.vatRate;
  // Round to 6 decimal places
  return Math.round(priceWithVat * 1000000) / 1000000;
};

/**
 * Determine device status based on current price
 */
const determineStatus = (priceEur, thresholdEur) => {
  return priceEur <= thresholdEur ? 'ON' : 'OFF';
};

/**
 * Fetch current price from Elering API
 */
const fetchCurrentPrice = async () => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setHours(start.getHours() - 1);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);

    // Format timestamps as YYYY-MM-DD'T'HH:mm:ss'Z'
    const startStr = start.toISOString().split('.')[0] + 'Z';
    const endStr = end.toISOString().split('.')[0] + 'Z';

    const response = await axios.get(config.eleringApiUrl, {
      params: {
        start: startStr,
        end: endStr,
        fields: 'ee',
      },
      timeout: 10000,
    });

    // Check if response is successful
    if (!response.data || !response.data.success) {
      logger.error({
        event: 'api_error_response',
        message: 'Elering API returned error or no success flag',
      });
      return null;
    }

    // Get price data for Estonia (ee field)
    const priceDataEe = response.data.data?.ee;
    if (!priceDataEe || priceDataEe.length === 0) {
      logger.error({
        event: 'api_empty_response',
        message: 'Elering API returned empty data for Estonia',
      });
      return null;
    }

    // Get the current hour price (latest entry)
    const currentPrice = priceDataEe[priceDataEe.length - 1];

    if (!currentPrice || !currentPrice.price) {
      logger.error({
        event: 'api_missing_price',
        message: 'Price field missing in API response',
      });
      return null;
    }

    return convertPrice(currentPrice.price);
  } catch (error) {
    const errorDetails = {
      event: 'api_failure',
      message: error.message,
    };

    if (error.response) {
      errorDetails.http_status = error.response.status;
    } else if (error.code) {
      errorDetails.error_code = error.code;
    }

    logger.error(errorDetails);
    return null;
  }
};

/**
 * Check price and update state
 */
const checkPrice = async () => {
  const currentPrice = await fetchCurrentPrice();

  if (currentPrice === null) {
    // API failed, maintain last known state
    logger.warn({
      event: 'using_cached_state',
      last_price_eur: lastKnownState.price_eur,
      status: lastKnownState.status,
    });
    return lastKnownState;
  }

  const newStatus = determineStatus(currentPrice, config.thresholdEur);

  // Log price check with all relevant fields
  logger.info({
    event: 'price_check',
    price_eur: currentPrice.toFixed(6),
    status: newStatus,
    threshold_eur: config.thresholdEur.toFixed(6),
  });

  // Update cached state
  lastKnownState = {
    price_eur: currentPrice,
    status: newStatus,
    threshold_eur: config.thresholdEur,
    timestamp: new Date().toISOString(),
  };

  return lastKnownState;
};

/**
 * Start periodic price checking
 */
const startPriceCheck = async () => {
  logger.info({
    event: 'service_started',
    interval_ms: config.checkIntervalMs,
    threshold_eur: config.thresholdEur.toFixed(6),
  });

  // Initial check
  await checkPrice();

  // Periodic checks
  setInterval(async () => {
    await checkPrice();
  }, config.checkIntervalMs);
};

/**
 * Get current state (for API endpoint)
 */
const getState = () => {
  return {
    status: lastKnownState.status,
    current_price_eur: lastKnownState.price_eur || 0,
    threshold: config.thresholdEur,
  };
};

/**
 * Fetch 24-hour price forecast from Elering API
 */
const getForecast = async () => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setHours(start.getHours() - 1);
    const end = new Date(now);
    end.setHours(end.getHours() + 24);

    const startStr = start.toISOString().split('.')[0] + 'Z';
    const endStr = end.toISOString().split('.')[0] + 'Z';

    const response = await axios.get(config.eleringApiUrl, {
      params: {
        start: startStr,
        end: endStr,
        fields: 'ee',
      },
      timeout: 10000,
    });

    if (!response.data || !response.data.data?.ee) {
      return [];
    }

    return response.data.data.ee.map(item => ({
      timestamp: item.timestamp,
      price_eur: convertPrice(item.price),
      status: determineStatus(convertPrice(item.price), config.thresholdEur),
    }));
  } catch (error) {
    logger.error({
      event: 'forecast_fetch_failed',
      message: error.message,
    });
    return [];
  }
};

module.exports = {
  startPriceCheck,
  getState,
  checkPrice,
  getForecast,
};
