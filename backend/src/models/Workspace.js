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

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      required: true
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'review', 'completed'],
      default: 'todo'
    },
    completed: {
      type: Boolean,
      default: false
    },
    assignee: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ''
    },
    startTime: {
      type: String,
      trim: true,
      maxlength: 10,
      default: ''
    },
    endTime: {
      type: String,
      trim: true,
      maxlength: 10,
      default: ''
    },
    reminder: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ''
    },
    reminderEnabled: {
      type: Boolean,
      default: false
    },
    reminderEmail: {
      type: String,
      trim: true,
      default: ''
    },
    reminderStartDateTime: {
      type: Date,
      default: null
    },
    reminderGapMinutes: {
      type: Number,
      default: 0
    },
    reminderLimit: {
      type: Number,
      default: 1
    },
    remindersSent: {
      type: Number,
      default: 0
    },
    nextReminderTime: {
      type: Date,
      default: null
    },
    workspaceName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
    icon: {
      type: String,
      trim: true,
      maxlength: 8,
      default: ''
    },
    visibility: {
      type: String,
      enum: ['private', 'invite_only'],
      default: 'invite_only'
    },
    active: {
      type: Boolean,
      default: true
    },
    archivedAt: {
      type: Date,
      default: null,
      index: true
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    joinApproval: {
      type: Boolean,
      default: true
    },
    tasks: [taskSchema],
    joinRequests: [joinRequestSchema],
    approvedMembers: [approvedMemberSchema],
    notifications: [notificationSchema]
  },
  {
    timestamps: true
  }
);

// Caps for embedded arrays. Workspace documents embed notifications + tasks
// rather than separate collections — unbounded growth causes Mongo document
// bloat and slow loads for active teams.
const MAX_NOTIFICATIONS = 200;
const MAX_TASKS = 500;

workspaceSchema.pre('save', function capEmbeddedArrays() {
  try {
    if (Array.isArray(this.notifications) && this.notifications.length > MAX_NOTIFICATIONS) {
      // Drop oldest (notifications are typically append-only; keep the newest N).
      this.notifications = this.notifications.slice(-MAX_NOTIFICATIONS);
    }

    if (Array.isArray(this.tasks) && this.tasks.length > MAX_TASKS) {
      // Drop oldest tasks by createdAt when available, otherwise truncate head.
      const sorted = [...this.tasks].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return at - bt;
      });
      this.tasks = sorted.slice(-MAX_TASKS);
    }
  } catch {
    // Never block a save on cap bookkeeping errors.
  }
});

// Speeds up dashboard list: members + non-archived workspaces.
workspaceSchema.index({ members: 1, archivedAt: 1 });
// Owner active count for workspace cap enforcement.
workspaceSchema.index({ owner: 1, archivedAt: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
module.exports.MAX_NOTIFICATIONS = MAX_NOTIFICATIONS;
module.exports.MAX_TASKS = MAX_TASKS;
