# Teamora — Full Codebase Audit Report (Re-audit)

**Date:** 2026-07-10  
**Branch:** `teamora-v2`  
**Scope:** Entire monorepo (`backend/`, `frontend/`, root, CI)  
**Method:** Source inspection + `npm test` / `npm run lint` / `npm run build` / `npm audit`  
**Note:** Supersedes the 2026-07-09 report for *open* findings. Items marked **RESOLVED** were fixed in prior commits and verified still present.

---

## 1. Architecture Summary

| Layer | Stack | Role |
|-------|--------|------|
| **Backend** | Express 5, Mongoose 9, Passport Google OAuth, express-session + connect-mongo, Helmet, CORS, rate-limit | Auth, workspaces, invites, join requests, notifications, tasks |
| **Frontend** | React 19, Vite 8, React Router 7, Tailwind 4, Axios | SPA: landing, auth, dashboard, workspace tools |
| **Data** | MongoDB (`User`, `Workspace` embeds: tasks, joinRequests, notifications, approvedMembers) | No separate Task/Document collections |
| **Realtime** | Browser-only `BroadcastChannel` + `localStorage` (`localCollabChannel`) | Cross-tab sync for docs/whiteboard/spreadsheet/slides/files/meetings |
| **Deploy** | Frontend → Vercel; Backend → Render | Cross-origin cookies (`sameSite: 'none'` in production) |

**Auth flow:** Browser session cookie → `requireAuth` → controller → service → Mongoose.

**Workspace tools:** Lazy-loaded sections + `useLocalCollabChannel`. Collaboration content is **not** server-persisted (except Calendar/Tasks via REST).

**Conventions:** CommonJS backend; ESM React frontend; Tailwind utility classes (mix of design tokens + hex literals); toast errors; axios interceptor normalizes API errors; Node native `node:test` on backend; ESLint + Prettier both sides.

---

## 2. Previously Critical / High — Status Check

| ID | Issue | Status |
|----|--------|--------|
| C1 | `joinApproval` ignored | **RESOLVED** — auto-join when `joinApproval === false` |
| C2 | ProtectedRoute flash while loading | **RESOLVED** — `AuthLoadingShell` while `loading` |
| C3 | Meetings host / chat broken | **RESOLVED** — host claim + `send-message` relay + local download recording |
| H1 | Unused Socket.IO packages | **RESOLVED** — removed from both package.json files |
| H2 | Leave does not revoke approval | **RESOLVED** — `revokedAt` on leave |
| H3 | Unbounded avatar payload | **RESOLVED** — 200KB avatar + `express.json({ limit: '300kb' })` |
| H4 | Orphan Tasks/FileExplorer | **RESOLVED** — removed; ErrorBoundary at root |
| H6 | Notification recipient filter fragile | **RESOLVED** — `getEntityId` |

---

## 3. Open Findings (Prioritized)

### Critical

*None remaining after prior fix pass.* Residual product limits (local-only collab, same-browser WebRTC) are architectural, not silent functional failures.

---

### High

#### H1 — Workspace creation limit only enforced on the client
| | |
|--|--|
| **Severity** | High |
| **Location** | `frontend/src/App.jsx` (`createWorkspace`); `backend/src/services/workspace.service.js` (`createWorkspace`) |
| **Why it matters** | Cap of 6 is trivial to bypass via direct API calls; product rule is not real. |
| **Fix direction** | Enforce max owned non-archived workspaces server-side; keep client check as UX. |

#### H2 — Auth cache marks session ready before `/me` revalidation
| | |
|--|--|
| **Severity** | High |
| **Location** | `frontend/src/contexts/AuthContext.jsx` (`loading` init from cache) |
| **Why it matters** | With a stale `teamora-auth-user` cache, `loading` starts `false` and `ProtectedRoute` renders private UI before the session cookie is verified. Expired sessions flash dashboard/workspace chrome and fire authenticated API calls that 401. |
| **Fix direction** | Always keep `loading === true` until the first `/me` attempt completes; still seed `user` from cache for post-validation display if desired. |

#### H3 — Legacy `rooms` collection update blocks leave/delete for ~10s when Mongo is buffering
| | |
|--|--|
| **Severity** | High |
| **Location** | `backend/src/services/workspace.service.js` (`leaveWorkspace`, `deleteWorkspace`) |
| **Why it matters** | `mongoose.connection.collection('rooms').updateOne(...)` waits on buffer timeout (observed **10s**) when the connection is not ready. Sole-owner leave tests hang; production degrades if Mongo is reconnecting. |
| **Fix direction** | Only touch `rooms` when `mongoose.connection.readyState === 1`; keep try/catch. |

---

### Medium

#### M1 — Failed workspace list fetch wipes UI + local cache
| | |
|--|--|
| **Severity** | Medium |
| **Location** | `frontend/src/App.jsx` (`loadWorkspaces` catch) |
| **Why it matters** | A transient network blip empties the dashboard and clears cache, looking like “all workspaces deleted.” |
| **Fix direction** | On error, set notice only; retain previous `workspaces` / `recentWorkspaces` and cache. |

#### M2 — Avatar client cap (1 MB file) vs server (~200k chars / 300kb JSON)
| | |
|--|--|
| **Severity** | Medium |
| **Location** | `frontend/src/components/SettingsPage.jsx`; `backend/src/services/auth.service.js` |
| **Why it matters** | Users pick a valid client image that fails only after upload with a confusing server error (or 413). Base64 expands ~33%. |
| **Fix direction** | Client-side max ~140 KB file (or compress before data URL); align copy with server. |

#### M3 — Workspace settings form state does not re-sync from props
| | |
|--|--|
| **Severity** | Medium |
| **Location** | `frontend/src/components/WorkspaceHome.jsx` (`WorkspaceSettings`) |
| **Why it matters** | After refresh/accept flows, toggles like `joinApproval` can show stale local state until remount. |
| **Fix direction** | `useEffect` syncing from `workspace` when ids/settings change. |

#### M4 — `declineJoinRequest` ignores archived workspaces
| | |
|--|--|
| **Severity** | Medium |
| **Location** | `backend/src/services/workspace.service.js` |
| **Why it matters** | Accept path rejects archived workspaces; decline still mutates them — inconsistent. |
| **Fix direction** | Mirror accept: 404 if `archivedAt` set. |

#### M5 — “Export as Word” is HTML with a fake DOCX MIME type
| | |
|--|--|
| **Severity** | Medium |
| **Location** | `frontend/src/components/Documents.jsx` (`exportDocx`) |
| **Why it matters** | Misleading product behavior; files often fail to open correctly in Word. |
| **Fix direction** | Honest “Export HTML” download (or real DOCX later). |

#### M6 — Noise suppression toggle is cosmetic only
| | |
|--|--|
| **Severity** | Medium |
| **Location** | `frontend/src/components/Meetings.jsx` |
| **Why it matters** | Control implies audio processing that never applies. |
| **Fix direction** | Label as experimental / unavailable, or apply `getUserMedia` constraints when re-acquiring audio. |

#### M7 — CI does not run on active development branch
| | |
|--|--|
| **Severity** | Medium |
| **Location** | `.github/workflows/ci.yml` |
| **Why it matters** | Work on `teamora-v2` skips automated checks until merge to main. |
| **Fix direction** | Add `teamora-v2` (and optionally all PRs) to `on.push` / `on.pull_request`. |

#### M8 — Waiting-room signal with missing host target is not targeted
| | |
|--|--|
| **Severity** | Medium |
| **Location** | `frontend/src/components/Meetings.jsx` (`handleJoinMeeting`) |
| **Why it matters** | Empty `targetSocketId` causes non-targeted broadcast semantics in the local channel. |
| **Fix direction** | If no host, claim host or block join with clear toast. |

#### M9 — Settings “notification preferences” and “active sessions” are mostly cosmetic
| | |
|--|--|
| **Severity** | Medium |
| **Location** | `frontend/src/components/SettingsPage.jsx` |
| **Why it matters** | Email notification toggles do not hit the backend; “session started today” is fabricated. |
| **Fix direction** | Honest copy (“stored on this device only” / “current browser session”) — no fake session inventory. |

---

### Low / Tech debt

| ID | Issue | Location | Fix direction |
|----|--------|----------|---------------|
| L1 | `requireAuth` omits `success: false` | `auth.middleware.js` | Align response shape |
| L2 | `morgan('dev')` in production | `app.js` | `combined` when prod |
| L3 | Quill 2.0.3 XSS advisory (export path) | `package.json` | Monitor upstream; sanitize exports |
| L4 | Hardcoded Render API fallback | `api.js` | Prefer env-only; document |
| L5 | Leftover `VITE_CLERK_*` in local env example surface | `frontend/.env` | Remove dead Clerk key if unused |
| L6 | Print path embeds `docTitle` unsanitized | `Documents.jsx` | Escape HTML in title |
| L7 | `visibility` private vs invite_only not enforced on join | workspace service | Document or enforce |
| L8 | Large lazy chunks (Documents ~1.2MB) | build output | Acceptable for now; optional further splits |
| L9 | Notifications poll every 5s | `NotificationButton.jsx` | Acceptable at current scale |
| L10 | Embedded tasks/notifications on Workspace | models | Architecture debt for large orgs |

---

## 4. Security Snapshot

| Severity | Finding | Action |
|----------|---------|--------|
| High | Client-only workspace limit | Fix this pass |
| High | Stale auth cache gates protected UI | Fix this pass |
| Medium | Cross-origin sessions without classic CSRF tokens | **Mitigated** (JSON Content-Type + CORS) |
| Medium | Avatar client/server size drift | Fix this pass |
| Low | Quill HTML export XSS (upstream) | Monitor |
| Info | Rate limit scoped to auth (not `/me`) | Good |
| Info | Session regenerate on login; reset tokens hashed | Good |
| Info | Backend npm audit clean; frontend 1 low (Quill) | OK |

---

## 5. Performance Snapshot

- Main shell ~638 KB / ~188 KB gzip — acceptable.
- Documents ~1.17 MB, Spreadsheet ~507 KB — lazy-loaded (first open cost).
- Leave/delete can stall 10s if Mongo buffering hits legacy `rooms` write — **fix**.
- Notification poll 5s — fine for current product scale.
- Workspace document growth (tasks + notifications arrays) — long-term risk.

---

## 6. Testing / Tooling Baseline (this re-audit)

| Check | Result |
|-------|--------|
| `backend npm test` | 7/7 pass (sole-owner leave ~10s due to H3) |
| `frontend npm run lint` | Pass |
| `frontend npm run build` | Pass |
| Backend audit | 0 vulns |
| Frontend audit | 1 low (Quill) |
| CI | Exists; branch filter incomplete (M7) |

---

## 7. Product Reality (not bugs — do not fake)

| Marketed capability | Current reality |
|---------------------|-----------------|
| Multi-device live docs/whiteboard | Same-browser tab sync only |
| Cross-device video meetings | Same-browser WebRTC mesh only |
| Workspace chat | Local + BroadcastChannel per browser |
| Cloud file storage | `localStorage` + channel |
| Email notification prefs | Local preferences only |

These remain **documented product limits**, not silent fake implementations.

---

## 8. Ordered Action Plan (Phase 3) → Phase 4 Status

| Step | Finding | Status |
|------|---------|--------|
| 1 | H3 rooms readyState guard | **Done** — sole-owner leave test ~0.5ms (was ~10s) |
| 2 | H1 server max 6 workspaces | **Done** + unit test |
| 3 | H2 auth session revalidation gate | **Done** |
| 4 | M1 preserve workspace list on error | **Done** |
| 5 | M2 avatar client/server size align | **Done** (140 KB file + encoded cap) |
| 6 | M3 settings form re-sync | **Done** (keyed remount) |
| 7 | M4 decline archived workspace | **Done** |
| 8 | M5/M6/M8/M9 UX honesty | **Done** |
| 9 | M7 CI + L1 requireAuth + L2 morgan | **Done** |
| 10 | Re-run tests/lint/build | **Done** — 8/8 tests, lint clean, build OK |

### Follow-up pass status (2026-07-10)

| Item | Status |
|------|--------|
| Visibility private vs invite_only | **Done** — private blocks invite joins (403); UI copy + invite page |
| Multi-device collab content | **Partial** — `WorkspaceContent` API + docs/files server sync (LWW); still no live OT/WebRTC mesh across devices |
| Notification prefs wired | **Done** — prefs filter in-app + browser task reminders; still device-local |
| Rate limits join/create/content | **Done** — production-only limiters on workspace routes |
| Orphan file deletions | **Pending commit** — already deleted on disk; review before push |
| Object storage for avatars | **Not started** — still data-URL with caps |
| Full e2e suite | **Not started** — expanded unit tests instead |

### Explicitly deferred

- Full realtime multi-user OT/CRDT server (WebSocket).
- Object storage (S3) for avatars/files.
- Playwright/Cypress e2e suite.
- Architectural rewrite of embedded Workspace arrays.
