import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authService from '../features/auth/services/auth'

const AuthContext = createContext(null)
let initialUserRequest = null

const getInitialUser = () => {
  if (!initialUserRequest) {
    initialUserRequest = authService.getCurrentUser()
  }

  return initialUserRequest
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async ({ useInitialCache = false } = {}) => {
    setLoading(true)

    try {
      const currentUser = useInitialCache ? await getInitialUser() : await authService.getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch (error) {
      if (error.status === 401) {
        setUser(null)
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser({ useInitialCache: true })
  }, [refreshUser])

  const login = async (payload) => {
    const authenticatedUser = await authService.login(payload)
    initialUserRequest = null
    setUser(authenticatedUser)
    return authenticatedUser
  }

  const register = async (payload) => {
    const authenticatedUser = await authService.register(payload)
    initialUserRequest = null
    setUser(authenticatedUser)
    return authenticatedUser
  }

  const logout = async () => {
    await authService.logout()
    initialUserRequest = null
    setUser(null)
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
