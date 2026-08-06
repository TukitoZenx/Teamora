import { describe, expect, it } from 'vitest'
import { extractInviteCode } from './inviteCode'

describe('extractInviteCode', () => {
  it('returns empty for blank input', () => {
    expect(extractInviteCode('')).toBe('')
    expect(extractInviteCode(null)).toBe('')
    expect(extractInviteCode('   ')).toBe('')
  })

  it('uppercases raw codes', () => {
    expect(extractInviteCode('abc123')).toBe('ABC123')
  })

  it('extracts the last path segment from a full URL', () => {
    expect(extractInviteCode('https://teamora.example/invite/xyz99')).toBe('XYZ99')
    expect(extractInviteCode('https://teamora.example/invite/xyz99/')).toBe('XYZ99')
  })

  it('handles path-like strings without a scheme', () => {
    expect(extractInviteCode('invite/joinMe')).toBe('JOINME')
  })
})
