import { useSession } from '../../../contexts/AuthContext'

export function useAuth() {// custom hook to access the authentication context 
  return useSession()// useSession what it does ? ans : it returns the value of the context give an example in the json format {user: {id: 1, name: 'John Doe', email: [EMAIL_ADDRESS]'}, loading: false, isAuthenticated: true, login: [Function: login], logout: [Function: logout], register: [Function: register], refreshUser: [Function: refreshUser], fetchCurrentUser: [Function: fetchCurrentUser], clearSession: [Function: clearSession]}
}

export default useAuth// import and export the useAuth hook for use in other components
