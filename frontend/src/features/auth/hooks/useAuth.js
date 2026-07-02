import { useSession } from '../../../contexts/AuthContext'

export function useAuth() {
  return useSession()
}

export default useAuth
