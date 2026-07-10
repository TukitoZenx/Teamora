# Strategy — Whiteboard (elements)

**Phase:** 2 (whiteboard)  
**Component:** Whiteboard canvas elements (`WhiteboardSection.jsx` + `Whiteboard.jsx` + content key `whiteboard:<fileId>`)  
**Date:** 2026-07-10  
**Depends on:** Documents/Spreadsheet Yjs + REST transport (`yjs-v1`, `connectRestYjsProvider`)

---

## How it works today

1. `Whiteboard` owns an `elements[]` array (stickies, shapes, text, images).
2. Mutations emit full-array `update-whiteboard-elements` on `localCollabChannel` (persisted LWW).
3. Freehand pen/eraser strokes use ephemeral `draw-line` (not stored in `elements`).
4. **No server content key** for the board body.

**Failure mode:** Multi-device / refresh loses shared board; concurrent full-array LWW drops another user’s stickies/shapes.

---

## Conflicts that matter

| Scenario | Severity | Notes |
|----------|----------|--------|
| User A adds sticky, User B adds shape | **High** | Full-array LWW drops one create |
| Both move/edit same element | **Medium** | Last-write per id is OK |
| Offline create then reconnect | **High** | Must merge without wiping remote |
| Concurrent freehand strokes | **Medium** | Today ephemeral only; v1 keeps same-browser `draw-line` |
| Clear page vs remote create | **Medium** | Delete only ids known in local snapshot |

---

## Chosen approach (one)

### **Yjs `Y.Map` of elements by id + REST `yjs-v1` (reuse docs/sheet transport)**

| Criterion | Why |
|-----------|-----|
| Edit pattern | Discrete element upsert/delete; map keys match element ids |
| Concurrent creates | Different ids both survive (unlike array LWW) |
| Offline | Local updates merge via `applyUpdate` |
| Fit | No new deps; same provider as documents/spreadsheet |
| Whiteboard surface | Keep component mostly intact via **socket facade** that turns full-array emits into differential map ops |

**Rejected:** Whole-array LWW on server; new WebSocket; freehand bitmap CRDT (out of scope v1).

### Data model

```
Y.Doc
  elements: Y.Map<id, elementObject>  // sticky/shape/text/… + order index
  meta:     Y.Map                     // legacyImported flag
```

Content key: **`whiteboard:<fileId>`**  
Payload: `{ format: "yjs-v1", state | update }` (server merge unchanged).

### Client protocol

1. Section owns `Y.Doc` + `connectRestYjsProvider`.
2. Facade `socket.emit('update-whiteboard-elements', { elements })`:
   - Upsert every element in the array into the map (with `order` from index).
   - **Delete only ids present in the previous local snapshot but missing from the new array** (so remote-only ids are not wiped).
3. Map observe → materialize sorted array → `receive-whiteboard-elements`.
4. `draw-line` still goes through local channel (same-browser live ink only).
5. Legacy: if map empty after pull, seed from channel `localStorage` snapshot once.

### Out of scope

- Persisted freehand paths as first-class elements.
- Remote cursors / awareness.
- Multi-page list sync (page tabs remain local view; `pageId` on elements still stored).
- WebSocket push.

---

## Definition of done

- [x] Concurrent creates of different element ids both survive (tests).
- [x] Offline element merge after remote advanced (tests).
- [x] Client REST key `whiteboard:<fileId>`.
- [x] Legacy localStorage / channel elements one-shot import.
- [x] No new infrastructure or dependencies.

---

## Phase 2 gate

Strategy frozen for **Whiteboard elements**. Phase 3 implements on `collab/documents-yjs` without a PR.
