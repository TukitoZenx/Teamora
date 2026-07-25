import axios from 'axios'
import { getApiBaseUrl } from './apiBaseUrl'
// whhy this file is imported ? ans : this file is imported to get the base URL for the API endpoints
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

/** Subscribers notified on HTTP 401 so AuthProvider can clear session. */
const unauthorizedListeners = new Set()

export const onUnauthorized = (listener) => {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

const emitUnauthorized = () => {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // Listener errors must not break the interceptor chain.
    }
  })
}

api.interceptors.request.use((config) => {
  config.headers.Accept = 'application/json'
  
  const method = config.method ? config.method.toUpperCase() : ''
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && config.data === undefined) {
    config.data = {}
  }

  // Prevent forcing application/json if sending FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  } else {
    config.headers['Content-Type'] = 'application/json'
  }

  config.withCredentials = true
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const networkError = new Error(
        error.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : 'Server unavailable. Please try again.'
      )
      networkError.status = 0
      networkError.code = error.code
      return Promise.reject(networkError)
    }

    const status = error.response.status
    if (status === 401) {
      const url = String(error.config?.url || '')
      // Don't thrash session clear during login/register/me bootstrap.
      const isAuthBootstrap = /\/api\/auth\/(login|register|me|google)/.test(url)
      if (!isAuthBootstrap) {
        emitUnauthorized()
      }
    }

    const message = error.response.data?.message || 'Something went wrong. Please try again.'
    const apiError = new Error(message)
    apiError.status = status
    return Promise.reject(apiError)
  }
)

export default api
