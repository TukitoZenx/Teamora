# Strategy — WebSocket push & live cursors (polish)

**Phase:** Transport + presence polish  
**Date:** 2026-07-10  
**Depends on:** Yjs REST providers already shipping

---

## Goal

Reduce multi-device latency from ~1s poll-only toward interactive, and show **remote document cursors** without replacing CRDT durability.

---

## Chosen approach

### **Hybrid: REST durability + WebSocket fanout**

| Path | Role |
|------|------|
| REST `yjs-v1` PUT/GET | Source of truth, offline queue, reconnect merge |
| WebSocket `/collab` | Ephemeral push of Yjs updates + awareness |
| Poll | Backup every ~8s when WS connected; ~1.2s when not |

### Protocol (JSON)

```json
{ "type": "join", "workspaceId": "...", "key": "documents:fileId", "user": { "name", "color", "clientId" } }
{ "type": "yjs-update", "workspaceId", "key", "update": "<base64>" }
{ "type": "awareness", "workspaceId", "key", "clientId", "user", "cursor": { "index", "length" } | null }
{ "type": "leave", "workspaceId", "key" }
```

Server: session-cookie auth on upgrade; room = `workspaceId::key`; broadcast to peers (not echo to sender). Membership checked on `join` via workspace member list.

### Cursors (Documents first)

- `quill-cursors` module on Quill
- Local selection → awareness message (throttled)
- Remote awareness → `cursors.createCursor` / `moveCursor`
- Spreadsheet/whiteboard presence: same protocol later (fields differ)

### Rejected for this pass

- Full y-websocket binary protocol (heavier; REST already works)
- Replacing REST with WS-only persistence
- Redis pub/sub multi-region

---

## DoD

- [x] WS hub attaches to HTTP server; unauthenticated upgrade rejected
- [x] Yjs provider broadcasts updates over WS when connected
- [x] Documents show remote cursors when peers send awareness
- [x] Graceful fallback to REST poll if WS fails
- [x] No break to existing merge tests
