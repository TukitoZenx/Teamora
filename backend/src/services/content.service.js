const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const WorkspaceContent = require('../models/WorkspaceContent');
const { mergeYjsPayload } = require('./yjsContent');
const { mergeFilesPayload } = require('./filesContent');
const { mergeCommentsPayload, mergeVersionsPayload, mergeMessagesPayload } = require('./listMerge');

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

  let nextData = data === undefined ? null : data;
  const existing = await WorkspaceContent.findOne({ workspace: workspaceId, key: cleanKey }).lean();

  // Collaborative documents: CRDT merge instead of blind overwrite.
  if (nextData && nextData.format === 'yjs-v1' && (nextData.update || nextData.state)) {
    const existingState =
      existing?.data?.format === 'yjs-v1' && typeof existing.data.state === 'string' ? existing.data.state : null;

    try {
      nextData = mergeYjsPayload(existingState, {
        update: typeof nextData.update === 'string' ? nextData.update : undefined,
        state: typeof nextData.state === 'string' ? nextData.state : undefined
      });
    } catch (error) {
      throw createError(`Invalid Yjs payload: ${error.message}`, 400);
    }
  }

  // File tree: merge-by-id + tombstones (key `files` or explicit format).
  if (nextData && (cleanKey === 'files' || nextData.format === 'files-v1' || Array.isArray(nextData.files))) {
    const legacyExisting =
      existing?.data?.format === 'files-v1'
        ? existing.data
        : existing?.data?.files
          ? { files: existing.data.files, removed: {} }
          : { files: [], removed: {} };

    const incoming =
      nextData.format === 'files-v1' || Array.isArray(nextData.files)
        ? {
            files: Array.isArray(nextData.files) ? nextData.files : [],
            removed: nextData.removed && typeof nextData.removed === 'object' ? nextData.removed : {}
          }
        : { files: [], removed: {} };

    nextData = mergeFilesPayload(legacyExisting, incoming);
  }

  // Document comments: merge-by-id + tombstones.
  if (
    nextData &&
    (nextData.format === 'comments-v1' ||
      cleanKey.startsWith('documents-comments:') ||
      Array.isArray(nextData.comments))
  ) {
    const legacyExisting =
      existing?.data?.format === 'comments-v1'
        ? existing.data
        : existing?.data?.comments
          ? { comments: existing.data.comments, removed: existing.data.removed || {} }
          : { comments: [], removed: {} };

    nextData = mergeCommentsPayload(legacyExisting, {
      comments: Array.isArray(nextData.comments) ? nextData.comments : [],
      removed: nextData.removed && typeof nextData.removed === 'object' ? nextData.removed : {}
    });
  }

  // Document versions: merge-by-versionId, cap length.
  if (
    nextData &&
    (nextData.format === 'versions-v1' ||
      cleanKey.startsWith('documents-versions:') ||
      Array.isArray(nextData.versions))
  ) {
    const legacyExisting =
      existing?.data?.format === 'versions-v1'
        ? existing.data
        : existing?.data?.versions
          ? { versions: existing.data.versions }
          : { versions: [] };

    nextData = mergeVersionsPayload(legacyExisting, {
      versions: Array.isArray(nextData.versions) ? nextData.versions : []
    });
  }

  // Workspace chat messages: append-merge by id.
  if (
    nextData &&
    (nextData.format === 'messages-v1' ||
      cleanKey === 'chat' ||
      cleanKey.startsWith('chat:') ||
      Array.isArray(nextData.messages))
  ) {
    const legacyExisting =
      existing?.data?.format === 'messages-v1'
        ? existing.data
        : existing?.data?.messages
          ? { messages: existing.data.messages }
          : { messages: [] };

    nextData = mergeMessagesPayload(legacyExisting, {
      messages: Array.isArray(nextData.messages) ? nextData.messages : []
    });
  }

  let serialized;
  try {
    serialized = JSON.stringify(nextData);
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
        data: nextData,
        updatedBy: userId
      }
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
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
