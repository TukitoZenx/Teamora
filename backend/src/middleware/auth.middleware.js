const authService = require('../services/auth.service');

/** Unified 401 shape: both `message` and `error` for client compatibility. */
const unauthorized = (res, req) =>
  res.status(401).json({
    success: false,
    message: 'Not authenticated',
    error: 'Not authenticated',
    csrfToken: req?.session?.csrfToken || null
  });

const requireAuth = async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      return unauthorized(res, req);
    }

    const user = await authService.findById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return unauthorized(res, req);
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requireAuth
};
