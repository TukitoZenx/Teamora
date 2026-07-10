# Strategy — Spreadsheet (cells)

**Phase:** 2 (spreadsheet)  
**Component:** Spreadsheet grid (`SpreadsheetSection.jsx` + `Spreadsheet.jsx` + content key `spreadsheet:<fileId>`)  
**Date:** 2026-07-10  
**Depends on:** Documents Yjs + REST transport (`yjs-v1`, `connectRestYjsProvider`)

---

## How it works today

1. `SpreadsheetSection` owns a 2D `grid` array (rows of cell strings).
2. Cell edits call `handleCellChange(row, col, value)` → update React state + `localStorage` snapshot.
3. Live same-browser: `localCollabChannel` event `update-spreadsheet` / `receive-spreadsheet` (deltas **not** persisted in the channel replay log).
4. Sheet tabs (`sheetsMetadata`) ride on channel `update-room-settings`.
5. **No server content key** for grid body — multi-device / refresh loses shared state except whatever is in that browser’s `localStorage`.

**Failure mode:** Two users on different devices never see each other’s cells; even same device after clear storage is empty. Concurrent cell edits on different machines cannot merge.

---

## Conflicts that matter

| Scenario | Severity | Notes |
|----------|----------|--------|
| User A edits A1, User B edits B2 | **High** | Must both survive |
| Both edit A1 at once | **Medium** | Last-write per cell is acceptable |
| Offline edit then reconnect | **High** | Must merge with server without wiping remote cells |
| Large import (xlsx) while remote edits | **Medium** | Prefer cell-level merge over whole-grid LWW |
| Sheet rename vs cell edit | **Low** | Orthogonal structures |

Offline need: **yes**.  
Latency: **interactive**; ~1s REST poll acceptable (same as Documents).  
Wrong merge cost: lost numbers / planning data.

---

## Chosen approach (one)

### **Yjs `Y.Map` of cells + existing REST `yjs-v1` merge (no new transport)**

| Criterion | Why |
|-----------|-----|
| Edit pattern | Independent cell writes map cleanly to map keys |
| Conflict frequency | Medium–high concurrent cells → CRDT; whole-grid LWW fails |
| Offline | Local Y.Doc updates queue; server `applyUpdate` merges |
| Fit | Reuse `mergeYjsPayload`, `connectRestYjsProvider`; **no new deps** |
| Perf | Sparse map only stores non-empty cells; grid rebuild for UI |

**Rejected**

| Approach | Why not |
|----------|---------|
| Whole-grid LWW JSON | Concurrent cell edits drop rows/columns of work |
| Custom op-log only | Reimplements CRDT we already ship for docs |
| New WebSocket / y-websocket | Transport swap later; not required for DoD |
| Full 2D `Y.Array` of rows | Heavier; sparse map matches current sparse grid |

### Data model

```
Y.Doc
  cells: Y.Map<string, string>   // key `${row}:${col}` → cell value (formulas as text)
  meta:  Y.Map                     // sheetsMetadata, legacy flags
```

Content key: **`spreadsheet:<fileId>`**  
Payload: existing `{ format: "yjs-v1", state | update }` (server merge unchanged).

### Client

1. On open file: create `Y.Doc`, bind `connectRestYjsProvider`, observe `cells` → rebuild sparse 2D `grid` for controlled `Spreadsheet`.
2. `handleCellChange`: `cells.set(key, value)` or `delete` when empty (inside optional `transact` for bulk-friendly future).
3. `sheetsMetadata`: store on `meta` map so multi-device sheet names/offsets sync; channel emit may remain for same-browser snappiness.
4. Legacy: if map empty after first pull, import `localStorage` grid snapshot once, then flush.
5. Drop cell dual-write on `update-spreadsheet` as source of truth (Yjs only for body).

### Server

No new merge path — `format === 'yjs-v1'` already handled in `content.service`.

### Out of scope

- Remote cursors / cell presence (`spreadsheetCells` UI hook stays empty or later awareness).
- Conditional formatting / charts / freeze as collab state.
- Formula evaluation engine changes.
- WebSocket push.

---

## Definition of done

- [x] Concurrent edits to different cells both survive (tests + server merge).
- [x] Offline cell update merges after remote advanced.
- [x] Client persists via REST key `spreadsheet:<fileId>`.
- [x] Legacy localStorage grid one-shot import.
- [x] No new infrastructure or dependencies.

---

## Phase 2 gate

Strategy frozen for **Spreadsheet cells**. Phase 3 implements on `collab/documents-yjs` without a PR (user request).
