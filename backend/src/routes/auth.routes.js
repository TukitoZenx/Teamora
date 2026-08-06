const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const rateLimit = require('express-rate-limit');

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';

// Throttle only unauthenticated, brute-forceable endpoints.
// /me, /logout, /profile, /google*, /csrf are intentionally unthrottled so
// legitimate session traffic cannot lock a user out mid-session.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after 15 minutes.'
  }
});

const sensitive = isProduction ? [authLimiter] : [];
const forgot = [forgotPasswordLimiter];
// Enumeration surface: always throttle check-email (even in development).
const checkEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many email checks. Please try again later.'
  }
});

router.post('/register', ...sensitive, authController.register);
router.post('/check-email', checkEmailLimiter, authController.checkEmail);
router.post('/login', ...sensitive, authController.login);
router.post('/forgot-password', ...forgot, authController.forgotPassword);
router.post('/reset-password/:token', ...sensitive, authController.resetPassword);
router.post('/reset-password', ...sensitive, authController.resetPassword);

// Unthrottled session / OAuth / CSRF endpoints
router.get('/csrf', authController.csrfToken);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch('/profile', requireAuth, authController.updateProfile);
router.get('/google', authController.google);
router.post('/google', authController.google);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
