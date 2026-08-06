import { describe, expect, it } from 'vitest'
import { normalizeHttpUrl, getCollabWebSocketUrl, getApiBaseUrl } from './apiBaseUrl'

describe('normalizeHttpUrl', () => {
  it('accepts http(s) origins and strips trailing slash/path noise', () => {
    expect(normalizeHttpUrl('https://api.example.com/')).toBe('https://api.example.com')
    expect(normalizeHttpUrl('http://localhost:5000/v1?x=1#h')).toBe('http://localhost:5000/v1')
  })

  it('rejects non-http schemes and template placeholders', () => {
    expect(normalizeHttpUrl('ftp://x.com')).toBeNull()
    expect(normalizeHttpUrl('<backend-url>')).toBeNull()
    expect(normalizeHttpUrl('')).toBeNull()
    expect(normalizeHttpUrl('not a url')).toBeNull()
  })
})

describe('getApiBaseUrl / getCollabWebSocketUrl', () => {
  it('returns a string base URL in test/dev', () => {
    const base = getApiBaseUrl()
    expect(typeof base).toBe('string')
    expect(base.startsWith('http')).toBe(true)
  })

  it('derives ws/wss collab URL from API base', () => {
    const ws = getCollabWebSocketUrl()
    expect(ws).toMatch(/^wss?:\/\//)
    expect(ws).toMatch(/\/collab$/)
  })
})
