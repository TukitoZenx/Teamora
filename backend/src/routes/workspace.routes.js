const express = require('express');
const workspaceController = require('../controllers/workspace.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);
router.get('/notifications', workspaceController.getNotifications);
router.patch('/notifications/:notificationId/read', workspaceController.markNotificationRead);
router.delete('/history/:workspaceId', workspaceController.removeRecentWorkspace);
router.get('/invite/:inviteCode', workspaceController.getInvitePreview);
router.post('/invite/:inviteCode/request', workspaceController.requestWorkspaceAccess);
router.post('/join', workspaceController.joinWorkspace);
router.post('/:id/leave', workspaceController.leaveWorkspace);
router.post('/:id/join-requests/:requestId/accept', workspaceController.acceptJoinRequest);
router.post('/:id/join-requests/:requestId/decline', workspaceController.declineJoinRequest);
router.get('/:id', workspaceController.getWorkspaceById);
router.put('/:id', workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);

module.exports = router;
