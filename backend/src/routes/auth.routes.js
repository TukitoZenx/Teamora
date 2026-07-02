const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/check-email', authController.checkEmail);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch('/profile', requireAuth, authController.updateProfile);
router.get('/google', authController.google);
router.post('/google', authController.google);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
