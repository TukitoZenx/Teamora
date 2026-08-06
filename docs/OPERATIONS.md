# Teamora Operations Runbook

Operational guide for running Teamora in production (backend on Render or similar, frontend on Vercel). Complements `docs/PRODUCTION_READINESS_AUDIT.md`.

---

## 1. Deploy topology

| Component | Typical host | Notes |
|-----------|--------------|--------|
| SPA | Vercel | Build with `VITE_API_URL` pointing at the API origin |
| API + collab WS | Render (or Node host) | Single instance recommended for mesh meetings + in-memory WS fanout |
| Database | MongoDB Atlas (or managed Mongo) | Required for users, sessions, workspace content |

**Constraint:** Collab WebSocket fanout and meeting signaling are **process-local**. Horizontal multi-instance API without sticky sessions / shared pub-sub will split rooms. Prefer **one API instance** until an infra change is approved.

---

## 2. Health probes

| Endpoint | Purpose | Success | Failure |
|----------|---------|---------|---------|
| `GET /health` or `GET /health/live` | **Liveness** — process up | `200` `{ status: "ok", ... }` | Process down / network |
| `GET /health/ready` | **Readiness** — Mongo connected | `200` `{ status: "ready", ready: true }` | `503` `{ status: "not_ready", ready: false }` |

### Platform wiring examples

**Render**

- Health Check Path: `/health/ready` (or `/health` if you only need process liveness during deploys)
- Prefer readiness so traffic is not routed while Mongo is unavailable

**Manual check**

```bash
curl -sS https://<api-host>/health/live | jq .
curl -sS -i https://<api-host>/health/ready
```

Response headers include `X-Request-Id` for correlation.

---

## 3. Required environment

See `backend/.env.example` and `frontend/.env.example`.

### Backend (required)

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` in prod |
| `PORT` | Listen port (platform may inject) |
| `MONGODB_URI` | Mongo connection string |
| `SESSION_SECRET` | Session signing (long random) |
| `CLIENT_URL` | SPA origin (OAuth redirects, CORS, emails) |

### Backend (strongly recommended in production)

| Variable | Purpose |
|----------|---------|
| `SMTP_*` / `EMAIL_FROM` | Password reset + task reminders |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `SERVER_URL` | Absolute OAuth callback base if needed |

### Backend (ops tuning, optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SHUTDOWN_TIMEOUT_MS` | `10000` | Max drain time on SIGTERM |
| `HTTP_REQUEST_TIMEOUT_MS` | `120000` | Node request timeout |
| `HTTP_HEADERS_TIMEOUT_MS` | `65000` | Headers timeout |
| `HTTP_KEEPALIVE_TIMEOUT_MS` | `65000` | Keep-alive |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS` | `10000` | Fail fast on bad Mongo |
| `MONGO_MAX_POOL_SIZE` | `20` | Pool size |
| `FATAL_ON_UNHANDLED_REJECTION` | unset | Set `true` to exit process on unhandled rejections |

### Frontend (build-time)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | **Required in production builds** — API origin |
| `VITE_API_TIMEOUT_MS` | Optional Axios timeout (default 30000) |
| `VITE_TURN_*` | TURN for multi-network meetings |

---

## 4. Logs & correlation

- **Production logs** are JSON lines: `{ level, message, time, ...meta }`
- Access logs (Morgan) include `rid=<requestId>`
- Error JSON bodies include `requestId` when available
- SPA Axios sends `X-Request-Id`; backend echoes it

**Debug a user-reported failure**

1. Ask for approximate time + action
2. Grep logs for `requestId` from the browser network panel response header / body
3. Confirm Mongo readiness around that timestamp (`MongoDB disconnected` warnings)

---

## 5. Graceful shutdown

On `SIGTERM` / `SIGINT` the API:

1. Stops accepting new HTTP connections (`server.close` + idle close when available)
2. Closes collab WebSocket clients (`1001 server shutting down`)
3. Closes Mongo connection
4. Exits `0` (or `1` if shutdown was triggered by a fatal error)

Platforms should send **SIGTERM** and wait ≥ `SHUTDOWN_TIMEOUT_MS` before SIGKILL.

---

## 6. Failure modes & operator actions

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `/health/ready` → 503 | Mongo down / wrong URI / network | Check Atlas status, `MONGODB_URI`, IP allowlist |
| SPA “Server unavailable” | API down, CORS, wrong `VITE_API_URL` | Verify API health; rebuild SPA with correct API URL |
| Login works, collab silent | WS blocked / wrong WS URL | Confirm `wss://` same host as API `/collab`; no proxy stripping Upgrade |
| Meetings no media cross-network | No TURN | Configure `VITE_TURN_*` and rebuild |
| Password reset no email | SMTP misconfigured | Check SMTP env; dev may use `EMAIL_DEV_LOG` |
| CSRF 403 on mutations | Cookie/token missing cross-site | Confirm `sameSite=none` + `secure` cookies, SPA sends `X-XSRF-TOKEN` |
| Session lost after deploy | Session secret rotated | Avoid rotating `SESSION_SECRET` without accepting logout of all users |
| High memory | Large base64 files / Yjs blobs / meetings | Cap content sizes; restart instance; plan object storage (future infra) |

---

## 7. Deploy checklist

1. Mongo reachable from API host  
2. Env vars set (required + SMTP if auth email needed)  
3. `GET /health/ready` returns 200 after boot  
4. SPA built with correct `VITE_API_URL`  
5. Smoke: register/login, open workspace, edit doc, leave  
6. Optional: start a 2-peer meeting with TURN if multi-network  

### Rollback

- **API:** Redeploy previous Render release; confirm `/health/ready`  
- **SPA:** Promote previous Vercel deployment  
- **Data:** No automated migrations in-repo — restore Mongo from Atlas backup if a bad write ships  

---

## 8. CI gates

GitHub Actions (`.github/workflows/ci.yml`) on `main` / `master` / `teamora-v2`:

- Backend: `npm audit --audit-level=high`, format check, unit tests  
- Frontend: audit policy script, format, lint, unit tests, production build  

CI does **not** start Mongo or hit a live `/health/ready` (unit isolation). Run readiness checks against staging after deploy.

---

## 9. What is intentionally not included

| Item | Reason |
|------|--------|
| Sentry / Datadog / APM | No new third-party infra without product decision; structured logs + request ids are the baseline |
| Multi-region WS / Redis fanout | Explicit “no new infra” audit constraint |
| SFU for meetings | Architecture residual; mesh only |
| Automated synthetic monitoring | Recommend external uptime check on `/health/ready` |

---

## 10. Quick local ops

```bash
# Backend
cd backend && cp .env.example .env   # fill values
npm run dev

# Probes
curl -sS http://localhost:5000/health/live
curl -sS -i http://localhost:5000/health/ready

# Frontend
cd frontend && cp .env.example .env
npm run dev
```
