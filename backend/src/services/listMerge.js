/**
 * Merge-by-id helpers for append-friendly collab lists
 * (document comments, version history).
 */

const toTime = (value) => {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
};

const MAX_VERSIONS = 50;

/**
 * @param {{ format?: string, comments?: any[], removed?: Record<string, string> }|null} existing
 * @param {{ format?: string, comments?: any[], removed?: Record<string, string> }|null} incoming
 */
const mergeCommentsPayload = (existing, incoming) => {
  const baseList = Array.isArray(existing?.comments) ? existing.comments : Array.isArray(existing) ? existing : [];
  const nextList = Array.isArray(incoming?.comments) ? incoming.comments : Array.isArray(incoming) ? incoming : [];

  const baseRemoved = existing?.removed && typeof existing.removed === 'object' ? { ...existing.removed } : {};
  const nextRemoved = incoming?.removed && typeof incoming.removed === 'object' ? incoming.removed : {};

  const removed = { ...baseRemoved };
  Object.entries(nextRemoved).forEach(([id, ts]) => {
    if (!id) return;
    if (toTime(ts) >= toTime(removed[id])) removed[id] = ts;
  });

  /** @type {Map<string, any>} */
  const byId = new Map();
  baseList.forEach((raw) => {
    if (!raw || typeof raw !== 'object' || !raw.id) return;
    byId.set(String(raw.id), { ...raw, id: String(raw.id) });
  });
  nextList.forEach((raw) => {
    if (!raw || typeof raw !== 'object' || !raw.id) return;
    const id = String(raw.id);
    const prev = byId.get(id);
    const nextTs = raw.updatedAt || raw.createdAt || raw.timestamp;
    const prevTs = prev?.updatedAt || prev?.createdAt || prev?.timestamp;
    if (!prev || toTime(nextTs) >= toTime(prevTs)) {
      byId.set(id, prev ? { ...prev, ...raw, id } : { ...raw, id });
    }
  });

  const comments = Array.from(byId.values())
    .filter((c) => {
      const tomb = removed[c.id];
      if (!tomb) return true;
      const cTs = c.updatedAt || c.createdAt || c.timestamp;
      return toTime(cTs) > toTime(tomb);
    })
    .sort((a, b) => {
      const at = toTime(a.createdAt || a.timestamp);
      const bt = toTime(b.createdAt || b.timestamp);
      return at - bt;
    });

  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 90;
  const prunedRemoved = {};
  Object.entries(removed).forEach(([id, ts]) => {
    if (toTime(ts) >= cutoff) prunedRemoved[id] = ts;
  });

  return {
    format: 'comments-v1',
    comments,
    removed: prunedRemoved
  };
};

/**
 * @param {{ format?: string, versions?: any[] }|null} existing
 * @param {{ format?: string, versions?: any[] }|null} incoming
 */
const mergeVersionsPayload = (existing, incoming) => {
  const baseList = Array.isArray(existing?.versions) ? existing.versions : Array.isArray(existing) ? existing : [];
  const nextList = Array.isArray(incoming?.versions) ? incoming.versions : Array.isArray(incoming) ? incoming : [];

  /** @type {Map<string, any>} */
  const byId = new Map();

  const ingest = (raw) => {
    if (!raw || typeof raw !== 'object') return;
    const id = String(raw.versionId || raw.id || '');
    if (!id) return;
    const prev = byId.get(id);
    const nextTs = raw.createdAt || raw.timestamp;
    const prevTs = prev?.createdAt || prev?.timestamp;
    if (!prev || toTime(nextTs) >= toTime(prevTs)) {
      byId.set(id, { ...raw, versionId: id });
    }
  };

  baseList.forEach(ingest);
  nextList.forEach(ingest);

  const versions = Array.from(byId.values())
    .sort((a, b) => toTime(b.createdAt || b.timestamp) - toTime(a.createdAt || a.timestamp))
    .slice(0, MAX_VERSIONS);

  return {
    format: 'versions-v1',
    versions
  };
};

/**
 * Chat / message list merge by id (cap length).
 * Newer `updatedAt` (then `createdAt`) wins so edits/deletes sync across clients.
 * Soft-deleted messages keep a tombstone (`deleted: true`) so peers do not resurrect them.
 */
const messageSortTime = (m) => toTime(m?.updatedAt || m?.createdAt || m?.timestamp);

const mergeMessagesPayload = (existing, incoming, max = 500) => {
  const baseList = Array.isArray(existing?.messages) ? existing.messages : Array.isArray(existing) ? existing : [];
  const nextList = Array.isArray(incoming?.messages) ? incoming.messages : Array.isArray(incoming) ? incoming : [];

  /** @type {Map<string, any>} */
  const byId = new Map();
  [...baseList, ...nextList].forEach((raw) => {
    if (!raw || typeof raw !== 'object' || !raw.id) return;
    const id = String(raw.id);
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, { ...raw, id });
      return;
    }
    const pt = messageSortTime(prev);
    const ct = messageSortTime(raw);
    // Later revision wins; on equal timestamps, later payload in the list wins.
    if (ct >= pt) {
      byId.set(id, { ...prev, ...raw, id });
    }
  });

  const messages = Array.from(byId.values()).sort(
    (a, b) => toTime(a.createdAt || a.timestamp) - toTime(b.createdAt || b.timestamp)
  );

  return {
    format: 'messages-v1',
    messages: messages.slice(-max)
  };
};

module.exports = {
  mergeCommentsPayload,
  mergeVersionsPayload,
  mergeMessagesPayload,
  MAX_VERSIONS,
  toTime
};
