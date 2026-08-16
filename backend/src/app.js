const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const compression = require('compression');
const morgan = require('morgan');
const helmet = require('helmet');
const authRoutes = require('./routes/auth.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const aiRoutes = require('./routes/ai.routes');
const configurePassport = require('./config/passport');
const { createSessionStore, createSessionMiddleware, isProduction } = require('./config/session');
const { ensureCsrfCookie, verifyCsrf } = require('./middleware/csrf.middleware');
const { requestIdMiddleware } = require('./middleware/requestId.middleware');
const { getLiveness, getReadiness } = require('./services/health.service');
const logger = require('./utils/logger');
const app = express();

const { normalizeUrl, isAllowedDevelopmentLanOrigin } = require('./utils/origin.util');

const clientUrl = normalizeUrl(process.env.CLIENT_URL || 'http://localhost:5173');
const extraClientUrls = String(process.env.CLIENT_URLS || '')
  .split(',')
  .map((value) => normalizeUrl(value.trim()))
  .filter(Boolean);
const productionClientUrl = 'https://teamora-ruby.vercel.app';
const localDevOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];
const allowedOrigins = new Set([
  clientUrl,
  productionClientUrl,
  'https://teamora.vercel.app',
  ...extraClientUrls,
  ...(isProduction ? [] : localDevOrigins)
]);
const isAllowedVercelPreview = (origin = '') => {
  if (isProduction) return false;
  return /^https:\/\/teamora(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
};

const isAllowedOrigin = (origin = '', { requireOrigin = false } = {}) => {
  if (!origin) return !requireOrigin;
  return allowedOrigins.has(origin) || isAllowedVercelPreview(origin) || isAllowedDevelopmentLanOrigin(origin);
};

const sessionStore = createSessionStore();
const sessionMiddleware = createSessionMiddleware(sessionStore);

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production');
}

// CSRF mitigation: session auth uses `sameSite: 'none'` cookies in production
// (required because the frontend and backend are on different origins), which
// on its own does not stop "simple" (non-preflighted) cross-site requests from
// reaching state-changing routes. Requiring `Content-Type: application/json`
// forces the browser to send a CORS preflight for every mutating request,
// which the existing origin allow-list then rejects for untrusted origins.
// The legitimate frontend already sends this header on every request (see
// frontend/src/services/api.js), so this is a no-op for real traffic.
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const requireJsonContentType = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method) || req.is('application/json') || req.is('multipart/form-data')) {
    return next();
  }

  return res.status(415).json({
    success: false,
    message: 'Content-Type must be application/json or multipart/form-data'
  });
};

app.use(helmet());
app.use(compression());
// Correlation id first so access logs and errors can include it.
app.use(requestIdMiddleware);
configurePassport();
morgan.token('request-id', (req) => req.requestId || '-');
app.use(
  morgan(
    isProduction
      ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" rid=:request-id'
      : ':method :url :status :response-time ms rid=:request-id'
  )
);
if (isProduction) {
  app.set('trust proxy', 1);
}
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Include X-Request-Id so the SPA correlation header survives CORS preflight.
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-XSRF-TOKEN',
      'X-CSRF-TOKEN',
      'X-Request-Id',
      'X-Correlation-Id'
    ]
  })
);
// Cap JSON body size. 12mb allows presentation decks with a few compressed
// images (base64). Avatars remain capped server-side separately.
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(requireJsonContentType);

// Liveness / readiness before session + CSRF so probes do not create Mongo sessions.
app.get(['/health', '/health/live'], (req, res) => {
  res.status(200).json(getLiveness());
});
app.get('/health/ready', (req, res) => {
  const body = getReadiness();
  res.status(body.ready ? 200 : 503).json(body);
});

app.use(cookieParser());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
// Double-submit / synchronizer CSRF: issue cookie+session token, verify on mutations.
// (JSON Content-Type + CORS remain a first line of defence for browsers.)
app.use(ensureCsrfCookie);
app.use(verifyCsrf);

app.use('/api/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/ai', aiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestId: req.requestId
  });
});

app.use((error, req, res, next) => {
  const requestId = req.requestId;
  const log = logger.with({ requestId });

  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origin is not allowed by CORS',
      requestId
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `${field} is already in use`,
      requestId
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid identifier', requestId });
  }

  if (error.name === 'ValidationError') {
    const first = error.errors && Object.values(error.errors)[0];
    return res.status(400).json({
      success: false,
      message: first?.message || 'Validation failed',
      requestId
    });
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;

  if (statusCode === 500) {
    log.error('Unhandled request error', error);
  } else if (statusCode >= 400) {
    log.warn('Request failed', { statusCode, message: error.message });
  }

  res.status(statusCode).json({ success: false, message, requestId });
});

module.exports = app;
module.exports.sessionMiddleware = sessionMiddleware;
module.exports.isAllowedOrigin = isAllowedOrigin;
