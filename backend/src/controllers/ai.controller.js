const AiService = require('../services/ai.service');

const setSseHeaders = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Establish SSE with client
};

const handleStream = async (res, generator) => {
  setSseHeaders(res);
  try {
    for await (const chunk of generator) {
      // Send data wrapped as a JSON payload to easily parse on client
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('AI Stream Error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'AI generation failed' })}\n\n`);
  } finally {
    res.end();
  }
};

const autocomplete = async (req, res) => {
  const { context } = req.body;
  if (!context) {
    return res.status(400).json({ success: false, message: 'Context is required' });
  }
  await handleStream(res, AiService.autocomplete(context));
};

const executeCommand = async (req, res) => {
  const { command, selectedText, fullText } = req.body;
  if (!command || !selectedText) {
    return res.status(400).json({ success: false, message: 'Command and selectedText are required' });
  }
  await handleStream(res, AiService.executeCommand(command, selectedText, fullText || ''));
};

const generateDocument = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }
  await handleStream(res, AiService.generateDocument(prompt));
};

module.exports = {
  autocomplete,
  executeCommand,
  generateDocument
};
