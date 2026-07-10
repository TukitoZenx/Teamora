# Strategy — Workspace file tree

**Phase:** 2 (file tree)  
**Component:** Workspace file tree / tabs (`WorkspaceHome.jsx` file state + content key `files`)  
**Date:** 2026-07-10

---

## How it works today

1. `WorkspaceHome` owns `workspaceFiles` (folders + document/spreadsheet/presentation/whiteboard files).
2. Mutations (create/rename/delete) update React state, `localStorage`, and `localCollabChannel` (`update-files`).
3. Debounced `PUT /content/files` with `{ files: [...] }` — **blind last-write-wins** of the whole array.
4. Hydrate from server only when local looks like an empty seed.

**Failure mode:** User A creates `Doc B` while User B creates `Doc C`; whichever PUT lands last wipes the other file from the shared tree (and orphans content keys).

---

## Conflicts that matter

| Scenario | Severity |
|----------|----------|
| Concurrent create of different files | **High** — LWW array drop |
| Concurrent rename of same file | **Medium** — last rename wins (OK) |
| One deletes, one renames same file | **Medium** — need tombstones |
| Concurrent create same id | **Low** — ids are random client-side |

Offline: yes (mobile). Latency: seconds OK. Wrong merge cost: missing files / lost navigation.

---

## Chosen approach (one)

### **Merge-by-id with tombstones (structured LWW per file), not Yjs**

| Criterion | Why |
|-----------|-----|
| Edit pattern | Discrete create/rename/delete, not keystroke streams |
| Conflict frequency | Medium; rarely two users edit same file metadata at once |
| Offline | Local queue of full tree + removed map merges on push |
| Complexity | Far lower than CRDT for this structure |
| Cost of wrong | Prefer keep both creates; prefer newer field on same id |

**Rejected:** Yjs for file trees (overkill); pure whole-array LWW (current bug).

### Payload

```json
{
  "format": "files-v1",
  "files": [ { "id", "type", "kind", "name", "parentId", "updatedAt", ... } ],
  "removed": { "<fileId>": "<ISO timestamp>" }
}
```

### Server merge

1. Load existing `files-v1` (or legacy `{ files }` → empty removed).
2. Merge `removed` maps (later timestamp wins).
3. Merge files by `id` (later `updatedAt` wins field set).
4. Drop any file whose `removed[id] >= file.updatedAt`.
5. Save merged document.

### Client

1. Always PUT `files-v1` with current files + local removed map (persist removed in localStorage).
2. Poll/hydrate: always merge remote into local (not only seed case).
3. On delete: set `removed[id] = now`, filter out of `files`.

### New dependencies

**None.**

### Out of scope

- SharedFilesSection dual UI unification (can share same state later).
- Spreadsheet/whiteboard body content (next components).

---

## DoD

- [ ] Concurrent creates on two clients both survive merge
- [ ] Delete on A + rename on B resolves via timestamps/tombstones
- [ ] Tests for merge helper
- [ ] No new infra
