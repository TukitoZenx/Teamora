const REMOTE_API_URL = 'https://teamora-3vgk.onrender.com'

const normalizeHttpUrl = (value) => {
  if (!value || /<[^>]+>/.test(value)) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.pathname = url.pathname.replace(/\/$/, '')
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

/**
 * Resolve the API server for both normal local development and devices on the
 * same network. A browser on 192.168.x.x must call that address, not its own
 * localhost.
 */
export const getApiBaseUrl = () => {
  const configured = normalizeHttpUrl(import.meta.env.VITE_API_URL)
  if (configured) return configured

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location
    if (hostname.endsWith('vercel.app')) return REMOTE_API_URL
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol === 'https:' ? 'https:' : 'http:'}//${hostname}:5000`
    }
  }

  return 'http://localhost:5000'
}

export const getCollabWebSocketUrl = () => {
  try {
    const url = new URL(getApiBaseUrl())
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = '/collab'
    return url.toString()
  } catch {
    return null
  }
}
