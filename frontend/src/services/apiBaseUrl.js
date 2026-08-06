/** Normalize and validate an HTTP(S) API origin (no path/query/hash). */
export const normalizeHttpUrl = (value) => {
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
 * Resolve the API base URL.
 * - Prefer VITE_API_URL (required for production builds).
 * - In local development only, fall back to the page host :5000 or localhost.
 * - Never hardcode a remote Render/Vercel backend URL.
 */
export const getApiBaseUrl = () => {
  const configured = normalizeHttpUrl(import.meta.env.VITE_API_URL)
  if (configured) return configured

  if (import.meta.env.PROD) {
    throw new Error(
      'VITE_API_URL is not set. Set it at build time (e.g. https://api.example.com) for production deployments.'
    )
  }

  // Development convenience: same machine / LAN without env.
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location
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
