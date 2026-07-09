/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as authService from '../features/auth/services/auth'

const AuthContext = createContext(null)
const AUTH_CACHE_KEY = 'teamora-auth-user'
let initialUserRequest = null

const readCachedUser = () => {
  try {
    return JSON.parse(window.localStorage.getItem(AUTH_CACHE_KEY) || 'null')
  } catch {
    return null
  }
}

const cacheUser = (user) => {
  try {
    if (user) {
      window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user))
    } else {
      window.localStorage.removeItem(AUTH_CACHE_KEY)
    }
  } catch {
    // Local storage is only a render cache. The httpOnly session cookie remains authoritative.
  }
}

const getInitialUser = () => {
  if (!initialUserRequest) {
    initialUserRequest = authService.getCurrentUser()
  }

  return initialUserRequest
}

export function AuthProvider({ children }) {
  // Seed user from cache only for display after validation. Always start with
  // `loading` true so ProtectedRoute never treats a stale localStorage user as
  // an authenticated session before `/me` returns.
  const [user, setUser] = useState(() => readCachedUser())
  const [loading, setLoading] = useState(true)
  const cachedUserRef = useRef(null)
  const sessionCheckedRef = useRef(false)

  const refreshUser = useCallback(async ({ useInitialCache = false } = {}) => {
    // Block protected routes only until the first session check finishes.
    // Later refreshes (e.g. after saving profile) should not remount the app
    // into the full-page auth loader.
    if (!sessionCheckedRef.current) {
      setLoading(true)
    }

    try {
      const currentUser = useInitialCache ? await getInitialUser() : await authService.getCurrentUser()
      setUser(currentUser)
      cachedUserRef.current = currentUser
      cacheUser(currentUser)
      sessionCheckedRef.current = true
      return currentUser
    } catch (error) {
      if (error.status === 401) {
        setUser(null)
        cachedUserRef.current = null
        cacheUser(null)
      }
      // Network errors keep the last known user so a brief outage does not
      // hard-logout; ProtectedRoute still waited for the first attempt.
      sessionCheckedRef.current = true
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cachedUserRef.current = user
  }, [user])

  useEffect(() => {
    queueMicrotask(() => refreshUser({ useInitialCache: true }))
  }, [refreshUser])

  const login = async (payload) => {
    const authenticatedUser = await authService.login(payload)
    initialUserRequest = null
    setUser(authenticatedUser)
    cachedUserRef.current = authenticatedUser
    cacheUser(authenticatedUser)
    sessionCheckedRef.current = true
    setLoading(false)
    return authenticatedUser
  }

  const register = async (payload) => {
    const authenticatedUser = await authService.register(payload)
    initialUserRequest = null
    setUser(authenticatedUser)
    cachedUserRef.current = authenticatedUser
    cacheUser(authenticatedUser)
    sessionCheckedRef.current = true
    setLoading(false)
    return authenticatedUser
  }

  const logout = async () => {
    await authService.logout()
    initialUserRequest = null
    setUser(null)
    cachedUserRef.current = null
    cacheUser(null)
    sessionCheckedRef.current = true
    setLoading(false)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      authenticated: Boolean(user),
      isAuthenticated: Boolean(user),
      profileComplete: user?.profileComplete !== false,
      login,
      logout,
      register,
      refreshUser,
      fetchCurrentUser: refreshUser
    }),
    [user, loading, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useSession() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useSession must be used within AuthProvider')
  }

  return context
}
