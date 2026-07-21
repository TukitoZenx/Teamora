# Implementation & Onboarding Guide

Welcome to the Teamora codebase! This document is designed as a phased learning roadmap. By following these phases, a new developer can systematically understand how the pieces fit together without getting overwhelmed by the entire repository at once.

## Project Architecture Philosophy

Teamora uses a **Hybrid Architecture** for real-time collaboration:
1. **Durable State (REST API + MongoDB):** All workspace structures, tasks, members, and periodic document snapshots are saved durably using standard HTTP REST endpoints.
2. **Ephemeral State (WebSockets):** Low-latency data like live cursors, WebRTC mesh signaling, and Yjs keystroke deltas are fanned out to connected peers via a lightweight WebSocket hub (`wsHub.js`), without forcing the DB to serialize every keystroke.

---

## Learning Roadmap

Read the following files in this exact order to understand the flow from the entry point down to the features.

### Step 1: The Core
- **Goal:** Understand how the server boots and how APIs are exposed.
- **Read:** `README.md` and `INVENTORY.md`
- **Read:** `backend/src/server.js` (The bootstrapper, attaches HTTP and WS).
- **Read:** `backend/src/app.js` (The Express middleware and route registry).

### Step 2: The Data Layer
- **Goal:** Understand the MongoDB collections.
- **Read:** `backend/src/models/Workspace.js` (Notice how tasks and members are subdocuments).
- **Read:** `backend/src/models/WorkspaceContent.js` (Notice how document blobs are saved per key).

### Step 3: Frontend Bootstrapping
- **Goal:** Understand how the frontend routes and authenticates.
- **Read:** `frontend/src/main.jsx` (React strict mode wrapper).
- **Read:** `frontend/src/App.jsx` (The routing engine and workspace state manager).
- **Read:** `frontend/src/contexts/AuthContext.jsx` (Session loader).

### Step 4: Realtime Engine
- **Goal:** Master the hybrid sync model.
- **Read:** `backend/src/collab/wsHub.js` (The fanout server).
- **Read:** `frontend/src/services/restYjsProvider.js` (The client-side hybrid sync logic linking local Yjs documents to both REST and WebSockets).

---

## Development Phases (Feature Drill-Downs)

### Phase 1: Authentication
- **Goal:** Secure the application.
- **Why this exists:** To ensure workspaces remain private and session hijacking is mitigated.
- **Files to study:**
  - `backend/src/config/passport.js` (OAuth logic)
  - `backend/src/controllers/auth.controller.js` (Login/Register endpoints)
  - `frontend/src/features/auth/hooks/useAuthForm.js` (Frontend form handler)
- **Request Flow:** Browser `POST /api/v1/auth/login` -> Controller verifies hash -> Sets `req.session` -> Express returns HTTP-only cookie.
- **Common Debugging:** If sessions drop, check `express-session` secret and CORS origins.

### Phase 2: Workspace Management
- **Goal:** Create, join, and list collaborative rooms.
- **Why this exists:** It acts as the container for all documents and meetings.
- **Files to study:**
  - `backend/src/controllers/workspace.controller.js`
  - `frontend/src/components/Dashboard.jsx`
  - `frontend/src/components/WorkspaceHome.jsx`
- **Component Flow:** `App.jsx` -> `ProtectedRoute` -> `Dashboard` -> `WorkspaceLayout` -> `WorkspaceHome`.
- **Database Interactions:** `Workspace` model reads/writes.
- **Possible Bugs:** Rate limiters (e.g., `joinWorkspaceLimiter`) might block fast testing locally.

### Phase 3: Documents (Yjs + Quill)
- **Goal:** Real-time text editing.
- **Why this exists:** The primary collaboration tool for text.
- **Files to study:**
  - `frontend/src/components/workspace-sections/DocumentsSection.jsx`
  - `frontend/src/services/restYjsProvider.js`
- **WebSocket Interactions:** Sends `yjs-update` events with base64 encoded CRDT deltas.
- **Database Interactions:** Debounced `PUT /api/v1/workspaces/:id/content/:key` pushes the full Yjs state blob to `WorkspaceContent`.

### Phase 4: Meetings (WebRTC Mesh)
- **Goal:** Integrated audio/video without expensive media servers.
- **Why this exists:** To reduce latency and infrastructure costs.
- **Files to study:**
  - `frontend/src/services/meetingPeerManager.js`
  - `frontend/src/contexts/MeetingContext.jsx`
  - `frontend/src/components/GlobalMeetings.jsx`
- **Request Flow:** Entirely over WebSockets. No database tables are used for active meeting states.
- **WebSocket Interactions:** Emits `meeting-event` (join, leave, SDP offers, ICE candidates).
- **Possible Bugs:** ICE candidate gathering failures behind corporate firewalls (requires STUN/TURN configurations).
- **Future Improvements:** Transition to SFU for scale > 5 participants.

### Phase 5: Whiteboard
- **Goal:** Freeform drawing.
- **Files to study:** `frontend/src/components/Whiteboard.jsx`.
- **Component Flow:** Uses an HTML5 canvas synchronized via Y.Map and `restYjsProvider.js`.

### Phase 6: Tasks
- **Goal:** Embedded to-do lists.
- **Files to study:** `frontend/src/components/Calendar.jsx`.
- **Database Interactions:** Updates the `tasks` array subdocument within the `Workspace` model using `PATCH /api/v1/workspaces/:id/tasks/:taskId`.

## Verification Checklist for New Developers
Before committing new features, ensure:
1. REST endpoints have rate-limiting if they mutate large blobs.
2. WebSockets payloads are stringified securely and sizes are bounded.
3. React `useEffect` hooks properly clean up Yjs instances and PeerConnections to prevent memory leaks.
