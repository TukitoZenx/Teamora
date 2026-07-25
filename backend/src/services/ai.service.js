const getEnv = (key, fallback = '') => process.env[key] || fallback;

const AI_PROVIDER = getEnv('AI_PROVIDER', 'ollama').toLowerCase();
const OLLAMA_MODEL = getEnv('OLLAMA_MODEL', 'llama3.2');
const OLLAMA_URL = getEnv('OLLAMA_URL', 'http://localhost:11434');

const getGeminiUrl = (model = 'gemini-2.5-flash', action = 'streamGenerateContent') => {
  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?alt=sse&key=${apiKey}`;
};

/**
 * Handles communication with Gemini API.
 */
async function* callGeminiStream(prompt, systemInstruction = null) {
  const url = getGeminiUrl();
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  };

  if (systemInstruction) {
    payload.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = `Gemini API failed: ${response.statusText}`;
    try {
      const p = await response.json();
      if (p.error?.message) errMsg = p.error.message;
    } catch {}
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.replace('data: ', '').trim();
        if (dataStr === '[DONE]') break;
        try {
          const parsed = JSON.parse(dataStr);
          const textPart = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textPart) yield textPart;
        } catch (e) {
          // ignore incomplete JSON chunks
        }
      }
    }
  }
}

/**
 * Handles communication with local Ollama API.
 */
async function* callOllamaStream(prompt, systemInstruction = null) {
  const url = `${OLLAMA_URL}/api/generate`;
  
  const payload = {
    model: OLLAMA_MODEL,
    prompt: prompt,
    system: systemInstruction || '',
    stream: true
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    throw new Error(`Failed to connect to Ollama at ${OLLAMA_URL}. Is it running?`);
  }

  if (!response.ok) {
    let errMsg = `Ollama API failed: ${response.statusText}`;
    try {
      const p = await response.json();
      if (p.error) errMsg = p.error;
    } catch {}
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(Boolean);
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.response) {
          yield parsed.response;
        }
      } catch (e) {
        // ignore incomplete JSON chunks
      }
    }
  }
}

/**
 * Routes to the configured provider
 */
async function* callAiStream(prompt, systemInstruction = null) {
  if (AI_PROVIDER === 'gemini') {
    yield* callGeminiStream(prompt, systemInstruction);
  } else {
    yield* callOllamaStream(prompt, systemInstruction);
  }
}

/**
 * Service to orchestrate AI tasks
 */
const AiService = {
  autocomplete: async function* (contextText) {
    const system = `You are an intelligent writing assistant embedded in a document editor.
The user is currently typing a document. Complete their sentence logically, matching their tone and style.
Do not provide multiple options. Do not include quotes. ONLY reply with the exact text that should follow what they typed, nothing else. Do not rewrite their input.`;

    // Limit context size for performance
    const maxContext = contextText.slice(-1000);
    const prompt = `Here is the current text (cursor is at the very end):\n\n${maxContext}`;
    
    yield* callAiStream(prompt, system);
  },

  executeCommand: async function* (command, selectedText, fullDocumentText) {
    const system = `You are an AI editor assistant. You perform actions on text selected by the user.
Reply ONLY with the updated text. Do not wrap in quotes or add conversational filler.`;

    let instruction = '';
    switch (command) {
      case 'rewrite': instruction = 'Rewrite this text to flow better.'; break;
      case 'professional': instruction = 'Rewrite this text to be highly professional and formal.'; break;
      case 'shorter': instruction = 'Make this text more concise.'; break;
      case 'expand': instruction = 'Expand on this text with more detail.'; break;
      case 'grammar': instruction = 'Fix all grammar and spelling errors without changing the meaning.'; break;
      case 'ideas': instruction = 'Generate 3 bulleted ideas expanding on this thought.'; break;
      case 'summarize': instruction = 'Provide a brief summary of this text.'; break;
      default: instruction = 'Process this text: ' + command;
    }

    // Limit full document size to save memory/processing for local models
    const maxFullText = fullDocumentText.slice(0, 2000);
    const prompt = `Command: ${instruction}\n\nSelected Text:\n${selectedText}\n\n(For context only, here is the document snippet:\n${maxFullText})`;

    yield* callAiStream(prompt, system);
  },

  generateDocument: async function* (promptText) {
    const system = `You are an AI document creator. The user will ask for a document. 
Generate a well-structured document using markdown (headers, bullet points). 
Do not include conversational filler like "Here is your document". Just output the document itself.`;

    const prompt = `Create a document based on this request:\n\n${promptText}`;
    
    yield* callAiStream(prompt, system);
  },

  generateSlides: async function (promptText) {
    const system = `You are an expert presentation generator. 
The user will provide a topic. Generate a structured presentation.
Return ONLY valid JSON.
The JSON must be an array of objects.
Each object represents a slide and MUST have these exact keys:
- "title": A concise title for the slide (string)
- "content": A markdown string representing the slide body (use bullet points, short paragraphs) (string)
- "notes": Speaker notes for the slide (string)

Do NOT wrap the JSON in markdown blocks like \`\`\`json. Just output the raw JSON array. Start with [ and end with ].`;

    const prompt = `Topic for presentation: ${promptText}\n\nPlease generate 5-8 slides.`;
    
    let fullJson = '';
    for await (const chunk of callAiStream(prompt, system)) {
      fullJson += chunk;
    }
    
    // Clean up potential markdown formatting that Ollama sometimes adds even when told not to
    fullJson = fullJson.trim();
    if (fullJson.startsWith('```json')) {
      fullJson = fullJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (fullJson.startsWith('```')) {
      fullJson = fullJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    return fullJson.trim();
  },

  generateSpreadsheet: async function (promptText, mode) {
    let system = '';
    let prompt = '';
    
    if (mode === 'formula') {
      system = `You are an expert spreadsheet formula generator.
The user will describe a calculation.
Return ONLY the raw formula starting with = (e.g. =SUM(A1:B2)).
Do NOT wrap the formula in markdown blocks or quotes. Just output the formula text.`;
      prompt = `Description: ${promptText}\n\nPlease provide the formula.`;
    } else {
      system = `You are an expert spreadsheet data generator.
The user will describe the data they want.
Generate realistic sample data based on the prompt.
Return ONLY valid JSON.
The JSON must be an array of arrays of strings. Each inner array represents a row of data.
Example: [["Name", "Age"], ["Alice", "30"], ["Bob", "25"]]
Do NOT wrap the JSON in markdown blocks like \`\`\`json. Just output the raw JSON array. Start with [ and end with ].`;
      prompt = `Data description: ${promptText}\n\nPlease provide the data as a JSON array of arrays.`;
    }

    let fullOutput = '';
    for await (const chunk of callAiStream(prompt, system)) {
      fullOutput += chunk;
    }
    
    fullOutput = fullOutput.trim();
    if (mode === 'data') {
      if (fullOutput.startsWith('```json')) {
        fullOutput = fullOutput.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (fullOutput.startsWith('```')) {
        fullOutput = fullOutput.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(fullOutput.trim());
    }
    
    // For formula, just return the text
    // Ensure it starts with '='
    if (!fullOutput.startsWith('=')) {
      if (fullOutput.startsWith('"') && fullOutput.endsWith('"')) {
        fullOutput = fullOutput.slice(1, -1);
      }
      if (!fullOutput.startsWith('=')) {
        fullOutput = '=' + fullOutput;
      }
    }
    return fullOutput.trim();
  },

  generateTasks: async function (promptText) {
    const system = `You are an expert project manager AI. 
The user will provide unstructured text (meeting notes, chat logs).
Extract all action items and tasks from the text.
Return ONLY valid JSON.
The JSON must be an array of objects.
Each object must have these exact keys:
- "title": A concise title for the task (string)
- "description": A slightly longer description or context (string)
- "assignee": The person assigned to it, or "" if unassigned (string)
- "deadline": The due date in YYYY-MM-DD format if mentioned, or "" if not (string)
- "priority": One of "Low", "Medium", "High", or "Urgent" (string)

Do NOT wrap the JSON in markdown blocks like \`\`\`json. Just output the raw JSON array. Start with [ and end with ].`;

    const prompt = `Unstructured Text:\n${promptText}\n\nPlease extract the tasks into the JSON array.`;
    
    let fullJson = '';
    for await (const chunk of callAiStream(prompt, system)) {
      fullJson += chunk;
    }
    
    fullJson = fullJson.trim();
    if (fullJson.startsWith('```json')) {
      fullJson = fullJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (fullJson.startsWith('```')) {
      fullJson = fullJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    return JSON.parse(fullJson.trim());
  }
};

module.exports = AiService;
