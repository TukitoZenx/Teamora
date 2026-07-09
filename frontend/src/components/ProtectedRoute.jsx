import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function AuthLoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-muted border-t-primary" />
        <p className="text-sm font-medium text-muted">Checking your session…</p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children }) {
  const { authenticated, loading, profileComplete } = useAuth()
  const location = useLocation()

  // Never render protected UI until the session check finishes — otherwise
  // dashboard/workspace chrome can flash for unauthenticated visitors.
  if (loading) {
    return <AuthLoadingShell />
  }

  if (!authenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  if (!profileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }

  return children
}
