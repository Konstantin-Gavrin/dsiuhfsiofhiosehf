# 🔧 Prometheus & Loki Integration Guide

## 📋 Что добавлено

### Backend изменения

#### 1. **src/metrics.js** - Prometheus метрики
Инициализирует все пользовательские метрики:
- HTTP запросы (count, latency)
- Ошибки (count по типам)
- Устройства (активные, команды)
- Цены (текущая, обновления)
- Пользователи (активные)
- Сбережения (в EUR)

**Использование:**
```javascript
const { httpRequests, activeDevices, errorCount } = require('./metrics');

// Увеличить счетчик
httpRequests.inc({ method: 'GET', route: '/api/devices', status: 200 });

// Установить gauge значение
activeDevices.set(5);

// Наблюдать гистограмму
httpDuration.observe({ method: 'GET', route: '/api/devices', status: 200 }, 0.15);
```

#### 2. **src/lokiLogger.js** - Loki логирование
Отправляет структурированные логи в Loki через HTTP:
- Буферизирует логи для batch отправки
- Поддерживает уровни: INFO, WARN, ERROR, CRITICAL
- Также логирует в консоль для Docker logs

**Использование:**
```javascript
const lokiLogger = require('./lokiLogger');

lokiLogger.info('device_created', { deviceId: 1, name: 'Boiler' });
lokiLogger.error('price_fetch_error', { error: 'Timeout' });
```

#### 3. **src/server.js** - Интеграция метрик
- Добавлен middleware для отслеживания HTTP метрик
- Добавлен endpoint `/metrics` для Prometheus
- Интегрированы lokiLogger и Prometheus метрики во все endpoints
- Обновлены обработчики ошибок для логирования

**Ключевые endpoint:**
```
GET /metrics - Prometheus metrics (format: text/plain; version=0.0.4)
GET /health - Health check
GET /api/devices - Device list с метриками
POST /api/devices/:id/override - Device control с логированием
```

### Docker & Инфраструктура изменения

#### 1. **docker-compose.yml** - Обновлен
- ✅ Добавлен **prometheus** сервис (port 9090)
- ✅ Добавлен **grafana** сервис (port 3001)
- ✅ Обновлен **loki** с конфиг файлом и портом 3100
- ✅ Настроен Docker logging driver для power-bot (отправляет логи в Loki)
- ✅ Добавлены volumes для persistence: loki-storage, prometheus-storage, grafana-storage

#### 2. **prometheus.yml** - Prometheus конфиг
Настраивает Prometheus для:
- Скрейпа `/metrics` с backend'а каждые 15 секунд
- Хранения time-series данных
- Форматирования job labels

#### 3. **grafana-provisioning/**
- **datasources/prometheus.yml** - Регистрирует Prometheus и Loki
- **dashboards/monitoring-main.json** - Main dashboard (9 панелей)
- **dashboards/monitoring-devices.json** - Device analysis (5 панелей)
- **dashboards/monitoring-logs.json** - Log analysis (3 панели)
- **dashboards/dashboards.yml** - Dashboard provisioning config

### package.json
- ✅ Добавлена зависимость: `"prom-client": "^15.1.0"`

---

## 🚀 Запуск

### Вариант 1: Linux/macOS
```bash
chmod +x setup-monitoring.sh
./setup-monitoring.sh
```

### Вариант 2: Windows PowerShell
```powershell
.\setup-monitoring.ps1
```

### Вариант 3: Manual (Все ОС)
```bash
# 1. Установить зависимости
npm install

# 2. Запустить Docker
docker-compose up -d

# 3. Подождать 30 секунд инициализации

# 4. Открыть Grafana
# http://localhost:3001 (admin/admin)
```

---

## 📊 Основные Меtrики

### HTTP Traffic
```
rate(http_requests_total[5m])              # Requests/sec
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))  # P95 latency
rate(http_requests_total{status=~"5.."}[5m])  # Error rate
```

### Device Operations
```
device_commands_success_total              # Total success count
device_commands_failed_total               # Total failure count
rate(device_commands_success_total[5m])    # Success rate
```

### Price Monitoring
```
electricity_price_eur                      # Current price
rate(price_updates_total[5m])              # Update frequency
price_updates_total{status="error"}        # Failed updates
```

### System Health
```
active_users                               # Logged-in users
active_devices                             # Online devices
errors_total                               # Total errors by type
```

---

## 📝 Структура Логов в Loki

Каждый лог имеет формат:
```json
{
  "timestamp": "2024-05-14T10:30:45.123Z",
  "level": "INFO",
  "event": "device_created",
  "deviceId": 1,
  "name": "Boiler",
  "userId": 10
}
```

### Log Levels
- **INFO**: Нормальные события (создание устройства, логин)
- **WARN**: Предупреждения (медленный API, retries)
- **ERROR**: Ошибки (failed command, timeout)
- **CRITICAL**: Критичные проблемы (DB error, shutdown)

### Loki Queries
```
# Все логи
{service="power-bot"}

# Ошибки только
{service="power-bot", level="ERROR"}

# Событие device_created
{service="power-bot"} | json | event="device_created"

# За последний час
{service="power-bot"} | since(1h)

# JSON парсинг
{service="power-bot"} | json | status="200"
```

---

## 🎯 Grafana Dashboards

### 1. Main Dashboard (Обзор системы)
**URL**: http://localhost:3001/d/monitoring-main

Панели:
| Панель | Метрика | Цель |
|--------|---------|------|
| Current Price | `electricity_price_eur` | Текущая цена с цветовой кодировкой |
| Active Devices | `active_devices` | Количество онлайн устройств |
| Active Users | `active_users` | Количество активных пользователей |
| Savings | `savings_eur` | Сумма сэкономленных средств |
| Price History | `electricity_price_eur` (chart) | 24-часовой график цены |
| Request Rate | `rate(http_requests_total[5m])` | Requests/sec |
| Response Time P95 | `histogram_quantile(0.95, ...)` | 95th percentile latency |
| Error Rate | `rate(errors_total[5m])` | Errors/sec |
| Recent Logs | `{service="power-bot"}` | Real-time logs |

### 2. Device Analysis Dashboard
**URL**: http://localhost:3001/d/monitoring-devices

Панели:
| Панель | Метрика | Цель |
|--------|---------|------|
| Commands Success Rate | `rate(device_commands_success_total[5m])` | Успешные команды |
| Commands Failed | `rate(device_commands_failed_total[5m])` | Ошибки команд |
| Total Commands | `sum(...) by (device_id)` | Команды по устройствам |
| Price Updates OK | `rate(price_updates_total{status="success"}[1h])` | Частота обновлений |
| Price Updates Failed | `rate(price_updates_total{status="error"}[1h])` | Ошибки обновлений |

### 3. Log Analysis Dashboard
**URL**: http://localhost:3001/d/monitoring-logs

Панели:
| Панель | Query | Цель |
|--------|-------|------|
| All Logs | `{service="power-bot"}` | Все события в real-time |
| ERROR Logs | `{service="power-bot", level="ERROR"}` | Только ошибки |
| WARN Logs | `{service="power-bot", level="WARN"}` | Предупреждения |

---

## 🔍 Примеры Использования в Коде

### Логирование события
```javascript
const lokiLogger = require('./lokiLogger');

// Успешная операция
lokiLogger.info('vacation_mode_toggled', {
  userId: 10,
  vacationMode: true
});

// Предупреждение
lokiLogger.warn('price_update_slow', {
  duration_ms: 5000,
  threshold_ms: 3000
});

// Ошибка
lokiLogger.error('device_connection_failed', {
  deviceId: 5,
  error: 'Connection timeout',
  retryCount: 3
});

// Критичное событие
lokiLogger.critical('database_offline', {
  service: 'power-bot',
  error: 'Cannot connect to database',
  action: 'attempting_reconnect'
});
```

### Отслеживание метрик
```javascript
const { deviceCommandsSuccess, activeDevices } = require('./metrics');

// Успешная команда
deviceCommandsSuccess.inc({
  device_id: '5',
  command: 'TOGGLE_ON'
});

// Обновить gauge
const allDevices = await prisma.device.findMany();
activeDevices.set(allDevices.length);
```

---

## 🛠️ Проверка Компонентов

### Prometheus скрейпит метрики?
```bash
curl http://localhost:3000/metrics | head -20
```

### Loki получает логи?
```bash
curl 'http://localhost:3100/loki/api/v1/query?query={service="power-bot"}'
```

### Grafana готова?
```bash
curl http://localhost:3001/api/health
```

### Prometheus видит target?
```bash
curl http://localhost:9090/api/v1/targets
```

---

## 📚 Документация

- **MONITORING.md** - Подробная документация по мониторингу
- **setup-monitoring.sh** - Linux/macOS setup скрипт
- **setup-monitoring.ps1** - Windows PowerShell скрипт

---

## 🎯 Next Steps

1. ✅ **Run monitoring**: `./setup-monitoring.ps1` на Windows или `./setup-monitoring.sh` на Linux
2. 🔍 **Verify metrics**: http://localhost:3000/metrics должен вернуть Prometheus формат
3. 📊 **Check Grafana**: http://localhost:3001 (admin/admin) - должны быть 3 dashboard'а
4. 📝 **Check Logs**: Grafana → Logs Dashboard - должны быть видны логи сервиса
5. 🎯 **Create Alerts**: Добавить alert rules в prometheus.yml для критичных событий

---

**Last Updated**: 2024-05-14  
**Version**: 1.0.0
