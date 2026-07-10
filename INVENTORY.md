# Collaborative Editing Inventory

**Phase:** 1 — Audit only  
**Date:** 2026-07-10  
**Branch context:** Teamora monorepo (`frontend/` + `backend/`)  
**Basis:** Phase 0 architecture summary + source inspection of `*Section` containers, feature components, and REST content API.

---

## Shared infrastructure (all collab-adjacent UIs)

| Piece | Location | Role today |
|-------|----------|------------|
| Local socket shim | `frontend/src/components/utils/localCollabChannel.js` | `emit`/`on`/`off`; `BroadcastChannel` + `localStorage`; same-browser only |
| Hook | `frontend/src/hooks/useLocalCollabChannel.js` | Per workspace+feature channel lifecycle |
| Section wiring | `frontend/src/components/workspace-sections/*` | Lazy-loaded; construct channel + pass to feature UI |
| Server blobs | `WorkspaceContent` + `GET/PUT /api/v1/workspaces/:id/content/:key` | Last-write-wins JSON; docs HTML + files tree partially wired |
| Workspace shell | `WorkspaceHome.jsx` | File tabs, section routing, local file tree |

**No** WebSocket server, Yjs, Automerge, or OT library is installed.

---

## Editable components

### 1. Documents (rich text)

| Field | Detail |
|-------|--------|
| **What** | Quill 2 snow editor, custom File/Insert/Layout ribbon, comments + version history panels |
| **Where** | `Documents.jsx`, `workspace-sections/DocumentsSection.jsx` |
| **Save / update** | Debounced local channel `doc-content-sync` (full HTML LWW); server `PUT content` key `documents:<fileId>` `{ html }`; local drafts via `update-document-versions` |
| **Conflict frequency** | **High** if multi-user concurrent typing |
| **Complexity** | **High** — needs CRDT/OT for character-level merge; existing socket surface helps wiring |

### 2. Spreadsheet (grid)

| Field | Detail |
|-------|--------|
| **What** | Custom cell grid, import/export xlsx, sheet settings |
| **Where** | `Spreadsheet.jsx`, `workspace-sections/SpreadsheetSection.jsx` |
| **Save / update** | **Shipped:** Yjs `Y.Map` cells + REST `yjs-v1` key `spreadsheet:<fileId>`; legacy localStorage import; sheet meta on Y.Map + channel |
| **Conflict frequency** | **Medium–High** (cell-level overlaps common in team planning) |
| **Complexity** | **High** — cell CRDT or op log; grid size/perf constraints |

### 3. Whiteboard (canvas elements)

| Field | Detail |
|-------|--------|
| **What** | Freehand + shapes/elements list on canvas |
| **Where** | `Whiteboard.jsx`, `workspace-sections/WhiteboardSection.jsx` |
| **Save / update** | **Shipped:** Yjs `Y.Map` elements by id + REST `yjs-v1` key `whiteboard:<fileId>`; freehand `draw-line` still local-tab only |
| **Conflict frequency** | **Medium** (simultaneous drawing common) |
| **Complexity** | **Medium–High** — element list LWW loses concurrent strokes; better as op-log or Yjs array |

### 4. Presentation / slides

| Field | Detail |
|-------|--------|
| **What** | Slide list, title/body, free elements, presenter mode |
| **Where** | `Slides.jsx`, `workspace-sections/PresentationSection.jsx` |
| **Save / update** | **Shipped:** Yjs `Y.Map` slides by id + REST `yjs-v1` key `presentation:<fileId>`; `change-slide` local channel |
| **Conflict frequency** | **Medium** |
| **Complexity** | **Medium** — structured JSON; LWW-with-version or per-slide merge |

### 5. Workspace file tree (tabs / “explorer”)

| Field | Detail |
|-------|--------|
| **What** | Create/rename/delete/reorder files & folders driving which editor opens |
| **Where** | `WorkspaceHome.jsx` (+ `SharedFilesSection`/`Files.jsx` for shared-files UI) |
| **Save / update** | Channel `update-files`; localStorage; server `files` content key (debounced PUT) |
| **Conflict frequency** | **Low–Medium** |
| **Complexity** | **Low–Medium** — versioned LWW or simple merge-by-id usually enough |

### 6. Shared files panel

| Field | Detail |
|-------|--------|
| **What** | Alternate files UI (`Files.jsx`) on shared-files section |
| **Where** | `Files.jsx`, `SharedFilesSection.jsx` |
| **Save / update** | Same `files` channel events as above (may dual-write with WorkspaceHome tree) |
| **Conflict frequency** | **Low–Medium** |
| **Complexity** | **Low** if unified with file tree source of truth |

### 7. Calendar / tasks

| Field | Detail |
|-------|--------|
| **What** | Task CRUD on calendar + “All Tasks” view |
| **Where** | `Calendar.jsx`; backend `workspace.service` tasks on `Workspace` |
| **Save / update** | REST create/patch/delete; local channel `tasks-updated` for same-browser refresh |
| **Conflict frequency** | **Low–Medium** (task-level, not keystroke) |
| **Complexity** | **Low** — optimistic locking / last-write per task id already natural |

### 8. Workspace chat

| Field | Detail |
|-------|--------|
| **What** | Message list in workspace chat section |
| **Where** | `WorkspaceHome.jsx` chat UI + local channel `chat-messages` |
| **Save / update** | localStorage + BroadcastChannel only; no server |
| **Conflict frequency** | **Low** (append-only) |
| **Complexity** | **Low** — server append log, not CRDT |

### 9. Meetings (A/V + chat + host controls)

| Field | Detail |
|-------|--------|
| **What** | WebRTC mesh, waiting room, meeting chat, host mute/kick |
| **Where** | `Meetings.jsx`, `MeetingsSection.jsx` |
| **Save / update** | Local channel for signal/join/chat; MediaStream local; recording downloads locally |
| **Conflict frequency** | N/A for media; **Low** for chat |
| **Complexity** | **Very high** for true multi-device (signaling server + TURN). Out of band from “document CRDT” work |

### 10. Document comments / version history

| Field | Detail |
|-------|--------|
| **What** | Side panels on Documents |
| **Where** | `Documents.jsx` + `DocumentsSection` |
| **Save / update** | **Shipped:** `comments-v1` / `versions-v1` merge-by-id on REST keys `documents-comments:*` / `documents-versions:*` |
| **Conflict frequency** | **Low** |
| **Complexity** | **Low** — append/version list with ids |

### 11. Settings / permissions / profile / auth forms

| Field | Detail |
|-------|--------|
| **What** | Workspace settings, member remove, join approval, visibility; user profile/settings |
| **Where** | `WorkspaceHome` settings, `SettingsPage`, auth feature pages |
| **Save / update** | REST only |
| **Conflict frequency** | **Low** |
| **Complexity** | **Low** — keep REST; optional ETag later |

### 12. Drag / resize / reorder

| Field | Detail |
|-------|--------|
| **What** | Tab reorder in WorkspaceHome; whiteboard/slides element drag; spreadsheet selection |
| **Where** | Scattered in feature components |
| **Save / update** | Bundled into parent state saves above |
| **Conflict frequency** | Tied to parent surface |
| **Complexity** | Include with parent component strategy, not standalone |

---

## Recommended priority order

Highest value / lowest risk first (for *this* codebase):

| Order | Component | Why |
|-------|-----------|-----|
| **1** | **Documents** | Core product promise; already has Quill + server content key + section adapter; highest pain for multi-user overwrite |
| **2** | Workspace file tree | Enables multi-device file discovery; LWW+version is enough; lower risk |
| **3** | Spreadsheet cells | High value; cell ops map cleanly to CRDT/op-log after docs transport exists |
| **4** | Whiteboard elements | High visual value; can reuse transport from docs |
| **5** | Presentation slides | Structured array merge |
| **6** | Document comments / versions | Easy once docs identity is stable |
| **7** | Workspace chat | Append-only server log |
| **8** | Calendar tasks | Already REST; add version field if needed |
| **9** | Meetings multi-device | Separate program (signaling + TURN); do not couple to doc CRDT |

---

## Phase 1 gate

**No strategy or code in this phase.**  
Next: Phase 2 strategy for **Documents** only (`STRATEGY-documents.md`), then implementation only after strategy sign-off.

*(User directed “go ahead and do what’s recommended to make it work” — Phase 2+3 for Documents follow immediately in this program session, still scoped to one component.)*
