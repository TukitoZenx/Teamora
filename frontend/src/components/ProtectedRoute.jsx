import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import BrandLoadingScreen from './ui/BrandLoadingScreen'

export default function ProtectedRoute({ children }) {
  const { authenticated, loading, profileComplete } = useAuth()
  const location = useLocation()

  // Never render protected UI until the session check finishes — otherwise
  // dashboard/workspace chrome can flash for unauthenticated visitors.
  if (loading) {
    return <BrandLoadingScreen message="Checking your session…" />
  }

  if (!authenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  if (!profileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }

  return children
}
