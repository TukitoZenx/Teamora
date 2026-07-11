const passport = require('passport');
const authService = require('../services/auth.service');

const sessionCookieName = () => process.env.SESSION_COOKIE_NAME || 'teamora.sid';
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const usesHttps = () =>
  process.env.NODE_ENV === 'production' || Boolean(process.env.TLS_KEY_PATH && process.env.TLS_CERT_PATH);
const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: usesHttps(),
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/'
});

const setSessionUser = (req, user) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError);
        return;
      }

      req.session.userId = user._id.toString();
      req.session.save((saveError) => {
        if (saveError) {
          reject(saveError);
          return;
        }

        resolve();
      });
    });
  });

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    await setSessionUser(req, user);
    res.status(201).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

const checkEmail = async (req, res, next) => {
  try {
    const result = await authService.checkEmailAvailability(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const user = await authService.login(req.body);
    await setSessionUser(req, user);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword({
      token: req.params.token || req.body.token,
      password: req.body.password
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const logout = (req, res, next) => {
  if (!req.session) {
    res.clearCookie(sessionCookieName(), sessionCookieOptions());
    return res.status(200).json({ success: true, message: 'Logged out' });
  }

  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie(sessionCookieName(), sessionCookieOptions());
    return res.status(200).json({ success: true, message: 'Logged out' });
  });
};

const me = (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user._id, req.body);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

const google = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ success: false, message: 'Google OAuth is not configured' });
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: true
  })(req, res, next);
};

const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: true }, async (error, user) => {
    if (error) {
      return next(error);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Google authentication failed' });
    }

    try {
      await setSessionUser(req, user);
      const targetPath = user.profileComplete === false ? '/complete-profile' : '/dashboard';
      return res.redirect(`${clientUrl()}${targetPath}`);
    } catch (sessionError) {
      return next(sessionError);
    }
  })(req, res, next);
};

module.exports = {
  register,
  checkEmail,
  login,
  forgotPassword,
  resetPassword,
  logout,
  me,
  updateProfile,
  google,
  googleCallback
};
