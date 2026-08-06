const { GoogleGenAI } = require('@google/genai');

const getEnv = (key, fallback = '') => process.env[key] || fallback;

let aiClientInstance = null;

function getAiClient() {
  if (!aiClientInstance) {
    const apiKey = getEnv('GEMINI_API_KEY');
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === '<gemini-api-key>') {
      throw new Error('GEMINI_API_KEY is not validly configured on the server. Please check your .env file.');
    }
    aiClientInstance = new GoogleGenAI({ apiKey });
  }
  return aiClientInstance;
}

/**
 * Handles communication with Gemini API using the official SDK.
 */
async function* callAiStream(prompt, systemInstruction = null) {
  const client = getAiClient();
  const config = {};

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  try {
    const responseStream = await client.models.generateContentStream({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: config
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    throw new Error(`Gemini API failed: ${error.message}`);
  }
}

/**
 * Service to orchestrate AI tasks
 */
const clampText = (value, max) => String(value ?? '').slice(0, max);

const ALLOWED_COMMANDS = new Set(['rewrite', 'professional', 'shorter', 'expand', 'grammar', 'ideas', 'summarize']);

const AiService = {
  autocomplete: async function* (contextText) {
    const system = `You are an intelligent writing assistant embedded in a document editor.
The user is currently typing a document. Complete their sentence logically, matching their tone and style.
Do not provide multiple options. Do not include quotes. ONLY reply with the exact text that should follow what they typed, nothing else. Do not rewrite their input.`;

    // Limit context size for performance + prompt injection surface
    const maxContext = clampText(contextText, 1000).slice(-1000);
    const prompt = `Here is the current text (cursor is at the very end):\n\n${maxContext}`;

    yield* callAiStream(prompt, system);
  },

  executeCommand: async function* (command, selectedText, fullDocumentText) {
    const system = `You are an AI editor assistant. You perform actions on text selected by the user.
Reply ONLY with the updated text. Do not wrap in quotes or add conversational filler.`;

    const safeCommand = ALLOWED_COMMANDS.has(command) ? command : 'rewrite';
    let instruction = '';
    switch (safeCommand) {
      case 'rewrite':
        instruction = 'Rewrite this text to flow better.';
        break;
      case 'professional':
        instruction = 'Rewrite this text to be highly professional and formal.';
        break;
      case 'shorter':
        instruction = 'Make this text more concise.';
        break;
      case 'expand':
        instruction = 'Expand on this text with more detail.';
        break;
      case 'grammar':
        instruction = 'Fix all grammar and spelling errors without changing the meaning.';
        break;
      case 'ideas':
        instruction = 'Generate 3 bulleted ideas expanding on this thought.';
        break;
      case 'summarize':
        instruction = 'Provide a brief summary of this text.';
        break;
      default:
        instruction = 'Rewrite this text to flow better.';
    }

    const maxFullText = clampText(fullDocumentText, 2000);
    const maxSelected = clampText(selectedText, 4000);
    const prompt = `Command: ${instruction}\n\nSelected Text:\n${maxSelected}\n\n(For context only, here is the document snippet:\n${maxFullText})`;

    yield* callAiStream(prompt, system);
  },

  generateDocument: async function* (promptText) {
    const system = `You are an AI document creator. The user will ask for a document. 
Generate a well-structured document using markdown (headers, bullet points). 
If the user asks to generate or include an image, output a markdown image using the Pollinations AI API format:
![Alt Text](https://image.pollinations.ai/prompt/{URL_ENCODED_IMAGE_PROMPT}?width=800&height=400&nologo=true)
Do not include conversational filler like "Here is your document". Just output the document itself.`;

    const prompt = `Create a document based on this request:\n\n${clampText(promptText, 4000)}`;

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

    const prompt = `Topic for presentation: ${clampText(promptText, 2000)}\n\nPlease generate 5-8 slides.`;

    let fullJson = '';
    for await (const chunk of callAiStream(prompt, system)) {
      fullJson += chunk;
    }

    // Clean up potential markdown formatting
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
      prompt = `Description: ${clampText(promptText, 1000)}\n\nPlease provide the formula.`;
    } else {
      system = `You are an expert spreadsheet data generator.
The user will describe the data they want.
Generate realistic sample data based on the prompt.
Return ONLY valid JSON.
The JSON must be an array of arrays of strings. Each inner array represents a row of data.
Example: [["Name", "Age"], ["Alice", "30"], ["Bob", "25"]]
Do NOT wrap the JSON in markdown blocks like \`\`\`json. Just output the raw JSON array. Start with [ and end with ].`;
      prompt = `Data description: ${clampText(promptText, 2000)}\n\nPlease provide the data as a JSON array of arrays.`;
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

    const prompt = `Unstructured Text:\n${clampText(promptText, 4000)}\n\nPlease extract the tasks into the JSON array.`;

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
