import { useSession } from '../../../contexts/AuthContext'

export function useAuth() {// custom hook to access the authentication context 
  return useSession()// 
}

export default useAuth// import and export the useAuth hook for use in other components
