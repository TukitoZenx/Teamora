const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const rateLimit = require('express-rate-limit');

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';

// Only throttle unauthenticated, brute-forceable/enumerable endpoints. Routes
// that already require a valid session (`/me`, `/profile`, `/logout`) are
// deliberately excluded so normal app usage (e.g. `/me` on every page load)
// can never lock a legitimate, already-authenticated user out of their own
// session. Disabled outside production so local development isn't throttled.
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 forgot password requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after 15 minutes.'
  }
});

const sensitive = isProduction ? [authLimiter] : [];

router.post('/register', ...sensitive, authController.register);
router.post('/check-email', ...sensitive, authController.checkEmail);
router.post('/login', ...sensitive, authController.login);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password/:token', ...sensitive, authController.resetPassword);
router.post('/reset-password', ...sensitive, authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch('/profile', requireAuth, authController.updateProfile);
router.get('/google', ...sensitive, authController.google);
router.post('/google', ...sensitive, authController.google);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
