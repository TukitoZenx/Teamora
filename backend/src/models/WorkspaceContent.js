const mongoose = require('mongoose');

/**
 * Server-side blob store for workspace collaboration payloads
 * (file trees, document HTML, whiteboard elements, etc.).
 *
 * This is last-write-wins JSON per (workspace, key) — enough for multi-device
 * persistence without a full realtime OT/CRDT server.
 */
const workspaceContentSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

workspaceContentSchema.index({ workspace: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('WorkspaceContent', workspaceContentSchema);
