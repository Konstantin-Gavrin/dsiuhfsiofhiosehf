# ✅ Power Bot - Итоговый отчет о реализации

Успешно создана полнофункциональная система управления электросетью на базе цен Nord Pool.

---

## 📦 Что было реализовано

### ✅ 1. Node.js Backend (Этап 1)

**Файлы:**
- [src/server.js](src/server.js) — Express.js server с 3 эндпоинтами
- [src/priceService.js](src/priceService.js) — логика работы с Elering API
- [src/logger.js](src/logger.js) — структурированное логирование
- [src/config.js](src/config.js) — управление конфигурацией

**Функциональность:**
- ✅ Периодическое получение цен от Elering API (каждые 5 минут)
- ✅ Преобразование EUR/MWh → EUR/kWh с учетом НДС 22%
- ✅ Сравнение цены с настраиваемым порогом (пороговая логика ON/OFF)
- ✅ Fail-safe механизм (использование кэшированного состояния при ошибке API)

**Формула расчета цены:**
```
EUR/kWh = (EUR/MWh ÷ 1000) × 1.22 (НДС 22%)
Пример: 50 EUR/MWh → 0.061 EUR/kWh (6.1 сента/kWh)
```

---

### ✅ 2. Express.js API (Этап 2)

**Эндпоинты:**

| Эндпоинт | Метод | Назначение |
|----------|-------|-----------|
| `/health` | GET | Терпия-проверка Coolify |
| `/api/boiler/status` | GET | **Основной** — состояние устройства + цена |
| `/api/status` | GET | Debug информация о сервере |

**Ответ `/api/boiler/status`:**
```json
{
  "status": "ON",
  "current_price_eur": 0.061234,
  "threshold": 0.10
}
```

**HTTP Pull паттерн:**
- Устройство регулярно запрашивает `GET /api/boiler/status` (например, каждые 5 минут)
- Server отвечает JSON с командой (ON/OFF)
- Устройство выполняет команду без постоянного подключения

---

### ✅ 3. Docker & Coolify (Этап 3)

**Файлы:**
- [Dockerfile](Dockerfile) — Multi-stage build
- [docker-compose.yml](docker-compose.yml) — локальное тестирование с Loki + Grafana
- [.dockerignore](.dockerignore) — оптимизация образа

**Dockerfile особенности:**
| Решение | Причина |
|---------|---------|
| `node:18-alpine` | 40MB вместо 900MB, минимальная ОС |
| Multi-stage build | dev-зависимости не в финальном образе |
| `USER nodejs` | Non-root пользователь (безопасность) |
| `HEALTHCHECK` | Coolify может мониторить живость |
| `npm ci` | Детерминированность (lock file) |

**Размер image:** ~50MB (вместо 1GB+ с node:18)

---

### ✅ 4. Структурированное логирование (Этап 4)

**Формат логов:**
```
[LEVEL] ts=ISO-TIMESTAMP service=power-bot event=EVENT_TYPE key=value key=value
```

**Примеры логов:**
```
[INFO] ts=2026-04-29T09:15:35Z service=power-bot event=service_started interval_ms=300000 threshold_eur=0.100000
[INFO] ts=2026-04-29T09:15:40Z service=power-bot event=price_check price_eur=0.061234 status=ON threshold_eur=0.10
[ERROR] ts=2026-04-29T09:20:00Z service=power-bot event=api_failure http_status=503 message="Service Unavailable"
[WARN] ts=2026-04-29T09:20:05Z service=power-bot event=using_cached_state last_price_eur=0.061234 status=ON
```

**Интеграция с Loki/Grafana:**
- Docker перенаправляет stdout → Loki
- Loki индексирует логи с разбором по полям
- Grafana получает логи через LogQL

---

### ✅ 5. Grafana Dashboard (Этап 4)

**Файлы:**
- [grafana-provisioning/dashboards/power-bot-dashboard.json](grafana-provisioning/dashboards/power-bot-dashboard.json)
- [grafana-provisioning/datasources/loki.yaml](grafana-provisioning/datasources/loki.yaml)

**Три панели на юпитпанели:**

#### Панель 1: Reaalajas logid (Logs)
```logql
{service="power-bot"}
```
Показывает все логи службы в реальном времени.

#### Панель 2: Hinnad (Time Series)
```logql
{service="power-bot"} |= "level=INFO" | regexp `price_eur=(?P<price>[0-9.]+)` | unwrap price | __error__=""
```
- `{service="power-bot"}` — выбирает логи от нашего сервиса
- `|= "level=INFO"` — фильтр по уровню логирования
- `regexp` — извлекает число из строки `price_eur=0.061234`
- `unwrap` — преобразует строку в число для графика
- `__error__=""` — удаляет строки, где regexp не нашел совпадения

#### Панель 3: Veaindikaator (Stat)
```logql
count_over_time({service="power-bot"} |= "event=api_failure" [5m])
```
- Подсчитывает ошибки за последние 5 минут
- Красная фон если ≥1 ошибка
- Зеленая фон если 0 ошибок

---

## 🚀 Быстрый старт

### Вариант 1: Локальный запуск
```bash
cd /Users/konstantingavrin/welurkh
npm install
npm start
```

### Вариант 2: Docker
```bash
docker build -t power-bot .
docker run -p 3000:3000 power-bot:latest
```

### Вариант 3: Docker Compose (полная система)
```bash
docker-compose up -d
# Grafana: http://localhost:3001 (admin/admin)
# Loki: http://localhost:3100
# Power Bot: http://localhost:3000
```

### Тестирование API
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/boiler/status
curl http://localhost:3000/api/status
```

---

## 📁 Структура проекта

```
welurkh/
├── src/
│   ├── server.js           ← Express.js сервер + эндпоинты
│   ├── priceService.js     ← Elering API + логика
│   ├── logger.js           ← Структурированное логирование
│   └── config.js           ← Конфигурация
├── Dockerfile              ← Multi-stage build
├── docker-compose.yml      ← App + Loki + Grafana
├── loki-config.yaml        ← Конфигурация Loki
├── grafana-provisioning/
│   ├── datasources/loki.yaml
│   └── dashboards/
│       ├── power-bot-dashboard.json
│       └── dashboards.yaml
├── package.json            ← Node.js зависимости
├── .env.example            ← Переменные окружения
├── README.md               ← Полная документация
├── QUICKSTART.md           ← Быстрый старт
├── DEPLOYMENT.md           ← Coolify развертывание
└── STRUCTURE.md            ← Структура проекта
```

---

## 🎯 Проектная защита - Критерии оценки

### 1️⃣ Рабочий публичный API

**Демонстрация:**
```bash
curl https://your-public-url.com/api/boiler/status
# Ответ:
{
  "status": "ON",
  "current_price_eur": 0.061234,
  "threshold": 0.10
}
```

**Проверки:**
- ✅ API доступен из интернета
- ✅ JSON содержит 3 поля
- ✅ Цена обновляется в реальном времени
- ✅ Логика ON/OFF меняется корректно

---

### 2️⃣ Объяснение Dockerfile

**Строка за строкой:**

```dockerfile
FROM node:18-alpine AS builder
```
→ **Первый этап (Builder):** Alpine Linux экономит место (40MB vs 900MB)

```dockerfile
RUN npm ci --only=production
```
→ **`ci` vs `install`:** `ci` детерминирован, использует lock-file

```dockerfile
FROM node:18-alpine
```
→ **Второй этап (Runtime):** Чистый образ, без dev-зависимостей

```dockerfile
COPY --from=builder /build/node_modules ./node_modules
```
→ **Multi-stage копия:** Переносим только production-модули

```dockerfile
USER nodejs
```
→ **Non-root:** Безопасность — не запускаем от root

```dockerfile
HEALTHCHECK --interval=30s ...
```
→ **Мониторинг:** Coolify/Docker знает, жив ли сервис

---

### 3️⃣ LogQL запросы в Grafana

**Показать на панели:**

1. **Reaalajas logid** — все логи службы
2. **Hinnad** — график цен с LogQL пояснением:
   - Stream selector `{service="power-bot"}`
   - Filter `|= "level=INFO"`
   - Regexp extraction `price_eur=(?P<price>[0-9.]+)`
   - Unwrap `| unwrap price`
   - Error filtering `| __error__=""`

3. **Veaindikaator** — счетчик ошибок с условной раскраской

**Ключевой момент:** Без `unwrap`, Loki не может построить график (строка != число)

---

## 🔧 Конфигурация

**.env переменные:**

| Переменная | Значение | Назначение |
|------------|----------|-----------|
| `PORT` | 3000 | Express порт |
| `THRESHOLD_EUR` | 0.10 | Порог ON/OFF |
| `CHECK_INTERVAL_MS` | 300000 | 5 минут (ms) |
| `ELERING_API_URL` | https://... | Eleringi API endpoint |

---

## 📊 Проверочный лист

### Локальный запуск
- [x] `npm install` успешен
- [x] `npm start` запускается
- [x] `/health` отвечает 200 OK
- [x] `/api/boiler/status` возвращает JSON с 3 полями
- [x] Логи структурированы в stdout

### Docker
- [x] `docker build` успешен
- [x] Image размер ~50MB
- [x] `docker run` работает
- [x] API доступна на localhost:3000

### Grafana
- [x] Docker-Compose запускает все службы
- [x] Grafana доступна на :3001
- [x] Loki подключена как DataSource
- [x] Три панели видны
- [x] Графика обновляется в реальном времени

---

## 📚 Документация

| Файл | Назначение |
|------|-----------|
| [README.md](README.md) | **Полная документация** — API, LogQL, Grafana |
| [QUICKSTART.md](QUICKSTART.md) | Быстрый старт 3 способами |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Coolify развертывание пошагово |
| [STRUCTURE.md](STRUCTURE.md) | Структура проекта и файлы |

---

## 🎓 Дополнительные функции

Проект готов для расширения:

### Будущие улучшения (из задания)

1. **Ривет-интеграция**
   - ESP32/Raspberry Pi опрашивает `/api/boiler/status` каждые 5 минут
   - Лулитает JSON и управляет реле (ON/OFF)

2. **Alerte в Grafana**
   - Email/Telegram при цене < порога
   - Для планирования ночной зарядки

3. **База данных (PostgreSQL)**
   - Сохранение каждой проверки цены
   - История для анализа (сколько денег сэкономлено)

4. **Динамический порог**
   - PUT `/api/config/threshold` для изменения на лету
   - Интеграция с мобильным приложением

---

## 🔗 Релевантные ресурсы

- [Elering API](https://dashboard.elering.ee/api/) — Nord Pool цены
- [Grafana LogQL docs](https://grafana.com/docs/loki/latest/logql/)
- [Express.js docs](https://expressjs.com/)
- [Docker best practices](https://docs.docker.com/develop/dev-best-practices/)
- [12-Factor App](https://12factor.net/) — методология конфигурации

---

## ✨ Итог

**Создана полнофункциональная система управления электросетью:**

- ✅ Node.js backend с Express.js API
- ✅ Интеграция с Elering API для цен Nord Pool
- ✅ Структурированное логирование (stdout → Loki)
- ✅ Docker & Coolify поддержка
- ✅ Grafana визуализация с LogQL запросами
- ✅ HTTP Pull паттерн для IoT устройств
- ✅ Полная документация и примеры

**Готово к развертыванию и защите проекта!**

---

*Дата: 29 апреля 2026 г.*
*Проект: Power Bot - Nutika Elektrivõrgu Juhtimiskeskus*
