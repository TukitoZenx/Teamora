const mongoose = require('mongoose');
const { hashPassword } = require('../utils/password');

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

const recentWorkspaceSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    ownerName: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'previously_joined', 'removed', 'trashed'],
      default: 'active',
      index: true
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date,
      default: null
    },
    requestedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required() {
        return this.provider === 'local';
      },
      select: false
    },
    avatar: {
      type: String,
      default: ''
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    profileComplete: {
      type: Boolean,
      default: true
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    recentWorkspaces: [recentWorkspaceSchema]
  },
  {
    timestamps: true,
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    },
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

userSchema.pre('save', async function hashPasswordBeforeSave() {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  if (!this.isNew && BCRYPT_HASH_PATTERN.test(this.password)) {
    return;
  }

  this.password = await hashPassword(this.password);
});

module.exports = mongoose.model('User', userSchema);
