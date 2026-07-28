/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as authService from '../features/auth/services/auth' 
import { onUnauthorized } from '../services/api'

const AuthContext = createContext(null) // create a global context for authentication state and actions
const AUTH_CACHE_KEY = 'teamora-auth-user'
let initialUserRequest = null

// it reads the data from localstorage... 
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
  // an authenticated session before `/me` returns. Public routes skip the wait
  // when there is no authenticated user (see PublicRoute).
  const [user, setUser] = useState(() => readCachedUser())// readcacheduser() gets the current user from localstorage using the auth key called teamora-auth-user and then sets it as the initial state of the user so the usestate is used ? ans : it is used to store the user data in the localstorage and also in the react state , the main purpose to use the usestate at here ? ans : 
  const [loading, setLoading] = useState(true)// if loading is true, it means the authentication state is being checked and the app is waiting for the response from the server
  /** True only after the first `/me` completes successfully with a user. */
  const [sessionValidated, setSessionValidated] = useState(false)// 
  const cachedUserRef = useRef(null)// what is does ? ans : it stores the cached user data
  const sessionCheckedRef = useRef(false)// what is does ? ans : it tracks whether the session has been checked
  const sessionValidatedRef = useRef(false)// what is does ? ans : it tracks whether the session is validated 

  const clearSession = useCallback(() => {
    initialUserRequest = null
    setUser(null)
    cachedUserRef.current = null
    cacheUser(null)
    sessionValidatedRef.current = false
    setSessionValidated(false)
    sessionCheckedRef.current = true
    setLoading(false)
  }, [])// at where this function is used ? ans : it is used to clear the session data when the user logs out or the session expires

  const refreshUser = useCallback(
    async ({ useInitialCache = false } = {}) => {
      // Block protected routes only until the first session check finishes.
      // Later refreshes (e.g. after saving profile) should not remount the app
      // into the full-page auth loader.
      if (!sessionCheckedRef.current) {// what is does ? ans : it checks if the session has been checked or not, it mean s the first time the user is loading the app, so it will set the loading state to true
        setLoading(true)
      }

      try {
        const currentUser = useInitialCache ? await getInitialUser() : await authService.getCurrentUser()
        setUser(currentUser)
        cachedUserRef.current = currentUser
        cacheUser(currentUser)
        const validated = Boolean(currentUser)
        sessionValidatedRef.current = validated
        setSessionValidated(validated)
        sessionCheckedRef.current = true
        return currentUser
      } catch (error) {
        if (error.status === 401) {
          clearSession()
          return null
        }
        // First load + network failure: do not treat cached user as authenticated.
        // After a validated session, keep last known user through brief outages.
        if (!sessionValidatedRef.current) {
          setUser(null)
          cachedUserRef.current = null
          cacheUser(null)
          sessionValidatedRef.current = false
          setSessionValidated(false)
        }
        sessionCheckedRef.current = true
        return null
      } finally {
        setLoading(false)
      }
    },
    [clearSession]
  )// what is does ? ans : it refreshes the user data from the server and updates the state accordingly

  useEffect(() => {
    cachedUserRef.current = user
  }, [user])

  useEffect(() => {
    queueMicrotask(() => refreshUser({ useInitialCache: true }))
  }, [refreshUser])

  useEffect(() => onUnauthorized(() => clearSession()), [clearSession])

  // --- AUTHENTICATION ACTIONS ---
  // These functions are exposed to the rest of the app. When a user logs in, 
  // we call the backend (authService), then save the user data in our React State and LocalStorage.
  // If we didn't save it in state, the UI wouldn't update to show the "Dashboard" after login.
  const login = useCallback(async (payload) => {
    const authenticatedUser = await authService.login(payload)
    initialUserRequest = null
    setUser(authenticatedUser)
    cachedUserRef.current = authenticatedUser
    cacheUser(authenticatedUser)
    sessionValidatedRef.current = true
    setSessionValidated(true)
    sessionCheckedRef.current = true
    setLoading(false)
    return authenticatedUser
  }, [])

  const register = useCallback(async (payload) => {
    const authenticatedUser = await authService.register(payload)
    initialUserRequest = null
    setUser(authenticatedUser)
    cachedUserRef.current = authenticatedUser
    cacheUser(authenticatedUser)
    sessionValidatedRef.current = true
    setSessionValidated(true)
    sessionCheckedRef.current = true
    setLoading(false)
    return authenticatedUser
  }, [])

  // Logs the user out. It tells the backend to destroy the session cookie, 
  // and then calls clearSession() to wipe all user data from the React memory.
  // If we didn't do this, the user's private data might stay visible on the screen after logging out!
  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Always clear local session even if the network logout fails.
    }
    clearSession()
  }, [clearSession])

  // --- THE CONTEXT PROVIDER VALUE ---
  // useMemo remembers this object so we don't recreate it on every single keystroke.
  // This object is the "Menu" of data and functions that any component in the app can order from.
  const value = useMemo(
    () => ({
      user,
      loading,
      // Validated cookie session, or cached user only while the first /me is in flight
      // (ProtectedRoute still waits on `loading` before rendering private UI).
      authenticated: Boolean(user) && (sessionValidated || loading),
      isAuthenticated: Boolean(user) && (sessionValidated || loading),
      profileComplete: user ? user.profileComplete !== false : false,
      login,
      logout,
      register,
      refreshUser,
      fetchCurrentUser: refreshUser,
      clearSession
    }),
    [user, loading, sessionValidated, login, logout, register, refreshUser, clearSession]
  )

  // This wraps our entire application, handing out the "value" object to anyone who asks for it.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// --- CUSTOM HOOK ---
// Instead of writing `useContext(AuthContext)` everywhere, developers just call `useSession()`.
// It includes a safety check: if you try to use it outside of the Provider, it crashes with a helpful error.
export function useSession() {// useSession custom hook 
  const context = useContext(AuthContext)// useContext what it does ? ans : it returns the value of the context for example AuthContext contains state user and loading and functions login, logout, register, refreshUser, fetchCurrentUser, clearSession

  if (!context) {// when it use ? ans : it is used to check if the context is not null or undefined
    throw new Error('useSession must be used within AuthProvider')
  }

  return context// when it use ? ans : it is used to return the context
}
