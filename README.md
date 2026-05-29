# Nutika Elektrivorgu Juhtimiskeskus

Fullstack solution for smart device power control based on Nord Pool spot prices (Elering API).

## Implemented modules

- User management and auth:
  - JWT auth, bcrypt password hashing
  - Roles: master and user
  - Master endpoints for user list/update/delete/deactivate
- Device management:
  - Create/update/delete devices with per-device threshold
  - Connection test on device create/update
  - Command logging with reason, success flag and price context
- Control center:
  - Current spot price and device statuses
  - Manual override ON/OFF/AUTO
  - Vacation mode (disables non-critical devices)
  - Automation runner with interval and manual refresh
- Additional features:
  - Savings report (day/week/month)
  - 24h forecast from Elering with planned actions per device
  - Notification channels: Discord webhook or Telegram bot

## Reliability and edge-case handling

- Strict server-side payload validation
- Graceful degradation when Elering API is unavailable (cached state)
- Negative price rule handled explicitly (force ON)
- Structured JSON logs with levels: info, warning, error, critical

## Observability

- `/metrics` endpoint with Prometheus format:
  - requests total
  - active sessions
  - device command count
  - HTTP latency p50/p95/p99
  - process memory and uptime
- Loki + Promtail integration for logs
- Grafana provisioned with:
  - logs dashboard
  - metrics/reliability dashboard

## Test coverage

Automated tests included for critical logic:

- price conversion and threshold decision
- savings calculation
- auth middleware
- command dispatch
- health endpoint integration

Run tests:

```bash
npm test
npm run test:coverage
```

## Local run

1. Install dependencies:

```bash
npm install
cd frontend/frontend && npm install
```

2. Configure env:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Run backend:

```bash
npm run dev
```

5. Run frontend:

```bash
cd frontend/frontend
npm run dev
```

## Docker and Compose

- Backend image: root `Dockerfile`
- Frontend image: `frontend/Dockerfile`
- Stack with Loki, Promtail, Prometheus and app: `docker-compose.yml`
- DB stack: `docker-compose.db.yml`

## CI/CD

GitHub Actions workflow: `.github/workflows/publish-image.yml`

- Feature branches + PRs: lint, tests, audits, frontend build
- Main branch: quality checks + image build/push + Coolify webhook deploy

Required secret for deploy step:

- `COOLIFY_WEBHOOK_URL`

## Key API routes

- `POST /api/register`
- `POST /api/login`
- `GET /api/users` (master)
- `PATCH /api/users/:id` (master)
- `GET /api/devices`
- `POST /api/devices`
- `PUT /api/devices/:id`
- `DELETE /api/devices/:id`
- `POST /api/devices/:id/override`
- `GET /api/control-center`
- `POST /api/control-center/refresh`
- `GET /api/forecast`
- `GET /api/reports/savings?period=day|week|month`
- `POST /api/vacation-mode`
- `GET /api/notifications/settings`
- `POST /api/notifications/settings`
- `POST /api/notifications/test`
- `GET /health`
- `GET /metrics`
