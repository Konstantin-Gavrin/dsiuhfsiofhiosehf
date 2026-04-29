# Power Bot - Projekti struktuur

```
welurkh/
├── src/                              # Rakenduse lähtekood
│   ├── server.js                    # Express.js server ja API endpointid
│   ├── priceService.js              # Elering API laadimine ja arvutused
│   ├── logger.js                    # Struktureeritud logimine
│   └── config.js                    # Keskkonna ja konfiguratsiooni haldus
│
├── grafana-provisioning/            # Grafana automaatne seadistus
│   ├── datasources/
│   │   └── loki.yaml               # Loki andmeallikas
│   └── dashboards/
│       ├── power-bot-dashboard.json # Juhtpaneel JSON-iga
│       └── dashboards.yaml         # Juhtpaneeli pakkuja
│
├── Dockerfile                        # Multi-stage Docker konfig
├── docker-compose.yml               # Lokaalne testimine (App + Loki + Grafana)
├── loki-config.yaml                # Loki logimine ja salvestus
│
├── package.json                     # Node.js sõltuvused
├── .env.example                     # Keskkonnmuutujate näide
├── .gitignore                       # Git ignoreeritavad failid
├── .dockerignore                    # Docker ignoreeritavad failid
│
├── README.md                        # Täispikk dokumentatsioon
├── QUICKSTART.md                    # Kiire alustamine
├── DEPLOYMENT.md                    # Coolify paigaldamine
│
└── test.sh                          # API testimise skript
```

---

## 📄 Failide selgitus

### Rakenduse failid (`src/`)

| Fail | Eesmärk |
|------|---------|
| `server.js` | Express.js server, marsruudid (`/health`, `/api/boiler/status`, `/api/status`) |
| `priceService.js` | Elering API kõned, hinna arvutamine, otsuste tegemine |
| `logger.js` | Struktureeritud logimise funktsioonid (Loki jaoks) |
| `config.js` | Keskkonnmuutujad ja rakenduse seadistused |

### Docker failid

| Fail | Eesmärk |
|------|---------|
| `Dockerfile` | Multi-stage build, node:18-alpine põhisus, USER nodejs |
| `docker-compose.yml` | Kohalik arendus: App + Loki + Grafana |
| `loki-config.yaml` | Loki server seadistused |
| `.dockerignore` | Failid, mis jäetakse Docker image-ist välja |

### Grafana seadistus

| Fail | Eesmärk |
|------|---------|
| `grafana-provisioning/datasources/loki.yaml` | Loki andmeallikas automaatne seadistamine |
| `grafana-provisioning/dashboards/power-bot-dashboard.json` | Juhtpaneel 3 paneeli: logid, hinnagraafik, veavaste |
| `grafana-provisioning/dashboards/dashboards.yaml` | Juhtpaneeli pakkuja |

### Dokumentatsioon

| Fail | Eesmärk |
|------|---------|
| `README.md` | Täispikk dokumentatsioon, LogQL päringud, API kirjeldus |
| `QUICKSTART.md` | Kiire alustamine 3 variandiga (Node.js, Docker, Docker-Compose) |
| `DEPLOYMENT.md` | Coolify pilveplattvormi paigaldamine |

---

## 🚀 Kasutus

### Kohalik käivitamine
```bash
npm install
npm start
```

### Docker lokaalselt
```bash
docker build -t power-bot .
docker run -p 3000:3000 power-bot:latest
```

### Täisväärtuslik keskkond (App + Grafana + Loki)
```bash
docker-compose up -d
# Grafana: http://localhost:3001 (admin/admin)
# Loki: http://localhost:3100
# App: http://localhost:3000
```

### Testing
```bash
npm start &
chmod +x test.sh
./test.sh
```

---

## 📊 Projekti statiistika

- **Failide arv:** 20+
- **Ridade kood:** ~500 (src/)
- **Testimata sõltuvused:** 0
- **Docker image suurus:** ~50MB (multi-stage build)
- **Kontrollintervall:** 5 minutit (konfigureeritav)

---

## 🔍 Peamised komponendid

### 1. Elering API integreerimine
- **Endpoint:** `https://dashboard.elering.ee/api/nps/price`
- **Andmeid:** Nord Pool tunnipõhised hinnad EUR/MWh
- **Arvutus:** Teisendamine kWh-ks + 22% käibemaks

### 2. Express.js API
- `GET /health` — tervisekontroll
- `GET /api/boiler/status` — seadme olek ja hind
- `GET /api/status` — debug info

### 3. Struktureeritud logimine
- Formaat: `[LEVEL] ts=... service=power-bot event=... key=value`
- Sihtkoht: stdout (Docker → Loki)
- LogQL päringud Grafanas

### 4. Docker + Coolify
- Multi-stage build (dev-sõltuvused välja)
- Non-root user (turvalisus)
- HEALTHCHECK (Coolify jälgimine)
- Keskkonnamuutujad (konfiguratsioon)

---

Vt täpsemalt: [README.md](README.md), [QUICKSTART.md](QUICKSTART.md), [DEPLOYMENT.md](DEPLOYMENT.md)
