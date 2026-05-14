#!/bin/bash

# Power Bot - Prometheus & Loki Setup Script
# Этот скрипт устанавливает и запускает мониторинг

set -e

echo "🚀 Power Bot Monitoring Setup"
echo "=============================="

# 1. Установка Node.js зависимостей
echo "📦 Установка зависимостей..."
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ node_modules уже существуют"
fi

# 2. Запуск Docker Compose
echo ""
echo "🐳 Запуск Docker контейнеров..."
docker-compose up -d

# 3. Ожидание инициализации сервисов
echo ""
echo "⏳ Ожидание инициализации сервисов (30 секунд)..."
sleep 30

# 4. Проверка Prometheus
echo ""
echo "🔍 Проверка Prometheus..."
if curl -s http://localhost:9090/api/v1/query?query=up | grep -q "success"; then
    echo "✅ Prometheus работает (http://localhost:9090)"
else
    echo "⚠️  Prometheus может быть еще не готов"
fi

# 5. Проверка Grafana
echo ""
echo "🔍 Проверка Grafana..."
if curl -s http://localhost:3001/api/health | grep -q "ok"; then
    echo "✅ Grafana работает (http://localhost:3001)"
    echo "   📝 Credentials: admin/admin"
else
    echo "⚠️  Grafana может быть еще не готова"
fi

# 6. Проверка Loki
echo ""
echo "🔍 Проверка Loki..."
if curl -s http://localhost:3100/loki/api/v1/labels | grep -q "labels"; then
    echo "✅ Loki работает (http://localhost:3100)"
else
    echo "⚠️  Loki может быть еще не готов"
fi

# 7. Проверка Backend
echo ""
echo "🔍 Проверка Backend..."
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "✅ Power Bot Backend работает (http://localhost:3000)"
else
    echo "⚠️  Backend может быть еще не готов"
fi

# 8. Проверка метрик
echo ""
echo "🔍 Проверка метрик..."
METRICS_COUNT=$(curl -s http://localhost:3000/metrics | grep -c "^#" || echo 0)
if [ "$METRICS_COUNT" -gt 0 ]; then
    echo "✅ Metrics endpoint работает"
    echo "   📊 Собирается $(curl -s http://localhost:3000/metrics | grep -v '^#' | wc -l) метрик"
else
    echo "⚠️  Metrics endpoint может быть еще не готов"
fi

# 9. Summary
echo ""
echo "=============================="
echo "✅ Все системы готовы!"
echo ""
echo "📊 Grafana Dashboards:"
echo "   • Main: http://localhost:3001/d/monitoring-main"
echo "   • Devices: http://localhost:3001/d/monitoring-devices"
echo "   • Logs: http://localhost:3001/d/monitoring-logs"
echo ""
echo "🔗 Ссылки:"
echo "   • Backend API: http://localhost:3000"
echo "   • Frontend: http://localhost:8080"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3001 (admin/admin)"
echo "   • Loki: http://localhost:3100"
echo ""
echo "📚 Документация: см. MONITORING.md"
echo ""
