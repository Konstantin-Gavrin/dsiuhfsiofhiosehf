# Power Bot - Smart Electricity Grid Control Center

Pilvebaseeritud süsteem, mis jälgib Nord Pool elektrihindade muutusi reaalajas, teeb autonoomseid otsuseid ja jagab käske nutikatele seadmetele.

**Tehnoloogiad:** Node.js, Express.js, Docker, Coolify, Grafana, Loki

---

## 📋 Projekti ülevaade

### Eesmärk

Luua serveripoolne arhitektuur, mis:
- Hangib Nord Pool elektrihinnad Eleringi API-st iga 5 minuti tagant
- Arvutab tegelikud hinnad koos käibemaksuga (22%)
- Võrdleb hinda konfigureeritava piirhinnaga
- Tagastab seadmele käsu HTTP GET kaudu: **seadme lülitamine sisse/välja**
- Logib kõik sündmused struktureeritud kujul Loki/Grafana jaoks

### Arhitektuur

```
┌─────────────────────────┐
│   Elering API           │
│  (Nord Pool hinnad)     │
└────────────┬────────────┘
             │
             ▼
┌──────────────────────────┐
│   Node.js Backend        │
│  - Hinna laadimine       │
│  - Arvutused             │
│  - Loogika               │
└────────────┬─────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌────────────┐    ┌──────────────┐
│ Express.js │    │ Logs (stdout)│
│ API        │    │ → Loki       │
└────────────┘    └──────┬───────┘
    │                     │
    ▼                     ▼
┌────────────┐    ┌──────────────┐
│   Device   │    │   Grafana    │
│ (HTTP GET) │    │  Dashboard   │
└────────────┘    └──────────────┘
```

---

## 🚀 Paigaldamine

### Eeltingimused

- Node.js 18+ (või Docker)
- Eleringi API ligipääs (avalik, autentimist ei nõua)

### Lokaalne käivitamine

1. **Kloonige/laadige alla repo**
   ```bash
   cd welurkh
   npm install
   ```

2. **Kopeeri .env fail**
   ```bash
   cp .env.example .env
   # Redigeerige vajadusel (THRESHOLD_EUR, CHECK_INTERVAL_MS)
   ```

3. **Käivitage rakendus**
   ```bash
   npm start
   ```

4. **Kontrollige tervisekontrolli**
   ```bash
   curl http://localhost:3000/health
   ```

5. **Päringu tegemine API-lt**
   ```bash
   curl http://localhost:3000/api/boiler/status
   ```

   Oodatav vastus:
   ```json
   {
     "status": "ON",
     "current_price_eur": 0.061234,
     "threshold": 0.10
   }
   ```

---

## 🐳 Docker & Coolify

### Dockerfile ehitamine

```bash
docker build -t power-bot:latest .
docker run -p 3000:3000 \
  -e THRESHOLD_EUR=0.10 \
  -e CHECK_INTERVAL_MS=300000 \
  power-bot:latest
```

### Coolify seadistus

1. **Avage Coolify paneel** (tavaliselt `https://your-coolify-server`)
2. **Lisage uus rakendus**
   - Valige **Docker** > **Repository**
   - Sisestage Git URL või kasutage kohalikku Dockerfile'i
   - Portide seadistamine: Konteiner 3000 → Host port (nt 3000)

3. **Keskkonnamuutujad**
   ```
   PORT=3000
   THRESHOLD_EUR=0.10
   CHECK_INTERVAL_MS=300000
   ```

4. **Health Check**
   - Coolify kutsub automaatselt `/health` endpunkti
   - Jälgib rakenduse tervist

---

## 📡 API dokumentatsioon

### GET `/api/boiler/status`

Peamine ütlev: seadme olek, praegune hind, piirhinnad.

**Kasutus**

```bash
curl http://localhost:3000/api/boiler/status
```

**Vastus (200 OK)**

```json
{
  "status": "ON",
  "current_price_eur": 0.061234,
  "threshold": 0.10
}
```

**Väljad**

| Väli | Tüüp | Selgitus |
|------|------|----------|
| `status` | String | `ON` või `OFF` — seadme olek |
| `current_price_eur` | Number | EUR/kWh, sealhulgas 22% käibemaks |
| `threshold` | Number | Konfiguratsioon piirhind EUR/kWh |

---

### GET `/api/status` (Debug)

Näitab serveri sisemist seisundit (arenenud).

```bash
curl http://localhost:3000/api/status
```

**Vastus**

```json
{
  "service": "power-bot",
  "state": {
    "status": "ON",
    "current_price_eur": 0.061234,
    "threshold": 0.10
  },
  "config": {
    "checkIntervalMs": 300000,
    "eleringApiUrl": "https://dashboard.elering.ee/api/nps/price"
  }
}
```

---

### GET `/health`

Tervisekontroll Coolify jaoks.

```bash
curl http://localhost:3000/health
```

**Vastus (200 OK)**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T14:00:00.000Z"
}
```

---

## 📊 Struktureeritud logimine

### Logi formaat

Iga logikirje sisaldab:
- **Ajaaja märgis** (`ts`) — ISO 8601 vorming
- **Taseme** (`level`) — INFO, WARN, ERROR
- **Teenuse nimi** (`service`) — alati "power-bot"
- **Sündmuste tüüp** (`event`) — funktsionaalne identifikaator
- **Lisandmete väljad** — kontekstispetsiifilised andmed

### Näited

**Edukas hinnacheck:**
```
[INFO] ts=2024-01-15T14:00:00Z service=power-bot event=price_check price_eur=0.061234 status=ON threshold_eur=0.10
```

**API viga:**
```
[ERROR] ts=2024-01-15T14:05:00Z service=power-bot event=api_failure message="timeout of 10000ms exceeded" error_code=ECONNABORTED
```

**Eleringi API veakoodi viga:**
```
[ERROR] ts=2024-01-15T14:10:00Z service=power-bot event=api_failure message="Request failed with status code 503" http_status=503
```

**Vahemälus kasutamine (kui API on maas):**
```
[WARN] ts=2024-01-15T14:15:00Z service=power-bot event=using_cached_state last_price_eur=0.061234 status=ON
```

---

## 🔍 Grafana seadistus

### Eeltingimused

- Grafana server käituses (käivitus: `docker run -d -p 3000:3000 grafana/grafana`)
- Loki installatsioon ja Docker logging draiveri konfigureerimine

### Loki konfigureerimine Grafana-le

1. **Avage Grafana** (`http://localhost:3000`)
2. **Data Sources → Add data source**
   - Tüüp: **Loki**
   - URL: `http://loki:3100` (või teie Loki serveri aadress)
   - Save & Test

### Logimine Docker konteinerist Lokisse

Docker `daemon.json`:
```json
{
  "log-driver": "loki",
  "log-opts": {
    "loki-url": "http://loki:3100/loki/api/v1/push",
    "loki-batch-size": "400"
  }
}
```

Või käivitades konteineri:
```bash
docker run -p 3000:3000 \
  --log-driver=loki \
  --log-opt loki-url=http://loki:3100/loki/api/v1/push \
  power-bot:latest
```

---

## 📈 Grafana juhtpaneel

### Paneel 1: Reaalajas logid

**Nimetus:** Power Bot Logs

**Paneeli tüüp:** Logs

**LogQL päring:**
```
{service="power-bot"}
```

**Seadistused:**
- Logs display: **Recent first**
- Show timestamp: **enabled**

Näitab kõiki teenuse logisid reaalajal.

---

### Paneel 2: Elektrihinnad (Time Series)

**Nimetus:** Electricity Price Over Time

**Paneeli tüüp:** Time Series

**LogQL päring:**
```
{service="power-bot"} |= "level=INFO" | regexp `price_eur=(?P<price>[0-9.]+)` | unwrap price | __error__=""
```

**Päringu selgitus:**

| Komponent | Selgitus |
|-----------|----------|
| `{service="power-bot"}` | **Stream selector** — vali ainult meie teenuse logid |
| `\|= "level=INFO"` | **Sõne filter** — ota ainult INFO taseme logid |
| `\| regexp` | **Regulaaravaldis** — erista tekstist numbriline väärtus `price_eur=X.XXXXXX` |
| `\| unwrap price` | **Labeli konversioon** — muuda stringi arvuks, et saaks joonistada graafikut |
| `\| __error__=""` | **Vigaste ridade filtreerimine** — eemalda read, kus regexp ei leidnud vastet |

**Seadistused:**
- Y-telje nimi: "Price (EUR/kWh)"
- Legend: Show legend
- Tooltip: Multi series

---

### Paneel 3: Veaarvesti (Stat)

**Nimetus:** API Errors (Last 5 min)

**Paneeli tüüp:** Stat

**LogQL päring:**
```
count_over_time({service="power-bot"} |= "event=api_failure" [5m])
```

**Seadistused:**
- Calculation: Last value
- Threshold mode: Absolute
  - Punane (0, ∞) — kui on vähemalt üks viga, taust muutub punaseks
  - Roheline (−∞, 0) — kui vigu pole

---

## 🔧 Konfigureerimine

### Keskkonnamuutujad

| Muutuja | Vaikimisi | Selgitus |
|---------|-----------|----------|
| `PORT` | 3000 | Server kuulama port |
| `THRESHOLD_EUR` | 0.10 | Piirhinnad EUR/kWh |
| `CHECK_INTERVAL_MS` | 300000 | Hinnacheck intervall (5 min) |
| `ELERING_API_URL` | `https://dashboard.elering.ee/api/nps/price` | Eleringi API URL |

### Hinna arvutamine

**Eleringi API tagastab:** EUR/MWh (näide: 50 EUR/MWh)

**Meie arvutus:**

```
EUR/kWh = (EUR/MWh / 1000) × (1 + 22% käibemaks)
        = (50 / 1000) × 1.22
        = 0.061 EUR/kWh
        = 6.1 senti/kWh
```

---

## 🧪 Testimine

### cURL abil

```bash
# Health check
curl http://localhost:3000/health

# Boiler status
curl http://localhost:3000/api/boiler/status

# Debug endpoint
curl http://localhost:3000/api/status
```

### Logimine

Käivitage rakendus ja vaadake stdout:

```bash
npm start
```

Näete logisid nagu:
```
[INFO] ts=2024-01-15T14:00:00Z service=power-bot event=price_check price_eur=0.061234 status=ON threshold_eur=0.10
```

### Eleringi API testimine

```bash
curl "https://dashboard.elering.ee/api/nps/price?start=2024-01-15T00:00:00Z&end=2024-01-15T23:59:59Z&fields=ee"
```

---

## 🎯 Projekti kaitsmine (hindamiskriteeriumid)

### 1. Töötav avalik API

**Demonstratsioon:**
```bash
curl https://your-public-url.com/api/boiler/status
```

**Kontroll:**
- ✅ API on ligipääsetav avalikust internetist
- ✅ JSON vastus sisaldab 3 välja: `status`, `current_price_eur`, `threshold`
- ✅ Hind uueneb reaalajas
- ✅ Piirhinna loogika töötab (ON/OFF vahetub õigel ajal)

---

### 2. Dockerfile selgitus

**Faili read-rea hälamine:**

| Rida | Selgitus |
|-----|----------|
| `FROM node:18-alpine` | Alpine Linux on minimaalne Linux, ~40MB vs 900MB täisfailisaladus |
| `AS builder` | Multi-stage build: eraldi faasis ehitust ja tootmist |
| `npm ci --only=production` | `ci` on deterministlik (lock file kasutamine), mitte `install` |
| `FROM node:18-alpine` | Teine etapp — tühja failisüsteemiga algus, ei sisalda dev-sõltuvusi |
| `COPY --from=builder` | Kopeerime ainult production-moodulid builder'ist |
| `USER nodejs` | Käivitame mitte-administraatori kasutajana (turvalisus) |
| `HEALTHCHECK` | Coolify/Docker saab teada, kas rakendus elus on |
| `CMD ["node", "src/server.js"]` | Rakenduse käivitamine konteineris |

---

### 3. LogQL päringute selgitus Grafana-s

**Näita Grafana juhtpaneeli kolme paneeli töötamist:**

1. Reaalajas logid (Logs paneel)
2. Hinnagraafik (Time Series paneel)
3. Veaarvesti (Stat paneel)

**Hinnagraafiku LogQL päring sammhaaval:**

```
{service="power-bot"}              ← Vali logid teenusest "power-bot"
|= "level=INFO"                    ← Filtreeri ainult INFO taseme kirjed
| regexp `price_eur=(?P<price>[0-9.]+)`  ← Erista tekstist numbriväli `price_eur=X.XXX`
| unwrap price                     ← Konversi stringi arvuks (Loki saab joonistada)
| __error__=""                     ← Eemalda read, kus regexp ei leidnud vastet
```

---

## 📝 Lisaressursid

- [Eleringi API dokumentatsioon](https://dashboard.elering.ee/api/)
- [Nord Pool börsi hinnad](https://www.nordpoolgroup.com/)
- [Express.js dokumentatsioon](https://expressjs.com/)
- [Grafana LogQL dokumentatsioon](https://grafana.com/docs/loki/latest/logql/)
- [12-Factor App metoodika](https://12factor.net/)

---

## 📄 Litsents

MIT License

---

## 👥 Toetus

Küsimuste korral kontakteerige projektijuhatajat.
