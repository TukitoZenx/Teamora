import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import toast, { Toaster, ToastBar } from 'react-hot-toast'
import { X } from 'lucide-react'
import AppNavbar from './components/AppNavbar'
import ProtectedRoute from './components/ProtectedRoute'
import InviteWorkspacePage from './components/InviteWorkspacePage'
import WorkspaceRoute, { WorkspaceLoadingShell } from './components/WorkspaceRoute'
import api from './services/api' 
import { useAuth } from './hooks/useAuth'
import { addWorkspaceNotification } from './components/utils/notifications'
import GlobalMeetings from './components/GlobalMeetings'
import { useMeeting } from './contexts/MeetingContext'
import BrandLoadingScreen from './components/ui/BrandLoadingScreen'
import { extractInviteCode } from './utils/inviteCode'
import { subscribeAppearance } from './utils/appearance'
import {
  LAST_PAGE_KEY,
  RECENT_WORKSPACES_CACHE_KEY,
  WORKSPACE_SECTIONS,
  WORKSPACES_CACHE_KEY,
  clearLastWorkspaceId,
  getCachedWorkspace,
  putCachedWorkspace,
  readJsonCache,
  removeWorkspaceCache,
  setLastWorkspaceId,
  writeJsonCache
} from './utils/workspaceStorage'

// what below will does ? ans : The code snippet you provided is a React application that serves as the main entry point for a web application. It sets up routing, authentication, workspace management, and global UI components. Here's a breakdown of what the code does:
const Dashboard = lazy(() => import('./components/Dashboard'))
const WorkspaceHome = lazy(() => import('./components/WorkspaceHome'))
const LandingPage = lazy(() => import('./components/LandingPage'))
const SettingsPage = lazy(() => import('./components/SettingsPage'))
const SettingsIndex = lazy(() => import('./components/SettingsPage').then((m) => ({ default: m.SettingsIndex })))
const SettingsSection = lazy(() => import('./components/SettingsPage').then((m) => ({ default: m.SettingsSection })))
const AuthPage = lazy(() => import('./features/auth/pages/AuthPage'))
const CompleteProfilePage = lazy(() => import('./features/auth/pages/CompleteProfilePage'))
const ForgotPasswordPage = lazy(() => import('./features/auth/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage'))

/** App shell: routing, workspace list state, and global chrome (toasts, meetings). */
export default function App() {
  const { user, loading, authenticated, profileComplete } = useAuth()
  const { activeMeetingWorkspace, leaveMeeting } = useMeeting()
  const navigate = useNavigate()
  const location = useLocation()
  const workspacesRequestRef = useRef(null)
  const workspaceRequestRef = useRef(new Map())
  const [workspaces, setWorkspaces] = useState(() => readJsonCache(WORKSPACES_CACHE_KEY, []))
  const [recentWorkspaces, setRecentWorkspaces] = useState(() => readJsonCache(RECENT_WORKSPACES_CACHE_KEY, []))
  const [activeWorkspace, setActiveWorkspace] = useState(null)
  const [workspacesLoading, setWorkspacesLoading] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [authNotice, setAuthNotice] = useState('')

  const displayName = useMemo(() => {
    if (user?.fullName) return user.fullName
    if (user?.username) return user.username
    return user?.email?.split('@')[0] || 'User'
  }, [user])

  useEffect(() => subscribeAppearance(), [])

  useEffect(() => {
    if (authenticated) {
      localStorage.setItem(LAST_PAGE_KEY, `${location.pathname}${location.search}`)
    }
  }, [authenticated, location.pathname, location.search])

  useEffect(() => {
    if (!authenticated || !user || user.provider !== 'google') return

    const googleAuthStarted = sessionStorage.getItem('teamora-google-auth-started')

    if (!googleAuthStarted) return

    sessionStorage.removeItem('teamora-google-auth-started')

    if (profileComplete) {
      toast.success('Welcome back! Signing you in...')
    }
  }, [authenticated, profileComplete, user])

  const loadWorkspaces = useCallback(async () => {
    setAuthNotice('')

    if (workspacesRequestRef.current) {
      return workspacesRequestRef.current
    }

    setWorkspacesLoading(true)

    const request = api
      .get('/api/v1/workspaces')
      .then(({ data }) => {
        const nextWorkspaces = data.workspaces || []
        const nextRecentWorkspaces = data.recentWorkspaces || []
        setWorkspaces(nextWorkspaces)
        setRecentWorkspaces(nextRecentWorkspaces)
        writeJsonCache(WORKSPACES_CACHE_KEY, nextWorkspaces)
        writeJsonCache(RECENT_WORKSPACES_CACHE_KEY, nextRecentWorkspaces)
        return nextWorkspaces
      })
      .catch((error) => {
        // Keep the last known list/cache so a transient network blip does not
        // look like every workspace was deleted.
        setAuthNotice(error.message)
        return null
      })
      .finally(() => {
        setWorkspacesLoading(false)
        workspacesRequestRef.current = null
      })

    workspacesRequestRef.current = request
    return request
  }, [])

  const replaceWorkspaces = useCallback((updater) => {
    setWorkspaces((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      writeJsonCache(WORKSPACES_CACHE_KEY, next)
      return next
    })
  }, [])

  const replaceRecentWorkspaces = useCallback((updater) => {
    setRecentWorkspaces((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      writeJsonCache(RECENT_WORKSPACES_CACHE_KEY, next)
      return next
    })
  }, [])

  // When the owner deletes a workspace, kick every remaining client out of the UI.
  // Must sit after replaceWorkspaces / replaceRecentWorkspaces are defined.
  useEffect(() => {
    const onWorkspaceDeleted = (event) => {
      const deletedId = event?.detail?.workspaceId
      if (!deletedId) return

      const activeId = activeWorkspace?._id || activeWorkspace?.workspaceId
      replaceWorkspaces((current) => current.filter((workspace) => workspace._id !== deletedId))
      replaceRecentWorkspaces((current) =>
        current.filter((workspace) => workspace.workspaceId !== deletedId && workspace._id !== deletedId)
      )
      removeWorkspaceCache(deletedId)
      clearLastWorkspaceId(deletedId)
      if (activeMeetingWorkspace?._id === deletedId) {
        leaveMeeting()
      }
      if (activeId === deletedId || location.pathname.includes(`/workspace/${deletedId}`)) {
        setActiveWorkspace(null)
        toast.error(event?.detail?.message || 'This workspace was deleted by the owner.')
        navigate('/dashboard', { replace: true })
      }
    }

    window.addEventListener('teamora-workspace-deleted', onWorkspaceDeleted)
    return () => window.removeEventListener('teamora-workspace-deleted', onWorkspaceDeleted)
  }, [
    activeMeetingWorkspace?._id,
    activeWorkspace?._id,
    activeWorkspace?.workspaceId,
    leaveMeeting,
    location.pathname,
    navigate,
    replaceRecentWorkspaces,
    replaceWorkspaces
  ])

  const cacheWorkspace = useCallback((workspace) => {
    putCachedWorkspace(workspace)
  }, [])

  useEffect(() => {
    const refresh = () => {
      if (user && profileComplete) {
        loadWorkspaces()
      }
    }

    window.addEventListener('teamora-workspaces-refresh', refresh)
    return () => window.removeEventListener('teamora-workspaces-refresh', refresh)
  }, [loadWorkspaces, profileComplete, user])

  useEffect(() => {
    let cancelled = false

    if (user && profileComplete) {
      queueMicrotask(() => {
        if (!cancelled) loadWorkspaces()
      })
    } else {
      queueMicrotask(() => {
        if (cancelled) return
        replaceWorkspaces([])
        replaceRecentWorkspaces([])
        setActiveWorkspace(null)
      })
    }

    return () => {
      cancelled = true
    }
  }, [user, profileComplete, loadWorkspaces, replaceRecentWorkspaces, replaceWorkspaces])

  const createWorkspace = async (payload) => {
    const userId = String(user?._id || user?.id || '')
    const ownedCount = workspaces.filter((workspace) => {
      const ownerId = workspace?.owner?._id || workspace?.owner
      return userId && String(ownerId) === userId
    }).length
    if (ownedCount >= 6) {
      toast.error('Maximum 6 workspaces can be created.')
      return
    }
    const { data } = await api.post('/api/v1/workspaces', payload)

    replaceWorkspaces((current) => [data.workspace, ...current])
    replaceRecentWorkspaces((current) => [
      { ...data.workspace, workspaceId: data.workspace._id, status: 'active', statusLabel: 'Active', canOpen: true },
      ...current.filter(
        (workspace) => workspace.workspaceId !== data.workspace._id && workspace._id !== data.workspace._id
      )
    ])
    setActiveWorkspace(data.workspace)
    cacheWorkspace(data.workspace)
    setLastWorkspaceId(data.workspace._id)
    navigate(`/workspace/${data.workspace._id}`)
    toast.success('Workspace created')
  }

  const joinWorkspace = async (inviteInput) => {
    const inviteCode = extractInviteCode(inviteInput)
    const { data } = await api.post(`/api/v1/workspaces/invite/${inviteCode}/request`, {})
    await loadWorkspaces()
    if (data.joined && data.workspace?._id) {
      replaceWorkspaces((current) => [
        data.workspace,
        ...current.filter((workspace) => workspace._id !== data.workspace._id)
      ])
      replaceRecentWorkspaces((current) => [
        { ...data.workspace, workspaceId: data.workspace._id, status: 'active', statusLabel: 'Active', canOpen: true },
        ...current.filter(
          (workspace) => workspace.workspaceId !== data.workspace._id && workspace._id !== data.workspace._id
        )
      ])
      setActiveWorkspace(data.workspace)
      cacheWorkspace(data.workspace)
      setLastWorkspaceId(data.workspace._id)
      navigate(`/workspace/${data.workspace._id}`)
      addWorkspaceNotification({
        type: 'workspace_joined',
        message: `You joined ${data.workspace.name}`,
        workspaceId: data.workspace._id,
        workspaceName: data.workspace.name
      })
      return data.workspace
    }

    toast.success('Access request sent')
    return data.workspace
  }

  const removeRecentWorkspace = async (workspaceId) => {
    replaceRecentWorkspaces((current) =>
      current.filter((workspace) => workspace.workspaceId !== workspaceId && workspace._id !== workspaceId)
    )
    try {
      await api.delete(`/api/v1/workspaces/history/${workspaceId}`)
    } catch (error) {
      await loadWorkspaces()
      toast.error(error.message)
    }
  }

  const updateWorkspace = async (workspaceId, payload) => {
    const { data } = await api.put(`/api/v1/workspaces/${workspaceId}`, payload)

    replaceWorkspaces((current) =>
      current.map((workspace) => (workspace._id === workspaceId ? data.workspace : workspace))
    )
    setActiveWorkspace((current) => (current?._id === workspaceId ? data.workspace : current))
    cacheWorkspace(data.workspace)
    toast.success('Workspace updated')
    return data.workspace
  }

  const deleteWorkspace = async (workspaceId) => {
    await api.delete(`/api/v1/workspaces/${workspaceId}`)

    replaceWorkspaces((current) => current.filter((workspace) => workspace._id !== workspaceId))
    replaceRecentWorkspaces((current) =>
      current.filter((workspace) => workspace.workspaceId !== workspaceId && workspace._id !== workspaceId)
    )
    setActiveWorkspace((current) => (current?._id === workspaceId ? null : current))
    if (activeMeetingWorkspace?._id === workspaceId) {
      leaveMeeting()
    }
    removeWorkspaceCache(workspaceId)
    clearLastWorkspaceId(workspaceId)
    navigate('/dashboard', { replace: true })
    toast.success('Workspace deleted successfully.')
  }

  const leaveWorkspace = useCallback(
    async (workspaceId, payload = {}) => {
      try {
        const { data } = await api.post(`/api/v1/workspaces/${workspaceId}/leave`, payload)

        replaceWorkspaces((current) => current.filter((workspace) => workspace._id !== workspaceId))
        if (data.workspaceDeleted) {
          replaceRecentWorkspaces((current) =>
            current.filter((workspace) => workspace.workspaceId !== workspaceId && workspace._id !== workspaceId)
          )
        } else {
          replaceRecentWorkspaces((current) => {
            const existing = current.find(
              (workspace) => workspace.workspaceId === workspaceId || workspace._id === workspaceId
            )
            const nextEntry = existing
              ? {
                  ...existing,
                  status: 'previously_joined',
                  statusLabel: 'Previously Joined',
                  canOpen: false,
                  canRequestAccess: true
                }
              : {
                  _id: workspaceId,
                  workspaceId,
                  status: 'previously_joined',
                  statusLabel: 'Previously Joined',
                  canOpen: false,
                  canRequestAccess: true,
                  lastSeenAt: new Date().toISOString()
                }

            return [
              nextEntry,
              ...current.filter((workspace) => workspace.workspaceId !== workspaceId && workspace._id !== workspaceId)
            ]
          })
        }
        setActiveWorkspace((current) => (current?._id === workspaceId ? null : current))
        if (activeMeetingWorkspace?._id === workspaceId) {
          leaveMeeting()
        }
        removeWorkspaceCache(workspaceId)
        clearLastWorkspaceId(workspaceId)

        await loadWorkspaces()
        navigate('/dashboard', { replace: true })
        if (data.workspaceDeleted) {
          toast.success('Workspace deleted because no members remained.')
        } else {
          toast.success('You have left the workspace.')
        }
      } catch (error) {
        const message = error?.message || 'Failed to leave workspace'
        toast.error(message)
        throw error
      }
    },
    [activeMeetingWorkspace, leaveMeeting, loadWorkspaces, navigate, replaceRecentWorkspaces, replaceWorkspaces]
  )

  const fetchWorkspace = useCallback(
    async (workspaceId) => {
      const cachedWorkspace = getCachedWorkspace(workspaceId)
      if (cachedWorkspace) {
        setActiveWorkspace(cachedWorkspace)
      }

      if (workspaceRequestRef.current.has(workspaceId)) {
        return workspaceRequestRef.current.get(workspaceId)
      }

      setWorkspaceLoading(true)
      const request = api
        .get(`/api/v1/workspaces/${workspaceId}`)
        .then(({ data }) => {
          setActiveWorkspace(data.workspace)
          cacheWorkspace(data.workspace)
          setLastWorkspaceId(data.workspace._id)
          return data.workspace
        })
        .catch((error) => {
          if (error.status === 404) {
            removeWorkspaceCache(workspaceId)
          }
          throw error
        })
        .finally(() => {
          setWorkspaceLoading(false)
          workspaceRequestRef.current.delete(workspaceId)
        })

      workspaceRequestRef.current.set(workspaceId, request)
      return request
    },
    [cacheWorkspace]
  )

  const openWorkspace = useCallback(
    async (workspaceId, section = 'home') => {
      const workspacePath = section === 'home' ? `/workspace/${workspaceId}` : `/workspace/${workspaceId}/${section}`
      setLastWorkspaceId(workspaceId)
      navigate(workspacePath)
    },
    [navigate]
  )

  const goToDashboard = useCallback(() => {
    setActiveWorkspace(null)// 
    clearLastWorkspaceId()
    navigate('/dashboard', { replace: true })
  }, [navigate])

  const renderAppFrame = ({ forceWorkspace = false, forceDashboard = false, workspacePage = 'home' } = {}) => {
    // forceDashboard: always show dashboard even if activeWorkspace is still set
    // (e.g. browser back to /dashboard without clearing workspace state).
    const currentWorkspace = forceDashboard || forceWorkspace ? null : activeWorkspace

    if (currentWorkspace) {
      return (
        <ProtectedRoute>
          <WorkspaceHome
            key={currentWorkspace._id}
            workspace={currentWorkspace}
            loading={workspaceLoading}
            currentUserName={displayName}
            onBack={goToDashboard}
            onLeaveWorkspace={leaveWorkspace}
            onDeleteWorkspace={deleteWorkspace}
            onUpdateWorkspace={updateWorkspace}
            initialActiveItem={workspacePage}
            onWorkspacePageChange={(page) => {
              const nextPage = WORKSPACE_SECTIONS.has(page) ? page : 'home'
              const nextPath =
                nextPage === 'home'
                  ? `/workspace/${currentWorkspace._id}`
                  : `/workspace/${currentWorkspace._id}/${nextPage}`
              setLastWorkspaceId(currentWorkspace._id)
              navigate(nextPath)
            }}
            onRefresh={async () => {
              await fetchWorkspace(currentWorkspace._id)
              await loadWorkspaces()
            }}
          />
        </ProtectedRoute>
      )
    }

    if (forceWorkspace) {// 
      return (
        <ProtectedRoute>
          <WorkspaceLoadingShell activeItem={workspacePage} onBack={goToDashboard} />
        </ProtectedRoute>
      )
    }

    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background text-text transition-colors">
          <AppNavbar onDashboard={goToDashboard} />
          <div className="pt-navbar">
            <Dashboard
              user={user}
              displayName={displayName}
              workspaces={workspaces}
              recentWorkspaces={recentWorkspaces}
              loading={workspacesLoading}
              authNotice={authNotice}
              onCreateWorkspace={createWorkspace}
              onJoinWorkspace={joinWorkspace}
              onOpenWorkspace={openWorkspace}
              onUpdateWorkspace={updateWorkspace}
              onLeaveWorkspace={leaveWorkspace}
              onRemoveRecentWorkspace={removeRecentWorkspace}
              onDeleteWorkspace={deleteWorkspace}
              onRefresh={loadWorkspaces}
            />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const renderSettingsFrame = () => (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-text">
        <AppNavbar onDashboard={goToDashboard} />
        <div className="pt-navbar">
          <SettingsPage user={user} />
        </div>
      </div>
    </ProtectedRoute>
  )

  const DashboardRoute = renderAppFrame({ forceDashboard: true })

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            '!rounded-button !border !border-border !bg-card !text-text !shadow-dropdown !text-sm !font-medium',
          success: { iconTheme: { primary: 'var(--tw-success)', secondary: 'var(--tw-card)' } },
          error: { iconTheme: { primary: 'var(--tw-danger)', secondary: 'var(--tw-card)' } },
          duration: 3500
        }}
        containerStyle={{ zIndex: 1300 }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="ml-2 -mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-card-sunken hover:text-text focus:outline-none cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
      <Suspense fallback={<BrandLoadingScreen message="Loading…" />}>
        <Routes>
          <Route
            path="/"
            element={<RootRoute loading={loading} authenticated={authenticated} profileComplete={profileComplete} />}
          />
          <Route
            path="/signin"
            element={
              <PublicRoute loading={loading} authenticated={authenticated} profileComplete={profileComplete}>
                <AuthPage mode="signin" />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute loading={loading} authenticated={authenticated} profileComplete={profileComplete}>
                <AuthPage mode="signup" />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute loading={loading} authenticated={authenticated} profileComplete={profileComplete}>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <PublicRoute loading={loading} authenticated={authenticated} profileComplete={profileComplete}>
                <ResetPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute>
                <CompleteProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invite/:inviteCode"
            element={
              <ProtectedRoute>
                <InviteWorkspacePage onOpenWorkspace={openWorkspace} />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={DashboardRoute} />
          <Route path="/settings" element={renderSettingsFrame()}>
            <Route index element={<SettingsIndex />} />
            <Route path=":section" element={<SettingsSection />} />
          </Route>
          <Route
            path="/workspace"
            element={
              <WorkspaceRoute
                authenticated={authenticated}
                activeWorkspace={activeWorkspace}
                fetchWorkspace={fetchWorkspace}
                goToDashboard={goToDashboard}
                renderAppFrame={renderAppFrame}
              />
            }
          />
          <Route
            path="/workspace/:id"
            element={
              <WorkspaceRoute
                authenticated={authenticated}
                activeWorkspace={activeWorkspace}
                fetchWorkspace={fetchWorkspace}
                goToDashboard={goToDashboard}
                renderAppFrame={renderAppFrame}
              />
            }
          />
          <Route
            path="/workspace/:id/:section"
            element={
              <WorkspaceRoute
                authenticated={authenticated}
                activeWorkspace={activeWorkspace}
                fetchWorkspace={fetchWorkspace}
                goToDashboard={goToDashboard}
                renderAppFrame={renderAppFrame}
              />
            }
          />
          <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/'} replace />} />
        </Routes>
      </Suspense>
      {authenticated ? <GlobalMeetings /> : null}
    </>
  )
}

function PublicRoute({ children, loading, authenticated, profileComplete }) {
  // Guests see auth UI immediately — do not block on slow /me.
  // Only wait when a cached/live session may need redirect away from auth pages.
  if (authenticated) {
    if (loading) {
      return <BrandLoadingScreen message="Signing you in…" />
    }
    return profileComplete ? <Navigate to="/dashboard" replace /> : <Navigate to="/complete-profile" replace />
  }

  return children
}

const SAFE_RESTORE_PATH = /^\/(dashboard|settings(?:\/[a-z0-9-]+)?|workspace(?:\/[a-zA-Z0-9_-]+(?:\/[a-z0-9-]+)?)?)$/

function RootRoute({ loading, authenticated, profileComplete }) {
  if (loading) {
    return <LandingPage />
  }

  if (!authenticated) return <LandingPage />

  const lastPage = localStorage.getItem(LAST_PAGE_KEY)
  const blockedRestorePages = ['/', '/signin', '/signup', '/forgot-password', '/complete-profile', '/reset-password']
  if (
    profileComplete &&
    lastPage &&
    !blockedRestorePages.some((p) => lastPage === p || lastPage.startsWith('/reset-password')) &&
    SAFE_RESTORE_PATH.test(lastPage)
  ) {
    return <Navigate to={lastPage} replace />
  }

  return profileComplete ? <Navigate to="/dashboard" replace /> : <Navigate to="/complete-profile" replace />
}
