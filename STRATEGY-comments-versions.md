# Strategy — Document comments & version history

**Phase:** 2 (comments / versions)  
**Component:** Documents side panels (`DocumentsSection` + `Documents.jsx`)  
**Date:** 2026-07-10

---

## How it works today

| Surface | Today |
|---------|--------|
| Comments | `comments` state frozen empty; `socket=null`; add/delete emit no-ops |
| Versions | Manual “save draft” → LWW `PUT documents-versions:<fileId>` `{ versions }` |

**Failure mode:** Concurrent draft saves can drop entries; comments never multi-device.

---

## Chosen approach

### **Merge-by-id lists over REST content API (like file tree)**

| List | Format | Merge rule |
|------|--------|------------|
| Comments | `comments-v1` | By `id`; tombstones in `removed`; later `updatedAt` wins |
| Versions | `versions-v1` | By `versionId`; union; keep 50 newest by `createdAt` |

Keys:
- `documents-comments:<fileId>`
- `documents-versions:<fileId>` (existing)

**No Yjs** — discrete append/resolve ops, not keystroke streams.

### Client

1. Own `comments` / `versions` in `DocumentsSection`.
2. Wire `onAddComment` / `onDeleteComment` / poll ~4s.
3. Save draft merges via server (not blind overwrite only).

### Out of scope

- Anchored comments to text ranges (v1 is thread list).
- Auto version snapshots on every edit.

---

## DoD

- [x] Concurrent comment creates both survive
- [x] Concurrent version drafts both survive (cap 50)
- [x] Delete/resolve via tombstone
- [x] Tests for merge helpers
