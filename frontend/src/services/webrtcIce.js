/**
 * WebRTC ICE server config for meetings mesh.
 *
 * Env (Vite):
 *   VITE_TURN_URLS      comma-separated, e.g. turn:turn.example.com:3478,turns:turn.example.com:5349
 *   VITE_TURN_USERNAME  optional shared secret username
 *   VITE_TURN_CREDENTIAL optional password
 *   VITE_STUN_URLS      optional override of default Google STUN (comma-separated)
 *
 * Without TURN, peers behind symmetric NATs may fail. STUN alone works on
 * many home/office networks and same-LAN tabs.
 */

const DEFAULT_STUN = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302'
]

const splitUrls = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

/**
 * @returns {RTCConfiguration}
 */
export function getMeetingRtcConfiguration() {
  const stunUrls = splitUrls(import.meta.env.VITE_STUN_URLS)
  const turnUrls = splitUrls(import.meta.env.VITE_TURN_URLS)
  const username = import.meta.env.VITE_TURN_USERNAME || ''
  const credential = import.meta.env.VITE_TURN_CREDENTIAL || ''

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

  return {
    iceServers,
    iceCandidatePoolSize: 8,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  }
}

export function describeIceSetup() {
  const turnUrls = splitUrls(import.meta.env.VITE_TURN_URLS)
  return {
    hasTurn: turnUrls.length > 0,
    turnCount: turnUrls.length,
    stunDefault: !import.meta.env.VITE_STUN_URLS
  }
}
