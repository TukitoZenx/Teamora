import { getApiBaseUrl } from './apiBaseUrl';

/**
 * Helper to fetch a stream from the API and yield chunks.
 * We bypass `api.js` interceptors here because we want raw streams
 * and standard fetch handles SSE easily.
 */
async function* fetchAiStream(endpoint, payload) {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    // We need credentials so the backend accepts our auth cookie
    credentials: 'include'
  });

  if (!response.ok) {
    let msg = 'Failed to connect to AI service.';
    try {
      const data = await response.json();
      if (data.message) msg = data.message;
    } catch (e) {
      // ignore
    }
    throw new Error(msg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunkStr = decoder.decode(value, { stream: true });
    const lines = chunkStr.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') break;
        if (!data) continue;
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          // Ignore incomplete JSON chunks from split network packets
          continue;
        }
        
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.chunk) {
          yield parsed.chunk;
        }
      }
    }
  }
}

export const getAutocompleteStream = (context) => {
  return fetchAiStream('/api/v1/ai/autocomplete', { context });
};

export const getCommandStream = (command, selectedText, fullText) => {
  return fetchAiStream('/api/v1/ai/command', { command, selectedText, fullText });
};

export const getGenerateStream = (prompt) => {
  return fetchAiStream('/api/v1/ai/generate', { prompt });
};

export const generateSlides = async (prompt) => {
  const url = `${getApiBaseUrl()}/api/v1/ai/generate-slides`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    credentials: 'include'
  });

  if (!response.ok) {
    let msg = 'Failed to generate slides.';
    try {
      const data = await response.json();
      if (data.message) msg = data.message;
    } catch (e) {
      // ignore
    }
    throw new Error(msg);
  }

  const data = await response.json();
  return data.slides; // JSON array of slides
};
