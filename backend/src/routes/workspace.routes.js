const express = require('express');
const rateLimit = require('express-rate-limit');
const workspaceController = require('../controllers/workspace.controller');
const contentController = require('../controllers/content.controller');
const importController = require('../controllers/import.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';

// Abuse protection for expensive or invitation-facing mutations. Session-auth
// routes stay available for normal use; these only throttle spammy create/join.
const createWorkspaceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many workspaces created. Please try again later.'
  }
});

const joinWorkspaceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many join attempts. Please try again later.'
  }
});

const contentWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many content saves. Please slow down.'
  }
});

const maybe = (limiter) => (isProduction ? [limiter] : []);

router.use(requireAuth);

router.post('/', ...maybe(createWorkspaceLimiter), workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);
router.get('/notifications', workspaceController.getNotifications);
router.patch('/notifications/:notificationId/read', workspaceController.markNotificationRead);
router.delete('/history/:workspaceId', workspaceController.removeRecentWorkspace);
router.get('/invite/:inviteCode', workspaceController.getInvitePreview);
router.post('/invite/:inviteCode/request', ...maybe(joinWorkspaceLimiter), workspaceController.requestWorkspaceAccess);
router.post('/join', ...maybe(joinWorkspaceLimiter), workspaceController.joinWorkspace);
router.post('/:id/leave', workspaceController.leaveWorkspace);
router.get('/:id/tasks', workspaceController.listTasks);
router.post('/:id/tasks', workspaceController.createTask);
router.patch('/:id/tasks/:taskId', workspaceController.updateTask);
router.delete('/:id/tasks/:taskId', workspaceController.deleteTask);
router.delete('/:id/members/:memberId', workspaceController.removeMember);
router.post('/:id/join-requests/:requestId/accept', workspaceController.acceptJoinRequest);
router.post('/:id/join-requests/:requestId/decline', workspaceController.declineJoinRequest);

// Multi-device collab content (last-write-wins JSON blobs)
router.get('/:id/content', contentController.listContentKeys);
router.get('/:id/content/:key', contentController.getContent);
router.put('/:id/content/:key', ...maybe(contentWriteLimiter), contentController.putContent);

// File import routes
router.post('/:id/files/import', importController.importFile);

// DOCX export route
router.post('/export-docx', contentController.exportDocx);

router.get('/:id', workspaceController.getWorkspaceById);
router.put('/:id', workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);

module.exports = router;
