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
    const workspaces = await workspaceService.getWorkspaces(req.user._id);
    res.status(200).json({ success: true, workspaces });
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
    const workspace = await workspaceService.joinWorkspace(req.user._id, req.body);
    res.status(200).json({ success: true, workspace });
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
  joinWorkspace
};
