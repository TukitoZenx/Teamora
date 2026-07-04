const crypto = require('crypto');
const User = require('../models/User');
const { comparePassword } = require('../utils/password');
const { sendPasswordResetEmail } = require('./email.service');

const normalizeUsername = (username) => username.trim().toLowerCase();
const normalizeEmail = (email) => email.trim().toLowerCase();
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const USERNAME_PATTERN = /^[a-z0-9_][a-z0-9_.-]{2,39}$/;
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_EXPIRY_MS = 1000 * 60 * 15;
const RESET_SUCCESS_MESSAGE = "If an account exists, we've sent a password reset email.";

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
    throw createError('Username must be 3-40 characters and contain only letters, numbers, dots, hyphens, or underscores');
  }

  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw createError('Please provide a valid email address');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
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
};

const register = async ({ fullName, username, email, password, avatar }) => {
  const input = validateRegistrationInput({ fullName, username, email, password });

  const existingUser = await User.findOne({
    $or: [{ email: input.email }, { username: input.username }]
  });

  if (existingUser?.email === input.email) {
    throw createError('Email is already in use', 409);
  }

  if (existingUser?.username === input.username) {
    throw createError('Username is already in use', 409);
  }

  const user = await User.create({
    ...input,
    avatar: typeof avatar === 'string' ? avatar.trim() : '',
    provider: 'local'
  });

  return sanitizeUser(user);
};

const checkEmailAvailability = async ({ email }) => {
  const cleanEmail = normalizeEmail(requireString(email, 'Email'));

  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw createError('Please provide a valid email address');
  }

  const existingUser = await User.exists({ email: cleanEmail });

  if (existingUser) {
    throw createError('Email is already in use', 409);
  }

  return { available: true };
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
  const user = await User.findById(id);
  return user ? sanitizeUser(user) : null;
};

const updateProfile = async (userId, { fullName, username }) => {
  const cleanFullName = requireString(fullName, 'Full name');
  const cleanUsername = normalizeUsername(requireString(username, 'Username'));

  if (cleanFullName.length > 120) {
    throw createError('Full name must be 120 characters or fewer');
  }

  if (!USERNAME_PATTERN.test(cleanUsername)) {
    throw createError('Username must be 3-40 characters and contain only letters, numbers, dots, hyphens, or underscores');
  }

  const usernameOwner = await User.findOne({ username: cleanUsername });

  if (usernameOwner && usernameOwner._id.toString() !== userId.toString()) {
    throw createError('Username is already in use', 409);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      fullName: cleanFullName,
      username: cleanUsername,
      profileComplete: true
    },
    { new: true, runValidators: true }
  );

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

  return { message: 'Password updated successfully.' };
};

const buildGoogleUsername = async (email) => {
  const base = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'user';
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
  findOrCreateGoogleUser
};
