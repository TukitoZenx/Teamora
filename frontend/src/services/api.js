import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  config.headers.Accept = 'application/json'
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
