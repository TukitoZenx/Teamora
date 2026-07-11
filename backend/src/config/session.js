const session = require('express-session');
const MongoStore = require('connect-mongo');

const isProduction = process.env.NODE_ENV === 'production';
const usesHttps = isProduction || Boolean(process.env.TLS_KEY_PATH && process.env.TLS_CERT_PATH);

const createSessionStore = () => {
  if (!process.env.MONGODB_URI) return undefined;
  return MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 * 30,
    autoRemove: 'native',
    crypto: process.env.SESSION_STORE_SECRET ? { secret: process.env.SESSION_STORE_SECRET } : undefined
  });
};

/**
 * Shared express-session middleware factory (HTTP + WebSocket upgrade).
 */
const createSessionMiddleware = (store) =>
  session({
    name: process.env.SESSION_COOKIE_NAME || 'teamora.sid',
    secret: process.env.SESSION_SECRET || 'development-session-secret',
    store: store || createSessionStore(),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: isProduction,
    cookie: {
      httpOnly: true,
      secure: usesHttps,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30
    }
  });

module.exports = {
  createSessionStore,
  createSessionMiddleware,
  isProduction,
  usesHttps
};
