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
  const [user, setUser] = useState(() => readCachedUser())
  const [loading, setLoading] = useState(() => !readCachedUser())
  const cachedUserRef = useRef(null)

  const refreshUser = useCallback(async ({ useInitialCache = false } = {}) => {
    if (!cachedUserRef.current) {
      setLoading(true)
    }

    try {
      const currentUser = useInitialCache ? await getInitialUser() : await authService.getCurrentUser()
      setUser(currentUser)
      cachedUserRef.current = currentUser
      cacheUser(currentUser)
      return currentUser
    } catch (error) {
      if (error.status === 401) {
        setUser(null)
        cachedUserRef.current = null
        cacheUser(null)
      }
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
    return authenticatedUser
  }

  const register = async (payload) => {
    const authenticatedUser = await authService.register(payload)
    initialUserRequest = null
    setUser(authenticatedUser)
    cachedUserRef.current = authenticatedUser
    cacheUser(authenticatedUser)
    return authenticatedUser
  }

  const logout = async () => {
    await authService.logout()
    initialUserRequest = null
    setUser(null)
    cachedUserRef.current = null
    cacheUser(null)
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
