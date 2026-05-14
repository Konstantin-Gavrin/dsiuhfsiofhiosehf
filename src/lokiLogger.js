const axios = require('axios');

const LOKI_URL = process.env.LOKI_URL || 'http://loki-master:3100';

// Буфер для логов
let logBuffer = [];
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 секунд

// Функция для отправки логов в Loki
async function flushLogs() {
  if (logBuffer.length === 0) return;

  const logsToSend = [...logBuffer];
  logBuffer = [];

  try {
    const streams = [
      {
        stream: {
          service: 'power-bot',
          environment: process.env.NODE_ENV || 'development'
        },
        values: logsToSend.map(log => [
          Date.now() * 1000000, // Loki использует nanoseconds
          JSON.stringify(log)
        ])
      }
    ];

    await axios.post(`${LOKI_URL}/loki/api/v1/push`, { streams }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
  } catch (error) {
    // Если отправка не удалась, логируем в консоль
    console.error('[LOKI ERROR]', error.message);
    logBuffer = logsToSend; // Возвращаем логи в буфер для повторной попытки
  }
}

// Периодическая отправка логов
setInterval(flushLogs, FLUSH_INTERVAL);

// Отправка логов при завершении
process.on('exit', flushLogs);
process.on('SIGTERM', () => {
  flushLogs();
  process.exit(0);
});

function addLog(level, event, data = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data
  };

  // Добавляем в буфер
  logBuffer.push(log);

  // Если буфер переполнен, отправляем сразу
  if (logBuffer.length >= BUFFER_SIZE) {
    flushLogs();
  }

  // Также логируем в консоль
  console.log(`[${level}] ts=${log.timestamp} event=${event} ${Object.entries(data).map(([k, v]) => `${k}=${v}`).join(' ')}`);
}

module.exports = {
  addLog,
  flushLogs,
  info: (event, data) => addLog('INFO', event, data),
  warn: (event, data) => addLog('WARN', event, data),
  error: (event, data) => addLog('ERROR', event, data),
  critical: (event, data) => addLog('CRITICAL', event, data)
};
