import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import TeamoraLoader from '../features/auth/components/TeamoraLoader'

export default function ProtectedRoute({ children }) {
  const { authenticated, loading, profileComplete } = useAuth()
  const location = useLocation()

  if (loading) {
    return <TeamoraLoader />
  }

  if (!authenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  if (!profileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }

  return children
}
