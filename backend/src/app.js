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
const rateLimit = require('express-rate-limit');

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
const sessionStore =
  process.env.MONGODB_URI
    ? MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 60 * 60 * 24 * 30,
        autoRemove: 'native',
        crypto: process.env.SESSION_STORE_SECRET
          ? { secret: process.env.SESSION_STORE_SECRET }
          : undefined
      })
    : undefined;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later."
  }
});

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production');
}

app.use(helmet());
app.use(compression());
configurePassport();
app.use(morgan('dev'));
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

if (isProduction) {
  app.use('/api/auth', authLimiter, authRoutes);
} else {
  app.use('/api/auth', authRoutes);
}
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
