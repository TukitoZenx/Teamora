# Collaborative Editing — Implementation Plan

**Program:** Multi-session collab upgrade  
**Current branch:** `collab/documents-yjs`  
**Status:** Core inventory surfaces + comments/versions + WS/cursors polish shipped

---

## Status

| Phase | Status |
|-------|--------|
| 0–1 Context / Inventory | Done → `INVENTORY.md` |
| Documents | Done → `STRATEGY-documents.md` |
| File tree | Done → `STRATEGY-file-tree.md` |
| Spreadsheet | Done → `STRATEGY-spreadsheet.md` |
| Whiteboard | Done → `STRATEGY-whiteboard.md` |
| Presentation | Done → `STRATEGY-presentation.md` |
| Comments / versions | Done → `STRATEGY-comments-versions.md` |
| WebSocket + cursors polish | Done → `STRATEGY-websocket-cursors.md` |
| Next (optional) | Chat log, calendar task versions, multi-region |

---

## Decisions (summary)

| Surface | Approach | Key |
|---------|----------|-----|
| Documents body | Yjs + REST `yjs-v1` + WS fanout | `documents:<fileId>` |
| File tree | merge-by-id `files-v1` | `files` |
| Spreadsheet | Yjs cell map + REST (+ WS) | `spreadsheet:<fileId>` |
| Whiteboard | Yjs element map + REST (+ WS) | `whiteboard:<fileId>` |
| Presentation | Yjs slide map + REST (+ WS) | `presentation:<fileId>` |
| Comments | merge-by-id `comments-v1` | `documents-comments:<fileId>` |
| Versions | merge-by-id `versions-v1` (cap 50) | `documents-versions:<fileId>` |
| Live push | WebSocket `/collab` (session auth) | rooms `workspaceId::key` |
| Cursors | quill-cursors + awareness over WS | Documents first |

**Deps added this pass:** backend `ws`. Frontend already had `quill-cursors`.

---

## Definition of done

### Comments / versions
- [x] Concurrent comment creates both survive (tests)
- [x] Tombstone resolve/delete (tests)
- [x] Concurrent version drafts both survive; cap 50 (tests)
- [x] Client wired: add/delete comment, save draft, poll merge

### WebSocket / cursors polish
- [x] WS hub on HTTP server path `/collab`; session required on upgrade
- [x] REST Yjs provider broadcasts updates over WS; poll slows when connected
- [x] Documents remote cursors via awareness + quill-cursors
- [x] Graceful fallback when WS unavailable
- [x] Existing merge tests still pass

---

## What shipped

| Component | Server | Client |
|-----------|--------|--------|
| Documents | `yjs-v1` | Y.Doc + QuillBinding + REST + WS + cursors |
| File tree | `files-v1` | merge + poll |
| Spreadsheet | `yjs-v1` | Y.Map cells + REST + WS fanout |
| Whiteboard | `yjs-v1` | Y.Map elements + REST + WS fanout |
| Presentation | `yjs-v1` | Y.Map slides + REST + WS fanout |
| Comments | `comments-v1` | DocumentsSection + poll |
| Versions | `versions-v1` | DocumentsSection + poll |
| Collab WS | `/collab` hub | `collabSocket.js` + provider |

---

## Known limitations

- WS is single-process fanout (no Redis); multi-instance deploy needs sticky sessions or pub/sub later.
- Cursors only on Documents (not sheet cells / whiteboard pointers yet).
- Freehand whiteboard ink still same-browser only.
- Presenter slide index not durable multi-device.
- ~8s REST backup poll when WS healthy; ~1.2s when not.

---

## Future work (log only)

- Awareness for spreadsheet cells / whiteboard pointers
- Workspace chat server log
- Redis pub/sub for multi-instance WS
- Auto version snapshots
- Anchored comments to text ranges
