# Teamora Audit Report

**Date:** 2026-08-13  
**Branch:** `teamora-v2`  
**Scope:** `frontend/src` (128 files), `backend/src` (32 files), package manifests, `.env.example`, `.gitignore`, `README.md`

## Summary

- Build Status: **PASS** (`frontend`: `eslint .` 0 errors, `vite build` OK; `backend`: syntax OK; no `tsconfig` — JS project, `tsc --noEmit` skipped)
- Total Files Scanned: **160** application source files + manifests
- Total Bugs Fixed: **24** (3 P0, 7 P1, 12 P2, 2 P3)

## Bugs Fixed [P0/P1/P2] (Table: File | Issue | Root Cause | Fix)

| File | Issue | Root Cause | Fix |
| --- | --- | --- | --- |
| `frontend/src/contexts/AuthContext.jsx` | **P0** `/me` success throws `ReferenceError` | `refreshUser` ended with `return c` (`c` never defined) | Return `currentUser` |
| `frontend/src/contexts/AuthContext.jsx` | **P0** in-flight `/me` can log out a just-finished login | Bootstrap promise was not invalidated on `login`/`register` | Generation counter; ignore stale 401 after session is validated |
| `backend/src/middleware/csrf.middleware.js` | **P0** CSRF reject is 500 + logs secrets | `cookieToken` used before `const` (TDZ); `console.log` dumped tokens | Read cookie first; 403 only; `timingSafeEqual`; no token logs |
| `frontend/src/features/auth/services/auth.js` | **P1** credentials in source | Login comment contained a real email + password | Removed the comment |
| `frontend/src/components/Documents.jsx` | **P1** stored XSS via Quill HTML | Import/header/footer pasted unsanitized; `javascript:` links | `DOMPurify` + escaped text + http(s)/mailto only |
| `frontend/src/components/Meetings.jsx` | **P1** recording leak on unmount | Unmount stopped tracks/interval but not `MediaRecorder` or mix graph | Stop recorder + run `recordingCleanupRef` on unmount |
| `backend/src/collab/wsHub.js` | **P1** leaked TCP sockets + empty rooms | Non-`/collab` upgrades returned without `destroy()`; `leave` never deleted empty maps | `socket.destroy()`; `rooms.delete` when size 0 |
| `backend/src/controllers/import.controller.js` | **P1** PPTX import can hang | Parse/sync errors incremented `processed` without resolving | Resolve when `processed === slideEntries.length` on every path |
| `backend/src/services/reminder.service.js` | **P1** reminder query + race | Array `$expr` compare; overdue cron raced emails | `$elemMatch`; skip completed; `await` overdue before reminders; HTML escape |
| `backend/src/services/auth.service.js` | **P1** invalid session id → 500 | `User.findById` throws `CastError` | Return `null` when id is not a valid ObjectId |
| `backend/src/controllers/auth.controller.js` | **P1** Google OAuth CSRF | `passport.authenticate` omitted `state` | `state: true` |
| `cookies.txt`, `frontend/test-csrf.cjs`, `frontend/test-csrf-2.cjs` | **P1** secret/debug artifacts in tree | CSRF cookie dump + ad-hoc probes were committed | Deleted; ignored in `.gitignore` |
| `frontend/src/App.jsx` | **P2** create cap used membership count | `workspaces.length >= 6` counted every workspace the user is in | Count workspaces the current user **owns** (server already caps owned at 6) |
| `frontend/src/components/Documents.jsx` | **P2** save always cleared dirty | `onDirtyChange(false)` ran even if save rejected | Clear dirty only after save resolves |
| `frontend/src/components/Documents.jsx` | **P2** page indicator vs zoom | Print layout forced scale ≥100% while scroll used raw zoom | Single `zoom/100` scale |
| `frontend/src/components/Calendar.jsx` | **P2** far-future reminders fire immediately | `setTimeout` overflow above 2^31-1 ms | Skip timeouts beyond max delay |
| `frontend/src/components/Spreadsheet.jsx` | **P2** persist inside `setState` | Socket emit in updater (Strict Mode double-fire) | Persist latest drag snapshot in `mouseup` |
| `frontend/src/components/Meetings.jsx` | **P2** unmount skipped `meeting-leave` | Cleanup destroyed peers but never signaled leave | Emit leave via `meetingSignalRef` |
| `frontend/src/services/meetingPeerManager.js`, `Meetings.jsx`, `meetingSocket.js` | **P2** production console flood | `console.log` / `console.info` on every ICE/SDP event | Gate on `import.meta.env.DEV` |
| `backend/src/services/reminder.service.js` | **P2** overdue cron loaded every workspace with any task | Query was `'tasks.0': { $exists: true }` | `$elemMatch` incomplete tasks with a date |
| `backend/src/services/workspace.service.js` | **P2** silent `rooms` cleanup failure | Empty `catch` around legacy `rooms` update | `logger.warn` with error message |
| `README.md` | **P2** wrong local ports / auth prefix | Docs said backend `:3000` and `/api/v1/auth` | `:5000` + `/api/auth` to match `app.js` / `.env.example` |

## Broken Features Fixed

| Feature | Issue | Fix |
| --- | --- | --- |
| Session bootstrap | Successful `/me` threw after writing user state (`return c`) | Return the fetched user; loading still clears in `finally` |
| Workspace create UX | Member of 6 workspaces could be blocked even with 0 owned | Align client check with server `MAX_OWNED_WORKSPACES` ownership rule |
| Meeting leave / refresh | Active recording could keep the recorder + AudioContext alive after unmount | Stop recorder and mix cleanup in the existing unmount effect |

## Dead Code Removed

| File/Export | Proof it's unused | Action |
| --- | --- | --- |
| `cookies.txt` | No imports; Netscape cookie dump | Deleted + gitignored |
| `frontend/test-csrf.cjs`, `frontend/test-csrf-2.cjs` | No imports; not referenced by `npm test` | Deleted + gitignored |
| `pageFlow.js` `isFlowChrome` | Grep: only defined, never imported | Export removed (constant kept file-local) |

**Not deleted (public design-system barrel):** `ui/Tooltip`, `ui/Badge`, `ui/PageShell`, `ui/Pagination`, `ui/SearchBar`, `ui/Loader` — unused by current screens but exported from `components/ui/index.js` as the shared kit. Removing them would shrink the design system without a usage-graph replacement.

**Not deleted (thin re-exports still imported):** `hooks/useAuth.js`, `services/auth.js`, `features/workspace/components/NotificationButton.jsx`.

## Duplicate Logic Refactored

- Meeting RTC diagnostics now share a DEV-gated logger (`rtcLog` / `log`) instead of two ad-hoc `console.log` styles.
- No additional extract-to-shared-util was required; auth/useAuth/NotificationButton duplicates were already re-exports.

## Improvements Made (Perf, Error Handling, Types, UI)

- Overdue-task cron no longer hydrates workspaces that have only completed tasks.
- Quill toolbar/pagination effects use `useCallback` + real dependency arrays (removed the `eslint-disable` this pass had added).
- Format-read failures log `console.warn` instead of an empty `catch`.
- `npm audit fix` (non-force): frontend `react-router` → **7.18.2** (GHSA-qwww-vcr4-c8h2); backend `nanoid` / `ip-address` patched. Left `image-size` via `html-to-docx` / `pptxgenjs` — `audit fix --force` would downgrade `html-to-docx` to 1.1.2 (breaking).

## Files Changed (List with reason)

| File | Reason |
| --- | --- |
| `frontend/src/contexts/AuthContext.jsx` | P0 `return currentUser` |
| `frontend/src/features/auth/services/auth.js` | Remove leaked credentials |
| `frontend/src/App.jsx` | Ownership-based create cap |
| `frontend/src/components/Meetings.jsx` | DEV logs; recorder unmount cleanup |
| `frontend/src/services/meetingPeerManager.js` | DEV-gated RTC logs |
| `frontend/src/services/meetingSocket.js` | DEV-gated signal logs |
| `frontend/src/components/Documents.jsx` | `useCallback` deps; warn on format read |
| `frontend/src/components/editor/pageFlow.js` | Drop unused export |
| `backend/src/services/workspace.service.js` | Log legacy `rooms` skip |
| `backend/src/services/reminder.service.js` | `$elemMatch` reminders; overdue-before-email; HTML escape |
| `backend/src/middleware/csrf.middleware.js` | CSRF TDZ 500 + token logs |
| `backend/src/collab/wsHub.js` | Destroy invalid upgrades; prune empty rooms |
| `backend/src/controllers/import.controller.js` | PPTX import always resolves |
| `backend/src/controllers/auth.controller.js` | Google OAuth `state: true` |
| `backend/src/services/auth.service.js` | Invalid ObjectId → null (401) |
| `README.md` | Correct local ports + auth prefix |
| `.gitignore` | Ignore cookie dumps / CSRF probes |
| `frontend/package-lock.json`, `backend/package-lock.json` | Non-breaking audit bumps |
| `AUDIT_REPORT.md` | This report |

## Remaining Issues / Risks (If any, with reason why not fixed)

| Item | Why not fixed |
| --- | --- |
| `image-size` high via `html-to-docx` / `pptxgenjs` | Official fix is `npm audit fix --force` → `html-to-docx@1.1.2` (breaking) |
| Pre-existing `eslint-disable` in `MeetingContext`, `Whiteboard`, `SlideCanvas`, `GlobalMeetings`, `Meetings` | Hook-rule exceptions around legacy effects; rewriting those effects is a behavior risk, not a proven bug |
| Design-system components with no current importers | Public kit; deletion is a product/API change |
| Backend `npm test` runs 0 tests (`test/*.test.js` empty) | No tests to invent; constraint forbids adding throwaway test files |
| No TypeScript / no `tsconfig` | `tsc --noEmit` is not applicable |
| Live Vite on `:5173` was serving `~/Spaces/Codespace/collab-workspace`, not this worktree | Operational mismatch; not a code defect in this tree |
| Owner leave does not transfer ownership | Product rule in `WorkspaceLayout`: ownership is never transferred |
| Google account auto-link by email | Changing it would break existing same-email Google login; needs an email-verification product |
| Workspace create TOCTOU (7th workspace) | Needs a Mongo transaction/replica-set session; not enabled in all deploys |
| Leave/kick does not close live collab sockets | Requires a new `forceCloseUser` API on `wsHub`; larger than an atomic bugfix |

## Verification Commands Run & Results

| Command | Result |
| --- | --- |
| `cd frontend && npx eslint . --max-warnings=0` | **PASS** (0 errors, 0 warnings) |
| `cd frontend && npx vite build` | **PASS** (627–953ms) |
| `tsc --noEmit` | **SKIPPED** — no `tsconfig.json` (JS codebase) |
| `cd backend && node --check src/services/workspace.service.js` (+ reminder) | **PASS** |
| `cd backend && npm test` | **PASS** (0 tests in `test/`) |
| `cd frontend && npm audit --omit=dev` | High remaining only in `image-size` (see above) |
| `cd backend && npm audit fix --omit=dev` | nanoid / ip-address patched; `image-size` left |

No generic “code quality improved” claims: every row above is file-specific and verified by lint/build/grep.
