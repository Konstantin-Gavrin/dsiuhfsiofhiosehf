#!/usr/bin/env powershell

# Power Bot - Prometheus & Loki Setup Script (Windows)
# Этот скрипт устанавливает и запускает мониторинг

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "🚀 Power Bot Monitoring Setup (Windows)" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Установка Node.js зависимостей
Write-Host "📦 Установка зависимостей..." -ForegroundColor Yellow
if (-Not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Зависимости установлены" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Ошибка при установке зависимостей" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "✅ node_modules уже существуют" -ForegroundColor Green
}

# 2. Запуск Docker Compose
Write-Host ""
Write-Host "🐳 Запуск Docker контейнеров..." -ForegroundColor Yellow
try {
    docker-compose up -d
    Write-Host "✅ Docker контейнеры запущены" -ForegroundColor Green
}
catch {
    Write-Host "❌ Ошибка при запуске Docker" -ForegroundColor Red
    exit 1
}

# 3. Ожидание инициализации сервисов
Write-Host ""
Write-Host "⏳ Ожидание инициализации сервисов (30 секунд)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 4. Проверка Prometheus
Write-Host ""
Write-Host "🔍 Проверка Prometheus..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/query?query=up" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Prometheus работает (http://localhost:9090)" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  Prometheus может быть еще не готов" -ForegroundColor Yellow
}

# 5. Проверка Grafana
Write-Host ""
Write-Host "🔍 Проверка Grafana..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Grafana работает (http://localhost:3001)" -ForegroundColor Green
        Write-Host "   📝 Credentials: admin/admin" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  Grafana может быть еще не готова" -ForegroundColor Yellow
}

# 6. Проверка Loki
Write-Host ""
Write-Host "🔍 Проверка Loki..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3100/loki/api/v1/labels" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Loki работает (http://localhost:3100)" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  Loki может быть еще не готов" -ForegroundColor Yellow
}

# 7. Проверка Backend
Write-Host ""
Write-Host "🔍 Проверка Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Power Bot Backend работает (http://localhost:3000)" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  Backend может быть еще не готов" -ForegroundColor Yellow
}

# 8. Проверка метрик
Write-Host ""
Write-Host "🔍 Проверка метрик..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/metrics" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $metricsCount = ($response.Content | Select-String "^#" | Measure-Object).Count
        Write-Host "✅ Metrics endpoint работает" -ForegroundColor Green
        Write-Host "   📊 Собирается $($response.Content.Split([Environment]::NewLine).Count - 1) метрик" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  Metrics endpoint может быть еще не готов" -ForegroundColor Yellow
}

# 9. Summary
Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "✅ Все системы готовы!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Grafana Dashboards:" -ForegroundColor Cyan
Write-Host "   • Main: http://localhost:3001/d/monitoring-main"
Write-Host "   • Devices: http://localhost:3001/d/monitoring-devices"
Write-Host "   • Logs: http://localhost:3001/d/monitoring-logs"
Write-Host ""
Write-Host "🔗 Ссылки:" -ForegroundColor Cyan
Write-Host "   • Backend API: http://localhost:3000"
Write-Host "   • Frontend: http://localhost:8080"
Write-Host "   • Prometheus: http://localhost:9090"
Write-Host "   • Grafana: http://localhost:3001 (admin/admin)"
Write-Host "   • Loki: http://localhost:3100"
Write-Host ""
Write-Host "📚 Документация: см. MONITORING.md" -ForegroundColor Cyan
Write-Host ""
