import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useSession, __resetAuthBootstrapForTests } from './AuthContext'

vi.mock('../features/auth/services/auth', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn()
}))

vi.mock('../services/api', () => ({
  onUnauthorized: () => () => {}
}))

import * as authService from '../features/auth/services/auth'

function Probe() {
  const { loading, user, authenticated } = useSession()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="auth">{String(authenticated)}</span>
      <span data-testid="user">{user?.email || 'none'}</span>
    </div>
  )
}

describe('AuthContext session gate', () => {
  beforeEach(() => {
    try {
      window.localStorage?.clear?.()
    } catch {
      // ignore
    }
    __resetAuthBootstrapForTests()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps loading true until /me resolves', async () => {
    let resolveMe
    authService.getCurrentUser.mockReturnValue(
      new Promise((resolve) => {
        resolveMe = resolve
      })
    )

    window.localStorage.setItem(
      'teamora-auth-user',
      JSON.stringify({ email: 'cached@example.com', profileComplete: true })
    )

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    // While /me is pending, loading must remain true even with a cache seed.
    expect(screen.getByTestId('loading').textContent).toBe('true')

    resolveMe({ email: 'live@example.com', profileComplete: true })

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('user').textContent).toBe('live@example.com')
  })

  it('clears user after 401 from /me', async () => {
    const err = new Error('Not authenticated')
    err.status = 401
    authService.getCurrentUser.mockRejectedValue(err)
    window.localStorage.setItem(
      'teamora-auth-user',
      JSON.stringify({ email: 'stale@example.com', profileComplete: true })
    )

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('user').textContent).toBe('none')
    expect(screen.getByTestId('auth').textContent).toBe('false')
  })
})
