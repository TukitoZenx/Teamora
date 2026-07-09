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

- **Local Collaboration Channel**: Uses `BroadcastChannel` and `localStorage` to provide cross-tab live synchronization for Whiteboard, Documents, Spreadsheet, Slides, Files, and Meetings without requiring a dedicated WebSocket server dependency.
- **Security Hardened**: Enforces `Content-Type: application/json` for mutating requests to prevent simple-request CSRF vulnerabilities across origins, scopes rate limiting strictly to brute-forceable authentication routes, and secures session cookie configurations.
- **Code-Split Features**: Lazy-loads heavy collaboration sections (`quill`, `xlsx`, `html2pdf.js`) to keep initial bundle size minimal.
