const express = require('express');
const workspaceController = require('../controllers/workspace.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);
router.post('/join', workspaceController.joinWorkspace);
router.get('/:id', workspaceController.getWorkspaceById);
router.put('/:id', workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);

module.exports = router;
