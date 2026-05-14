const prometheus = require('prom-client');

// Создаем реестр метрик
const register = new prometheus.Registry();

// Коллектор default метрик (memory, cpu, gc и т.д.)
prometheus.collectDefaultMetrics({ register });

// Пользовательские метрики

// Counter для HTTP запросов
const httpRequests = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Histogram для latency
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// Gauge для активных подключений
const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

// Counter для ошибок
const errorCount = new prometheus.Counter({
  name: 'errors_total',
  help: 'Total errors occurred',
  labelNames: ['error_type'],
  registers: [register]
});

// Gauge для активных устройств
const activeDevices = new prometheus.Gauge({
  name: 'active_devices',
  help: 'Number of active devices',
  registers: [register]
});

// Gauge для текущей цены
const currentPrice = new prometheus.Gauge({
  name: 'electricity_price_eur',
  help: 'Current electricity price in EUR/kWh',
  registers: [register]
});

// Gauge для активных пользователей
const activeUsers = new prometheus.Gauge({
  name: 'active_users',
  help: 'Number of active users',
  registers: [register]
});

// Counter для успешных команд устройств
const deviceCommandsSuccess = new prometheus.Counter({
  name: 'device_commands_success_total',
  help: 'Total successful device commands',
  labelNames: ['device_id', 'command'],
  registers: [register]
});

// Counter для неудачных команд устройств
const deviceCommandsFailed = new prometheus.Counter({
  name: 'device_commands_failed_total',
  help: 'Total failed device commands',
  labelNames: ['device_id', 'command'],
  registers: [register]
});

// Counter для цены обновлений
const priceUpdates = new prometheus.Counter({
  name: 'price_updates_total',
  help: 'Total price updates from Elering API',
  labelNames: ['status'], // success, error
  registers: [register]
});

// Gauge для savings
const savedAmount = new prometheus.Gauge({
  name: 'savings_eur',
  help: 'Current savings in EUR',
  registers: [register]
});

module.exports = {
  register,
  httpRequests,
  httpDuration,
  activeConnections,
  errorCount,
  activeDevices,
  currentPrice,
  activeUsers,
  deviceCommandsSuccess,
  deviceCommandsFailed,
  priceUpdates,
  savedAmount
};
