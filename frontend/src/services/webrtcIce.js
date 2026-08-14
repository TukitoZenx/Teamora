/**
 * WebRTC ICE server config for meetings mesh.
 *
 * Env (Vite, build-time):
 *   VITE_TURN_URLS      comma-separated, e.g. turn:turn.example.com:3478,turns:turn.example.com:5349
 *   VITE_TURN_USERNAME  optional shared secret username (alias: VITE_TURN_USER)
 *   VITE_TURN_CREDENTIAL optional password (alias: VITE_TURN_SECRET)
 *   VITE_STUN_URLS      optional override of default STUN (comma-separated)
 *
 * The collab WebSocket `joined` ack can also push ICE servers from backend
 * env (TURN_URLS / TURN_USERNAME / TURN_CREDENTIAL / STUN_URLS) so production
 * TURN does not require a frontend rebuild.
 *
 * Without TURN, peers behind symmetric NATs may fail. STUN alone works on
 * many home/office networks and same-LAN tabs.
 */

const DEFAULT_STUN = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun.cloudflare.com:3478'
]

const splitUrls = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

let remoteIceServers = null

const isIceServer = (entry) =>
  entry && typeof entry === 'object' && (typeof entry.urls === 'string' || Array.isArray(entry.urls))

/**
 * Merge ICE servers delivered by the collab hub (authoritative for production TURN).
 * @param {RTCIceServer[]|undefined|null} servers
 */
export function applyRemoteIceServers(servers) {
  if (!Array.isArray(servers) || !servers.length) return
  remoteIceServers = servers.filter(isIceServer)
}

export function getRemoteIceServers() {
  return remoteIceServers
}

/**
 * @returns {RTCConfiguration}
 */
export function getMeetingRtcConfiguration() {
  const stunUrls = splitUrls(import.meta.env.VITE_STUN_URLS)
  const turnUrls = splitUrls(import.meta.env.VITE_TURN_URLS)
  const username = import.meta.env.VITE_TURN_USERNAME || import.meta.env.VITE_TURN_USER || ''
  const credential = import.meta.env.VITE_TURN_CREDENTIAL || import.meta.env.VITE_TURN_SECRET || ''

  /** @type {RTCIceServer[]} */
  const iceServers = []

  ;(stunUrls.length ? stunUrls : DEFAULT_STUN).forEach((urls) => {
    iceServers.push({ urls })
  })

  if (turnUrls.length) {
    const entry = { urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls }
    if (username) entry.username = username
    if (credential) entry.credential = credential
    iceServers.push(entry)
  }

  if (remoteIceServers?.length) {
    remoteIceServers.forEach((server) => {
      const urls = Array.isArray(server.urls) ? server.urls.join(',') : String(server.urls || '')
      const already = iceServers.some((existing) => {
        const existingUrls = Array.isArray(existing.urls) ? existing.urls.join(',') : String(existing.urls || '')
        return existingUrls === urls
      })
      if (!already) iceServers.push(server)
    })
  }

  return {
    iceServers,
    iceCandidatePoolSize: 8,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all'
  }
}

export function describeIceSetup() {
  const turnUrls = splitUrls(import.meta.env.VITE_TURN_URLS)
  const remoteTurn = (remoteIceServers || []).some((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
    return urls.some((url) => String(url || '').startsWith('turn'))
  })
  return {
    hasTurn: turnUrls.length > 0 || remoteTurn,
    turnCount: turnUrls.length + (remoteTurn ? 1 : 0),
    stunDefault: !import.meta.env.VITE_STUN_URLS
  }
}
