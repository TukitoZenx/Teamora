import { useSession } from '../../../contexts/AuthContext'

/** Auth session hook backed by AuthContext. */
export function useAuth() {
  return useSession()
}

export default useAuth
