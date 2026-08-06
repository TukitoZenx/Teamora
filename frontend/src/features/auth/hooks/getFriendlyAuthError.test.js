import { describe, expect, it } from 'vitest'
import { getFriendlyAuthError } from './useAuthForm'

describe('getFriendlyAuthError', () => {
  it('maps known auth server messages', () => {
    expect(getFriendlyAuthError('Invalid credentials')).toBe('Wrong email or password.')
    expect(getFriendlyAuthError('Email is already in use')).toBe('Email already exists.')
    expect(getFriendlyAuthError('Username is already in use')).toBe('Username already exists.')
    expect(getFriendlyAuthError('Please provide a valid email')).toBe('Please enter a valid email address.')
    expect(getFriendlyAuthError('Server unavailable. Please try again.')).toBe('Server unavailable. Please try again.')
  })

  it('returns original message when no mapping matches', () => {
    expect(getFriendlyAuthError('Custom backend message')).toBe('Custom backend message')
  })

  it('falls back when message is empty', () => {
    expect(getFriendlyAuthError('')).toBe('Something went wrong. Please try again.')
  })
})
