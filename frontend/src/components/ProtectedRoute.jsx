import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { authenticated, loading, profileComplete } = useAuth()
  const location = useLocation()

  if (loading) {
    return children
  }

  if (!authenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  if (!profileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }

  return children
}
