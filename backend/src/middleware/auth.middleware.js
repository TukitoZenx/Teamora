const authService = require('../services/auth.service');

const requireAuth = async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await authService.findById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, message: 'Authentication required' });
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
