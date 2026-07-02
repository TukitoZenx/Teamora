import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
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
import TeamoraLoader from './features/auth/components/TeamoraLoader'
import api from './services/api'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { user, loading, authenticated, profileComplete } = useAuth()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspace, setActiveWorkspace] = useState(null)
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

    try {
      const { data } = await api.get('/api/v1/workspaces')
      setWorkspaces(data.workspaces || [])
    } catch (error) {
      setAuthNotice(error.message)
      setWorkspaces([])
    }
  }, [])

  useEffect(() => {
    if (user && profileComplete) {
      loadWorkspaces()
    } else {
      setWorkspaces([])
      setActiveWorkspace(null)
    }
  }, [user, profileComplete, loadWorkspaces])

  const createWorkspace = async (payload) => {
    const { data } = await api.post('/api/v1/workspaces', payload)

    setWorkspaces((current) => [data.workspace, ...current])
    setActiveWorkspace(data.workspace)
    localStorage.setItem('teamora-last-workspace-id', data.workspace._id)
    navigate(`/workspace/${data.workspace._id}`)
    toast.success('Workspace created')
  }

  const joinWorkspace = async (inviteCode) => {
    const { data } = await api.post('/api/v1/workspaces/join', { inviteCode })

    setWorkspaces((current) => {
      const withoutDuplicate = current.filter((workspace) => workspace._id !== data.workspace._id)
      return [data.workspace, ...withoutDuplicate]
    })
    setActiveWorkspace(data.workspace)
    localStorage.setItem('teamora-last-workspace-id', data.workspace._id)
    navigate(`/workspace/${data.workspace._id}`)
    toast.success('Workspace joined')
  }

  const updateWorkspace = async (workspaceId, payload) => {
    const { data } = await api.put(`/api/v1/workspaces/${workspaceId}`, payload)

    setWorkspaces((current) => current.map((workspace) => (workspace._id === workspaceId ? data.workspace : workspace)))
    setActiveWorkspace((current) => (current?._id === workspaceId ? data.workspace : current))
    toast.success('Workspace updated')
    return data.workspace
  }

  const deleteWorkspace = async (workspaceId) => {
    await api.delete(`/api/v1/workspaces/${workspaceId}`)

    setWorkspaces((current) => current.filter((workspace) => workspace._id !== workspaceId))
    setActiveWorkspace((current) => (current?._id === workspaceId ? null : current))
    if (localStorage.getItem('teamora-last-workspace-id') === workspaceId) {
      localStorage.removeItem('teamora-last-workspace-id')
    }
    toast.success('Workspace deleted')
  }

  const fetchWorkspace = useCallback(async (workspaceId) => {
    setWorkspaceLoading(true)
    try {
      const { data } = await api.get(`/api/v1/workspaces/${workspaceId}`)
      setActiveWorkspace(data.workspace)
      localStorage.setItem('teamora-last-workspace-id', data.workspace._id)
      return data.workspace
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  const openWorkspace = useCallback(async (workspaceId) => {
    navigate(`/workspace/${workspaceId}`)
  }, [navigate])

  const goToDashboard = useCallback(() => {
    setActiveWorkspace(null)
    navigate('/dashboard')
  }, [navigate])

  const renderAppFrame = ({ forceWorkspace = false } = {}) => {
    const currentWorkspace = forceWorkspace ? null : activeWorkspace

    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#F8FAFC] pt-[72px] text-[#111827] transition-colors">
        <AppNavbar onDashboard={goToDashboard} />

        {currentWorkspace ? (
          <WorkspaceHome
            workspace={currentWorkspace}
            currentUserName={displayName}
            onBack={goToDashboard}
            onRefresh={async () => {
              await fetchWorkspace(currentWorkspace._id)
              await loadWorkspaces()
            }}
          />
        ) : workspaceLoading || forceWorkspace ? (
          null
        ) : (
          <Dashboard
            user={user}
            displayName={displayName}
            workspaces={workspaces}
            authNotice={authNotice}
            onCreateWorkspace={createWorkspace}
            onJoinWorkspace={joinWorkspace}
            onOpenWorkspace={openWorkspace}
            onUpdateWorkspace={updateWorkspace}
            onDeleteWorkspace={deleteWorkspace}
            onRefresh={loadWorkspaces}
          />
        )}
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<PublicRoute loading={loading} authenticated={authenticated} profileComplete={profileComplete}><AuthPage mode="signin" /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute loading={loading} authenticated={authenticated} profileComplete={profileComplete}><AuthPage mode="signup" /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute loading={loading} authenticated={authenticated} profileComplete={profileComplete}><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<PublicRoute loading={loading} authenticated={authenticated} profileComplete={profileComplete}><ResetPasswordPage /></PublicRoute>} />
        <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
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
        <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/'} replace />} />
      </Routes>
    </>
  )
}

function PublicRoute({ children, loading, authenticated, profileComplete }) {
  if (loading) {
    return <TeamoraLoader />
  }

  if (!authenticated) return children
  return profileComplete ? <Navigate to="/dashboard" replace /> : <Navigate to="/complete-profile" replace />
}

function WorkspaceRoute({ authenticated, activeWorkspace, fetchWorkspace, goToDashboard, renderAppFrame }) {
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authenticated) return

    if (id) {
      if (activeWorkspace?._id === id) return

      fetchWorkspace(id).catch((error) => {
        toast.error(error.message)
        goToDashboard()
      })
      return
    }

    const lastWorkspaceId = localStorage.getItem('teamora-last-workspace-id')

    if (lastWorkspaceId) {
      navigate(`/workspace/${lastWorkspaceId}`, { replace: true })
    } else {
      goToDashboard()
    }
  }, [id, authenticated, activeWorkspace?._id, fetchWorkspace, goToDashboard, navigate])

  const isCurrentWorkspaceLoaded = activeWorkspace?._id === id
  return renderAppFrame({ forceWorkspace: Boolean(id && !isCurrentWorkspaceLoaded) })
}
