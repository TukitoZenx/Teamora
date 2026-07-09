# Teamora — Collaboration Workspace

Teamora is a modern real-time team collaboration workspace SPA and Express API featuring Documents, Whiteboard, Spreadsheet, Presentation Slides, Meetings, Shared Files, Tasks, and Workspace Management.

---

## Repository Structure

- **`backend/`**: Express 5 + Mongoose 9 API with MongoDB session storage, Passport Google OAuth, email verification, workspace access management, and REST endpoints for tasks and notifications.
- **`frontend/`**: React 19 + Vite + React Router 7 + Tailwind CSS single page application with rich collaboration suites (Documents, Whiteboard, Spreadsheet, Presentations, Meetings, Files).

---

## Getting Started

### Prerequisites
- Node.js >= 20.8.0
- MongoDB instance (for full persistence) or configured `MONGODB_URI`

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env # Configure MONGODB_URI, SESSION_SECRET, CLIENT_URL
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173`.

---

## Testing & Quality Controls

### Backend Unit Tests
Runs isolated tests using Node's native test runner (`node:test`) without requiring a live MongoDB connection:

```bash
cd backend
npm test
npm run format:check
```

### Frontend Linting & Build

```bash
cd frontend
npm run lint
npm run build
```

---

## Architectural Highlights

- **Local Collaboration Channel**: Uses `BroadcastChannel` and `localStorage` for cross-tab live sync (Documents, Whiteboard, Spreadsheet, Slides, Files, Meetings).
- **Server content blobs**: Workspace files and document HTML also persist via `GET/PUT /api/v1/workspaces/:id/content/:key` (last-write-wins) so members can open the same content on another browser/device. Live multi-user OT and cross-device WebRTC still need a future realtime layer.
- **Workspace visibility**: `invite_only` accepts invite links (with optional join approval); `private` blocks all invite joins.
- **Security Hardened**: JSON Content-Type CSRF mitigation, production rate limits on auth + workspace create/join/content writes, session cookie hardening.
- **Code-Split Features**: Lazy-loads heavy collaboration sections (`quill`, `xlsx`, `html2pdf.js`) to keep initial bundle size minimal.
