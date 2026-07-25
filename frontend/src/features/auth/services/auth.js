import api from '../../../services/api'
//why this file is imported ? ans : this file is imported to use the api instance for making HTTP requests to the backend server
const extractUser = (data) => data?.user || null
//where the data come from 
export const register = async (payload) => {
  const { data } = await api.post('/api/auth/register', payload)
  return extractUser(data)
}

export const login = async (payload) => {
  const { data } = await api.post('/api/auth/login', payload)
  return extractUser(data)
}

export const logout = async () => {
  await api.post('/api/auth/logout', {})
}

export const getCurrentUser = async () => {
  // Cap wait so a cold/unreachable API cannot leave the app on a spinner forever.
  const { data } = await api.get('/api/auth/me', { timeout: 8000 })
  return extractUser(data)
}

export const checkEmailAvailability = async (email) => {
  const { data } = await api.post('/api/auth/check-email', { email })
  return data
}

export const completeProfile = async (payload) => {
  const { data } = await api.patch('/api/auth/profile', payload)
  return extractUser(data)
}

export const forgotPassword = async (email) => {
  const { data } = await api.post('/api/auth/forgot-password', { email })
  return data
}

export const resetPassword = async ({ token, password }) => {
  const { data } = await api.post(`/api/auth/reset-password/${encodeURIComponent(token)}`, { password })
  return data
}

export const getGoogleAuthUrl = () => {
  const baseURL = api.defaults.baseURL || ''
  return `${baseURL.replace(/\/$/, '')}/api/auth/google`
}
