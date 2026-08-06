/**
 * Client-side merge helpers mirrored from backend listMerge/filesContent.
 * Used by workspace file trees and document comments for multi-tab LWW merge.
 */

const toTime = (value) => {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

export const mergeFilesPayload = (existing, incoming) => {
  const baseList = Array.isArray(existing?.files) ? existing.files : []
  const nextList = Array.isArray(incoming?.files) ? incoming.files : []
  const baseRemoved = existing?.removed && typeof existing.removed === 'object' ? existing.removed : {}
  const nextRemoved = incoming?.removed && typeof incoming.removed === 'object' ? incoming.removed : {}

  const removed = { ...baseRemoved }
  Object.entries(nextRemoved).forEach(([id, ts]) => {
    if (!id) return
    if (toTime(ts) >= toTime(removed[id])) removed[id] = ts
  })

  const byId = new Map()
  baseList.forEach((raw) => {
    if (!raw || typeof raw !== 'object' || !raw.id) return
    byId.set(String(raw.id), { ...raw, id: String(raw.id) })
  })
  nextList.forEach((raw) => {
    if (!raw || typeof raw !== 'object' || !raw.id) return
    const id = String(raw.id)
    const prev = byId.get(id)
    if (!prev || toTime(raw.updatedAt) >= toTime(prev.updatedAt)) {
      byId.set(id, prev ? { ...prev, ...raw, id } : { ...raw, id })
    }
  })

  const files = Array.from(byId.values()).filter((file) => {
    const tomb = removed[file.id]
    if (!tomb) return true
    return toTime(file.updatedAt) > toTime(tomb)
  })

  return { format: 'files-v1', files, removed }
}

export const mergeCommentsPayload = (existing, incoming) => {
  const baseList = Array.isArray(existing?.comments) ? existing.comments : []
  const nextList = Array.isArray(incoming?.comments) ? incoming.comments : []
  const baseRemoved = existing?.removed && typeof existing.removed === 'object' ? { ...existing.removed } : {}
  const nextRemoved = incoming?.removed && typeof incoming.removed === 'object' ? incoming.removed : {}

  const removed = { ...baseRemoved }
  Object.entries(nextRemoved).forEach(([id, ts]) => {
    if (!id) return
    if (toTime(ts) >= toTime(removed[id])) removed[id] = ts
  })

  const byId = new Map()
  baseList.forEach((raw) => {
    if (!raw || typeof raw !== 'object' || !raw.id) return
    byId.set(String(raw.id), { ...raw, id: String(raw.id) })
  })
  nextList.forEach((raw) => {
    if (!raw || typeof raw !== 'object' || !raw.id) return
    const id = String(raw.id)
    const prev = byId.get(id)
    const nextTs = raw.updatedAt || raw.createdAt || raw.timestamp
    const prevTs = prev?.updatedAt || prev?.createdAt || prev?.timestamp
    if (!prev || toTime(nextTs) >= toTime(prevTs)) {
      byId.set(id, prev ? { ...prev, ...raw, id } : { ...raw, id })
    }
  })

  const comments = Array.from(byId.values()).filter((c) => {
    const tomb = removed[c.id]
    if (!tomb) return true
    const cTs = c.updatedAt || c.createdAt || c.timestamp
    return toTime(cTs) > toTime(tomb)
  })

  return { format: 'comments-v1', comments, removed }
}

/** Avatar client guard — reject files larger than 140 KB. */
export const MAX_AVATAR_FILE_BYTES = 140 * 1024

export const isAvatarFileTooLarge = (file) => {
  if (!file || typeof file.size !== 'number') return true
  return file.size > MAX_AVATAR_FILE_BYTES
}
