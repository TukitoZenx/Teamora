import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import AppNavbar from './components/AppNavbar'
import Dashboard from './components/Dashboard'
import WorkspaceHome from './components/WorkspaceHome'
import LandingPage from './components/LandingPage'
import ProtectedRoute from './components/ProtectedRoute'
import SettingsPage, { SettingsIndex, SettingsSection } from './components/SettingsPage'
import AuthPage from './features/auth/pages/AuthPage'
import CompleteProfilePage from './features/auth/pages/CompleteProfilePage'
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage'
import api from './services/api'
import { useAuth } from './hooks/useAuth'
import WorkspaceLayout from './features/workspace/components/WorkspaceLayout'
import { addWorkspaceNotification } from './components/utils/notifications'

const LAST_WORKSPACE_KEY = 'teamora-last-workspace-id'
const LAST_PAGE_KEY = 'teamora-last-page'
const WORKSPACES_CACHE_KEY = 'teamora-workspaces-cache'
const RECENT_WORKSPACES_CACHE_KEY = 'teamora-recent-workspaces-cache'
const WORKSPACE_CACHE_KEY = 'teamora-workspace-cache'
const WORKSPACE_SECTIONS = new Set([
  'home',
  'documents',
  'whiteboard',
  'spreadsheet',
  'presentation',
  'calendar',
  'tasks',
  'meetings',
  'members',
  'shared-files',
  'settings',
  'chat'
])

const readJsonCache = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || fallback
  } catch {
    return fallback
  }
}

const writeJsonCache = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Cache writes are best-effort; API data remains authoritative.
  }
}

const removeWorkspaceCache = (workspaceId) => {
  const cache = readJsonCache(WORKSPACE_CACHE_KEY, {})
  delete cache[workspaceId]
  writeJsonCache(WORKSPACE_CACHE_KEY, cache)
}

export default function App() {
  const { user, loading, authenticated, profileComplete } = useAuth()
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

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('collabspace-dark-mode')
  }, [])

  useEffect(() => {
    const applyAppearance = () => {
      try {
        const preferences = JSON.parse(localStorage.getItem('teamora-appearance') || 'null')
        if (!preferences) return
        document.documentElement.dataset.density = String(preferences.density || 'Comfortable').toLowerCase()
        document.documentElement.lang =
          preferences.language === 'Español' ? 'es' : preferences.language === 'Français' ? 'fr' : 'en'
        document.documentElement.dataset.timeZone = preferences.timeZone || 'UTC'
        document.documentElement.dataset.dateFormat = preferences.dateFormat || 'MM/DD/YYYY'
      } catch {
        // Appearance preferences are optional local UI state.
      }
    }

    applyAppearance()
    window.addEventListener('storage', applyAppearance)
    return () => window.removeEventListener('storage', applyAppearance)
  }, [])

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
        setAuthNotice(error.message)
        setWorkspaces([])
        setRecentWorkspaces([])
        writeJsonCache(WORKSPACES_CACHE_KEY, [])
        writeJsonCache(RECENT_WORKSPACES_CACHE_KEY, [])
        return []
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

  const cacheWorkspace = useCallback((workspace) => {
    if (!workspace?._id) return

    try {
      const cache = readJsonCache(WORKSPACE_CACHE_KEY, {})
      cache[workspace._id] = workspace
      writeJsonCache(WORKSPACE_CACHE_KEY, cache)
    } catch {
      // Ignore cache failures.
    }
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
    localStorage.setItem(LAST_WORKSPACE_KEY, data.workspace._id)
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
      localStorage.setItem(LAST_WORKSPACE_KEY, data.workspace._id)
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
    const workspaceToArchive =
      activeWorkspace?._id === workspaceId
        ? activeWorkspace
        : workspaces.find((workspace) => workspace._id === workspaceId)
    await api.delete(`/api/v1/workspaces/${workspaceId}`)

    replaceWorkspaces((current) => current.filter((workspace) => workspace._id !== workspaceId))
    replaceRecentWorkspaces((current) => [
      {
        ...(workspaceToArchive || {}),
        _id: workspaceId,
        workspaceId,
        name: workspaceToArchive?.name || 'Deleted workspace',
        status: 'trashed',
        statusLabel: 'Workspace Trash',
        canOpen: false,
        canRequestAccess: false,
        lastSeenAt: new Date().toISOString(),
        leftAt: new Date().toISOString()
      },
      ...current.filter((workspace) => workspace.workspaceId !== workspaceId && workspace._id !== workspaceId)
    ])
    setActiveWorkspace((current) => (current?._id === workspaceId ? null : current))
    removeWorkspaceCache(workspaceId)
    if (localStorage.getItem(LAST_WORKSPACE_KEY) === workspaceId) {
      localStorage.removeItem(LAST_WORKSPACE_KEY)
    }
    navigate('/dashboard', { replace: true })
    toast.success('Workspace moved to history.')
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
        removeWorkspaceCache(workspaceId)

        if (localStorage.getItem(LAST_WORKSPACE_KEY) === workspaceId) {
          localStorage.removeItem(LAST_WORKSPACE_KEY)
        }

        await loadWorkspaces()
        navigate('/dashboard', { replace: true })
        if (data.workspaceDeleted) {
          toast.success('Workspace deleted because no members remained.')
        } else {
          addWorkspaceNotification({
            type: 'workspace_left',
            message: data.workspaceInactive
              ? 'You left the workspace. It is inactive because no members remain.'
              : 'You left the workspace.',
            workspaceId
          })
        }
      } catch (error) {
        const message = error?.response?.data?.message || error?.message || 'Failed to leave workspace'
        toast.error(message)
        throw error
      }
    },
    [loadWorkspaces, navigate, replaceRecentWorkspaces, replaceWorkspaces]
  )

  const fetchWorkspace = useCallback(
    async (workspaceId) => {
      const cachedWorkspace = readJsonCache(WORKSPACE_CACHE_KEY, {})[workspaceId]
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
          localStorage.setItem(LAST_WORKSPACE_KEY, data.workspace._id)
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
      localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId)
      navigate(workspacePath)
    },
    [navigate]
  )

  const goToDashboard = useCallback(() => {
    setActiveWorkspace(null)
    if (localStorage.getItem(LAST_WORKSPACE_KEY)) {
      localStorage.removeItem(LAST_WORKSPACE_KEY)
    }
    navigate('/dashboard', { replace: true })
  }, [navigate])

  const renderAppFrame = ({ forceWorkspace = false, workspacePage = 'home' } = {}) => {
    const currentWorkspace = forceWorkspace ? null : activeWorkspace

    if (currentWorkspace) {
      return (
        <ProtectedRoute>
          <WorkspaceHome
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
              localStorage.setItem(LAST_WORKSPACE_KEY, currentWorkspace._id)
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

    if (forceWorkspace) {
      return (
        <ProtectedRoute>
          <WorkspaceLoadingShell activeItem={workspacePage} onBack={goToDashboard} />
        </ProtectedRoute>
      )
    }

    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#F8FAFC] pt-[72px] text-[#111827] transition-colors">
          <AppNavbar onDashboard={goToDashboard} />

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
      </ProtectedRoute>
    )
  }

  const renderSettingsFrame = () => (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#F8FAFC] pt-[72px] text-[#111827]">
        <AppNavbar onDashboard={goToDashboard} />
        <SettingsPage user={user} />
      </div>
    </ProtectedRoute>
  )

  const DashboardRoute = renderAppFrame()

  return (
    <>
      <Toaster position="top-right" />
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
    </>
  )
}

function extractInviteCode(value) {
  const trimmed = String(value || '').trim()

  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    const parts = parsed.pathname.split('/').filter(Boolean)
    return (parts[parts.length - 1] || '').toUpperCase()
  } catch {
    return trimmed.split('/').filter(Boolean).pop()?.toUpperCase() || trimmed.toUpperCase()
  }
}

function InviteWorkspacePage({ onOpenWorkspace }) {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadInvite = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/v1/workspaces/invite/${inviteCode}`)
      setWorkspace(data.workspace)
    } catch (error) {
      toast.error(error.message)
      navigate('/dashboard', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [inviteCode, navigate])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) loadInvite()
    })

    return () => {
      cancelled = true
    }
  }, [loadInvite])

  const requestAccess = async () => {
    setSubmitting(true)
    try {
      const { data } = await api.post(`/api/v1/workspaces/invite/${inviteCode}/request`, {})
      setWorkspace(data.workspace)
      toast.success('Access request sent')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pt-[72px] text-[#111827]">
        <AppNavbar onDashboard={() => navigate('/dashboard')} />
        <main className="mx-auto max-w-3xl px-5 py-10">
          <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-8 shadow-sm">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="mt-4 h-9 w-64" />
            <SkeletonBlock className="mt-4 h-16 w-full" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-20 w-full" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-[72px] text-[#111827]">
      <AppNavbar onDashboard={() => navigate('/dashboard')} />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-3xl items-center px-5 py-10">
        <section className="w-full rounded-[20px] border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-[#7C3AED]">Invite-only workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{workspace?.name}</h1>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">
            {workspace?.description || 'No description provided.'}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoTile label="Workspace ID" value={workspace?.workspaceId} />
            <InfoTile label="Members" value={String(workspace?.memberCount || 0)} />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="h-12 rounded-[14px] border border-[#E5E7EB] px-5 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
            >
              Back to Dashboard
            </button>
            {workspace?.isMember ? (
              <button
                type="button"
                onClick={() => onOpenWorkspace(workspace._id)}
                className="h-12 rounded-[14px] bg-[#7C3AED] px-5 text-sm font-semibold text-white transition hover:bg-[#6D28D9]"
              >
                Open Workspace
              </button>
            ) : (
              <button
                type="button"
                disabled={workspace?.hasPendingRequest || submitting}
                onClick={requestAccess}
                className="h-12 rounded-[14px] bg-[#7C3AED] px-5 text-sm font-semibold text-white transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:bg-[#C4B5FD]"
              >
                {workspace?.hasPendingRequest ? 'Request Pending' : submitting ? 'Sending...' : 'Request Access'}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-[16px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <p className="text-xs font-semibold uppercase text-[#9CA3AF]">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-[#111827]">{value || 'N/A'}</p>
    </div>
  )
}

function PublicRoute({ children, loading, authenticated, profileComplete }) {
  if (loading) {
    return children
  }

  if (!authenticated) return children
  return profileComplete ? <Navigate to="/dashboard" replace /> : <Navigate to="/complete-profile" replace />
}

function RootRoute({ loading, authenticated, profileComplete }) {
  if (loading) {
    return <LandingPage />
  }

  if (!authenticated) return <LandingPage />

  const lastPage = localStorage.getItem(LAST_PAGE_KEY)
  const blockedRestorePages = ['/', '/signin', '/signup', '/forgot-password', '/complete-profile']
  if (profileComplete && lastPage && !blockedRestorePages.includes(lastPage)) {
    return <Navigate to={lastPage} replace />
  }

  return profileComplete ? <Navigate to="/dashboard" replace /> : <Navigate to="/complete-profile" replace />
}

function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton-shimmer ${className}`} />
}

function WorkspaceLoadingShell({ activeItem = 'home', onBack }) {
  return (
    <WorkspaceLayout
      workspace={{ name: 'Workspace', members: [], owner: null }}
      activeItem={activeItem}
      onActiveItemChange={() => {}}
      onBackToDashboard={onBack}
      onLeaveWorkspace={() => {}}
      onDeleteWorkspace={() => {}}
    >
      <div className="teamora-content-fade">
        <WorkspaceContentSkeleton activeItem={activeItem} />
      </div>
    </WorkspaceLayout>
  )
}

function WorkspaceContentSkeleton({ activeItem }) {
  if (activeItem === 'whiteboard') {
    return (
      <section className="space-y-4">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-[520px] w-full rounded-[20px]" />
      </section>
    )
  }

  if (activeItem === 'spreadsheet') {
    return (
      <section className="space-y-4">
        <SkeletonBlock className="h-8 w-52" />
        <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-4">
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 36 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (activeItem === 'presentation') {
    return (
      <section className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-28 w-full" />
          ))}
        </div>
        <SkeletonBlock className="h-[460px] w-full rounded-[20px]" />
      </section>
    )
  }

  if (activeItem === 'documents') {
    return (
      <section className="space-y-4">
        <SkeletonBlock className="h-8 w-44" />
        <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6">
          <SkeletonBlock className="h-7 w-2/3" />
          <SkeletonBlock className="mt-5 h-4 w-full" />
          <SkeletonBlock className="mt-3 h-4 w-11/12" />
          <SkeletonBlock className="mt-3 h-4 w-10/12" />
          <SkeletonBlock className="mt-8 h-64 w-full" />
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div>
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="mt-3 h-8 w-64" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[20px] border border-[#E5E7EB] bg-white p-5">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="mt-4 h-4 w-full" />
            <SkeletonBlock className="mt-3 h-4 w-3/4" />
            <SkeletonBlock className="mt-6 h-10 w-32" />
          </div>
        ))}
      </div>
    </section>
  )
}

function WorkspaceRoute({ authenticated, activeWorkspace, fetchWorkspace, goToDashboard, renderAppFrame }) {
  const { id, section } = useParams()
  const navigate = useNavigate()
  const workspacePage = WORKSPACE_SECTIONS.has(section) ? section : 'home'

  useEffect(() => {
    if (!authenticated) return

    if (id && section && !WORKSPACE_SECTIONS.has(section)) {
      navigate(`/workspace/${id}`, { replace: true })
      return
    }

    if (id) {
      if (activeWorkspace?._id === id) return

      fetchWorkspace(id).catch((error) => {
        toast.error(error.message)
        goToDashboard()
      })
      return
    }

    const lastWorkspaceId = localStorage.getItem(LAST_WORKSPACE_KEY)

    if (lastWorkspaceId) {
      navigate(`/workspace/${lastWorkspaceId}`, { replace: true })
    } else {
      goToDashboard()
    }
  }, [id, section, authenticated, activeWorkspace?._id, fetchWorkspace, goToDashboard, navigate])

  const isCurrentWorkspaceLoaded = activeWorkspace?._id === id
  return renderAppFrame({ forceWorkspace: Boolean(id && !isCurrentWorkspaceLoaded), workspacePage })
}
