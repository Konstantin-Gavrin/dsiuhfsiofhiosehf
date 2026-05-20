const getTimestamp = () => new Date().toISOString();

const logLevels = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

const formatLog = (level, fields) => {
  return JSON.stringify({
    ts: getTimestamp(),
    service: 'power-bot',
    level,
    ...fields,
  });
};

const logger = {
  info: (fields) => {
    console.log(formatLog(logLevels.INFO, fields));
  },

  warning: (fields) => {
    console.warn(formatLog(logLevels.WARNING, fields));
  },

  error: (fields) => {
    console.error(formatLog(logLevels.ERROR, fields));
  },

  critical: (fields) => {
    console.error(formatLog(logLevels.CRITICAL, fields));
  },
};

logger.warn = logger.warning;

module.exports = logger;
