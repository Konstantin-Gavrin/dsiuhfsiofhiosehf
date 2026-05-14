# 📊 Prometheus & Loki Monitoring Setup

## Обзор

Проект интегрирован с **Prometheus** (сбор метрик) и **Loki** (логирование) через **Grafana** (визуализация).

### Архитектура

```
┌─────────────────────────────────────────────────────┐
│           Power Bot Backend (Node.js)               │
├─────────────────────────────────────────────────────┤
│ • Prometheus Client (prom-client)                  │
│ • Loki Logger (lokiLogger.js)                      │
│ • GET /metrics endpoint                             │
│ • Structured JSON logging to stdout                │
└─────────────────────────────────────────────────────┘
    ↓
    ├─→ Prometheus (http://prometheus-master:9090)
    │   • Scrapes /metrics every 15 seconds
    │   • Stores time-series data
    │
    └─→ Loki (http://loki-master:3100)
        • Receives logs via Docker logging driver
        • Stores structured logs
```

## 🚀 Быстрый Старт

### 1. Установка Зависимостей

```bash
npm install
# Это установит prom-client из package.json
```

### 2. Запуск Docker Compose

```bash
docker-compose up -d
```

Сервисы, которые будут запущены:
- **power-bot**: Backend (port 3000)
- **frontend**: React UI (port 8080)
- **prometheus**: Metrics collector (port 9090)
- **loki**: Log aggregator (port 3100)
- **grafana**: Dashboard (port 3001)
- **promtail**: Log shipper

### 3. Доступ к Grafana

Откройте браузер:
```
http://localhost:3001
```

**Credentials:**
- Username: `admin`
- Password: `admin`

## 📈 Собираемые Метрики

### HTTP Метрики
- `http_requests_total` - Total requests by method, route, status
- `http_request_duration_seconds` - Request latency histogram

### Device Метрики
- `device_commands_success_total` - Успешные команды устройств
- `device_commands_failed_total` - Неудачные команды устройств

### Price Метрики
- `electricity_price_eur` - Текущая цена электроэнергии
- `price_updates_total` - Количество обновлений цены

### System Метрики
- `active_devices` - Кол-во активных устройств
- `active_users` - Кол-во активных пользователей
- `savings_eur` - Сумма сэкономленных средств
- `errors_total` - Общее кол-во ошибок

## 📝 Структурированное Логирование

Все логи автоматически отправляются в **Loki** с меткой `service=power-bot`.

### Примеры Логов

```javascript
// В backend коде
const lokiLogger = require('./lokiLogger');

// INFO логи
lokiLogger.info('device_created', { 
  deviceId: 1, 
  name: 'Boiler', 
  userId: 10 
});

// WARN логи
lokiLogger.warn('price_update_slow', { 
  duration_ms: 2500 
});

// ERROR логи
lokiLogger.error('device_override_error', { 
  deviceId: 5, 
  error: 'Connection timeout' 
});

// CRITICAL логи
lokiLogger.critical('database_connection_lost', { 
  attempts: 5 
});
```

## 🎯 Dashboards

### 1. Main Dashboard (Мониторинг системы)
**URL**: http://localhost:3001/d/monitoring-main

Панели:
- 💰 Current Electricity Price
- 📱 Active Devices Count
- 👥 Active Users
- 💾 Savings Amount
- 📊 Price History Chart
- 📈 HTTP Request Rate
- ⏱️ Response Time (P95)
- 🔴 Error Rate

### 2. Device Analysis Dashboard
**URL**: http://localhost:3001/d/monitoring-devices

Панели:
- ✅ Device Commands Success Rate
- ❌ Device Commands Failed
- 📊 Total Commands by Device
- 🔄 Price Update Status
- ⚠️ Price Update Errors

### 3. Log Analysis Dashboard
**URL**: http://localhost:3001/d/monitoring-logs

Панели:
- 📋 All Logs (Real-time)
- 🔴 ERROR Logs
- ⚠️ WARN Logs

## 🔧 Конфигурация

### Prometheus (`prometheus.yml`)

Скрейпит metrics endpoint каждые 15 секунд:

```yaml
scrape_configs:
  - job_name: 'power-bot'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Docker Logging Driver

В `docker-compose.yml` настроена отправка логов в Loki:

```yaml
logging:
  driver: loki
  options:
    loki-url: "http://loki-master:3100/loki/api/v1/push"
    loki-batch-size: "400"
    loki-retries: "5"
    labels: "service=power-bot"
```

### Grafana Datasources

В `grafana-provisioning/datasources/prometheus.yml`:

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus-master:9090
    
  - name: Loki
    type: loki
    url: http://loki-master:3100
```

## 🔍 Примеры Prometheus Queries

### Текущая цена электроэнергии
```
electricity_price_eur
```

### HTTP Request Rate (requests/sec)
```
rate(http_requests_total[5m])
```

### Request Latency P95
```
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Error Rate
```
rate(errors_total[5m])
```

### Успешные команды устройств за час
```
sum(rate(device_commands_success_total[1h])) by (device_id)
```

## 🔍 Примеры Loki LogQL Queries

### Все логи сервиса
```
{service="power-bot"}
```

### Только ERROR логи
```
{service="power-bot", level="ERROR"}
```

### Логи конкретного события
```
{service="power-bot"} | json | event="device_created"
```

### Логи за последний час
```
{service="power-bot"} | since(1h)
```

## 🛠️ Отладка

### Проверить, отправляются ли метрики

```bash
curl http://localhost:3000/metrics
```

Вы должны увидеть список метрик в формате Prometheus.

### Проверить, попадают ли логи в Loki

```bash
curl 'http://localhost:3100/loki/api/v1/query?query={service="power-bot"}'
```

### Посмотреть логи в реальном времени (tail)

```bash
docker logs -f power-bot
```

### Проверить статус Prometheus

```bash
curl http://localhost:9090/api/v1/status/config
```

## 📊 Примеры Alert Rules

Добавьте в `prometheus.yml` для создания алертов:

```yaml
rule_files:
  - 'alert_rules.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

### Пример `alert_rules.yml`:

```yaml
groups:
  - name: power_bot
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighPrice
        expr: electricity_price_eur > 0.20
        for: 10m
        annotations:
          summary: "Electricity price above threshold"

      - alert: DeviceOffline
        expr: rate(device_commands_failed_total[5m]) > 0.5
        for: 5m
        annotations:
          summary: "Device seems to be offline"
```

## 🐳 Docker Networking

Сервисы общаются через Docker network `default` (bridge):

- Backend обращается к Loki через: `http://loki:3100`
- Prometheus скрейпит backend: `http://power-bot:3000/metrics`
- Grafana подключается к Prometheus: `http://prometheus:9090`
- Grafana подключается к Loki: `http://loki:3100`

## 🚨 Troubleshooting

### Графана не видит datasources

1. Проверьте, запущены ли Prometheus и Loki:
   ```bash
   docker ps | grep prometheus
   docker ps | grep loki
   ```

2. Перезагрузите Grafana:
   ```bash
   docker-compose restart grafana
   ```

### Логи не отправляются в Loki

1. Проверьте, установлен ли Loki logging driver:
   ```bash
   docker plugin ls | grep loki
   ```

2. Если не установлен, установите:
   ```bash
   docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions
   ```

3. Перезагрузите docker:
   ```bash
   docker-compose restart power-bot
   ```

### Metrics endpoint не возвращает данные

1. Проверьте, что backend запущен:
   ```bash
   curl http://localhost:3000/health
   ```

2. Проверьте логи backend:
   ```bash
   docker logs power-bot
   ```

3. Убедитесь, что prom-client установлен:
   ```bash
   npm list prom-client
   ```

## 📚 Полезные Ссылки

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [prom-client npm](https://www.npmjs.com/package/prom-client)

## 🎯 Следующие Шаги

1. **Добавить больше метрик**: Расширить `src/metrics.js` с дополнительными метриками
2. **Создать Alert Rules**: Добавить alert rules в Prometheus
3. **Настроить Notification**: Отправлять alerts в Slack/Email
4. **Оптимизировать Dashboards**: Улучшить визуализацию данных
5. **Добавить SLOs**: Определить Service Level Objectives

---

**Version**: 1.0.0  
**Last Updated**: 2024-05-14
