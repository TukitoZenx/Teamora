const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
      index: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  { _id: true }
);

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    type: {
      type: String,
      enum: ['join_request', 'join_request_accepted', 'join_request_declined'],
      required: true,
      index: true
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const approvedMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    approvedAt: {
      type: Date,
      default: Date.now
    },
    revokedAt: {
      type: Date,
      default: null
    },
    bannedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    joinRequests: [joinRequestSchema],
    approvedMembers: [approvedMemberSchema],
    notifications: [notificationSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Workspace', workspaceSchema);
