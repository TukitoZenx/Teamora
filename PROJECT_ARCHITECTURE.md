# Project Architecture Documentation

Welcome to the Teamora collaborative workspace codebase! This document provides a high-level overview of the entire project so developers can understand the architecture, data flow, and file structure without reading every file.

---

## 1. Project Overview

**What this application does:**
Teamora is a real-time collaborative workspace application similar to Notion or Google Workspace. It allows teams to create workspaces and collaborate live on multiple types of content.

**Main Features:**
- Real-time Documents (Rich text editing)
- Real-time Whiteboard (Canvas drawing)
- Real-time Spreadsheets (Grid with formulas)
- Real-time Presentations (Slides generation and viewing)
- Tasks and Calendar Management
- Video/Audio Meetings (WebRTC)
- Shared File Storage
- AI Assistants (Text generation, Data/Formula generation, Slide generation, Task extraction)

**Technology Stack:**

*   **Frontend Technologies:**
    *   React 18 (Vite)
    *   React Router v6
    *   TailwindCSS (Styling)
    *   Yjs (Real-time CRDT collaboration)
    *   Lucide React (Icons)
    *   React Hot Toast (Notifications)
*   **Backend Technologies:**
    *   Node.js & Express.js
    *   Socket.IO & WebSockets (Real-time signaling and Yjs sync)
    *   Passport.js (Authentication via Google & Local)
    *   Mongoose (MongoDB ODM)
    *   Multer (File uploads)
*   **Database:**
    *   MongoDB (Stores user data, workspace metadata, and Yjs document blobs)
*   **External Services:**
    *   Google OAuth (SSO Authentication)
    *   Ollama / Local AI models (For AI assistant generation)

---

## 2. Complete Architecture

### Frontend Architecture

```text
Browser
 |
 ↓
React Application (Vite)
 |
 ↓
frontend/src/main.jsx (Entry Point)
 |
 ↓
Providers (AuthProvider, MeetingProvider, etc.)
 |
 ↓
frontend/src/App.jsx (Routing & Global State)
 |
 ↓
Router (React Router DOM)
 |
 ↓
Pages (Dashboard, WorkspaceHome, AuthPage)
 |
 ↓
Components (Documents, Whiteboard, Calendar)
 |
 ↓
Services/API (api.js, aiClient.js, Yjs WebSockets)
```

### Backend Architecture

```text
Client Request (HTTP / WebSocket)
 |
 ↓
backend/src/server.js (Server Bootstrapper)
 |
 ↓
backend/src/app.js (Express App & Middleware)
 |
 ↓
Routes (auth.routes.js, workspace.routes.js, ai.routes.js)
 |
 ↓
Middleware (auth.middleware.js, rate limiters)
 |
 ↓
Controllers (auth.controller.js, workspace.controller.js, ai.controller.js)
 |
 ↓
Services (ai.service.js, etc.)
 |
 ↓
Models (User.js, Workspace.js)
 |
 ↓
Database (MongoDB)
```

### Communication Layer
- **HTTP/REST:** Standard stateless requests (CRUD operations, AI generation, authentication).
- **WebSockets / Yjs:** Used for real-time collaboration. The frontend connects to `ws://server/collab/workspaceId/documentId`. The backend uses `wsHub.js` to sync CRDT updates and persist them to MongoDB.
- **WebRTC / Socket.IO:** Used for global video/audio meetings, managed through the `MeetingContext`.

---

## 3. Folder Structure Explanation

### Frontend (`frontend/src/`)

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `components/` | Shared UI and feature components | `AppNavbar.jsx`, `Dashboard.jsx`, `WorkspaceHome.jsx`, feature modules (`Calendar.jsx`, `Whiteboard.jsx`) |
| `components/ui/` | Reusable atomic UI elements | `Button.jsx`, `Modal.jsx` |
| `components/workspace-sections/` | Lazy-loaded wrappers for workspace features | `DocumentsSection.jsx`, `SpreadsheetSection.jsx` |
| `contexts/` | React Context providers | `AuthContext.jsx`, `MeetingContext.jsx` |
| `hooks/` | Custom React hooks | `useAuth.js`, `useLocalCollabChannel.js` |
| `features/` | Domain-specific modules | `auth/pages/AuthPage.jsx`, `workspace/components/WorkspaceLayout.jsx` |
| `services/` | API interaction logic | `api.js` (Axios instance), `aiClient.js` |
| `utils/` | Helper functions | `notifications.js`, `arrayUtils.js` |

### Backend (`backend/src/`)

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `config/` | Setup configurations | `database.js` (MongoDB), `passport.js` (Auth), `session.js` |
| `controllers/` | Request handlers | `auth.controller.js`, `workspace.controller.js`, `ai.controller.js` |
| `routes/` | Express route definitions | `auth.routes.js`, `workspace.routes.js`, `ai.routes.js` |
| `middleware/` | Express middlewares | `auth.middleware.js` (protects routes) |
| `models/` | Mongoose schemas | `User.js`, `Workspace.js` |
| `services/` | Business logic abstractions | `ai.service.js`, `email.service.js` |
| `collab/` | Yjs WebSocket handlers | `wsHub.js` (Manages real-time sync connections) |

---

## 4. Application Startup Flow

When a user opens the application, the following execution path occurs:

1. **User enters URL**
2. **`index.html`** loads the Vite bundle.
3. **`frontend/src/main.jsx`** executes, wrapping the app in `<BrowserRouter>` and `<AuthProvider>`.
4. **`AuthProvider` initializes**: Checks `sessionStorage` and triggers `checkAuth()` via `/api/auth/session` to validate the user.
5. **`frontend/src/App.jsx` execution**:
   - Applies theme and appearance preferences from `localStorage`.
   - Listens to authentication state (`authenticated`, `loading`).
   - Determines routing paths.
6. **Router Decision**:
   - If not authenticated, routes to `/signin` (or `/` LandingPage).
   - If authenticated, routes to `/dashboard`.
7. **`Dashboard.jsx` (Page Rendering)**:
   - Fetches workspaces via `loadWorkspaces()`.
   - Displays recent workspaces and options to join/create new ones.

---

## 5. Authentication Architecture

**Components involved:**
- `AuthContext.jsx` & `useAuth.js` hook
- `AuthPage.jsx`
- Backend `auth.routes.js` & `passport.js`

**Session Handling:**
The app uses **Cookie-based sessions** via `express-session` and Passport.js. No raw JWTs are exposed to the frontend.

**Login Flow:**
```text
User
 |
 ↓
Login Component (AuthPage.jsx)
 |
 ↓
Auth Service (`api.post('/api/auth/login')`)
 |
 ↓
Backend Auth Route (`auth.routes.js`)
 |
 ↓
Passport Local Strategy (`config/passport.js`)
 |
 ↓
Database (Validates Password Hash)
 |
 ↓
Express Session Cookie created & returned
 |
 ↓
AuthContext updates (`authenticated: true`)
 |
 ↓
Application routes user to `/dashboard`
```

---

## 6. Routing System

All frontend routes are defined inside `frontend/src/App.jsx`.

| Route | Component | Protection | Purpose |
|-------|-----------|------------|---------|
| `/` | `RootRoute` -> `LandingPage` | Public | Homepage for logged out users |
| `/signin` & `/signup` | `AuthPage` | Public | Local and Google Authentication |
| `/dashboard` | `Dashboard` | **Protected** | Lists user's workspaces |
| `/settings` | `SettingsPage` | **Protected** | Global user preferences |
| `/workspace/:id` | `WorkspaceHome` | **Protected** | Entry point for a specific workspace |
| `/workspace/:id/:section` | Lazy-loaded Sections | **Protected** | Deep link into a workspace tool (e.g., `/workspace/123/spreadsheet`) |
| `/invite/:inviteCode` | `InviteWorkspacePage` | **Protected** | Handles joining workspaces via invite links |

---

## 7. Component Relationship Map

```text
App.jsx
 |
 ├── AppNavbar (Top navigation bar)
 |
 ├── Dashboard (Workspaces listing)
 |    ├── WorkspaceCard
 |    └── CreateWorkspaceModal
 |
 ├── WorkspaceHome (Active Workspace Shell)
 |    ├── Sidebar (Navigation within workspace)
 |    ├── TopToolbar (Global actions & AI Assistants)
 |    └── Section Viewer (Swaps between features)
 |         ├── DocumentsSection -> Documents.jsx (Quill Editor + Yjs)
 |         ├── WhiteboardSection -> Whiteboard.jsx (Canvas + Yjs)
 |         ├── SpreadsheetSection -> Spreadsheet.jsx (Grid + Formulas)
 |         ├── PresentationSection -> PresentationModule.jsx (Slides)
 |         └── Calendar.jsx (Tasks and Scheduling)
 |
 └── SettingsPage (User preferences)
```

---

## 8. Data Flow

### 1. Standard CRUD Data Flow (e.g., Workspaces List)
```text
Database (MongoDB)
 ↓
Backend API (`workspace.controller.js`)
 ↓
Frontend Service (`api.js` Axios call)
 ↓
React State (`App.jsx` workspaces array)
 ↓
Component UI (`Dashboard.jsx` map function)
```

### 2. Real-time Collaborative Data Flow (e.g., Documents/Spreadsheet)
```text
User types in Editor
 ↓
Yjs Document Instance updates locally
 ↓
WebSocket sends delta to Backend (`collab/wsHub.js`)
 ↓
Backend broadcasts delta to all other connected clients
 ↓
Other clients' Yjs Instances merge the delta
 ↓
UI updates instantly (via React hooks or Quill bindings)
```

---

## 9. API Documentation

| Method | Endpoint | Frontend File | Backend Route | Purpose |
|--------|----------|---------------|---------------|---------|
| POST | `/api/auth/login` | `AuthPage.jsx` | `auth.routes.js` | Authenticate user via email/pass |
| GET | `/api/auth/session` | `AuthContext.jsx` | `auth.routes.js` | Validate active session cookie |
| GET | `/api/v1/workspaces` | `App.jsx` | `workspace.routes.js` | Get list of user's workspaces |
| POST | `/api/v1/workspaces` | `App.jsx` | `workspace.routes.js` | Create a new workspace |
| POST | `/api/v1/ai/generate` | `AiGenerateModal.jsx` | `ai.routes.js` | Generate document text via AI |
| POST | `/api/v1/ai/generate-slides` | `AiPresentationModal.jsx`| `ai.routes.js` | Generate PPT slides structure |
| POST | `/api/v1/ai/generate-tasks` | `AiTaskModal.jsx` | `ai.routes.js` | Extract tasks from unstructured text |

---

## 10. Database Architecture

**Database Technology:** MongoDB with Mongoose ORM.

**Primary Collections:**
- **Users:** Stores authentication credentials, profile information, and preferences.
- **Workspaces:** Stores workspace metadata, ownership, access roles (members).
- **YjsUpdates:** (Handled internally by y-mongodb-provider) Stores the CRDT operation logs for collaborative features so documents persist after clients disconnect.
- **Tasks:** Metadata for calendar/task items.

**Relationships:**
- Workspaces contain an array of member objects referencing User IDs.
- Tasks are bound to a Workspace ID.
- Yjs documents are keyed by `workspaceId-featureName` (e.g., `ws123-document`).

---

## 11. Feature-by-Feature Explanation

### Documents (Rich Text)
- **Flow:** User opens `/workspace/:id/documents` -> `DocumentsSection` loads -> `Documents.jsx` initializes Quill editor -> `y-quill` binds Quill to a Yjs `Y.Text` type -> WebSocket connects to backend -> Collaborative typing begins.

### Spreadsheet
- **Flow:** Uses a custom Grid rendering system. State is managed via a Yjs `Y.Map`. `handleCellChange` updates the Y.Map. AI can be injected via `AiSpreadsheetModal` which calls `/api/v1/ai/generate-spreadsheet`, returning JSON data or formulas that are injected into the Y.Map.

### Tasks & Calendar
- **Flow:** Uses standard REST API for persistence. `Calendar.jsx` fetches tasks via `api.get`. When the user clicks the AI Extract Tasks button -> `AiTaskModal.jsx` opens -> sends meeting notes to `/api/v1/ai/generate-tasks` -> AI returns JSON task array -> Frontend maps results and POSTs to `/api/v1/workspaces/:id/tasks` -> Updates local state.

### AI Assistants
- **Flow:** User clicks AI button (Sparkles icon) in top toolbar -> Modal opens -> User enters prompt -> Request sent to backend `ai.controller.js` -> `ai.service.js` crafts a rigid system prompt -> Connects to Ollama backend via streaming API -> Returns formatted text, Markdown, or JSON array -> Frontend parses and applies to the local editor/canvas/grid.

---

## 12. Important Functions

### `loadWorkspaces()`
- **Purpose:** Fetches the active user's workspaces and recent history.
- **Called From:** `App.jsx` (on mount and on refresh events).
- **Calls:** `api.get('/api/v1/workspaces')`.
- **Output:** Sets `workspaces` and `recentWorkspaces` state, updates local cache.

### `handleInsertAiTasks(newTasks)`
- **Purpose:** Takes AI-generated JSON task objects and persists them to the database.
- **Called From:** `Calendar.jsx` (callback passed to `AiTaskModal`).
- **Calls:** `Promise.allSettled` with `api.post('/api/v1/workspaces/:id/tasks')`.
- **Output:** Merges successfully saved tasks into the active React state and emits a WebRTC update to other clients via `tasksChannel`.

### `AiService.generateSpreadsheet(prompt, mode)`
- **Purpose:** Backend service generating structured spreadsheet data or formulas.
- **Called From:** `ai.controller.js`.
- **Calls:** Ollama local AI server.
- **Output:** Returns a raw formula string (starting with `=`) or a parsed 2D JSON array.

---

## 13. Developer Debugging Guide

- **Where a component is rendered:** Search inside `frontend/src/App.jsx` or `frontend/src/components/WorkspaceHome.jsx`.
- **Where a function is defined:** Most API logic is in `frontend/src/services/api.js`. Global state is often inside `frontend/src/App.jsx` or `contexts/`.
- **Where API calls happen:** Backend logic lives in `backend/src/controllers/`.
- **Where backend routes are handled:** Start at `backend/src/app.js`, trace to `backend/src/routes/`, then to `controllers/`.
- **Where real-time sync happens:** Look at `backend/src/collab/wsHub.js` for the server WebSocket logic, and the `useEffect` hooks inside individual components (like `Documents.jsx`) for the client-side Yjs connection.

---

## 14. Complete User Journey

**New User:**
Open website → Click "Sign Up" → `AuthPage` (Signup Mode) → API registers user in MongoDB → AuthContext sets session → Redirected to `/dashboard` → Clicks "Create Workspace" → Redirected to `/workspace/:id` → Clicks "Documents" sidebar item → Begins collaborative editing.

**Existing User:**
Open website → `AuthContext` validates session via cookie on load → Redirected immediately to `/dashboard` → Clicks a recent workspace card → Enters workspace and continues previous work.

---

## 15. Code Navigation Map

If you want to understand specific features, read these files in order:

**Authentication:**
1. `frontend/src/contexts/AuthContext.jsx`
2. `frontend/src/features/auth/pages/AuthPage.jsx`
3. `backend/src/routes/auth.routes.js`
4. `backend/src/config/passport.js`

**Real-Time Collaboration (Yjs):**
1. `backend/src/collab/wsHub.js`
2. `frontend/src/components/Documents.jsx` (Look at the `Y.Doc` and `WebsocketProvider` initialization)

**AI Assistants Integration:**
1. `frontend/src/components/AiTaskModal.jsx` (or Spreadsheet/Presentation equivalents)
2. `backend/src/routes/ai.routes.js`
3. `backend/src/controllers/ai.controller.js`
4. `backend/src/services/ai.service.js`
