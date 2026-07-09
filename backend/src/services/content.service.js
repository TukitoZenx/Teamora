const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const WorkspaceContent = require('../models/WorkspaceContent');

const MAX_KEY_LENGTH = 200;
const MAX_JSON_CHARS = 1_500_000; // ~1.5MB serialized — keeps Mongo docs safe

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Invalid workspace id', 400);
  }
};

const isWorkspaceMember = (workspace, userId) =>
  workspace.members.some((memberId) => {
    const id = memberId._id || memberId;
    return id.toString() === userId.toString();
  });

const sanitizeKey = (key) => {
  if (typeof key !== 'string' || !key.trim()) {
    throw createError('Content key is required');
  }

  const clean = key.trim();
  if (clean.length > MAX_KEY_LENGTH) {
    throw createError(`Content key must be ${MAX_KEY_LENGTH} characters or fewer`);
  }

  // Allow alphanumeric, colon, dash, underscore, dot — used for feature:id keys.
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_.-]*$/.test(clean)) {
    throw createError('Content key contains invalid characters');
  }

  return clean;
};

const assertMember = async (userId, workspaceId) => {
  validateObjectId(workspaceId);
  const workspace = await Workspace.findById(workspaceId).select('members archivedAt');

  if (!workspace || workspace.archivedAt || !isWorkspaceMember(workspace, userId)) {
    throw createError('Workspace not found', 404);
  }

  return workspace;
};

const getContent = async (userId, workspaceId, key) => {
  await assertMember(userId, workspaceId);
  const cleanKey = sanitizeKey(key);

  const doc = await WorkspaceContent.findOne({ workspace: workspaceId, key: cleanKey });

  return {
    key: cleanKey,
    data: doc ? doc.data : null,
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updatedBy || null
  };
};

const putContent = async (userId, workspaceId, key, data) => {
  await assertMember(userId, workspaceId);
  const cleanKey = sanitizeKey(key);

  let serialized;
  try {
    serialized = JSON.stringify(data === undefined ? null : data);
  } catch {
    throw createError('Content payload is not serializable');
  }

  if (serialized.length > MAX_JSON_CHARS) {
    throw createError('Content payload is too large', 413);
  }

  const doc = await WorkspaceContent.findOneAndUpdate(
    { workspace: workspaceId, key: cleanKey },
    {
      $set: {
        data: data === undefined ? null : data,
        updatedBy: userId
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    key: cleanKey,
    data: doc.data,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy
  };
};

const listContentKeys = async (userId, workspaceId, prefix = '') => {
  await assertMember(userId, workspaceId);

  const filter = { workspace: workspaceId };
  if (prefix) {
    filter.key = { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
  }

  const docs = await WorkspaceContent.find(filter).select('key updatedAt updatedBy').sort({ key: 1 }).lean();

  return docs.map((doc) => ({
    key: doc.key,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy
  }));
};

module.exports = {
  getContent,
  putContent,
  listContentKeys,
  MAX_JSON_CHARS
};
