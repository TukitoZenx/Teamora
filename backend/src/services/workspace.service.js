const crypto = require('crypto');
const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');

const USER_SELECT = 'fullName username email avatar';

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const cleanWorkspace = (workspace) => {
  const data = workspace.toObject ? workspace.toObject() : workspace;
  delete data.__v;
  return data;
};

const populateWorkspace = (query) => query.populate('owner', USER_SELECT).populate('members', USER_SELECT);

const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Invalid workspace id', 400);
  }
};

const normalizeVisibility = (visibility) => {
  if (!visibility) return 'private';
  const normalized = String(visibility).trim().toLowerCase();

  if (!['private', 'public'].includes(normalized)) {
    throw createError('Visibility must be private or public');
  }

  return normalized;
};

const validateName = (name) => {
  if (typeof name !== 'string' || !name.trim()) {
    throw createError('Workspace name is required');
  }

  const cleanName = name.trim();

  if (cleanName.length > 120) {
    throw createError('Workspace name must be 120 characters or fewer');
  }

  return cleanName;
};

const validateDescription = (description) => {
  if (description === undefined || description === null) return '';

  if (typeof description !== 'string') {
    throw createError('Description must be a string');
  }

  const cleanDescription = description.trim();

  if (cleanDescription.length > 500) {
    throw createError('Description must be 500 characters or fewer');
  }

  return cleanDescription;
};

const generateInviteCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = crypto.randomBytes(5).toString('hex').toUpperCase();
    const exists = await Workspace.exists({ inviteCode });

    if (!exists) {
      return inviteCode;
    }
  }

  throw createError('Unable to generate invite code', 500);
};

const assertOwner = (workspace, userId) => {
  if (workspace.owner.toString() !== userId.toString()) {
    throw createError('Only the workspace owner can perform this action', 403);
  }
};

const createWorkspace = async (userId, payload) => {
  const workspace = await Workspace.create({
    name: validateName(payload.name),
    description: validateDescription(payload.description),
    owner: userId,
    members: [userId],
    visibility: normalizeVisibility(payload.visibility),
    inviteCode: await generateInviteCode()
  });

  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  return cleanWorkspace(populated);
};

const getWorkspaces = async (userId) => {
  const workspaces = await populateWorkspace(
    Workspace.find({
      $or: [{ owner: userId }, { members: userId }]
    }).sort({ updatedAt: -1 })
  );

  return workspaces.map(cleanWorkspace);
};

const getWorkspaceById = async (userId, workspaceId) => {
  validateObjectId(workspaceId);

  const workspace = await populateWorkspace(Workspace.findById(workspaceId));

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  const isMember = workspace.members.some((member) => member._id.toString() === userId.toString());

  if (!isMember && workspace.visibility !== 'public') {
    throw createError('Workspace not found', 404);
  }

  return cleanWorkspace(workspace);
};

const updateWorkspace = async (userId, workspaceId, payload) => {
  validateObjectId(workspaceId);

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  assertOwner(workspace, userId);

  if (payload.name !== undefined) {
    workspace.name = validateName(payload.name);
  }

  if (payload.description !== undefined) {
    workspace.description = validateDescription(payload.description);
  }

  if (payload.visibility !== undefined) {
    workspace.visibility = normalizeVisibility(payload.visibility);
  }

  await workspace.save();

  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  return cleanWorkspace(populated);
};

const deleteWorkspace = async (userId, workspaceId) => {
  validateObjectId(workspaceId);

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  assertOwner(workspace, userId);
  await workspace.deleteOne();
};

const joinWorkspace = async (userId, { inviteCode }) => {
  if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
    throw createError('Invite code is required');
  }

  const workspace = await Workspace.findOne({ inviteCode: inviteCode.trim().toUpperCase() });

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  const isMember = workspace.members.some((memberId) => memberId.toString() === userId.toString());

  if (!isMember) {
    workspace.members.push(userId);
    await workspace.save();
  }

  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  return cleanWorkspace(populated);
};

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  joinWorkspace
};
