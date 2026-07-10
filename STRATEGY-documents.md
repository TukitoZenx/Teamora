# Strategy — Documents (rich text)

**Phase:** 2 — Design only for one component  
**Component:** Documents (`DocumentsSection.jsx` + `Documents.jsx` + content API for `documents:*` keys)  
**Date:** 2026-07-10

---

## How it works today

1. `DocumentsSection` mounts a **Quill 2** instance on a DOM node (`mountElRef`).
2. User edits produce Quill `text-change` events.
3. Debounced save:
   - Emits full HTML on local `localCollabChannel` (`doc-content-sync`) → same-browser tabs.
   - `PUT /api/v1/workspaces/:id/content/documents:<fileId>` with `{ html }` → multi-device **last-write-wins**.
4. On load: channel hydrates from localStorage; optional server GET overwrites empty editor.
5. Large ribbon UI (File / Insert / Layout) calls into the same Quill instance.

**Failure mode today:** Two users typing on different devices (or even the same doc after slow network) silently overwrite each other’s full HTML. Same-tab BroadcastChannel is not multi-user.

---

## Conflict scenarios that matter

| Scenario | Severity | Notes |
|----------|----------|--------|
| Two users typing in same paragraph | **Critical** | Character-level interleaving; HTML LWW destroys one user’s work |
| User A offline, User B online, A reconnects | **High** | Full HTML PUT from A can wipe B’s newer server state |
| User A formats while B types | **High** | Format + text must commute or merge |
| Simultaneous open, only one types | **Low** | LWW acceptable if versions checked |
| Comments / version history race | **Low** | Separate structures; out of this phase’s core path |

Offline need: **yes** (mobile / flaky networks).  
Latency need: **interactive** (sub-second preferred; 1–2s poll acceptable for v1 without WebSocket).

Cost of getting it wrong: silent data loss — unacceptable for a “collaboration workspace.”

---

## Chosen approach (one)

### **CRDT via Yjs, synced over existing REST content API (no new WebSocket server)**

**Justification**

| Criterion | Why Yjs + REST wins here |
|-----------|---------------------------|
| Edit pattern | Continuous concurrent typing → CRDT (not lock-whole-doc) |
| Conflict frequency | High → OT/CRDT required; LWW fails definition of done |
| Offline | Yjs applies local updates offline; merge on reconnect |
| Latency | Poll + push every ~1s is enough for v1 without approving a WS farm |
| Cost of wrong merge | Yjs is battle-tested for rich text; custom OT is higher risk |
| Fit with codebase | Keeps Express + Mongo; extends `WorkspaceContent` blob store; section adapter remains the integration point |

**Rejected for this component**

| Approach | Why not |
|----------|---------|
| Pure LWW HTML | Cannot satisfy concurrent-edit DoD |
| Optimistic locking only | Blocks or forces full reload; poor for typing |
| OT from scratch | High implementation risk vs Yjs |
| WebSocket server now | New infra; works later as *transport swap* for same Y.Doc |

### New dependencies (**flagged for approval — implementing per “go ahead with recommended”**)

| Package | Where | Purpose |
|---------|--------|---------|
| `yjs` | frontend + backend | CRDT document + `applyUpdate` / `encodeStateAsUpdate` |
| (optional) binding helper | frontend only | Prefer minimal custom Quill↔Yjs bridge if `y-quill` is incompatible with Quill 2 |

**Not adding:** Redis, Kafka, dedicated WebSocket process, y-websocket provider (unless a later phase reopens transport).

### Sync protocol (v1)

1. Content key remains `documents:<fileId>`.
2. Stored payload shape:
   ```json
   {
     "format": "yjs-v1",
     "state": "<base64 of encodeStateAsUpdate(doc)>"
   }
   ```
3. Client:
   - Owns `Y.Doc` per open file.
   - On local Yjs update → debounce POST of **incremental** update (base64) to `PUT .../content/:key` with `{ format, update }` **or** full state if small.
4. Server:
   - Loads existing state into a temporary `Y.Doc`, `Y.applyUpdate`, re-encodes full state, saves (merge, not blind overwrite).
5. Client poll (e.g. 1s) or poll-after-focus: GET state, `applyUpdate` if remote advanced.
6. Quill: bind editor to Yjs text type via a thin adapter (Delta apply) so formatting survives.

### Fallback / non-collaborative path

- If Yjs init fails or content is legacy `{ html }` only: one-time import HTML into Y.Doc, then CRDT path.
- Local `BroadcastChannel` can remain for ultra-low-latency same-browser mirror **or** be superseded by Yjs updates on the same machine (prefer single source: Yjs only after cutover for this component).

### Out of scope for this component

- Live cursors/awareness (can layer later on same Y.Doc).
- Comments CRDT.
- Spreadsheet (done separately → `STRATEGY-spreadsheet.md`) / whiteboard.
- Multi-region.

---

## Phase 2 gate

Strategy frozen for **Documents only**.  
Phase 3 implements this branch (`collab/documents-yjs`) with tests for concurrent apply + offline merge.
