# Teamora — Full Codebase Audit Report

**Date:** 2026-07-09  
**Branch:** `teamora-v2`  
**Scope:** Entire monorepo (`backend/`, `frontend/`, root, CI)  
**Method:** Source inspection only (no assumptions about undeployed services)

---

## 1. Architecture Summary

| Layer | Stack | Role |
|-------|--------|------|
| **Backend** | Express 5, Mongoose 9, Passport Google OAuth, express-session + connect-mongo, Helmet, CORS, rate-limit | Auth, workspaces, invites, join requests, notifications, tasks |
| **Frontend** | React 19, Vite 8, React Router 7, Tailwind 4, Axios | SPA: landing, auth, dashboard, workspace tools |
| **Data** | MongoDB (User, Workspace embeds: tasks, joinRequests, notifications, approvedMembers) | No separate Task/Document collections |
| **Realtime** | Browser-only `BroadcastChannel` + `localStorage` (`localCollabChannel`) | Cross-tab sync for docs/whiteboard/spreadsheet/slides/files/meetings |
| **Deploy** | Frontend → Vercel (`vercel.json` SPA rewrites); Backend → Render (hardcoded prod API URL fallback) | Cross-origin cookies (`sameSite: 'none'`) |

**Request flow (auth):** Browser → session cookie → `requireAuth` → controller → service → Mongoose.

**Workspace tools:** Lazy-loaded sections wrap heavy editors (`Documents`, `Whiteboard`, …) with `useLocalCollabChannel`. Content is **not** persisted server-side (except Calendar/Tasks via REST).

---

## 2. Mental Model — Component Dependencies

```
main.jsx → AuthProvider → App.jsx (routes)
  ├─ Auth pages → features/auth/services/auth → services/api → /api/auth/*
  ├─ Dashboard → workspace CRUD via /api/v1/workspaces
  └─ WorkspaceHome
       ├─ Calendar (tasks REST)
       ├─ *Section (lazy) → localCollabChannel → feature components
       ├─ Members / Settings / Chat (localStorage chat)
       └─ NotificationButton → /api/v1/workspaces/notifications
```

**Backend modules:** `server.js` → `app.js` → `auth.routes` / `workspace.routes` → controllers → services → models.

---

## 3. Critical Issues

### C1 — `joinApproval` setting is ignored
| | |
|--|--|
| **Files** | `backend/src/services/workspace.service.js` (`requestWorkspaceAccess`); UI in `WorkspaceHome.jsx` |
| **Root cause** | Setting is stored and editable, but join path always creates a pending request (unless already approved). |
| **Impact** | Owners who turn off “Join approval” still force every invitee through request/accept. Feature is non-functional. |
| **Fix** | When `workspace.joinApproval === false`, auto-add member, approval row, accept pending requests, return `joined: true`. |

### C2 — Protected routes flash unauthenticated content
| | |
|--|--|
| **Files** | `frontend/src/components/ProtectedRoute.jsx` |
| **Root cause** | While `loading === true`, children render without auth check. |
| **Impact** | Brief leak of dashboard/workspace chrome; possible flash of private UI before redirect. |
| **Fix** | Render a neutral full-page loader until session resolves. |

### C3 — Meetings host / chat partially broken
| | |
|--|--|
| **Files** | `frontend/src/components/Meetings.jsx`, `localCollabChannel.js`, `MeetingsSection.jsx` |
| **Root cause** | `activeUsers` always `[]` → `isHost` always false (host controls never work). `send-message` not in relay map → chat only updates local state. Recording claims “saved to Files” but does not save. |
| **Impact** | Waiting room, mute/kick/admit unusable; multi-tab chat incomplete; misleading recording UX. |
| **Fix** | First participant becomes host; relay meeting chat; honest recording UX (timer only / local download). |

---

## 4. High-Priority Issues

### H1 — Unused Socket.IO dependencies still installed
| | |
|--|--|
| **Files** | `frontend/package.json` (`socket.io-client`), `backend/package.json` (`socket.io`) |
| **Root cause** | Legacy realtime server removed; local collab channel replaced it. |
| **Impact** | Dead weight, larger install surface, confusion. |
| **Fix** | Remove packages and reinstall lockfiles. |

### H2 — Leave workspace does not revoke membership approval
| | |
|--|--|
| **Files** | `backend/src/services/workspace.service.js` (`leaveWorkspace`) |
| **Root cause** | Member list updated; `approvedMembers` not revoked. |
| **Impact** | Leaving user can re-join via invite without approval (`hasActiveApproval` path). |
| **Fix** | Set `revokedAt` on leave (same as `removeMember`). |

### H3 — Avatar stored as unrestricted base64 on user document
| | |
|--|--|
| **Files** | `SettingsPage.jsx` (1MB client cap); `auth.service.js` / User model (no server cap) |
| **Root cause** | Profile accepts arbitrary string avatar; `express.json()` default may still allow large payloads. |
| **Impact** | Document bloat, DoS via large profile updates, Mongo size pressure. |
| **Fix** | Server-side max length (~200KB data URL), `express.json({ limit: '300kb' })`. |

### H4 — Orphaned / dead frontend modules
| | |
|--|--|
| **Files** | `Tasks.jsx`, `FileExplorer.jsx`, `frontend/UserAvatar.jsx`, design tokens under `styles/` (mostly unused), `ErrorBoundary` unused |
| **Root cause** | Tasks UI replaced by Calendar; FileExplorer never wired; leftover re-exports. |
| **Impact** | Maintenance cost; `Tasks.jsx` still emits `update-tasks` which has no channel rule. |
| **Fix** | Wire ErrorBoundary at root; remove or clearly quarantine dead modules; prefer delete confirmed-orphan files. |

### H5 — Google OAuth silently upgrades local accounts
| | |
|--|--|
| **Files** | `auth.service.js` `findOrCreateGoogleUser` |
| **Root cause** | Existing email → `provider = 'google'` without additional linking step. |
| **Impact** | Google-verified email ownership makes this common and usually OK; still changes auth method without user intent in Settings “Connect”. Document as accepted risk; do not wipe password. |
| **Fix** | Keep password hash; set provider to google only when linking intentionally; avoid wiping local password. |

### H6 — Notification recipient filter fragile when populated
| | |
|--|--|
| **Files** | `workspace.service.js` `getNotifications` |
| **Root cause** | Compares `notification.recipient.toString()`; if populated object, wrong comparison. |
| **Impact** | Notifications may disappear for users if population changes. |
| **Fix** | Use `getEntityId(notification.recipient)`. |

---

## 5. Medium-Priority Issues

| ID | Issue | Files | Impact | Fix |
|----|--------|-------|--------|-----|
| M1 | setState during render when switching workspace | `WorkspaceHome.jsx` | React anti-pattern; subtle bugs | Use `useEffect` / key remount |
| M2 | Frontend signup does not enforce min password length (8) | `useAuthForm.js` | Server rejects; poor UX | Client-side min length |
| M3 | Meeting WebRTC only same-browser tabs | design limitation | No cross-device meetings | Document; future signaling server |
| M4 | Workspace docs/files only localStorage | collab channel | No multi-device persistence | Future workspace content API |
| M5 | Chat is local-only | `WorkspaceHome` | No multi-user chat | Future chat API / channel |
| M6 | CI only on `main`/`master` | `.github/workflows/ci.yml` | `teamora-v2` PRs skip CI | Add branch |
| M7 | Quill XSS advisory (low, unpatched 2.x) | `quill@2.0.3` | XSS if malicious HTML exported | Track upstream; sanitize exports |
| M8 | Large JS chunks (Documents ~1.1MB, Spreadsheet ~500KB) | build | Slow first open of sections | Already lazy-loaded; further split optional |
| M9 | Hardcoded production API URL | `api.js` | Wrong backend if Render URL changes | Prefer env only; document |
| M10 | `removeRecentWorkspaceForEveryone` dead | `workspace.service.js` | Dead code | Remove or use on hard delete |
| M11 | Recording “saved to Files” lie | `Meetings.jsx` | False UX | Fix copy / implement download |
| M12 | Noise suppression / blur mostly cosmetic | `Meetings.jsx` | Blur works on video CSS; noise does nothing | Wire or label experimental |
| M13 | Rate limit disabled outside production for auth | `auth.routes.js` | Fine for dev; intentional | Keep |
| M14 | Uncommitted git mess (staged root deletes, node_modules noise) | repo | Hard reviews | Clean commit; never commit node_modules |

---

## 6. Low-Priority / Improvements

- Design tokens in `styles/` unused; UI uses Tailwind literals.
- Duplicate ProfileDropdown (app vs workspace) — intentional.
- No integration tests / e2e; only unit tests for email + leaveWorkspace.
- `morgan('dev')` in production noisy; consider `combined` in prod.
- No Docker / health monitoring beyond `/health`.
- Settings “Devices” / security actions are display-only.
- Favicon fixed to `/teamora.png` (good).
- Content-Type CSRF mitigation present for mutating routes (good).
- Session regenerate on login (good).
- Password reset token hashed at rest (good).

---

## 7. Security Findings

| Severity | Finding | Status |
|----------|---------|--------|
| High | joinApproval bypass of owner intent | Fix in this pass |
| High | Unbounded profile avatar payload | Fix in this pass |
| Medium | Protected route content flash | Fix in this pass |
| Medium | Quill HTML export XSS (upstream) | Accepted / monitor |
| Medium | Cross-origin session cookies without classic CSRF tokens | Mitigated via JSON Content-Type + CORS |
| Low | Weak default `SESSION_SECRET` in non-prod | Acceptable; prod requires secret |
| Low | Email enumeration mitigated on forgot-password | Good |
| Info | `.env` gitignored | Good |
| Info | Backend npm audit clean | Good |

---

## 8. Performance Findings

- Main bundle ~624KB / 184KB gzip — acceptable for SPA shell.
- Documents section pulls Quill + html2pdf (~1.1MB) — lazy-loaded, still heavy first paint.
- Notifications polled every 5s — simple but chatty; OK for scale of current product.
- Workspace embeds all tasks/notifications in one document — will not scale to large orgs (architecture debt).

---

## 9. Architecture Concerns & Technical Debt

1. **Dual persistence models:** Auth/workspaces/tasks on Mongo; collaboration content on `localStorage` only.
2. **Embedded arrays on Workspace** for tasks/notifications — eventual N+1-like document growth.
3. **No real multi-device realtime** — product marketed as collab; channel is same-browser only.
4. **Monolithic feature components** (800–1300 LOC) hard to test.
5. **Incomplete migration** from Socket.IO monolith still visible in package deps and orphan files.
6. **Git worktree dirty** with staged deletions of root legacy files and untracked new structure.

---

## 10. Unfinished / Missing Functionality

| Feature | Reality |
|---------|---------|
| Multi-device live docs/whiteboard | Local tab sync only |
| Cross-device video meetings | Same-browser WebRTC only |
| Workspace chat | Local per-browser |
| Kanban `Tasks.jsx` | Dead; Calendar/API used instead |
| FileExplorer dual file system | Dead |
| Meeting recording to Files | Fake |
| Email change | Explicitly unsupported |
| Dark mode | Removed / forced light |
| Realtime notifications | 5s poll |

---

## 11. Testing & DevOps

| Check | Result |
|-------|--------|
| `backend npm test` | 5/5 pass |
| `frontend npm run lint` | Pass |
| `frontend npm run build` | Pass |
| Backend audit | 0 vulns |
| Frontend audit | 1 low (Quill) |
| CI | Exists; limited branch filters |

---

## 12. Fix Plan (Phase 4)

1. Enforce `joinApproval` auto-join; revoke approval on leave; harden notifications + avatars + JSON limit.
2. ProtectedRoute loader; meeting host + chat relay; recording honesty; password min length; ErrorBoundary.
3. Remove `socket.io` / `socket.io-client`; remove dead `removeRecentWorkspaceForEveryone` if unused; quarantine or delete `FileExplorer`/`Tasks` only if safe (prefer keep if plan referenced them — delete confirmed zero-import).
4. Expand CI branches; re-run tests/lint/build.

**Out of scope for this pass (documented, not silently faked):** full multi-device collab server, object storage for files/avatars, e2e suite rewrite.
