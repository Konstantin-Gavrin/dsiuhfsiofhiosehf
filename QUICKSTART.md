# Power Bot - Kiire Alustamise Juhend

Järgige neid samme rakenduse kohe töösse panekuks.

---

## 🚀 Variant 1: Lokal (arendus)

### Sammud

1. **Sõltuvuste installeerimine**
   ```bash
   npm install
   ```

2. **Rakenduse käivitamine**
   ```bash
   npm start
   ```

   Näete logisid:
   ```
   [INFO] ts=2024-01-15T14:00:00Z service=power-bot event=server_started host=0.0.0.0 port=3000
   [INFO] ts=2024-01-15T14:00:05Z service=power-bot event=price_check price_eur=0.061234 status=ON
   ```

3. **API testimine**
   ```bash
   curl http://localhost:3000/api/boiler/status
   ```

   Vastus:
   ```json
   {
     "status": "ON",
     "current_price_eur": 0.061234,
     "threshold": 0.10
   }
   ```

---

## 🐳 Variant 2: Docker (kohalik)

### Sammud

1. **Docker image ehitamine**
   ```bash
   docker build -t power-bot:latest .
   ```

2. **Konteineri käivitamine**
   ```bash
   docker run -p 3000:3000 \
     -e THRESHOLD_EUR=0.10 \
     power-bot:latest
   ```

3. **API testimine (sama mis ülal)**
   ```bash
   curl http://localhost:3000/api/boiler/status
   ```

---

## 🐳 Variant 3: Docker Compose (koos Grafana/Loki-ga)

Parimaks testimiseks koos juhtpaneeli visualiseerimisega:

### Sammud

1. **Docker Compose käivitamine**
   ```bash
   docker-compose up -d
   ```

   Teenused:
   - **Power Bot API:** http://localhost:3000
   - **Grafana:** http://localhost:3001 (kasutaja: admin, parool: admin)
   - **Loki:** http://localhost:3100

2. **Grafana juhtpaneel**
   - Avage http://localhost:3001
   - Logige sisse (admin/admin)
   - Valige juhtpaneel: **Power Bot - Elektrivõrgu Juhtimiskeskus**
   - Näete kolme paneeli:
     - ✅ Reaalajas logid
     - ✅ Hinnagraafik
     - ✅ Veavaste indikaator

3. **Teenuste peatamine**
   ```bash
   docker-compose down
   ```

---

## 🔧 Konfigureerimine

Lokaalselt muuta `.env` failis:

```env
PORT=3000
THRESHOLD_EUR=0.10           # Seadme lülitamise piir
CHECK_INTERVAL_MS=300000     # 5 minutit
```

Docker-Compose-s muutke `docker-compose.yml` `environment` sektsiooni.

---

## ✅ Kiire test-checklist

- [ ] Server käivitub vigadeta (`npm start`)
- [ ] API vastab: `curl http://localhost:3000/health`
- [ ] Boiler status: `curl http://localhost:3000/api/boiler/status`
- [ ] Status sisaldab 3 välja: `status`, `current_price_eur`, `threshold`
- [ ] Logis kuvatakse: `[INFO]` ja `service=power-bot`

---

## 🚨 Tavapärastest probleemid

### Port 3000 on juba kasutusel

```bash
# Võite kasutada teist porti
PORT=3001 npm start
```

### Eleringi API timeout

- Kontrollige internetiühendust
- Eleringi API võib olla ajutiselt maas
- Rakendus kasutab viimast teadaolev hinda (fail-safe)

### Grafana ei näe logisid

- Kontrollige, et Loki on käituses: `docker ps | grep loki`
- Ootake 10 sekundit - logid võivad viivitada
- Kontrollige Grafana seadistust: **Configuration** → **Data Sources** → **Loki**

---

## 📖 Järgmine samm

1. Lugege täispikka [README.md](README.md) dokumentatsiooni
2. Uurige [Dockerfile](Dockerfile) rea-rea kaupa
3. Lugege [DEPLOYMENT.md](DEPLOYMENT.md) Coolify paigaldamiseks
4. Uurige [LogQL päringuid](README.md#grafana-seadistus) Grafana juhtpaneelist

---

## 🎓 Projekti kaitsmine

Projekti kaitsmisel näidake:

1. **Töötav API** — `curl https://your-public-url/api/boiler/status`
2. **Dockerfile selgitus** — rida-rea analüüs
3. **Grafana juhtpaneel** — kolm paneeli töötamas + LogQL päringute selgitus

Lisainfo: vt [README.md](README.md#🎯-projekti-kaitsmine-hindamiskriteeriumid)

---

Õnnestunud alustamist! 🚀
