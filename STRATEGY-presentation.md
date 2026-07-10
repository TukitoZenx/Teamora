# Strategy — Presentation (slides)

**Phase:** 2 (presentation)  
**Component:** Slide deck (`PresentationSection.jsx` + `Slides.jsx` + content key `presentation:<fileId>`)  
**Date:** 2026-07-10  
**Depends on:** Documents/Spreadsheet/Whiteboard Yjs + REST transport (`yjs-v1`)

---

## How it works today

1. `PresentationSection` owns `slides[]` (title, content, notes, elements, layout).
2. Mutations call `setSlides` → full-array `update-slides-list` on `localCollabChannel` (LWW).
3. `Slides.jsx` also listens for `receive-slides-list` and calls `setSlides` again (re-emit risk).
4. **No server content key**; no stable slide ids.

**Failure mode:** Multi-device overwrite of whole deck; concurrent “add slide” drops one user’s slide.

---

## Conflicts that matter

| Scenario | Severity | Notes |
|----------|----------|--------|
| Concurrent add of different slides | **High** | Array LWW drops one |
| Concurrent edit of different slides | **High** | Must both survive |
| Concurrent edit of same slide fields | **Medium** | Per-slide LWW OK |
| Offline edit then reconnect | **High** | Merge without wipe |
| Presenter slide index | **Low** | View state; channel OK |

---

## Chosen approach (one)

### **Yjs `Y.Map` of slides by id + REST `yjs-v1` (reuse transport)**

Same pattern as whiteboard elements:

| Criterion | Why |
|-----------|-----|
| Structure | Discrete slides with nested fields; map-by-id |
| Concurrent creates | Different ids both survive |
| Offline | CRDT merge on reconnect |
| Cost | No new deps; server merge already exists |

**Rejected:** Whole-deck LWW JSON; per-field OT for title/body (overkill for v1).

### Data model

```
Y.Doc
  slides: Y.Map<id, slideObject>  // includes order index
  meta:   Y.Map                   // legacyImported
```

Each slide:
```json
{
  "id": "slide-…",
  "title": "",
  "content": "",
  "notes": "",
  "layout": "title",
  "elements": [],
  "order": 0
}
```

Content key: **`presentation:<fileId>`**

### Client

1. Ensure every slide has a stable `id` (generate on blank / legacy import).
2. `setSlides(fullArray)` → differential map upsert; **delete only ids from previous local snapshot**.
3. Map observe → ordered array → React state (no re-emit loop).
4. `change-slide` stays on local channel (presenter UX, not persisted).
5. Legacy: channel `localStorage` `receive-slides-list` one-shot import.

### Out of scope

- Character-level CRDT inside title/body.
- Remote cursors / presenter awareness.
- True PPTX export (current export is outline text).
- WebSocket push.

---

## Definition of done

- [x] Concurrent creates of different slide ids both survive (tests).
- [x] Offline slide merge after remote advanced (tests).
- [x] Local full-array apply preserves remote-only slides (tests).
- [x] Client REST key `presentation:<fileId>`.
- [x] Legacy import; no new deps/infra.

---

## Phase 2 gate

Strategy frozen for **Presentation slides**. Phase 3 on `collab/documents-yjs`, no PR.
