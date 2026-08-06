import { getApiBaseUrl } from './apiBaseUrl'
import { ensureCsrfToken, getCsrfToken, setCsrfToken } from './api'

/**
 * Authenticated fetch for AI routes.
 * Raw fetch is used for streaming; axios interceptors do not run here, so we
 * must attach the CSRF synchronizer header ourselves.
 */
export async function aiFetch(endpoint, { method = 'POST', body, headers: extraHeaders } = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${getApiBaseUrl()}${endpoint}`
  const methodUpper = String(method || 'GET').toUpperCase()
  const headers = {
    Accept: 'application/json',
    ...(extraHeaders || {})
  }

  if (body != null && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(methodUpper)) {
    let token = getCsrfToken()
    if (!token) {
      token = await ensureCsrfToken()
    }
    if (token) {
      headers['X-XSRF-TOKEN'] = token
    }
  }

  const response = await fetch(url, {
    method: methodUpper,
    headers,
    body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    credentials: 'include'
  })

  // Capture rotated tokens if the API ever returns them on AI routes.
  try {
    const maybeToken = response.headers.get('x-csrf-token')
    if (maybeToken) setCsrfToken(maybeToken)
  } catch {
    // ignore
  }

  return response
}

const readErrorMessage = async (response, fallback) => {
  let msg = fallback
  try {
    const data = await response.json()
    if (data?.message) msg = data.message
    else if (data?.error) msg = data.error
  } catch {
    // ignore non-JSON error bodies
  }
  return msg
}

/**
 * Helper to fetch a stream from the API and yield chunks.
 */
async function* fetchAiStream(endpoint, payload) {
  const response = await aiFetch(endpoint, {
    method: 'POST',
    body: payload
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to connect to AI service.'))
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunkStr = decoder.decode(value, { stream: true })
    const lines = chunkStr.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.replace('data: ', '').trim()
        if (data === '[DONE]') break
        if (!data) continue
        let parsed
        try {
          parsed = JSON.parse(data)
        } catch {
          // Ignore incomplete JSON chunks from split network packets
          continue
        }

        if (parsed.error) {
          throw new Error(parsed.error)
        }
        if (parsed.chunk) {
          yield parsed.chunk
        }
      }
    }
  }
}

export const getAutocompleteStream = (context) => {
  return fetchAiStream('/api/v1/ai/autocomplete', { context })
}

export const getCommandStream = (command, selectedText, fullText) => {
  return fetchAiStream('/api/v1/ai/command', { command, selectedText, fullText })
}

export const getGenerateStream = (prompt) => {
  return fetchAiStream('/api/v1/ai/generate', { prompt })
}

export const generateSlides = async (prompt) => {
  const response = await aiFetch('/api/v1/ai/generate-slides', {
    method: 'POST',
    body: { prompt }
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to generate slides.'))
  }

  const data = await response.json()
  return data.slides // JSON array of slides
}

export const generateSpreadsheet = async (prompt, mode) => {
  const response = await aiFetch('/api/v1/ai/generate-spreadsheet', {
    method: 'POST',
    body: { prompt, mode }
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to generate content.'))
  }

  return response.json()
}

export const generateTasks = async (prompt, workspaceId) => {
  const response = await aiFetch('/api/v1/ai/generate-tasks', {
    method: 'POST',
    body: { prompt, workspaceId }
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to generate tasks.'))
  }

  return response.json()
}
