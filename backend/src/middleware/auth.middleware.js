const authService = require('../services/auth.service');

/** Unified 401 shape: both `message` and `error` for client compatibility. */
const unauthorized = (res) =>
  res.status(401).json({
    success: false,
    message: 'Not authenticated',
    error: 'Not authenticated'
  });

const requireAuth = async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      return unauthorized(res);
    }

    const user = await authService.findById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return unauthorized(res);
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
