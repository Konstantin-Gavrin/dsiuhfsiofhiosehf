/**
 * Structured Logger for Loki/Grafana integration
 * Logs to stdout in key-value format parseable by LogQL
 */

const getTimestamp = () => new Date().toISOString();

const logLevels = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

/**
 * Format a log entry as structured key-value pairs
 * Example: [INFO] ts=2024-01-15T14:00:00Z service=power-bot price_eur=0.05 status=ON
 */
const formatLog = (level, fields) => {
  const timestamp = getTimestamp();
  const baseFields = {
    ts: timestamp,
    service: 'power-bot',
    level: level,
  };

  const allFields = { ...baseFields, ...fields };

  // Build log line with key=value pairs
  const logLine = Object.entries(allFields)
    .map(([key, value]) => {
      // Quote string values if they contain spaces
      if (typeof value === 'string' && value.includes(' ')) {
        return `${key}="${value}"`;
      }
      return `${key}=${value}`;
    })
    .join(' ');

  return `[${level}] ${logLine}`;
};

const logger = {
  /**
   * Log info level event - successful operations
   */
  info: (fields) => {
    console.log(formatLog(logLevels.INFO, fields));
  },

  /**
   * Log warn level event - threshold changes, configuration updates
   */
  warn: (fields) => {
    console.warn(formatLog(logLevels.WARN, fields));
  },

  /**
   * Log error level event - API failures, exceptions
   */
  error: (fields) => {
    console.error(formatLog(logLevels.ERROR, fields));
  },
};

module.exports = logger;
