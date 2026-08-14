const crypto = require('crypto');
const { isProduction, usesHttps } = require('../config/session');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Paths exempt from CSRF verification.
 * Google OAuth starts/returns via browser redirects that cannot attach X-XSRF-TOKEN.
 */
// Health probes must never require sessions/CSRF (platform load balancers).
const CSRF_EXEMPT = [/^\/api\/auth\/google(\/|$)/i, /^\/health(\/|$)/i];

const isExempt = (req) => {
  const path = req.originalUrl?.split('?')[0] || req.path || '';
  return CSRF_EXEMPT.some((re) => re.test(path));
};

const generateToken = () => crypto.randomBytes(32).toString('hex');

const saveSession = (req) =>
  new Promise((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

/**
 * Create a CSRF token if the session does not have one. Does not rotate an
 * existing token — rotating on GET /csrf races with login / forgot-password.
 */
const ensureCsrfToken = (req, res) => {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  res.cookie('XSRF-TOKEN', req.session.csrfToken, cookieOptions());
  return req.session.csrfToken;
};

const tokensEqual = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const cookieOptions = () => ({
  // Readable by the SPA so it can copy the value into X-XSRF-TOKEN.
  // Cross-origin SPAs also fetch the token from GET /api/auth/csrf.
  httpOnly: false,
  secure: usesHttps,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 30
});

/**
 * Ensure every session has a CSRF token and mirror it into a non-httpOnly cookie
 * (Double-Submit Cookie + synchronizer token stored in session).
 */
const ensureCsrfCookie = (req, res, next) => {
  try {
    if (!req.session) return next();

    ensureCsrfToken(req, res);
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Verify X-XSRF-TOKEN (or X-CSRF-TOKEN) matches the session token on mutations.
 */
const verifyCsrf = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (isExempt(req)) return next();

  const sessionToken = req.session?.csrfToken;
  const headerToken =
    req.get('X-XSRF-TOKEN') || req.get('x-xsrf-token') || req.get('X-CSRF-TOKEN') || req.get('x-csrf-token');
  const cookieToken = req.cookies?.['XSRF-TOKEN'];

  if (!sessionToken || !headerToken || !tokensEqual(headerToken, sessionToken)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  // Optional double-submit: if the cookie is present, it must also match.
  if (cookieToken && !tokensEqual(cookieToken, sessionToken)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  return next();
};

/** Rotate CSRF token (e.g. after login) to limit fixation windows. */
const rotateCsrfToken = (req, res) => {
  if (!req.session) return null;
  req.session.csrfToken = generateToken();
  res.cookie('XSRF-TOKEN', req.session.csrfToken, cookieOptions());
  return req.session.csrfToken;
};

module.exports = {
  ensureCsrfCookie,
  ensureCsrfToken,
  saveSession,
  verifyCsrf,
  rotateCsrfToken,
  generateToken,
  isExempt
};
