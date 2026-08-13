const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const { comparePassword } = require('../utils/password');
const { sendPasswordResetEmail } = require('./email.service');

const normalizeUsername = (username) => username.trim().toLowerCase();
const normalizeEmail = (email) => email.trim().toLowerCase();
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const USERNAME_PATTERN = /^[a-z0-9_][a-z0-9_.-]{2,39}$/;
const MIN_PASSWORD_LENGTH = 8;
/** bcrypt only uses 72 bytes; reject absurd lengths to prevent CPU DoS. */
const MAX_PASSWORD_LENGTH = 72;
// Base64 data URLs expand ~33% over raw file bytes. Client caps files at 140 KB;
// ~190k chars leaves headroom for the data:image/...;base64, prefix.
const MAX_AVATAR_LENGTH = 190_000;
const RESET_TOKEN_EXPIRY_MS = 1000 * 60 * 15;
const RESET_SUCCESS_MESSAGE = "If an account exists, we've sent a password reset email.";

const sanitizeAvatar = (avatar) => {
  if (avatar === undefined) return undefined;
  if (typeof avatar !== 'string') {
    throw createError('Avatar must be a string');
  }

  const cleanAvatar = avatar.trim();
  if (!cleanAvatar) return '';

  if (cleanAvatar.length > MAX_AVATAR_LENGTH) {
    throw createError('Image must be under 140 KB');
  }

  // Only allow empty, absolute http(s) URLs, or raster data:image URLs (no SVG — XSS risk).
  if (!/^https?:\/\//i.test(cleanAvatar) && !/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(cleanAvatar)) {
    throw createError('Avatar must be a PNG, JPEG, GIF, or WebP image URL or data URL');
  }

  return cleanAvatar;
};

const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject() : user;
  delete plainUser.password;
  delete plainUser.__v;
  return plainUser;
};

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const requireString = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError(`${field} is required`);
  }

  return value.trim();
};

const validateRegistrationInput = ({ fullName, username, email, password }) => {
  const cleanFullName = requireString(fullName, 'Full name');
  const cleanUsername = normalizeUsername(requireString(username, 'Username'));
  const cleanEmail = normalizeEmail(requireString(email, 'Email'));

  if (typeof password !== 'string' || !password) {
    throw createError('Password is required');
  }

  if (cleanFullName.length > 120) {
    throw createError('Full name must be 120 characters or fewer');
  }

  if (!USERNAME_PATTERN.test(cleanUsername)) {
    throw createError(
      'Username must be 3-40 characters and contain only letters, numbers, dots, hyphens, or underscores'
    );
  }

  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw createError('Please provide a valid email address');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw createError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }

  return {
    fullName: cleanFullName,
    username: cleanUsername,
    email: cleanEmail,
    password
  };
};

const validateLoginInput = ({ email, password }) => {
  const cleanEmail = normalizeEmail(requireString(email, 'Email'));

  if (typeof password !== 'string' || !password) {
    throw createError('Password is required');
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw createError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }

  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw createError('Please provide a valid email address');
  }

  return {
    email: cleanEmail,
    password
  };
};

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getClientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

const validatePassword = (password) => {
  if (typeof password !== 'string' || !password) {
    throw createError('Password is required');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw createError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }
};

const register = async ({ fullName, username, email, password, avatar }) => {
  const input = validateRegistrationInput({ fullName, username, email, password });

  const existingUser = await User.findOne({
    $or: [{ email: input.email   }, { username: input.username }]
  });

  if (existingUser?.email === input.email) {
    throw createError('Email is already in use', 409);
  }

  if (existingUser?.username === input.username) {
    throw createError('Username is already in use', 409);
  }

  const user = await User.create({
    ...input,
    avatar: sanitizeAvatar(typeof avatar === 'string' ? avatar : '') || '',
    provider: 'local'
  });

  return sanitizeUser(user);
};

const checkEmailAvailability = async ({ email }) => {
  const cleanEmail = normalizeEmail(requireString(email, 'Email'));

  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw createError('Please provide a valid email address');
  }

  // Constant-ish response shape: always 200 with { available }.
  // Still theoretically enumerable, but no 409 differential; pair with rate limits.
  // Small fixed delay reduces trivial timing probes without blocking UX.
  const started = Date.now();
  const existingUser = await User.exists({ email: cleanEmail });
  const elapsed = Date.now() - started;
  if (elapsed < 80) {
    await new Promise((r) => setTimeout(r, 80 - elapsed));
  }

  return { available: !existingUser };
};

const login = async ({ email, password }) => {
  const input = validateLoginInput({ email, password });
  const user = await User.findOne({ email: input.email }).select('+password');

  if (!user || !user.password) {
    throw createError('Invalid credentials', 401);
  }

  const passwordMatches = await comparePassword(input.password, user.password);

  if (!passwordMatches) {
    throw createError('Invalid credentials', 401);
  }

  return sanitizeUser(user);
};

const findById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const user = await User.findById(id);
  return user ? sanitizeUser(user) : null;
};

const updateProfile = async (userId, { fullName, username, avatar }) => {
  const cleanFullName = requireString(fullName, 'Full name');
  const cleanUsername = normalizeUsername(requireString(username, 'Username'));

  if (cleanFullName.length > 120) {
    throw createError('Full name must be 120 characters or fewer');
  }

  if (!USERNAME_PATTERN.test(cleanUsername)) {
    throw createError(
      'Username must be 3-40 characters and contain only letters, numbers, dots, hyphens, or underscores'
    );
  }

  const usernameOwner = await User.findOne({ username: cleanUsername });

  if (usernameOwner && usernameOwner._id.toString() !== userId.toString()) {
    throw createError('Username is already in use', 409);
  }

  const updates = {
    fullName: cleanFullName,
    username: cleanUsername,
    profileComplete: true
  };

  if (avatar !== undefined) {
    updates.avatar = sanitizeAvatar(avatar) || '';
  }

  const user = await User.findByIdAndUpdate(userId, updates, { returnDocument: 'after', runValidators: true });

  if (!user) {
    throw createError('User not found', 404);
  }

  return sanitizeUser(user);
};

const forgotPassword = async ({ email }) => {
  const cleanEmail = typeof email === 'string' ? normalizeEmail(email) : '';

  if (!EMAIL_PATTERN.test(cleanEmail)) {
    return { message: RESET_SUCCESS_MESSAGE };
  }

  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    return { message: RESET_SUCCESS_MESSAGE };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = hashResetToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${getClientUrl()}/reset-password/${resetToken}`;
  try {
    await sendPasswordResetEmail({ to: user.email, resetUrl });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error('Teamora forgot-password email delivery failed:', {
      userId: user._id.toString(),
      statusCode: error.statusCode,
      message: error.message
    });
    throw error;
  }

  return { message: RESET_SUCCESS_MESSAGE };
};

/** Best-effort: drop Mongo session store entries that reference this userId. */
const invalidateUserSessions = async (userId) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) return;
    const id = userId.toString();
    // connect-mongo stores serialized session JSON; match userId assignment.
    await mongoose.connection.collection('sessions').deleteMany({
      $or: [{ 'session.userId': id }, { session: new RegExp(`"userId":"${id}"`) }]
    });
  } catch (error) {
    console.error('Session invalidation after password reset failed:', error.message);
  }
};

const resetPassword = async ({ token, password }) => {
  const cleanToken = requireString(token, 'Reset token');
  validatePassword(password);

  const user = await User.findOne({
    passwordResetToken: hashResetToken(cleanToken),
    passwordResetExpires: { $gt: new Date() }
  }).select('+password +passwordResetToken +passwordResetExpires');

  if (!user) {
    throw createError('Password reset link is invalid or has expired', 400);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Prevent stolen sessions from remaining valid after a password reset.
  await invalidateUserSessions(user._id);

  return { message: 'Password updated successfully.' };
};

const buildGoogleUsername = async (email) => {
  const base =
    email
      .split('@')[0]
      .replace(/[^a-z0-9_]/gi, '')
      .toLowerCase() || 'user';
  let candidate = base;
  let suffix = 1;

  while (await User.exists({ username: candidate })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const findOrCreateGoogleUser = async (profile) => {
  const email = profile.emails?.[0]?.value;

  if (!email) {
    throw createError('Google account email is required', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    let changed = false;
    // Google has verified email ownership, so signing in via Google is safe.
    // Keep any existing local password hash so the user can still use email
    // login if they had one; only mark the provider when the account was
    // pure-local and is now also Google-capable.
    if (existingUser.provider === 'local') {
      existingUser.provider = 'google';
      changed = true;
    }
    if (!existingUser.avatar && profile.photos?.[0]?.value) {
      existingUser.avatar = profile.photos[0].value;
      changed = true;
    }
    if (changed) {
      await existingUser.save({ validateBeforeSave: false });
    }
    return sanitizeUser(existingUser);
  }

  const username = await buildGoogleUsername(normalizedEmail);

  const user = await User.create({
    fullName: profile.displayName || normalizedEmail,
    username,
    email: normalizedEmail,
    avatar: profile.photos?.[0]?.value || '',
    provider: 'google',
    profileComplete: false
  });

  return sanitizeUser(user);
};

module.exports = {
  register,
  checkEmailAvailability,
  forgotPassword,
  login,
  findById,
  resetPassword,
  updateProfile,
  findOrCreateGoogleUser,
  // Pure validators exported for unit tests / future shared use
  validateRegistrationInput,
  validateLoginInput,
  validatePassword,
  sanitizeAvatar,
  sanitizeUser
};
