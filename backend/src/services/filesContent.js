/**
 * Merge workspace file trees by id with tombstones.
 * Used by content.service when key === 'files' or payload.format === 'files-v1'.
 */

const toTime = (value) => {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
};

const normalizeFile = (file) => {
  if (!file || typeof file !== 'object' || !file.id) return null;
  return {
    ...file,
    id: String(file.id),
    updatedAt: file.updatedAt || new Date(0).toISOString()
  };
};

/**
 * @param {{ files?: any[], removed?: Record<string, string> }|null} existing
 * @param {{ files?: any[], removed?: Record<string, string> }|null} incoming
 * @returns {{ format: 'files-v1', files: any[], removed: Record<string, string> }}
 */
const mergeFilesPayload = (existing, incoming) => {
  const baseFiles = Array.isArray(existing?.files) ? existing.files : [];
  const nextFiles = Array.isArray(incoming?.files) ? incoming.files : [];
  const baseRemoved = existing?.removed && typeof existing.removed === 'object' ? existing.removed : {};
  const nextRemoved = incoming?.removed && typeof incoming.removed === 'object' ? incoming.removed : {};

  /** @type {Record<string, string>} */
  const removed = { ...baseRemoved };

  Object.entries(nextRemoved).forEach(([id, ts]) => {
    if (!id) return;
    if (toTime(ts) >= toTime(removed[id])) {
      removed[id] = ts;
    }
  });

  /** @type {Map<string, any>} */
  const byId = new Map();

  baseFiles.forEach((raw) => {
    const file = normalizeFile(raw);
    if (file) byId.set(file.id, file);
  });

  nextFiles.forEach((raw) => {
    const file = normalizeFile(raw);
    if (!file) return;
    const prev = byId.get(file.id);
    if (!prev || toTime(file.updatedAt) >= toTime(prev.updatedAt)) {
      byId.set(file.id, prev ? { ...prev, ...file } : file);
    }
  });

  const files = Array.from(byId.values())
    .filter((file) => {
      const tombstone = removed[file.id];
      if (!tombstone) return true;
      // Tombstone wins if it is at least as new as the file record.
      return toTime(file.updatedAt) > toTime(tombstone);
    })
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  // Drop tombstones for ids that no longer matter older than 30 days to bound growth.
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const prunedRemoved = {};
  Object.entries(removed).forEach(([id, ts]) => {
    if (toTime(ts) >= cutoff) prunedRemoved[id] = ts;
  });

  return {
    format: 'files-v1',
    files,
    removed: prunedRemoved
  };
};

module.exports = {
  mergeFilesPayload,
  toTime
};
