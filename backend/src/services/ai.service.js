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
    const system = `You are a professional editor inside Teamora's document editor.
Operate ONLY on the selected text. Reply with the replacement text only.
Do not wrap the answer in quotes, markdown fences, or conversational filler such as "Here is".
Preserve names, numbers, and facts unless the command requires changing them.
If the command asks for a specific count (e.g. three advantages), produce exactly that count.
Use Markdown headings, lists, or tables only when they make the result more usable in a document.`;

    const safeCommand = ALLOWED_COMMANDS.has(command) ? command : 'rewrite';
    let instruction = '';
    switch (safeCommand) {
      case 'rewrite':
        instruction =
          'Rewrite the selected text so it flows clearly and professionally. Keep the same meaning, length band, and point of view.';
        break;
      case 'professional':
        instruction =
          'Rewrite the selected text in a formal workplace tone. Remove slang and filler. Keep the same facts.';
        break;
      case 'shorter':
        instruction =
          'Shorten the selected text by about 40% while keeping every essential fact. Do not add new ideas.';
        break;
      case 'expand':
        instruction =
          'Expand the selected text with concrete detail, examples, or reasoning. If the surrounding context implies a count (e.g. three advantages), honor that count. Do not repeat the same idea.';
        break;
      case 'grammar':
        instruction = 'Fix grammar, spelling, and punctuation only. Do not change meaning, tone, or structure.';
        break;
      case 'ideas':
        instruction = 'Produce exactly 3 distinct, useful bullet ideas that extend the selected thought.';
        break;
      case 'summarize':
        instruction = 'Summarize the selected text in 3–6 concise sentences. Do not introduce new claims.';
        break;
      default:
        instruction = 'Rewrite the selected text so it flows clearly.';
    }

    const maxFullText = clampText(fullDocumentText, 3000);
    const maxSelected = clampText(selectedText, 6000);
    const prompt = `COMMAND: ${instruction}

SELECTED TEXT (replace this entire selection):
${maxSelected}

SURROUNDING DOCUMENT (context only — do not rewrite unless it appears in the selection):
${maxFullText}`;

    yield* callAiStream(prompt, system);
  },

  generateDocument: async function* (promptText, options = {}) {
    const selectedText = clampText(options.selectedText, 6000);
    const documentContext = clampText(options.documentContext, 4000);
    const mode = String(options.mode || '').toLowerCase();

    const system = `You are a professional workplace document writer embedded in Teamora.

Follow the user's instruction exactly:
- Honor the requested topic, audience, tone, structure, length, and format.
- If they ask for approximately N words, produce roughly that length (within about 15%).
- If they ask for N sections, advantages, steps, or bullets, produce exactly that count.
- Write logically structured, non-repetitive content. Avoid generic filler and clichés.
- Output clean Markdown that can be pasted into a document: headings, paragraphs, lists, and tables when useful.
- Do not include conversational wrapper text such as "Here is your document" or "Sure".
- Do not invent a title unless the user asked for one or a full document.
- If an image is requested, emit: ![Alt](https://image.pollinations.ai/prompt/{URL_ENCODED_PROMPT}?width=800&height=400&nologo=true)

When selected text or document context is provided:
- Treat the selected text as the primary source for rewrite / expand / shorten / summarize / continue / transform.
- Change only what the instruction asks. Do not replace unrelated document content.
- For "continue", pick up from the end without repeating.
- Preserve formatting intent (lists stay lists, headings stay headings) unless asked to change it.`;

    let prompt = `USER REQUEST:\n${clampText(promptText, 4000)}\n`;
    if (mode) {
      prompt += `\nREQUESTED OPERATION: ${mode}\n`;
    }
    if (selectedText) {
      prompt += `\nSELECTED CONTENT (this is the material to operate on):\n${selectedText}\n`;
    }
    if (documentContext) {
      prompt += `\nSURROUNDING DOCUMENT CONTEXT (for continuity only):\n${documentContext}\n`;
    }
    prompt += selectedText
      ? `\nReturn only the resulting content for the selection / requested insertion.`
      : `\nWrite the requested document content now.`;

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
