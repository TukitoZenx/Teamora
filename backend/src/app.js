const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const authRoutes = require('./routes/auth.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const configurePassport = require('./config/passport');
const compression = require('compression');
const morgan = require('morgan');
const app = express();
const helmet = require('helmet');

const normalizeUrl = (url) => (url || '').replace(/\/$/, '');
const clientUrl = normalizeUrl(process.env.CLIENT_URL || 'http://localhost:5173');
const productionClientUrl = 'https://teamora-ruby.vercel.app';
const allowedOrigins = new Set([
  clientUrl,
  productionClientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
]);
const isAllowedVercelPreview = (origin = '') => /^https:\/\/teamora-[a-z0-9-]+\.vercel\.app$/i.test(origin);
const isProduction = process.env.NODE_ENV === 'production';
const sessionStore = process.env.MONGODB_URI
  ? MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24 * 30,
      autoRemove: 'native',
      crypto: process.env.SESSION_STORE_SECRET ? { secret: process.env.SESSION_STORE_SECRET } : undefined
    })
  : undefined;

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
  if (!MUTATING_METHODS.has(req.method) || req.is('application/json')) {
    return next();
  }

  return res.status(415).json({
    success: false,
    message: 'Content-Type must be application/json'
  });
};

app.use(helmet());
app.use(compression());
configurePassport();
app.use(morgan(isProduction ? 'combined' : 'dev'));
if (isProduction) {
  app.set('trust proxy', 1);
}
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isAllowedVercelPreview(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
// Cap JSON body size. 2mb supports workspace content blobs (docs/files) while
// still bounding memory; avatars remain capped server-side at ~200k chars.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(requireJsonContentType);
app.use(cookieParser());
app.use(
  session({
    name: process.env.SESSION_COOKIE_NAME || 'teamora.sid',
    secret: process.env.SESSION_SECRET || 'development-session-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: isProduction,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((error, req, res, next) => {
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origin is not allowed by CORS' });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `${field} is already in use` });
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json({ success: false, message });
});

module.exports = app;
