import api from './api'

/**
 * Server-backed workspace content (multi-device persistence).
 * Keys match local collab channel feature names where possible, e.g.:
 *  - files
 *  - documents:<fileId>
 *  - whiteboard:<fileId>
 */

export const getWorkspaceContent = async (workspaceId, key) => {
  const { data } = await api.get(`/api/v1/workspaces/${workspaceId}/content/${encodeURIComponent(key)}`)
  return data.content
}

export const putWorkspaceContent = async (workspaceId, key, payload) => {
  const { data } = await api.put(`/api/v1/workspaces/${workspaceId}/content/${encodeURIComponent(key)}`, {
    data: payload
  })
  return data.content
}

export const listWorkspaceContentKeys = async (workspaceId, prefix = '') => {
  const { data } = await api.get(`/api/v1/workspaces/${workspaceId}/content`, {
    params: prefix ? { prefix } : undefined
  })
  return data.keys || []
}
