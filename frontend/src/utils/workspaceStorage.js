/**
 * Browser-local workspace navigation cache.
 * Authoritative workspace data always comes from the API; these helpers only
 * speed up first paint and remember the last opened workspace.
 */

export const LAST_WORKSPACE_KEY = 'teamora-last-workspace-id'
export const LAST_PAGE_KEY = 'teamora-last-page'
export const WORKSPACES_CACHE_KEY = 'teamora-workspaces-cache'
export const RECENT_WORKSPACES_CACHE_KEY = 'teamora-recent-workspaces-cache'
export const WORKSPACE_CACHE_KEY = 'teamora-workspace-cache'

export const WORKSPACE_SECTIONS = new Set([
  'home',
  'documents',
  'whiteboard',
  'spreadsheet',
  'presentation',
  'calendar',
  'tasks',
  'meetings',
  'members',
  'shared-files',
  'settings',
  'chat'
])

export const readJsonCache = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || fallback
  } catch {
    return fallback
  }
}

export const writeJsonCache = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Cache writes are best-effort; API data remains authoritative.
  }
}

export const removeWorkspaceCache = (workspaceId) => {
  if (!workspaceId) return
  const cache = readJsonCache(WORKSPACE_CACHE_KEY, {})
  delete cache[workspaceId]
  writeJsonCache(WORKSPACE_CACHE_KEY, cache)
}

export const getCachedWorkspace = (workspaceId) => {
  if (!workspaceId) return null
  return readJsonCache(WORKSPACE_CACHE_KEY, {})[workspaceId] || null
}

export const putCachedWorkspace = (workspace) => {
  if (!workspace?._id) return
  const cache = readJsonCache(WORKSPACE_CACHE_KEY, {})
  cache[workspace._id] = workspace
  writeJsonCache(WORKSPACE_CACHE_KEY, cache)
}

export const getLastWorkspaceId = () => {
  try {
    return localStorage.getItem(LAST_WORKSPACE_KEY)
  } catch {
    return null
  }
}

export const setLastWorkspaceId = (workspaceId) => {
  try {
    if (workspaceId) localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId)
    else localStorage.removeItem(LAST_WORKSPACE_KEY)
  } catch {
    // Best-effort.
  }
}

export const clearLastWorkspaceId = (workspaceId) => {
  try {
    if (!workspaceId || localStorage.getItem(LAST_WORKSPACE_KEY) === workspaceId) {
      localStorage.removeItem(LAST_WORKSPACE_KEY)
    }
  } catch {
    // Best-effort.
  }
}
