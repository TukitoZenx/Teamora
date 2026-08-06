import { afterEach, describe, expect, it, vi } from 'vitest'

describe('webrtcIce', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('includes default STUN servers when TURN is unset', async () => {
    vi.stubEnv('VITE_TURN_URLS', '')
    vi.stubEnv('VITE_STUN_URLS', '')
    const { getMeetingRtcConfiguration, describeIceSetup } = await import('./webrtcIce')
    const cfg = getMeetingRtcConfiguration()
    expect(cfg.iceServers.length).toBeGreaterThan(0)
    expect(cfg.iceServers.some((s) => String(s.urls).includes('stun:'))).toBe(true)
    expect(describeIceSetup()).toEqual({ hasTurn: false, turnCount: 0, stunDefault: true })
  })

  it('adds TURN credentials when configured', async () => {
    vi.stubEnv('VITE_TURN_URLS', 'turn:turn.example.com:3478,turns:turn.example.com:5349')
    vi.stubEnv('VITE_TURN_USERNAME', 'user')
    vi.stubEnv('VITE_TURN_CREDENTIAL', 'secret')
    vi.stubEnv('VITE_STUN_URLS', 'stun:custom.stun:19302')
    const { getMeetingRtcConfiguration, describeIceSetup } = await import('./webrtcIce')
    const cfg = getMeetingRtcConfiguration()
    const turn = cfg.iceServers.find((s) => Array.isArray(s.urls) || String(s.urls).includes('turn:'))
    expect(turn).toBeTruthy()
    expect(turn.username).toBe('user')
    expect(turn.credential).toBe('secret')
    expect(describeIceSetup()).toEqual({ hasTurn: true, turnCount: 2, stunDefault: false })
  })
})
