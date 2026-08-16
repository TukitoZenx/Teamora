# AGENTS.md — Teamora

Optional guidance for humans and coding agents. Does not affect runtime.

## Mission

Change only what the user asked. Preserve observable product behavior.

## Non-negotiable invariants

1. Session cookie is the auth source of truth. localStorage user cache is display-only.
2. Workspace ownership NEVER transfers. `owner` stays the creator. Do not call `selectOwnershipSuccessor`.
3. Owner may leave. Last member leaving archives; do not report `workspaceDeleted: true` unless product later changes.
4. Non-members receive 404 (not 403) on workspace-scoped REST.
5. CSRF: mutations send `X-XSRF-TOKEN` matching session. `GET /api/auth/csrf` must not rotate an existing token.
6. Google and `/health` stay CSRF-exempt.
7. Collab hub and meeting roster are process-local. Do not assume multi-instance fanout.
8. Yjs keys with `{ format: 'yjs-v1', update|state }` CRDT-merge. Other keys are last-write-wins.
9. File tree merges by id + tombstones; never blind-replace.
10. Meetings: remove participants only on explicit self-leave or disconnect grace; refresh must rejoin the same meeting.
11. Do not add demo/placeholder tests or new dependencies unless asked.
12. Design chrome uses tokens in `frontend/src/index.css`. Editor palettes may keep hex.

## Before coding

- Read this file, `README.md`, and `frontend/DESIGN_SYSTEM.md`.
- Identify the user-visible flow you will touch. Write down what must still work.
- Prefer the smallest isolated change.

## After coding

```bash
cd frontend && npm run lint && npm run format:check && npm run build
cd ../backend && npm run format:check
```

Manually exercise the touched flow and one adjacent flow. Report residual risk.

## Forbidden without an explicit user request

- Ownership transfer
- Replacing mesh WebRTC with an SFU
- Changing API paths or response shapes
- Mass file moves / renaming public components
- Turning off CSRF, CORS, or membership checks
