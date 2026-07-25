const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth.middleware');
const aiController = require('../controllers/ai.controller');

const router = express.Router();

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 AI requests per 15 minutes per IP
  message: { success: false, message: 'Too many AI requests. Please slow down.' }
});

router.use(requireAuth);
router.use(aiRateLimiter);

router.post('/autocomplete', aiController.autocomplete);
router.post('/command', aiController.executeCommand);
router.post('/generate', aiController.generateDocument);
router.post('/generate-slides', aiController.generateSlides);
router.post('/generate-spreadsheet', aiController.generateSpreadsheet);
router.post('/generate-tasks', aiController.generateTasks);

module.exports = router;
