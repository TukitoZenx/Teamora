import api from '../../../services/api'

const extractUser = (data) => data?.user || null

export const register = async (payload) => {
  const { data } = await api.post('/api/auth/register', payload)
  return extractUser(data)
}

export const login = async (payload) => {
  const { data } = await api.post('/api/auth/login', payload)
  return extractUser(data)
}

export const logout = async () => {
  await api.post('/api/auth/logout')
}

export const getCurrentUser = async () => {
  const { data } = await api.get('/api/auth/me')
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
