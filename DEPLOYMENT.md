# Power Bot - Coolify Deployment Guide

See juhis kirjeldab, kuidas paigaldada Power Bot rakendus Coolify pilveplattvormi.

---

## 📋 Eeltingimused

- Coolify server on installatsioon ja käituses
- Git repository ligipääs (GitHub, GitLab, Gitea jne)
- Domain nimi SSL/TLS sertifikaatiga (Coolify seadistab automaatselt Let's Encrypt abil)

---

## 🚀 Paigalduse sammud

### 1. Ühenduse loomine Git repositooriumiga

1. Avage **Coolify juhtpaneel** (tavaliselt `https://your-coolify-url`)
2. Navigeerige **Applications** → **New Application**
3. Valige **From Git Repository**

### 2. Git repository seadistamine

- **Repository URL:** `https://github.com/your-user/welurkh.git`
- **Branch:** `main` (või muu harule)
- **Dockerfile:** 
  - ☑️ Kasuta kohandatud Dockerfile (mitte Nixpacks)
  - Dockerfile path: `Dockerfile`

### 3. Pordi seadistamine

Coolify kuuleb sissetulev trafiku ja suunab selle konteineri porti:

- **Container Port:** `3000` (Express.js kuulab seda porti)
- **Exposed Port:** `3000` või `80`/`443` (avalik port)

### 4. Keskkonnamuutujad

Klõpsake **Environment Variables** ja lisage:

| Muutuja | Väärtus | Selgitus |
|---------|---------|----------|
| `PORT` | `3000` | Express kuulama port |
| `THRESHOLD_EUR` | `0.10` | Piirhinnad eurodes |
| `CHECK_INTERVAL_MS` | `300000` | Kontrollintervall ms (300000 = 5 min) |
| `ELERING_API_URL` | `https://dashboard.elering.ee/api/nps/price` | Eleringi API URL |

### 5. Tervisekontroll

Coolify seadistab tervisekontrolli automaatselt, kui `HEALTHCHECK` on Dockerfile's määratletud:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

Coolify kutsub `/health` endpunkti iga 30 sekundi järel.

### 6. Domääni seadistamine

- Valige **Advanced** → **Domain**
- Sisestage domain nimi (nt `power-bot.yourdomain.com`)
- Coolify seadistab automaatselt HTTPS Let's Encrypt sertifikaadiga

### 7. Paigaldamine

Klõpsake **Deploy** nuppu ja oodake, kuni:

1. ✅ Docker image ehituse lõpetamine
2. ✅ Konteineri käivitamine
3. ✅ Tervisekontrolli läbimine (umbes 5-10 sekundit)

Pärast edukat paigaldust näete rohelist "Running" staatus.

---

## 🔍 Jälgimine ja silumine

### Logide vaatamine Coolify-s

1. Valige rakendus
2. Klõpsake **Logs** vahekaarti
3. Näete reaalajal stdout väljundit

Näites logisid:
```
[INFO] ts=2024-01-15T14:00:00Z service=power-bot event=server_started host=0.0.0.0 port=3000
[INFO] ts=2024-01-15T14:00:05Z service=power-bot event=price_check price_eur=0.061234 status=ON threshold_eur=0.10
```

### API testimine

```bash
curl https://power-bot.yourdomain.com/api/boiler/status

# Oodatav vastus:
{
  "status": "ON",
  "current_price_eur": 0.061234,
  "threshold": 0.10
}
```

### Tervisekontrolli testimine

```bash
curl https://power-bot.yourdomain.com/health

# Oodatav vastus:
{
  "status": "ok",
  "timestamp": "2024-01-15T14:00:00.000Z"
}
```

---

## 🔐 Turvalisus ja parimad praktikad

### 1. Dockerile pääsemise piirang

- Coolify käivitab konteineri mitte-administraatori kasutajana (`USER nodejs`)
- Konteiner ei saa juurdepääsu hosti failisüsteemile

### 2. Keskkonnamuutujad

- **Ärge pange** sensitiivseid andmeid (API-võtmeid jne) `.env` faili
- Kasutage Coolify paneelis määratud keskkonnmuutujaid

### 3. HTTPS/TLS

- Coolify automaaditab Let's Encrypt sertifikaatide haldamise
- HTTPS on vaikimisi sisse lülitatud

### 4. Taaskäivitus poliitika

Coolify automaatselt taaskäivitab konteineri, kui see seisab:

```
Restart Policy: Unless Stopped
```

---

## 🐛 Tavapärasest probleemid

### Konteiner käivitub, kuid API pole ligipääsetav

1. Kontrollige logisid: **Logs** vahekaar
2. Kontrollige, kas `PORT=3000` on seadistatud
3. Kontrollige domäänserverit DNS-is

### Eleringi API päringud ebaõnnestuvad

1. Kontrollige internetiühendust konteineri logides
2. Kontrollige, et `ELERING_API_URL` on õige
3. Eleringi API võib olla ajutiselt maas

### Tervisekontroll ebaõnnestub

1. Kontrollige, kas `/health` endpoint on käituses
2. Kontrollige pordi seadistust
3. Vaadake Docker logisid Coolify juhtpaneelilt

---

## 📊 Loki/Grafana integreerimine

Coolify ei sisalda Loki-t vaikimisi. Selle seadistamiseks:

### Variant 1: Lokaalse Loki server

Oma serveris käivitage Loki:

```bash
docker run -d -p 3100:3100 grafana/loki
```

### Variant 2: Docker logging draiver

Seadistage Coolify või hosti Docker `daemon.json`:

```json
{
  "log-driver": "loki",
  "log-opts": {
    "loki-url": "http://your-loki-server:3100/loki/api/v1/push"
  }
}
```

Seejärel kopeeri **docker-compose.yml** ja **loki-config.yaml** lokaalsesse Loki serverisse.

---

## 📈 Skaleerimise soovitused

- Rakendus on stateless — saab käitada mitmes repliikas
- Elering API kutsumisi saab vahemälustada kesktasemele (Redis, Memcached)
- Hinnad ei muutu tihedalti — 5-minutiline kontrollintervall on piisav

---

## 🔄 Uuendamine

Coolify automaatselt jälgib Git repositooriumi:

1. Tehke `git push` oma repositooriumisse
2. Coolify kutsub webhook-ga ja alustab uue ehitust
3. Uus versioon paigaldatakse automaatselt

---

## ✅ Kasutuskontroll-nimekirja

- [ ] Coolify server on käituses
- [ ] Git repositoorium on seadistatud
- [ ] Keskkonnamuutujad on defineeritud
- [ ] Port 3000 on eksponeeritud
- [ ] HEALTHCHECK on Dockerfile-s
- [ ] Domain nimi on seadistatud
- [ ] Let's Encrypt sertifikaat on kehtiv
- [ ] API vastab `/api/boiler/status` kaudu
- [ ] Logid on nähtavad Coolify juhtpaneelil
- [ ] Tervisekontroll läbib edukalt

---

## 📞 Silumine

Kui midagi ei tööta:

1. **Vaadake logisid:** Coolify → Rakendus → Logs
2. **Testige API-d:** 
   ```bash
   curl -v https://power-bot.yourdomain.com/health
   ```
3. **Kontrollige keskkonda:**
   ```bash
   curl https://power-bot.yourdomain.com/api/status
   ```

---

Õnnestunud paigaldamist! 🚀
