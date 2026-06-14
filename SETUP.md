# ID-Link Tanzania — Developer Setup

## Prerequisites
- Node.js 18+
- Docker Desktop (for PostgreSQL)

## 1. Start the database

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432, runs `schema.sql` and `seed.sql` automatically.

## 2. Start the backend

```bash
cd server
npm run dev
# → http://localhost:3001
```

Health check: http://localhost:3001/health

## 3. Start the frontend

```bash
cd client
npm run dev
# → http://localhost:5173
```

## Default Staff Credentials (change immediately)

| Phone           | Password    | Role  | Branch             |
|-----------------|-------------|-------|--------------------|
| +255700000001   | Admin@1234  | admin | Arusha Main PO     |
| +255700000002   | Admin@1234  | clerk | Arusha Main PO     |

## URL Structure

| URL               | Who                        | What                        |
|-------------------|----------------------------|-----------------------------|
| `/`               | Public                     | Home / hero search          |
| `/search`         | Public                     | Search + filter results     |
| `/claim/:docId`   | Document owner             | Claim flow (ID → OTP → Pay → QR) |
| `/clerk`          | Post Office staff          | Login + log found ID + status updates |
| `/admin`          | Admin only                 | Dashboard + branches + staff |

## Architecture

```
client/          React PWA (Vite + Tailwind + React Router)
  src/
    api/         Axios client (all API calls in one place)
    pages/       Home, SearchResults, ClaimFlow, ClerkPortal, AdminDashboard
    components/  Layout, DocumentCard, QRToken

server/          Node.js + Express API
  src/
    db/          PostgreSQL pool + schema.sql + seed.sql
    utils/       crypto (AES-256-GCM), otp, sms (stub), qr
    middleware/  auth (JWT), audit (PDPA log)
    routes/      auth, public, clerk, admin
```

## Adding real payment (Selcom/Pesapal/AzamPay)

1. Get API credentials from the aggregator
2. Add to `server/.env`: `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID`
3. Update `server/src/utils/sms.js` with real API call
4. In `server/src/routes/public.js`, replace the SIMULATED `gateway_ref` in the `/claims/:id/pay`
   endpoint with the real payment initiation + webhook callback

## Adding real OCR (Google Vision)

1. Get a Google Cloud API key with Vision API enabled
2. Add to `server/.env`: `GOOGLE_VISION_API_KEY`
3. Update `server/src/routes/clerk.js` `/ocr` endpoint — the TODO comment shows the pattern

## Production checklist

- [ ] Change all default passwords
- [ ] Set `NODE_ENV=production` in server env
- [ ] Set `CLIENT_ORIGIN` to production domain
- [ ] Host PostgreSQL on TZ-resident server (data residency requirement)
- [ ] Register with PDPC (dataprotection.pdpc.go.tz) — mandatory before going live
- [ ] Replace SMS stub with real aggregator SDK
- [ ] Replace OCR stub with Google Vision API
- [ ] Set up automatic `purge_after` scheduled job (cron DELETE WHERE purge_after < NOW())
- [ ] Add HTTPS / TLS termination
- [ ] Add backup strategy for PostgreSQL
