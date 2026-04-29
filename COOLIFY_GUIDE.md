# 🚀 Power Bot на Coolify - Пошаговая инструкция

## ШАГ 1: Подготовка Git репозитория

```bash
cd /Users/konstantingavrin/welurkh
git init
git add .
git commit -m "Initial Power Bot commit"
```

Затем загрузьте на GitHub/GitLab/Gitea:
```bash
git remote add origin https://github.com/YOUR_USER/welurkh.git
git branch -M main
git push -u origin main
```

---

## ШАГ 2: Вход в Coolify

1. Откройте Coolify панель: **`https://your-coolify-server.com`**
   - Или локально: `http://localhost:3000` (если Coolify на вашем сервере)

2. Войдите с учетной записью (admin/пароль, который вы установили)

---

## ШАГ 3: Создание приложения

### Вариант A: Из Git репозитория (Рекомендуется)

1. **New Application** → **From Git Repository**

2. **Заполните поля:**

   | Поле | Значение |
   |------|----------|
   | **Repository URL** | `https://github.com/YOUR_USER/welurkh.git` |
   | **Branch** | `main` |
   | **Build Context** | `/` (корень) |

3. **Выберите Dockerfile:**
   - ☑️ **Use custom Dockerfile** 
   - Dockerfile Path: `Dockerfile`
   - ⚠️ **НЕ** используйте Nixpacks (не оптимизирует как наш multi-stage)

---

## ШАГ 4: Настройка портов

1. **Container Port:** `3000`
2. **Published Port:** `3000` (или 80/443 если через Load Balancer)

```
Внутри контейнера: 3000 (Express слушает)
     ↓
   Coolify
     ↓
Снаружи: 3000 или :443 (публичный доступ)
```

---

## ШАГ 5: Переменные окружения

**Advanced** → **Environment Variables**

Добавьте переменные:

```env
PORT=3000
THRESHOLD_EUR=0.10
CHECK_INTERVAL_MS=300000
ELERING_API_URL=https://dashboard.elering.ee/api/nps/price
```

| Переменная | Значение | Описание |
|------------|----------|---------|
| `PORT` | `3000` | Порт Express |
| `THRESHOLD_EUR` | `0.10` | Порог ON/OFF (10 центов/kWh) |
| `CHECK_INTERVAL_MS` | `300000` | 5 минут между проверками |
| `ELERING_API_URL` | `https://...` | Eleringi API URL |

---

## ШАГ 6: Домен и HTTPS

1. **Advanced** → **Domain**
2. Введите домен: `power-bot.yourdomain.com`
3. Coolify автоматически:
   - Получит Let's Encrypt сертификат
   - Настроит HTTPS
   - Перенаправит HTTP → HTTPS

---

## ШАГ 7: Health Check

Coolify проверит здоровье приложения через HEALTHCHECK из Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

✅ Coolify будет вызывать `/health` каждые 30 секунд

---

## ШАГ 8: Запуск приложения

1. Нажмите **Deploy**
2. Ожидайте:
   - 📦 Загрузка Dockerfile
   - 🔨 Сборка Docker image
   - 🚀 Запуск контейнера (~2-3 минуты)
   - ✅ Health check проходит

**Статус должен быть ЗЕЛЕНЫЙ "Running"**

---

## ШАГ 9: Тестирование

Когда приложение запущено:

```bash
# Терм-проверка
curl https://power-bot.yourdomain.com/health

# Основной API
curl https://power-bot.yourdomain.com/api/boiler/status

# Debug информация
curl https://power-bot.yourdomain.com/api/status
```

---

## ШАГ 10: Логирование и мониторинг

### Просмотр логов в Coolify

1. Приложение → **Logs**
2. Увидите структурированные логи:

```
[INFO] ts=2026-04-29T09:15:35Z service=power-bot event=service_started
[INFO] ts=2026-04-29T09:15:40Z service=power-bot event=price_check price_eur=0.061234 status=ON
```

### Настройка Loki (опционально)

Если хотите видеть логи в Grafana:

1. Установите Loki на отдельном сервере (или используйте облачный Loki)
2. Настройте Docker logging driver на хосте Coolify

**Файл `/etc/docker/daemon.json`:**
```json
{
  "log-driver": "loki",
  "log-opts": {
    "loki-url": "http://your-loki-server:3100/loki/api/v1/push",
    "loki-batch-size": "400"
  }
}
```

3. Перезагрузите Docker: `systemctl restart docker`

---

## 🔧 Проблемы и решения

### Проблема: Контейнер не запускается

**Решение:** Посмотрите логи
```
Applications → power-bot → Logs
```

Ищите:
- ❌ `Cannot find module` — забыли `npm install`
- ❌ `Port 3000 already in use` — измените PORT
- ❌ `ECONNREFUSED` — Eleringi API недоступна

### Проблема: API недоступна снаружи

**Решение:**
1. Проверьте домен в DNS: `nslookup power-bot.yourdomain.com`
2. Проверьте firewall: порт 443 открыт?
3. Проверьте Coolify: Advanced → Domain правильно настроено?

### Проблема: Health check fails

**Решение:**
1. Проверьте порт: PORT=3000?
2. Приложение запустилось? Посмотрите логи
3. Ждите 5 сек после запуска (start-period=5s)

---

## 📊 Автоматическое обновление

Coolify может автоматически перестраивать приложение:

1. **Advanced** → **Webhooks**
2. Скопируйте webhook URL
3. На GitHub → Settings → Webhooks:
   - URL: `ваш-webhook-от-Coolify`
   - Events: **Push events**
   - ✅ Active

Теперь при `git push` Coolify автоматически перестроит приложение!

---

## ✅ Финальная проверка

Когда приложение работает в Coolify:

- [ ] Статус: **Running** (зеленый)
- [ ] `/health` отвечает 200 OK
- [ ] `/api/boiler/status` возвращает JSON
- [ ] Логи видны в **Logs** вкладке
- [ ] HTTPS работает (зеленый замок 🔒)
- [ ] Доступно по домену: `https://power-bot.yourdomain.com`

---

## 🎯 Для защиты проекта

Покажите преподавателю:

1. **Coolify панель** с запущенным приложением
2. **API в браузере:** `https://your-domain/api/boiler/status`
3. **Логи в Coolify:** Logs вкладка
4. **Объяснение Dockerfile** в коде

---

## 📞 Краткая шпаргалка

| Задача | Действие |
|--------|----------|
| Создать приложение | New App → From Git Repository |
| Задать переменные | Advanced → Environment Variables |
| Установить домен | Advanced → Domain |
| Просмотреть логи | Приложение → Logs |
| Перестроить | Redeploy кнопка |
| Удалить | Delete application |

---

**Готово!** Приложение должно быть доступно по вашему домену с HTTPS 🚀
