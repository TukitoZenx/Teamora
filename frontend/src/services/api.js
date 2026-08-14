import axios from 'axios'
import { getApiBaseUrl } from './apiBaseUrl'

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  // Bound hung requests so the UI can recover with a clear timeout message.
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30_000,
  headers: {
    'Content-Type': 'application/json'
  }
})

/** In-memory CSRF token (session-backed synchronizer; also mirrored in XSRF-TOKEN cookie). */
let csrfTokenMemory = null

const readCookie = (name) => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&')}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export const setCsrfToken = (token) => {
  if (typeof token === 'string' && token) {
    csrfTokenMemory = token
  }
}

export const clearCsrfToken = () => {
  csrfTokenMemory = null
}

export const getCsrfToken = () => csrfTokenMemory || readCookie('XSRF-TOKEN') || null

/** Fetch CSRF token when cookie is not readable (cross-origin API). */
let csrfBootstrap = null
const fetchCsrfToken = () =>
  api.get('/api/auth/csrf').then(({ data }) => {
    if (data?.csrfToken) setCsrfToken(data.csrfToken)
    return getCsrfToken()
  })

export const ensureCsrfToken = async ({ force = false } = {}) => {
  if (!force) {
    const existing = getCsrfToken()
    if (existing) return existing
  }
  if (!csrfBootstrap) {
    csrfBootstrap = fetchCsrfToken()
      .catch(() => null)
      .finally(() => {
        csrfBootstrap = null
      })
  }
  return csrfBootstrap
}

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

const newClientRequestId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    }
  } catch {
    // fall through
  }
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

api.interceptors.request.use(async (config) => {
  config.headers.Accept = 'application/json'
  // Correlate browser network errors with backend access/error logs.
  if (!config.headers['X-Request-Id']) {
    config.headers['X-Request-Id'] = newClientRequestId()
  }

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

  // Attach CSRF token on all mutating requests.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    let token = getCsrfToken()
    if (!token && !String(config.url || '').includes('/api/auth/csrf')) {
      token = await ensureCsrfToken()
    }
    if (token) {
      config.headers['X-XSRF-TOKEN'] = token
    }
  }

  config.withCredentials = true
  return config
})

api.interceptors.response.use(
  (response) => {
    // Capture rotated tokens from login/register/me/csrf responses.
    if (response?.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken)
    }
    return response
  },
  (error) => {
    const requestId =
      error.response?.headers?.['x-request-id'] ||
      error.response?.data?.requestId ||
      error.config?.headers?.['X-Request-Id']

    if (!error.response) {
      const networkError = new Error(
        error.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : 'Server unavailable. Please try again.'
      )
      networkError.status = 0
      networkError.code = error.code
      networkError.requestId = requestId
      return Promise.reject(networkError)
    }

    const status = error.response.status
    if (error.response.data?.csrfToken) {
      setCsrfToken(error.response.data.csrfToken)
    }

    if (status === 401) {
      const url = String(error.config?.url || '')
      // Don't thrash session clear during login/register/me bootstrap.
      const isAuthBootstrap = /\/api\/auth\/(login|register|me|google|csrf)/.test(url)
      if (!isAuthBootstrap) {
        emitUnauthorized()
      }
    }

    const csrfFailed =
      status === 403 && /csrf/i.test(String(error.response.data?.message || error.response.data?.error || ''))
    if (csrfFailed && error.config && !error.config.__csrfRetry) {
      clearCsrfToken()
      return ensureCsrfToken({ force: true }).then((token) => {
        if (!token) {
          const csrfError = new Error(error.response.data?.message || 'Invalid CSRF token')
          csrfError.status = 403
          csrfError.response = error.response
          csrfError.requestId = requestId
          return Promise.reject(csrfError)
        }
        const retryConfig = { ...error.config, __csrfRetry: true }
        retryConfig.headers = { ...(error.config.headers || {}), 'X-XSRF-TOKEN': token }
        return api.request(retryConfig)
      })
    }

    const message =
      error.response.data?.message || error.response.data?.error || 'Something went wrong. Please try again.'
    const apiError = new Error(message)
    apiError.status = status
    apiError.response = error.response
    apiError.requestId = requestId
    return Promise.reject(apiError)
  }
)

export default api
