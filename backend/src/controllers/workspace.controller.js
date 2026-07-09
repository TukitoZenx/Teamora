const workspaceService = require('../services/workspace.service');

const createWorkspace = async (req, res, next) => {
  try {
    const workspace = await workspaceService.createWorkspace(req.user._id, req.body);
    res.status(201).json({ success: true, workspace });
  } catch (error) {
    next(error);
  }
};

const getWorkspaces = async (req, res, next) => {
  try {
    const result = await workspaceService.getWorkspaces(req.user._id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const getWorkspaceById = async (req, res, next) => {
  try {
    const workspace = await workspaceService.getWorkspaceById(req.user._id, req.params.id);
    res.status(200).json({ success: true, workspace });
  } catch (error) {
    next(error);
  }
};

const updateWorkspace = async (req, res, next) => {
  try {
    const workspace = await workspaceService.updateWorkspace(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, workspace });
  } catch (error) {
    next(error);
  }
};

const deleteWorkspace = async (req, res, next) => {
  try {
    await workspaceService.deleteWorkspace(req.user._id, req.params.id);
    res.status(200).json({ success: true, message: 'Workspace deleted' });
  } catch (error) {
    next(error);
  }
};

const joinWorkspace = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    const result = await workspaceService.requestWorkspaceAccess(req.user._id, inviteCode);
    res.status(result.joined ? 200 : 202).json({
      success: true,
      ...result,
      message: result.joined ? 'Joined workspace' : 'Access request sent'
    });
  } catch (error) {
    next(error);
  }
};

const getInvitePreview = async (req, res, next) => {
  try {
    const workspace = await workspaceService.getInvitePreview(req.user._id, req.params.inviteCode);
    res.status(200).json({ success: true, workspace });
  } catch (error) {
    next(error);
  }
};

const requestWorkspaceAccess = async (req, res, next) => {
  try {
    const result = await workspaceService.requestWorkspaceAccess(req.user._id, req.params.inviteCode);
    res.status(result.joined ? 200 : 202).json({
      success: true,
      ...result,
      message: result.joined ? 'Joined workspace' : 'Access request sent'
    });
  } catch (error) {
    next(error);
  }
};

const acceptJoinRequest = async (req, res, next) => {
  try {
    const workspace = await workspaceService.acceptJoinRequest(req.user._id, req.params.id, req.params.requestId);
    res.status(200).json({ success: true, workspace });
  } catch (error) {
    next(error);
  }
};

const declineJoinRequest = async (req, res, next) => {
  try {
    const workspace = await workspaceService.declineJoinRequest(req.user._id, req.params.id, req.params.requestId);
    res.status(200).json({ success: true, workspace });
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await workspaceService.getNotifications(req.user._id);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const result = await workspaceService.markNotificationRead(req.user._id, req.params.notificationId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const listTasks = async (req, res, next) => {
  try {
    const tasks = await workspaceService.listTasks(req.user._id, req.params.id);
    res.status(200).json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const task = await workspaceService.createTask(req.user._id, req.params.id, req.body);
    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await workspaceService.updateTask(req.user._id, req.params.id, req.params.taskId, req.body);
    res.status(200).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const result = await workspaceService.deleteTask(req.user._id, req.params.id, req.params.taskId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const workspace = await workspaceService.removeMember(req.user._id, req.params.id, req.params.memberId);
    res.status(200).json({ success: true, workspace });
  } catch (error) {
    next(error);
  }
};

const removeRecentWorkspace = async (req, res, next) => {
  try {
    const result = await workspaceService.removeRecentWorkspace(req.user._id, req.params.workspaceId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const leaveWorkspace = async (req, res, next) => {
  try {
    const result = await workspaceService.leaveWorkspace(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  joinWorkspace,
  getInvitePreview,
  requestWorkspaceAccess,
  acceptJoinRequest,
  declineJoinRequest,
  getNotifications,
  markNotificationRead,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  removeMember,
  removeRecentWorkspace,
  leaveWorkspace
};
