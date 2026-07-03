const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Workspace = require('../models/Workspace');

const USER_SELECT = 'fullName username email avatar';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getEntityId = (entity) => entity?._id || entity;

const cleanWorkspace = (workspace, currentUserId) => {
  const data = workspace.toObject ? workspace.toObject() : workspace;
  delete data.__v;
  data.workspaceId = data._id?.toString();
  data.inviteLink = `${CLIENT_URL}/invite/${data.inviteCode}`;

  const isOwner = currentUserId && getEntityId(data.owner)?.toString() === currentUserId.toString();

  if (!isOwner) {
    delete data.joinRequests;
  }

  data.notifications = (data.notifications || []).filter((notification) => (
    currentUserId && getEntityId(notification.recipient)?.toString() === currentUserId.toString()
  ));

  return data;
};

const populateWorkspace = (query) =>
  query
    .populate('owner', USER_SELECT)
    .populate('members', USER_SELECT)
    .populate('approvedMembers.user', USER_SELECT)
    .populate('joinRequests.requester', USER_SELECT)
    .populate('notifications.requester', USER_SELECT)
    .populate('tasks.creator', USER_SELECT);

const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Invalid workspace id', 400);
  }
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

const validateDateKey = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError('Task date must use YYYY-MM-DD format');
  }

  return date;
};

const validatePriority = (priority) => {
  if (!['Low', 'Medium', 'High', 'Urgent'].includes(priority)) {
    throw createError('Task priority is required');
  }

  return priority;
};

const validateTaskTitle = (title) => {
  if (typeof title !== 'string' || !title.trim()) {
    throw createError('Task title is required');
  }

  const cleanTitle = title.trim();

  if (cleanTitle.length > 160) {
    throw createError('Task title must be 160 characters or fewer');
  }

  return cleanTitle;
};

const validateTaskDescription = (description) => {
  if (description === undefined || description === null) return '';
  if (typeof description !== 'string') {
    throw createError('Task description must be a string');
  }

  const cleanDescription = description.trim();

  if (cleanDescription.length > 1000) {
    throw createError('Task description must be 1000 characters or fewer');
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

const isWorkspaceMember = (workspace, userId) =>
  workspace.members.some((memberId) => {
    const id = memberId._id || memberId;
    return id.toString() === userId.toString();
  });

const hasActiveApproval = (workspace, userId) =>
  workspace.approvedMembers?.some((approval) => {
    const id = getEntityId(approval.user);
    return id?.toString() === userId.toString() && !approval.revokedAt && !approval.bannedAt;
  });

const ensureApproval = (workspace, userId) => {
  const existingApproval = workspace.approvedMembers?.find((approval) => {
    const id = getEntityId(approval.user);
    return id?.toString() === userId.toString();
  });

  if (existingApproval) {
    existingApproval.approvedAt = existingApproval.approvedAt || new Date();
    existingApproval.revokedAt = null;
    existingApproval.bannedAt = null;
    return;
  }

  workspace.approvedMembers.push({ user: userId });
};

const getDisplayName = (user) => user?.fullName || user?.username || user?.email || 'A teammate';

const getOwnerName = (workspace) => {
  if (workspace?.owner && typeof workspace.owner === 'object' && (workspace.owner.fullName || workspace.owner.username || workspace.owner.email)) {
    return getDisplayName(workspace.owner);
  }

  return '';
};

const upsertRecentWorkspace = async (userId, workspace, status, extra = {}) => {
  if (!workspace?._id) return;

  const now = new Date();
  const owner = getEntityId(workspace.owner);
  const entry = {
    workspace: workspace._id,
    name: workspace.name || '',
    owner,
    ownerName: getOwnerName(workspace),
    status,
    lastSeenAt: now,
    leftAt: status === 'previously_joined' ? now : null,
    requestedAt: status === 'pending' ? now : null,
    ...extra
  };

  await User.updateOne({ _id: userId }, { $pull: { recentWorkspaces: { workspace: workspace._id } } });
  await User.updateOne({ _id: userId }, { $push: { recentWorkspaces: { $each: [entry], $position: 0 } } });
};

const removeRecentWorkspaceForEveryone = async (workspaceId) => {
  await User.updateMany({}, { $pull: { recentWorkspaces: { workspace: workspaceId } } });
};

const cleanRecentWorkspace = (entry, userId, activeWorkspaceIds = new Set()) => {
  const workspaceId = getEntityId(entry.workspace)?.toString();
  const workspace = entry.workspace && typeof entry.workspace === 'object' ? entry.workspace : null;
  const active = workspaceId && activeWorkspaceIds.has(workspaceId);
  const pendingRequest = workspace?.joinRequests?.find((request) => {
    const requesterId = getEntityId(request.requester);
    return requesterId?.toString() === userId.toString() && request.status === 'pending';
  });
  const status = active ? 'active' : pendingRequest ? 'pending' : entry.status === 'active' ? 'removed' : entry.status;
  const statusLabel =
    status === 'active'
      ? 'Active'
      : status === 'pending'
        ? 'Pending'
        : status === 'removed'
          ? 'Removed Access'
          : 'Previously Joined';

  return {
    _id: workspaceId,
    workspaceId,
    name: workspace?.name || entry.name,
    owner: workspace?.owner || entry.owner,
    ownerName: workspace?.owner ? getDisplayName(workspace.owner) : entry.ownerName,
    inviteCode: workspace?.inviteCode || null,
    inviteLink: workspace?.inviteCode ? `${CLIENT_URL}/invite/${workspace.inviteCode}` : null,
    status,
    statusLabel,
    canOpen: active,
    canRequestAccess: !active && Boolean(workspace?.inviteCode),
    lastSeenAt: entry.lastSeenAt,
    leftAt: entry.leftAt,
    requestedAt: entry.requestedAt
  };
};

const createWorkspace = async (userId, payload) => {
  const workspace = await Workspace.create({
    name: validateName(payload.name),
    description: validateDescription(payload.description),
    owner: userId,
    members: [userId],
    approvedMembers: [{ user: userId }],
    inviteCode: await generateInviteCode()
  });

  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  await upsertRecentWorkspace(userId, populated, 'active');
  return cleanWorkspace(populated, userId);
};

const getWorkspaces = async (userId) => {
  const workspaces = await populateWorkspace(
    Workspace.find({
      $or: [{ owner: userId }, { members: userId }]
    }).sort({ updatedAt: -1 })
  );

  const activeWorkspaceIds = new Set(workspaces.map((workspace) => workspace._id.toString()));
  const user = await User.findById(userId)
    .populate({
      path: 'recentWorkspaces.workspace',
      populate: [
        { path: 'owner', select: USER_SELECT },
        { path: 'joinRequests.requester', select: USER_SELECT }
      ]
    })
    .populate('recentWorkspaces.owner', USER_SELECT);

  const recentWorkspaces = (user?.recentWorkspaces || [])
    .filter((entry) => entry.workspace)
    .map((entry) => cleanRecentWorkspace(entry, userId, activeWorkspaceIds));

  const recentIds = new Set(recentWorkspaces.map((entry) => entry.workspaceId));
  const activeRecentWorkspaces = workspaces
    .filter((workspace) => !recentIds.has(workspace._id.toString()))
    .map((workspace) => ({
      _id: workspace._id.toString(),
      workspaceId: workspace._id.toString(),
      name: workspace.name,
      owner: workspace.owner,
      ownerName: getDisplayName(workspace.owner),
      inviteCode: workspace.inviteCode,
      inviteLink: `${CLIENT_URL}/invite/${workspace.inviteCode}`,
      status: 'active',
      statusLabel: 'Active',
      canOpen: true,
      canRequestAccess: false,
      lastSeenAt: workspace.updatedAt
    }));

  return {
    workspaces: workspaces.map((workspace) => cleanWorkspace(workspace, userId)),
    recentWorkspaces: [...activeRecentWorkspaces, ...recentWorkspaces]
  };
};

const getWorkspaceById = async (userId, workspaceId) => {
  validateObjectId(workspaceId);

  const workspace = await populateWorkspace(Workspace.findById(workspaceId));

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  if (!isWorkspaceMember(workspace, userId)) {
    throw createError('Workspace not found', 404);
  }

  return cleanWorkspace(workspace, userId);
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

  if (payload.icon !== undefined) {
    workspace.icon = typeof payload.icon === 'string' ? payload.icon.trim().slice(0, 8) : '';
  }

  if (payload.visibility !== undefined) {
    if (!['private', 'invite_only'].includes(payload.visibility)) {
      throw createError('Invalid workspace visibility');
    }
    workspace.visibility = payload.visibility;
  }

  if (payload.joinApproval !== undefined) {
    workspace.joinApproval = Boolean(payload.joinApproval);
  }

  await workspace.save();

  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  return cleanWorkspace(populated, userId);
};

const deleteWorkspace = async (userId, workspaceId) => {
  validateObjectId(workspaceId);

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  assertOwner(workspace, userId);
  await workspace.deleteOne();
  await removeRecentWorkspaceForEveryone(workspace._id);

  try {
    await mongoose.connection.collection('rooms').deleteOne({ _id: workspaceId.toString() });
  } catch {
    // Workspace metadata is authoritative here; room data may live in a separate legacy service.
  }
};

const getInvitePreview = async (userId, inviteCode) => {
  if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
    throw createError('Invite code is required');
  }

  const workspace = await Workspace.findOne({ inviteCode: inviteCode.trim().toUpperCase() });

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  const pendingRequest = workspace.joinRequests.find((request) => {
    const requesterId = getEntityId(request.requester);
    return requesterId.toString() === userId.toString() && request.status === 'pending';
  });

  return {
    _id: workspace._id,
    workspaceId: workspace._id.toString(),
    name: workspace.name,
    description: workspace.description,
    owner: workspace.owner,
    memberCount: workspace.members.length,
    inviteCode: workspace.inviteCode,
    inviteLink: `${CLIENT_URL}/invite/${workspace.inviteCode}`,
    isMember: isWorkspaceMember(workspace, userId),
    hasPendingRequest: Boolean(pendingRequest),
    pendingRequestId: pendingRequest?._id || null
  };
};

const requestWorkspaceAccess = async (userId, inviteCode) => {
  if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
    throw createError('Invite code is required');
  }

  const workspace = await Workspace.findOne({ inviteCode: inviteCode.trim().toUpperCase() }).populate('owner', USER_SELECT);

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  if (isWorkspaceMember(workspace, userId)) {
    throw createError('You are already a member of this workspace', 409);
  }

  if (hasActiveApproval(workspace, userId)) {
    workspace.members.push(userId);
    workspace.joinRequests.forEach((request) => {
      const requesterId = getEntityId(request.requester);
      if (requesterId?.toString() === userId.toString() && request.status === 'pending') {
        request.status = 'accepted';
        request.resolvedAt = new Date();
      }
    });
    await workspace.save();

    const populated = await populateWorkspace(Workspace.findById(workspace._id));
    await upsertRecentWorkspace(userId, populated, 'active');
    return {
      joined: true,
      workspace: cleanWorkspace(populated, userId)
    };
  }

  const existingPending = workspace.joinRequests.find((request) => {
    const requesterId = getEntityId(request.requester);
    return requesterId.toString() === userId.toString() && request.status === 'pending';
  });

  if (existingPending) {
    await upsertRecentWorkspace(userId, workspace, 'pending');
    return {
      request: existingPending,
      workspace: await getInvitePreview(userId, workspace.inviteCode)
    };
  }

  workspace.joinRequests.push({ requester: userId });
  const request = workspace.joinRequests[workspace.joinRequests.length - 1];
  workspace.notifications.push({
    recipient: getEntityId(workspace.owner),
    requester: userId,
    request: request._id,
    type: 'join_request',
    message: 'requested access to your workspace'
  });
  await workspace.save();
  await upsertRecentWorkspace(userId, workspace, 'pending');

  return {
    request,
    workspace: await getInvitePreview(userId, workspace.inviteCode)
  };
};

const acceptJoinRequest = async (ownerId, workspaceId, requestId) => {
  validateObjectId(workspaceId);

  const workspace = await Workspace.findById(workspaceId).populate('joinRequests.requester', USER_SELECT);

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  assertOwner(workspace, ownerId);

  const request = workspace.joinRequests.id(requestId);

  if (!request || request.status !== 'pending') {
    throw createError('Pending join request not found', 404);
  }

  const requesterId = getEntityId(request.requester);

  if (!isWorkspaceMember(workspace, requesterId)) {
    workspace.members.push(requesterId);
  }
  ensureApproval(workspace, requesterId);

  request.status = 'accepted';
  request.resolvedAt = new Date();
  workspace.notifications.push({
    recipient: requesterId,
    requester: ownerId,
    request: request._id,
    type: 'join_request_accepted',
    message: `Your request to join ${workspace.name} was accepted`
  });
  await workspace.save();

  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  await upsertRecentWorkspace(requesterId, populated, 'active');
  return cleanWorkspace(populated, ownerId);
};

const declineJoinRequest = async (ownerId, workspaceId, requestId) => {
  validateObjectId(workspaceId);

  const workspace = await Workspace.findById(workspaceId).populate('joinRequests.requester', USER_SELECT);

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  assertOwner(workspace, ownerId);

  const request = workspace.joinRequests.id(requestId);

  if (!request || request.status !== 'pending') {
    throw createError('Pending join request not found', 404);
  }

  const requesterId = getEntityId(request.requester);
  request.status = 'declined';
  request.resolvedAt = new Date();
  workspace.notifications.push({
    recipient: requesterId,
    requester: ownerId,
    request: request._id,
    type: 'join_request_declined',
    message: `Your request to join ${workspace.name} was declined`
  });
  await workspace.save();

  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  return cleanWorkspace(populated, ownerId);
};

const getNotifications = async (userId) => {
  const workspaces = await populateWorkspace(
    Workspace.find({ 'notifications.recipient': userId }).sort({ updatedAt: -1 })
  );

  return workspaces.flatMap((workspace) =>
    workspace.notifications
      .filter((notification) => notification.recipient.toString() === userId.toString())
      .map((notification) => ({
        _id: notification._id,
        type: notification.type,
        title: notification.type === 'join_request' ? 'Join Request' : 'Workspace Access',
        message: notification.message,
        requester: notification.requester,
        requesterName: getDisplayName(notification.requester),
        requestId: notification.request,
        workspaceId: workspace._id,
        workspaceName: workspace.name,
        read: notification.read,
        createdAt: notification.createdAt,
        requestStatus: workspace.joinRequests.id(notification.request)?.status || null
      }))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const markNotificationRead = async (userId, notificationId) => {
  const workspace = await Workspace.findOne({
    notifications: {
      $elemMatch: {
        _id: notificationId,
        recipient: userId
      }
    }
  });

  if (!workspace) {
    throw createError('Notification not found', 404);
  }

  const notification = workspace.notifications.id(notificationId);
  notification.read = true;
  await workspace.save();

  return { success: true };
};

const listTasks = async (userId, workspaceId) => {
  validateObjectId(workspaceId);
  const workspace = await populateWorkspace(Workspace.findById(workspaceId));

  if (!workspace || !isWorkspaceMember(workspace, userId)) {
    throw createError('Workspace not found', 404);
  }

  return cleanWorkspace(workspace, userId).tasks || [];
};

const createTask = async (userId, workspaceId, payload) => {
  validateObjectId(workspaceId);
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace || !isWorkspaceMember(workspace, userId)) {
    throw createError('Workspace not found', 404);
  }

  workspace.tasks.push({
    title: validateTaskTitle(payload.title),
    description: validateTaskDescription(payload.description),
    date: validateDateKey(payload.date),
    priority: validatePriority(payload.priority),
    creator: userId
  });

  await workspace.save();
  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  const task = populated.tasks.id(workspace.tasks[workspace.tasks.length - 1]._id);
  return task.toObject ? task.toObject() : task;
};

const updateTask = async (userId, workspaceId, taskId, payload) => {
  validateObjectId(workspaceId);
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace || !isWorkspaceMember(workspace, userId)) {
    throw createError('Workspace not found', 404);
  }

  const task = workspace.tasks.id(taskId);
  if (!task) {
    throw createError('Task not found', 404);
  }

  if (payload.title !== undefined) task.title = validateTaskTitle(payload.title);
  if (payload.description !== undefined) task.description = validateTaskDescription(payload.description);
  if (payload.priority !== undefined) task.priority = validatePriority(payload.priority);
  if (payload.completed !== undefined) task.completed = Boolean(payload.completed);

  await workspace.save();
  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  const updatedTask = populated.tasks.id(taskId);
  return updatedTask.toObject ? updatedTask.toObject() : updatedTask;
};

const deleteTask = async (userId, workspaceId, taskId) => {
  validateObjectId(workspaceId);
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace || !isWorkspaceMember(workspace, userId)) {
    throw createError('Workspace not found', 404);
  }

  const task = workspace.tasks.id(taskId);
  if (!task) {
    throw createError('Task not found', 404);
  }

  task.deleteOne();
  await workspace.save();
  return { success: true };
};

const removeMember = async (ownerId, workspaceId, memberId) => {
  validateObjectId(workspaceId);
  validateObjectId(memberId);
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  assertOwner(workspace, ownerId);

  if (workspace.owner.toString() === memberId.toString()) {
    throw createError('The workspace owner cannot be removed');
  }

  workspace.members = workspace.members.filter((id) => id.toString() !== memberId.toString());
  const approval = workspace.approvedMembers.find((item) => getEntityId(item.user)?.toString() === memberId.toString());
  if (approval) {
    approval.revokedAt = new Date();
  }
  await workspace.save();
  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  await upsertRecentWorkspace(memberId, populated, 'previously_joined');
  return cleanWorkspace(populated, ownerId);
};

const removeRecentWorkspace = async (userId, workspaceId) => {
  validateObjectId(workspaceId);
  await User.updateOne({ _id: userId }, { $pull: { recentWorkspaces: { workspace: workspaceId } } });
  return { success: true };
};

const leaveWorkspace = async (userId, workspaceId) => {
  validateObjectId(workspaceId);

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  const isMember = workspace.members.some((memberId) => memberId.toString() === userId.toString());

  if (!isMember) {
    throw createError('You are not a member of this workspace', 404);
  }

  const isOwner = workspace.owner.toString() === userId.toString();

  if (isOwner) {
    const otherMembers = workspace.members.filter((memberId) => memberId.toString() !== userId.toString());

    if (otherMembers.length === 0) {
      await workspace.deleteOne();
      await removeRecentWorkspaceForEveryone(workspace._id);

      try {
        await mongoose.connection.collection('rooms').deleteOne({ _id: workspaceId.toString() });
      } catch {
        // Workspace metadata is authoritative here; room data may live in a separate legacy service.
      }

      return { success: true, workspaceDeleted: true };
    }

    workspace.owner = otherMembers[0];
  }

  workspace.members = workspace.members.filter((memberId) => memberId.toString() !== userId.toString());
  await workspace.save();
  const populated = await populateWorkspace(Workspace.findById(workspace._id));
  await upsertRecentWorkspace(userId, populated, 'previously_joined');

  return { success: true, ownershipTransferred: isOwner };
};

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
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
