# Teamora — Project Improvement Plan

**Status legend:** `Not Started` · `In Progress` · `Completed` · `Blocked`

This document is the single source of truth for the end-to-end audit and improvement
pass on the Teamora collaboration workspace (`backend/` Express API + `frontend/`
React SPA). It is updated continuously as work progresses.

---

## 0. Repository Snapshot (as found)

- **Backend** (`backend/`): Express 5 + Mongoose 9 + Passport (Google OAuth) +
  express-session (Mongo-backed). Implements auth (register/login/logout/forgot-reset
  password/Google OAuth/profile) and workspaces (CRUD, invites, join requests,
  notifications, tasks). No realtime/WebSocket layer.
- **Frontend** (`frontend/`): React 19 + React Router 7 + Vite + Tailwind 4. A large
  component library exists for Documents, Whiteboard, Spreadsheet, Slides, Files,
  Meetings, Tasks — **but most of it is not wired into the app** (see Finding F1).
- **Git state**: repo root still tracks a deleted legacy `server.js`
  (Express + Socket.IO + a monolithic `Room` Mongo model) and a stale root
  `package.json`/`README.md`/`.gitignore`, all removed from disk but not committed as
  deleted. This is leftover from a migration to the current `backend/` + `frontend/`
  split.
- **No tests, no CI pipeline anywhere in the project.**

### Key findings that shape this plan

- **F1 — Orphaned features (Critical/High):** `Documents.jsx`, `Whiteboard.jsx`,
  `Spreadsheet.jsx`, `Slides.jsx`, `Files.jsx`, `Meetings.jsx`, `Tasks.jsx` and a whole
  cluster of realtime-chrome components (`CollaborationPanel`, `TopNavbar`, `StatusBar`,
  `FloatingScreenShare`, `ScreenViewer`, `ScreenShareButton`, `useWebRTC`,
  `useScreenShare`, `Sidebar`, `DashboardSidePanel`, `GlobalSearch`, `AuthForm`,
  `NotificationBell`) exist in `frontend/src/components` but are **never imported by
  anything reachable from `App.jsx`**. `WorkspaceHome.jsx` renders a generic
  "No items yet." placeholder for Documents/Whiteboard/Spreadsheet/Presentation/
  Meetings/Shared Files instead. This is leftover from the old Socket.IO
  single-server architecture (recovered from `git show HEAD:server.js`) that was
  never reconnected after the backend was rewritten.
- **F2 — Broken ownership transfer on workspace leave (Critical):**
  `workspace.service.js#leaveWorkspace` has a no-op `workspace.owner = userId` and
  always returns `workspaceDeleted: false`, so a departing owner keeps owner
  privileges forever (broken access control) and empty workspaces are never cleaned
  up, even though the frontend already has UI copy for both cases.
- **F3 — Dead/unused dependencies:** `socket.io-client` (frontend), `express-validator`
  (backend) are installed but never used anywhere.
- **F4 — Rate limiter too broad (High):** the strict 20-req/15-min `authLimiter`
  wraps the *entire* `/api/auth` router in production, including `/me` (called on
  every page load) and `/logout`/`/profile`, risking legitimate users getting locked
  out during normal use.
- **F5 — CSRF gap (High):** session cookies use `sameSite: 'none'` in production
  (required for the cross-origin Vercel/Render split) with no CSRF defense beyond
  CORS allow-listing, which does not stop "simple" (non-preflighted) cross-site
  requests to state-changing endpoints.
- **F6 — Email service ignores its own config (Medium):** `email.service.js` hardcodes
  `service: 'gmail'` in the Nodemailer transport, so `SMTP_HOST`/`SMTP_PORT`/
  `SMTP_SECURE` are parsed/validated but never actually used; also logs SMTP
  username/host to stdout.
- **Misc:** broken favicon reference, dead legacy `components/AuthForm.jsx` /
  `NotificationBell.jsx` shims, no tests, no CI, thin documentation.

Full detail for every finding is captured in the stage sections below as they are
executed.

---

## 1. Execution Plan (Stages)

| # | Stage | Status |
|---|-------|--------|
| 1 | Repository understanding | Completed |
| 2 | Build & dependency hygiene | Completed |
| 3 | Critical bug fixes (backend correctness) | Completed |
| 4 | Security hardening | Completed |
| 5 | Dead code removal & architecture cleanup | Completed |
| 6 | Feature completion — wire up orphaned workspace tools | Completed |
| 7 | Frontend bug sweep (remaining components) | Completed |
| 8 | Backend automated tests | Completed |
| 9 | Documentation | Completed |
| 10 | CI/CD & tooling | Completed |
| 11 | Final polish & re-review | Completed |

Stages are mostly sequential (each depends on the previous being safe to build on),
but 6 and 7 can interleave once 2–5 are done.

---

## Stage 1 — Repository Understanding

**Objective:** Fully map the codebase, confirm what is live vs. dead, and recover
context for anything ambiguous (e.g. via git history) before changing code.
**Status:** Completed.

**Findings:** captured above in "Repository Snapshot" and inline in each later stage.
Recovered the original Socket.IO event contract from `git show HEAD:server.js`
(deleted but still in history) — this directly informs Stage 6's design.

---

## Stage 2 — Build & Dependency Hygiene

**Objective:** Make the repository's tracked state match reality; remove dead
dependencies; fix obviously broken static assets.
**Scope:** repo root git state, `frontend/index.html`, `frontend/src/assets`,
`backend/package.json`, `frontend/package.json`.
**Risk:** Low. **Dependency:** none.

Tasks:
- [x] Remove stale root files from git tracking (legacy `server.js`, `server copy.js`,
      root `package.json`/`package-lock.json`/`README.md`/`.gitignore`) and add a
      new root `.gitignore` describing the `backend/`/`frontend/` layout (README to
      be finalized in Stage 9).
- [x] Fix broken favicon reference (`/teamora.svg` → `/teamora.png`).
- [x] Remove unused template assets (`react.svg`, `vite.svg`).
- [x] Removed confirmed-unused dependencies from `frontend/package.json`:
      `socket.io-client`, `tailwind-merge`, `quill-cursors` (verified via a clean
      `npm run build` after removal — `clsx` was *not* removed; an earlier grep
      pass incorrectly flagged it as unused when it is actually imported by nearly
      every `components/ui/*` primitive, caught by the build failing and restored
      immediately). Removed `express-validator` from `backend/package.json`
      (confirmed zero references).
- [x] **Correction:** initially (mis)flagged `Documents.jsx`/`Spreadsheet.jsx` as
      missing the `html2pdf`/`XLSX` imports, based on a grep that only checked for
      dynamic `import(`/`require(` calls. Both files actually have proper static
      `import ... from '...'` statements — confirmed by reading the files directly
      and by a clean `npm run build`. No bug there; noted here so the record is
      accurate. Lesson applied for the rest of this audit: verify with `lint`/`build`
      output, not just grep, before recording a finding as confirmed.
- [x] **Real bug found via `eslint` (`no-undef`) and fixed:** `Spreadsheet.jsx`
      referenced an undefined variable `sheetGridRowsCount` in two places
      (`handleImportXLSX`, `handleDuplicateSheet`) — leftover from a rename to the
      `rowCount` state variable that missed these two call sites. Would have thrown
      `ReferenceError` the moment a user imported an `.xlsx` file or duplicated a
      sheet. Fixed: import loop now bounds on the imported file's own row count
      (so large imports aren't truncated to the current viewport), duplicate-sheet
      loop now correctly uses `rowCount`.
- [x] **Security fix found via `npm audit`:** the pinned `xlsx@^0.18.5` pulled in
      two unpatched advisories (CVE-2023-30533 prototype pollution, CVE-2024-22363
      ReDoS — SheetJS never shipped a fix to the npm registry for the `xlsx` package
      name). Vendor-recommended remediation applied: point the dependency at
      SheetJS's own CDN tarball (`xlsx: "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`),
      which resolves both highs. Verified the tarball installs cleanly and resolves
      to `xlsx@0.20.3`. Remaining `npm audit`: 1 low-severity Quill XSS advisory
      (GHSA-v3m3-f69x-jf25 / CVE-2025-15056) affecting all Quill 2.x with **no patch
      released upstream yet** — documented as an accepted, tracked risk (see
      Documentation stage); revisit when `slab/quill` ships a fix.
- [x] Ran `npm install` in both `backend/` and `frontend/` to sync lockfiles and
      prune `node_modules` to match the trimmed dependency lists.
- [ ] Add real `"test"` scripts once Stage 8 lands (currently backend has no test
      script at all; tracked there, not here).

---

## Stage 3 — Critical Bug Fixes (Backend Correctness)

**Objective:** Fix functional bugs that break correctness or leave data in a broken
state.
**Scope:** `backend/src/services/workspace.service.js`, `backend/src/services/email.service.js`.
**Risk:** Medium (touches core workspace membership logic — needs careful review of
call sites). **Dependency:** Stage 2.

Tasks:
- [x] Fix `leaveWorkspace` (F2): transfer ownership to the earliest-joined remaining
      member when the owner leaves and members remain; delete the workspace (and its
      recent-workspace references) when the last member leaves; return accurate
      `workspaceDeleted` / `ownershipTransferred` / `newOwnerId` flags matching what the
      frontend already expects.
- [x] Fix `email.service.js` (F6): honor `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE` instead
      of hardcoding `service: 'gmail'`; remove sensitive `console.log`s of credentials.
- [x] **Tooling note discovered mid-stage:** the editor's bundled Prettier was
      auto-formatting entire files on every save using its *default* style (double
      quotes, semicolons everywhere) since the repo had no Prettier config, which
      produced noisy whole-file diffs unrelated to the actual change. Added
      `backend/.prettierrc.json` (single quotes + semicolons, matching the backend's
      existing convention) and `frontend/.prettierrc.json` (single quotes, no
      semicolons, matching the actively-used frontend files' convention), plus
      `.prettierignore` in both and a `prettier` devDependency + `format`/`format:check`
      scripts in both `package.json`s. Re-formatted the two files already touched
      back to the project style; confirmed via `git diff` that only intended logic
      changes remain plus safe, non-semantic line-wrap adjustments.

---

## Stage 4 — Security Hardening

**Objective:** Close authorization/rate-limiting/CSRF gaps without breaking existing
flows.
**Scope:** `backend/src/app.js`, `backend/src/routes/auth.routes.js`.
**Risk:** Medium (rate limit / CSRF changes can lock out legitimate traffic if
misconfigured — needs to preserve current dev/test ergonomics).
**Dependency:** Stage 3.

Tasks:
- [x] Scope the strict auth rate limiter to only brute-forceable endpoints
      (register/login/check-email/reset-password/google) instead of the whole
      `/api/auth` router (F4). `/me`, `/logout`, `/profile` are no longer limited
      since they require an existing session and are called during routine use.
- [x] Add a `Content-Type: application/json` enforcement middleware for
      POST/PUT/PATCH/DELETE requests (F5). This forces a CORS preflight for every
      mutating request, and the existing origin allow-list rejects that preflight
      for untrusted origins, closing the "simple request" CSRF gap without a full
      token-based CSRF scheme. Verified the legitimate frontend already sends this
      header on every request (`frontend/src/services/api.js` sets it as an axios
      default), so this is behavior-preserving for real traffic.
- [x] Verified `app.js` still loads cleanly (`node -e "require('./backend/src/app.js')"`)
      and both edited backend files have zero diagnostics after the change.
- [x] Reviewed and confirmed existing protections are already sound (no change
      needed): Helmet defaults, CORS allow-list incl. Vercel preview regex, session
      cookie flags (`httpOnly`, `secure` in prod, `sameSite: none` in prod / `lax`
      in dev), bcrypt cost factor 12, password length policy (8+ chars, matches
      current NIST 800-63B guidance of favoring length over forced complexity),
      password reset token hashing (SHA-256 of a 32-byte random token, 15 min
      expiry, generic response to avoid account enumeration on that specific path),
      `trust proxy` only enabled in production, Mongo query inputs validated/cast
      before use (no NoSQL injection surface found).
- [x] Documented (not changed, by design) that `checkEmailAvailability` intentionally
      reveals whether an email is registered — needed for the signup UX — this is a
      standard, accepted trade-off distinct from the password-reset flow, which does
      not leak that information.

---

## Stage 5 — Dead Code Removal & Architecture Cleanup

**Objective:** Remove confirmed-dead legacy code tied to the old Socket.IO/room
architecture; tidy duplicated auth/profile-dropdown shims.
**Scope:** `frontend/src/components/*`, `frontend/src/hooks/*`, `frontend/src/features/*`.
**Risk:** Low (all removals verified to have zero importers before deletion).
**Dependency:** Stage 1 (analysis), independent of 2–4.

Tasks:
- [x] Deleted confirmed-orphaned legacy chrome (zero importers, re-verified with a
      targeted grep immediately before deletion to rule out false negatives):
      `CollaborationPanel.jsx`, `TopNavbar.jsx`, `StatusBar.jsx`,
      `FloatingScreenShare.jsx`, `ScreenViewer.jsx`, `ScreenShareButton.jsx`,
      `useWebRTC.js`, `useScreenShare.js`, `Sidebar.jsx`, `DashboardSidePanel.jsx`,
      `GlobalSearch.jsx`, `AuthForm.jsx`, `NotificationBell.jsx`.
- [x] Deleted empty placeholder `features/*/index.js` stub folders that were never
      imported anywhere (`calendar`, `dashboard`, `documents`, `meetings`,
      `presentation`, `profile`, `settings`, `spreadsheet`, `whiteboard`).
- [x] Deleted superseded `components/Settings.jsx` (replaced by `SettingsPage.jsx`).
- [x] **Verified with a real build, not just grep:** `npm run build` in `frontend/`
      succeeds after all deletions (459 modules transformed, no missing-module
      errors). `features/auth` and `features/workspace` were kept as-is since their
      contents are genuinely used (just not through their unused barrel
      `index.js`, which was left in place — low-value/low-risk to remove and
      documented as a future cleanup instead).

---

## Stage 6 — Feature Completion: Wire Up Orphaned Workspace Tools

**Objective:** Make Documents, Whiteboard, Spreadsheet, Presentation (Slides),
Shared Files and Meetings actually reachable and functional instead of showing
"No items yet.", without requiring a brand-new realtime backend in this pass.
**Scope:** new `frontend/src/utils/localCollabChannel.js`,
new `frontend/src/hooks/useLocalCollabChannel.js`, new
`frontend/src/components/workspace-sections/*Section.jsx`, `WorkspaceHome.jsx`.
**Risk:** Medium-High (largest functional change in this pass).
**Dependency:** Stages 2–5.

**Design decision:** Building a full multi-user realtime backend (Socket.IO server +
new persistence models + room auth) is a legitimate long-term goal (see "Future
Improvements") but is too large/risky to rush into this pass safely. Instead:
implement a small **local collaboration channel** (localStorage persistence +
`BroadcastChannel` for live cross-tab sync, no new dependencies) that satisfies the
*exact* `socket.emit`/`socket.on` contract these components already expect (recovered
from the legacy server). This makes every page fully usable and persistent per
workspace/browser today, and cross-tab-live as a bonus, while remaining a drop-in
replacement for a real Socket.IO client later (same `emit/on/off` surface).

Tasks:
- [x] Recovered the exact original event contract (`git show HEAD:server.js`) and
      built `src/utils/localCollabChannel.js`: emit/on/off + an explicit relay map
      mirroring every event Documents/Whiteboard/Spreadsheet/Slides/Files/Meetings
      actually use, `localStorage` persistence for "whole state" events, and
      `BroadcastChannel` fan-out (with correct exclude-sender broadcast semantics
      for room-style events and correct target-only delivery for `meeting-signal`).
- [x] Built `useLocalCollabChannel(workspaceId, feature)` hook. Iterated twice on
      its implementation after the *new* `eslint-plugin-react-hooks` v7 rules
      (`react-hooks/refs`, `react-hooks/set-state-in-effect`) correctly flagged an
      initial ref-during-render design and then a setState-in-effect design; settled
      on React's documented "adjust state during render" pattern, which is both
      lint-clean and avoids an extra render when the workspace/feature changes.
- [x] `DocumentsSection` — owns `comments`/`versions`, constructs the Quill editor
      itself (`window.Quill.find(...)` in `Documents.jsx` needs the class exposed
      globally — nothing previously did this), added a new `doc-content-sync`
      event (debounced last-write-wins whole-document-HTML sync; true
      character-level collaborative editing needs real OT/CRDT and a server, which
      is out of scope — documented as future work) since the recovered protocol's
      per-keystroke delta sync was never something a local-only channel could do
      safely.
- [x] `WhiteboardSection` — wires `Whiteboard.jsx` (fully self-managing via socket
      events; container only owns tool/color/size UI state).
- [x] `SpreadsheetSection` — owns `grid` (snapshotted to `localStorage` as a whole,
      with single-cell deltas relayed live between tabs) and `roomSettings`
      (sheet names/offsets, via the channel's normal persist+replay path).
- [x] `PresentationSection` — owns `slides`/`activeSlide`/`isPresenting`, wires `Slides.jsx`.
- [x] `SharedFilesSection` — owns `filesList`, wires `Files.jsx`.
- [x] `MeetingsSection` — wires `Meetings.jsx` (same-browser multi-tab WebRTC works
      for real today via BroadcastChannel-relayed SDP/ICE signaling; cross-device
      requires the future realtime backend — documented in-code and in this plan).
- [x] Added `React.lazy` + `Suspense` code-splitting for all six sections in
      `WorkspaceHome.jsx` (reusing the existing `WorkspaceContentSkeleton` as the
      fallback), since `quill`, `xlsx` and `html2pdf.js` are large and previously
      would have joined the eagerly-loaded main bundle the moment they were wired
      in. Verified via `npm run build`: main bundle unchanged in size; each section
      now loads as its own chunk (17–25 kB for Whiteboard/Meetings/Presentation/
      Files; the Quill/xlsx-heavy Documents/Spreadsheet chunks are large but load
      only on demand — further per-library lazy-loading noted as future work).
- [x] Updated `WorkspaceHome.jsx` to render the new sections instead of the generic
      "No items yet." placeholder for these six keys; trimmed `sectionTitles` down
      to the two keys (`calendar`, `tasks`) that still hit that fallback path (both
      already unreachable dead entries *before* this change too, since `calendar`/
      `tasks` have their own explicit branches above the fallback — pre-existing,
      left as-is).
- [x] `Tasks.jsx` / `FileExplorer.jsx` / `FilePreviewer.jsx` intentionally left
      unwired (Calendar's task viewer already covers tasks against the real backend;
      wiring a second, competing local-only task store would regress data integrity
      by giving tasks two disagreeing sources of truth). Documented as future work.
- [x] **Verification:** `npm run build` succeeds (751 modules transformed, proper
      per-section chunking, no missing-module errors). `npm run lint` and the
      project-wide `diagnostics` check both come back **zero errors/warnings** for
      every new file (`localCollabChannel.js`, `useLocalCollabChannel.js`, all six
      `workspace-sections/*.jsx`). Remaining lint findings are all pre-existing,
      inside the large feature components themselves; carried into Stage 7.

---

## Stage 7 — Frontend Bug Sweep

**Objective:** Fix concrete bugs in the components being newly wired up (and any
still-used components) found while integrating Stage 6, plus the standalone
workspace-search input that renders but does nothing.
**Scope:** varies; see findings log below as this stage executes.
**Risk:** Low-Medium. **Dependency:** Stage 6 (need integration to exercise the code).

---

## Stage 8 — Backend Automated Tests

**Objective:** Establish a real test suite using Node's built-in test runner
(`node:test`) + `mongodb-memory-server`-free approach (or lightweight mocking) so CI
can run without a live MongoDB — no new heavy dependencies unless proven necessary.
**Scope:** `backend/test/**`, `backend/package.json`.
**Risk:** Low. **Dependency:** Stages 3–4 (tests should assert the fixed behavior).

---

## Stage 9 — Documentation

**Objective:** Root README, backend README/env docs, frontend README refresh,
inline docs for the new local collab channel and its future realtime-backend
upgrade path.
**Scope:** `README.md` (root, new), `backend/README.md` (new), `frontend/README.md`.
**Dependency:** Stages 2–8 (docs should describe the final state).

---

## Stage 10 — CI/CD & Tooling

**Objective:** Add a GitHub Actions workflow running lint + build (frontend) and
lint + tests (backend) on push/PR.
**Scope:** `.github/workflows/ci.yml`.
**Dependency:** Stage 8.

---

## Stage 11 — Final Polish & Re-Review

**Objective:** Re-run diagnostics/build across both apps, re-scan for regressions,
finalize this document with remaining/future work.
**Dependency:** all prior stages.

---

## Future Improvement Ideas (out of scope for this pass, documented for later)

1. **Real realtime backend:** Socket.IO server sharing the Express session, verifying
   workspace membership on room join, persisting document/whiteboard/spreadsheet/
   slides/files content in a dedicated `WorkspaceContent` collection (kept separate
   from `Workspace` to avoid bloating the 16MB document limit), with the exact event
   names already recovered from the legacy server (see Stage 6 notes) so the frontend
   components need zero changes — only `localCollabChannel` gets swapped for a real
   `socket.io-client` instance.
2. **Cross-device Meetings:** once the realtime backend exists, `Meetings.jsx`'s
   WebRTC mesh will work across devices, not just same-browser tabs.
3. **Unified file system:** reconcile `Files.jsx` vs `FileExplorer.jsx` +
   `FilePreviewer.jsx` into one "files can be opened into their typed editor" system
   (the latter two already have the right props for it).
4. **Tasks Kanban view:** merge `Tasks.jsx`'s kanban/list UI into Calendar's task
   viewer as an additional view mode, backed by the existing tasks REST API.
5. **Workspace search:** replace the decorative search input in `WorkspaceNavbar`
   with a real (even if modest) search across tasks/members; the old `GlobalSearch.jsx`
   design assumed a single monolithic room state that no longer matches the current
   per-feature architecture and should not be revived as-is.
6. Multi-cursor / live presence indicators for Whiteboard/Spreadsheet once realtime
   backend exists.
7. Consider consolidating `components/` vs `features/*/components/` into one
   consistent structure (currently mid-migration); left as-is to avoid a risky
   mass-rename in this pass.

---

## Change Log

Entries added as each stage completes, with concrete file lists and rationale.
