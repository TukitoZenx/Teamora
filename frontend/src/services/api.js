import axios from 'axios'
import { getApiBaseUrl } from './apiBaseUrl'

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  config.headers.Accept = 'application/json'
  config.headers['Content-Type'] = 'application/json'

  const method = config.method ? config.method.toUpperCase() : ''
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && config.data === undefined) {
    config.data = {}
  }

  config.withCredentials = true
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const networkError = new Error('Server unavailable. Please try again.')
      networkError.status = 0
      return Promise.reject(networkError)
    }

    const message = error.response.data?.message || 'Something went wrong. Please try again.'
    const apiError = new Error(message)
    apiError.status = error.response.status
    return Promise.reject(apiError)
  }
)

export default api
