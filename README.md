# Teamora

<p align="center">
  <strong>Real-time collaborative workspace</strong><br/>
  Documents, whiteboards, spreadsheets, presentations, files, tasks, and mesh WebRTC meetings — one product, one session.
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D20.8-339933?logo=nodedotjs&logoColor=white"/>
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black"/>
  <img alt="Express 5" src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white"/>
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose%209-47A248?logo=mongodb&logoColor=white"/>
  <img alt="WebRTC" src="https://img.shields.io/badge/Meetings-WebRTC%20mesh-333333"/>
  <img alt="License" src="https://img.shields.io/badge/License-ISC-blue"/>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#environment-variables">Configuration</a> ·
  <a href="#api-reference">API</a> ·
  <a href="#deployment">Deployment</a>
</p>

---

## Overview

Teamora is a session-authenticated SPA + API for teams that want a single workspace instead of a stack of disconnected tools. Members collaborate on rich documents, drawings, grids, and slides; share files; track tasks; and join live audio/video calls without leaving the product.

**Value proposition:** low-latency live collaboration (Yjs + WebSockets + same-browser BroadcastChannel) with durable REST persistence in MongoDB. Meetings use a WebRTC mesh signaled over the same collab hub — no separate media server.

| Surface | Role |
| --- | --- |
| **Frontend** | React 19 SPA on Vite 8, deployed as static hosting (Vercel) |
| **Backend** | Single Express 5 process: REST, sessions, WebSocket `/collab`, email, optional Gemini AI |
| **Data** | MongoDB via Mongoose 9 (users, workspaces, content blobs, sessions) |

> [!IMPORTANT]
> Meeting roster and WebSocket rooms are **process-local**. Do not run multiple API instances without sticky sessions or a shared pub/sub layer, or live rooms and calls will desync.

---

## Features

### Workspaces

- Create, join (invite code), leave, and delete workspaces
- Hard cap of **6 owned** active workspaces per user
- Invite links, join requests, owner accept/decline
- Visibility and join-approval settings
- Ownership **never transfers** — the creator remains `owner` even after leaving; the workspace is archived if the last member leaves
- Recent-workspace history on the dashboard

### Collaboration editors

| Module | What it does |
| --- | --- |
| **Documents** | Quill + Yjs, comments, versions, AI autocomplete / generate |
| **Whiteboard** | Multi-page canvas, live strokes, BroadcastChannel + WS fanout |
| **Spreadsheet** | Grid editing, cell deltas, AI spreadsheet generation |
| **Presentation** | Slide canvas, themes, import/export, AI slide generation |
| **Files** | Shared file tree, import (`.docx`, `.pptx`, `.txt`, `.md`, `.html`, 15 MB cap) |
| **Tasks / calendar** | Workspace tasks, reminders via SMTP (cron) |

Live updates use Yjs CRDTs over `/collab` and debounced REST snapshots (`PUT /api/v1/workspaces/:id/content/:key`). Same-browser tabs also sync through `BroadcastChannel`.

### Meetings

- Mesh WebRTC (camera, mic, screen share, chat, host controls, recording)
- Hybrid signaling: WebSocket room `meetings` + BroadcastChannel
- Server-authoritative roster; participants drop on explicit leave or after a disconnect grace period (refresh can rejoin)
- STUN by default; optional TURN via frontend `VITE_TURN_*` or backend `TURN_*` (pushed on `/collab` join)
- Designed for small rooms (full mesh; see [scalability](#performance--scalability))

### Auth & account

- Email/password register, login, logout, profile completion
- Forgot / reset password (SMTP; or `EMAIL_DEV_LOG` in development)
- Optional Google OAuth 2.0
- Session cookies (`express-session` + Mongo store)
- CSRF synchronizer (`GET /api/auth/csrf` + `X-XSRF-TOKEN`)

### AI (optional)

When `GEMINI_API_KEY` is set, authenticated routes can generate documents, slides, spreadsheets, and tasks, plus editor autocomplete (`gemini-flash-latest` via `@google/genai`).

---

## Tech stack

| Layer | Stack |
| --- | --- |
| UI | React 19, React Router 7, Tailwind CSS 4, Framer Motion, Lucide, react-hot-toast |
| Editors | Quill + y-quill + quill-cursors, Yjs, SheetJS (`xlsx`), pptxgenjs, html2canvas, jsPDF |
| API | Node.js ≥ 20.8, Express 5, Helmet, compression, Morgan, express-rate-limit |
| Auth | Passport.js (Google), bcrypt, express-session, connect-mongo |
| Realtime | `ws` hub at `/collab`, Yjs updates, meeting SDP/ICE fanout |
| Media | WebRTC mesh (`RTCPeerConnection`), STUN/TURN from env |
| Data | MongoDB, Mongoose 9 |
| Mail | Nodemailer (SMTP) |
| AI | Google Gemini (`@google/genai`) |
| Build | Vite 8, ESLint, Prettier, Vitest (`--passWithNoTests`) |

---

## Architecture

```
Browser (React SPA)
  ├── HTTPS REST + cookies ──► Express  ──► MongoDB (users, workspaces, Yjs blobs)
  ├── WSS /collab            ──► wsHub   ──► room fanout (Yjs, awareness, meeting signals)
  └── BroadcastChannel       ──► same-browser tabs (editors + meeting signaling)
```

**Hybrid sync:** the client applies local edits immediately, fans them out over WebSocket / BroadcastChannel, and periodically persists the document snapshot with REST. MongoDB is the durable store; the hub is not a multi-node Yjs authority.

**Meetings:** `MeetingPeerManager` builds a mesh. Signaling is JSON over `/collab` (`meeting-event`). The hub keeps `activeMeetings` in process memory and hydrates reconnecting clients with `meeting-active-session`.

**Contexts**

| Context | Responsibility |
| --- | --- |
| `AuthContext` | Session bootstrap (`GET /me`), login/register/logout |
| `MeetingContext` | Global in-call flag, restore after refresh, leave/join |

---

## System workflow

1. User signs in (password or Google). Session cookie is issued; CSRF token is stored in session and returned to the SPA.
2. Dashboard lists member workspaces and recent history.
3. Opening a workspace loads `WorkspaceHome` and lazy editor sections.
4. Editors attach a collab socket (`/collab`) and a `BroadcastChannel` for the content key.
5. Content snapshots are written with `PUT /api/v1/workspaces/:id/content/:key`.
6. Opening **Meetings** shows a lobby preview; **Join Meeting** acquires camera/mic and announces the participant. Peers exchange SDP/ICE over the meetings room.
7. **Leave** or **Leave Workspace** tears down media and signaling. Leave Workspace confirms in a modal (ported above the call overlay), then exits to the dashboard.

---

## Screenshots

Add captures under `docs/screenshots/` and link them here.

| View | Placeholder |
| --- | --- |
| Landing / marketing | `docs/screenshots/landing.png` |
| Dashboard | `docs/screenshots/dashboard.png` |
| Documents | `docs/screenshots/documents.png` |
| Whiteboard | `docs/screenshots/whiteboard.png` |
| Spreadsheet | `docs/screenshots/spreadsheet.png` |
| Presentation | `docs/screenshots/presentation.png` |
| Call lobby | `docs/screenshots/meeting-lobby.png` |
| In-call grid | `docs/screenshots/meeting-grid.png` |

```markdown
![Dashboard](docs/screenshots/dashboard.png)
```

---

## Getting started

### Prerequisites

- Node.js **≥ 20.8**
- npm
- MongoDB (local or Atlas)
- SMTP credentials for password reset in production
- Optional: `GEMINI_API_KEY`, Google OAuth client, TURN server

### Install

```bash
git clone https://github.com/TukitoZenx/Teamora.git
cd Teamora

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Configure

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set at least `MONGODB_URI`, `SESSION_SECRET`, `CLIENT_URL`, and `PORT` in `backend/.env`. Set `VITE_API_URL` in `frontend/.env` (required for production builds).

### Run locally

```bash
# terminal 1 — API + WebSocket hub
cd backend && npm run dev

# terminal 2 — Vite (http://localhost:5173)
cd frontend && npm run dev
```

API default: `http://localhost:5000`  
Health: `GET http://localhost:5000/health`

### LAN / multi-device meetings (HTTPS)

Browsers block camera/mic on `http://<LAN-IP>`. Use trusted TLS (for example mkcert) whose SAN includes the machine IP:

- `backend/.env`: `TLS_KEY_PATH`, `TLS_CERT_PATH` (paths relative to `backend/`)
- `frontend/.env`: `VITE_TLS_KEY_PATH`, `VITE_TLS_CERT_PATH`

Open `https://<LAN-IP>:5173`. In development the SPA targets `https://<LAN-IP>:5000` for REST and `wss://<LAN-IP>:5000/collab`. Allow TCP **5173** and **5000** on the host firewall.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Production | `production` / `development` |
| `PORT` | Production | Listen port (dev defaults to `5000`) |
| `HOST` | No | Bind address (default `0.0.0.0`) |
| `MONGODB_URI` | Yes | Mongo connection (`MONGO_URI` alias accepted) |
| `SESSION_SECRET` | Production | Session signing secret |
| `SESSION_COOKIE_NAME` | No | Default `teamora.sid` |
| `SESSION_STORE_SECRET` | No | Optional Mongo session encryption |
| `CLIENT_URL` | Yes | SPA origin (CORS, OAuth, reset links) |
| `CLIENT_URLS` | No | Extra CORS / WS origins, comma-separated |
| `SERVER_URL` | No | Public API URL (OAuth callbacks) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | Production (mail) | Password reset + task reminders |
| `SMTP_URL` | No | Alternate SMTP URL |
| `EMAIL_FROM` | No | From header |
| `EMAIL_DEV_LOG` | No | Log reset links instead of sending (dev) |
| `GEMINI_API_KEY` | No | Enables `/api/v1/ai/*` |
| `STUN_URLS` / `TURN_URLS` / `TURN_USERNAME` / `TURN_CREDENTIAL` | No | ICE servers sent on meetings join |
| `MEETING_DISCONNECT_GRACE_MS` | No | Rejoin window (default `12000`) |
| `TLS_KEY_PATH` / `TLS_CERT_PATH` | No | HTTPS for LAN testing |
| `SHUTDOWN_TIMEOUT_MS` | No | Graceful shutdown cap |
| `HTTP_REQUEST_TIMEOUT_MS` / `HTTP_HEADERS_TIMEOUT_MS` / `HTTP_KEEPALIVE_TIMEOUT_MS` | No | HTTP server timeouts |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS` / `MONGO_MAX_POOL_SIZE` | No | Mongo pool |
| `FATAL_ON_UNHANDLED_REJECTION` | No | Exit process on unhandled rejection |

Production session cookies use `SameSite=None; Secure` (cross-origin SPA).

### Frontend (`frontend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | **Production builds** | API origin, no trailing slash |
| `VITE_API_TIMEOUT_MS` | No | Axios timeout (default `30000`) |
| `VITE_TURN_URLS` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` | No | Build-time ICE TURN |
| `VITE_TURN_USER` / `VITE_TURN_SECRET` | No | Aliases for username / credential |
| `VITE_STUN_URLS` | No | Override default Google/Cloudflare STUN |
| `VITE_TLS_KEY_PATH` / `VITE_TLS_CERT_PATH` | No | Vite HTTPS for LAN |

Vite env is **build-time**. Prefer backend `TURN_*` in production so TURN can change without rebuilding the SPA.

---

## Project structure

```
Teamora/
├── backend/
│   ├── src/
│   │   ├── server.js              # HTTP(S) listen, collab upgrade, shutdown
│   │   ├── app.js                 # Express, CORS, CSRF, routes
│   │   ├── collab/wsHub.js        # /collab rooms + meeting roster
│   │   ├── config/                # Mongo, session, Passport
│   │   ├── controllers/           # Auth, workspace, content, import, AI
│   │   ├── middleware/            # Auth, CSRF, request id
│   │   ├── models/                # User, Workspace, WorkspaceContent
│   │   ├── routes/
│   │   ├── services/              # Domain logic, email, health, reminders
│   │   └── utils/
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Routes, workspace cache, GlobalMeetings
│   │   ├── components/            # Editors, dashboard, Meetings
│   │   ├── contexts/              # Auth, Meeting
│   │   ├── features/              # Auth + workspace chrome
│   │   ├── hooks/
│   │   ├── services/              # api, collab, WebRTC, Yjs REST
│   │   └── utils/
│   ├── vercel.json                # SPA rewrite
│   └── .env.example
└── README.md
```

---

## Usage

| Path | What you get |
| --- | --- |
| `/` | Landing (guests) or restore last authenticated page |
| `/signin` `/signup` | Email/password + Google |
| `/forgot-password` `/reset-password/:token` | Password reset |
| `/complete-profile` | Required after Google if profile is incomplete |
| `/dashboard` | Workspace list, create/join |
| `/workspace/:id` | Home |
| `/workspace/:id/{documents,whiteboard,spreadsheet,presentation,meetings,shared-files,…}` | Editors and meetings |
| `/invite/:inviteCode` | Invite preview / request access |
| `/settings` | Account settings |

**Meetings:** open the Meetings section → verify camera in the lobby → **Join Meeting**. Use **Leave** to exit the call. **Leave Workspace** (sidebar/profile) confirms, then leaves the workspace and the call and returns to the dashboard.

**Invites:** copy the workspace invite link. Private / approval-required workspaces create a join request for the owner.

---

## API reference

Base URL: `VITE_API_URL` (dev `http://localhost:5000`). JSON body on mutations. Credentials: session cookie. Mutations send `X-XSRF-TOKEN` (from `GET /api/auth/csrf` or `csrfToken` on auth responses).

### Health

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health`, `/health/live` | Liveness |
| GET | `/health/ready` | Mongo + collab stats; **503** if not ready |

### Auth (`/api/auth`)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/register` | — | Rate limited in production |
| POST | `/login` | — | Rate limited in production |
| POST | `/check-email` | — | Always rate limited |
| POST | `/forgot-password` | — | Rate limited |
| POST | `/reset-password` , `/reset-password/:token` | — | |
| GET | `/csrf` | — | Issues/returns session CSRF (does not rotate) |
| GET | `/me` | Session | Also returns `csrfToken` |
| POST | `/logout` | — | Destroys session |
| PATCH | `/profile` | Session | Complete / update profile |
| GET/POST | `/google` | — | OAuth start |
| GET | `/google/callback` | — | OAuth return |

Google start/callback are CSRF-exempt (browser redirects).

### Workspaces (`/api/v1/workspaces`) — all `requireAuth`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Member workspaces + recent |
| POST | `/` | Create (max 6 owned) |
| GET | `/:id` | Member only |
| PUT | `/:id` | Update settings |
| DELETE | `/:id` | Owner delete |
| POST | `/:id/leave` | Leave; archive if last member |
| POST | `/join` | Join by invite |
| GET | `/invite/:inviteCode` | Preview |
| POST | `/invite/:inviteCode/request` | Request access |
| POST | `/:id/join-requests/:requestId/accept` | Owner |
| POST | `/:id/join-requests/:requestId/decline` | Owner |
| DELETE | `/:id/members/:memberId` | Remove member |
| GET/POST | `/:id/tasks` | List / create |
| PATCH/DELETE | `/:id/tasks/:taskId` | Update / delete |
| GET | `/notifications` | |
| PATCH | `/notifications/:notificationId/read` | |
| DELETE | `/history/:workspaceId` | Drop recent entry |
| GET | `/:id/content` | Content keys |
| GET/PUT | `/:id/content/:key` | Yjs / JSON blob |
| POST | `/:id/files/import` | Import allowed types ≤ 15 MB |
| POST | `/:id/export-docx` | Member-scoped DOCX export |

### AI (`/api/v1/ai`) — `requireAuth` + rate limit

| Method | Path |
| --- | --- |
| POST | `/autocomplete` |
| POST | `/command` |
| POST | `/generate` |
| POST | `/generate-slides` |
| POST | `/generate-spreadsheet` |
| POST | `/generate-tasks` |

Requires `GEMINI_API_KEY`.

### WebSocket

`GET` upgrade `wss://<api-host>/collab`

- Cookie session required (401 if missing)
- Origin must pass the same allow-list as CORS
- Rooms: `${workspaceId}::${contentKey}` (e.g. `meetings`, document keys)
- First join checks workspace membership
- Meetings: `meeting-event` payloads, roster, ICE servers on `joined`

---

## Authentication, security, and data

| Concern | Implementation |
| --- | --- |
| Session | `express-session` + Mongo store; `SameSite=None; Secure` in production |
| CSRF | Session token + `XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header; login/forgot prefetch token |
| Passwords | bcrypt |
| HTTP | Helmet, JSON/multipart content-type on mutations, CORS allow-list, request IDs |
| Rate limits | Auth, forgot-password, check-email, workspace create/join, content writes, AI |
| Uploads | Import allow-list + 15 MB cap |
| Export | DOCX scoped to workspace membership (no IDOR on a global export path) |
| XSS | DOMPurify on rendered HTML |
| Secrets | No hardcoded API hosts; `VITE_API_URL` required in production builds |

**Database:** `User` (profile, password hash, recent workspaces), `Workspace` (members, owner, invites, tasks, notifications), `WorkspaceContent` (keyed blobs: Yjs / files / editor state). Sessions live in the `sessions` collection.

---

## Real-time and WebRTC

| Path | Behavior |
| --- | --- |
| Yjs / awareness / lists | Binary/JSON frames fanned out in the content room |
| Meetings | Offer/answer/ICE + join/leave/state/chat over `meeting-event` |
| Same browser | `localCollabChannel` BroadcastChannel mirror |
| Rejoin | Stable client id in `sessionStorage`; hub grace period before roster removal |
| ICE | Default STUN; optional TURN from Vite env and/or backend env |

Mesh WebRTC is appropriate for small calls. Restrictive NATs need TURN.

---

## Deployment

Typical topology: **Vercel** (SPA) + **one** API process (e.g. Render) + **MongoDB Atlas**.

### Frontend (Vercel)

1. Root / app directory: `frontend`
2. Build: `npm run build`
3. Output: `dist`
4. Env: `VITE_API_URL=https://<your-api-host>`
5. `vercel.json` rewrites all routes to `index.html`

### Backend

1. Start: `npm start` (`node src/server.js`)
2. Set production env (see table above)
3. `CLIENT_URL` = Vercel origin; add preview origins via `CLIENT_URLS` or the built-in `teamora-*.vercel.app` pattern
4. Health: `/health/live` for process, `/health/ready` for load-balancer routing
5. Single instance (or sticky + shared broker) because `/collab` state is in-memory

OAuth: Google callback must match `SERVER_URL` / registered redirect. Session cookie requires HTTPS in production.

---

## Testing and build

```bash
# Frontend
cd frontend
npm run lint
npm run format:check
npm test              # vitest --passWithNoTests
npm run build

# Backend
cd backend
npm run format:check
npm test              # currently: no unit suite configured
npm start             # production entry
```

CI should run frontend `format:check`, `lint`, and `build`. Backend `npm test` is a placeholder (`echo 'No tests configured'`).

---

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| **Invalid CSRF token** on login / forgot password | Session cookie reaching the API (`SameSite=None; Secure` cross-origin). Restart API after CSRF changes. Hard-refresh the SPA. |
| **VITE_API_URL is not set** on build | Set the var at **build** time on Vercel. |
| Meetings work in two tabs, not two devices | WebSocket `/collab` (cookies, CORS, `wss`). Configure TURN for symmetric NAT. |
| Empty meeting after refresh | Stay on a single API instance; grace period + `teamora-in-call` restore the roster. |
| Camera blocked on LAN IP | Use HTTPS + trusted cert; not `http://192.168…`. |
| Google OAuth returns to localhost | Set `CLIENT_URL` / `SERVER_URL` to public origins. |
| AI routes fail | `GEMINI_API_KEY` on the **server**, not Vite. |
| Reset email never arrives | SMTP vars; in dev `EMAIL_DEV_LOG=true` prints the link. |
| Leave Workspace dialog hidden | Fixed by portaling modals above the meeting overlay — use current `teamora-v2`. |
| Preview CORS 403 | Origin must match `CLIENT_URL`, `CLIENT_URLS`, or `https://teamora-*.vercel.app`. |

---

## Performance and scalability

- **One API process** for correct WS + meeting roster.
- Yjs snapshots are debounced REST writes; avoid huge unbounded blobs (presentations are capped in JSON body size).
- Mesh meetings: each peer sends media to every other peer — keep rooms small (on the order of **≤ 5**).
- Content write rate limit: 120 PUTs / minute / IP in production.
- AI: 100 requests / 15 minutes / IP.
- Horizontal scale needs: shared session store (already Mongo), **plus** a WS pub/sub and a shared meeting roster (not implemented).

---

## Future improvements

These are roadmap items, not current features:

1. **Authoritative Yjs server** — persist merges on the server instead of last-write-wins snapshots.
2. **SFU meetings** (LiveKit, Janus, or similar) for larger calls.
3. **Object storage** for files instead of Base64 in `WorkspaceContent`.
4. **Richer RBAC** (viewer / editor / admin) beyond owner vs member.
5. **Backend unit/integration tests** beyond the current placeholder script.

---

## Contributing

1. Fork and branch from `teamora-v2` (or the current default).
2. Keep changes scoped; do not commit `node_modules`, `dist`, or `backend/local_db`.
3. Match existing Prettier / ESLint setup.
4. Before opening a PR:

   ```bash
   cd frontend && npm run lint && npm run format:check && npm run build
   cd ../backend && npm run format:check
   ```

5. Describe the user-visible behavior and any env changes.
6. Do not add placeholder demo apps or fake tests.

---

## License

ISC — see `backend/package.json`. A root `LICENSE` file is not checked in; treat the backend package license as the project license unless a `LICENSE` file is added.

---

<p align="center">
  <sub>Teamora · session-auth collaboration · Yjs + WebRTC mesh · single-node realtime hub</sub>
</p>
