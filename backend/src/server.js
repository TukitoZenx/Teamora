const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const logger = require('./utils/logger');

/**
 * Fail fast if required configuration is missing.
 * Accepts MONGODB_URI (preferred) or MONGO_URI as aliases.
 */
const validateRequiredEnv = () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (mongoUri && !process.env.MONGODB_URI) {
    process.env.MONGODB_URI = mongoUri;
  }

  const required = {
    MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI,
    SESSION_SECRET: process.env.SESSION_SECRET,
    CLIENT_URL: process.env.CLIENT_URL,
    PORT: process.env.PORT
  };

  // PORT may default in non-production for local DX; require it explicitly in production.
  if (process.env.NODE_ENV !== 'production' && !required.PORT) {
    required.PORT = '5000';
    process.env.PORT = '5000';
  }

  const missing = Object.entries(required)
    .filter(([, value]) => value === undefined || value === null || String(value).trim() === '')
    .map(([key]) => key);

  if (missing.length > 0) {
    logger.error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Set them in backend/.env (see backend/.env.example) and restart.'
    );
    process.exit(1);
  }
};

validateRequiredEnv();

const app = require('./app');
const { sessionMiddleware, isAllowedOrigin } = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { attachCollabWs, closeCollabWs } = require('./collab/wsHub');
const { startReminderService } = require('./services/reminder.service');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const SHUTDOWN_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10_000);

const getTlsOptions = () => {
  const { TLS_KEY_PATH, TLS_CERT_PATH } = process.env;
  if (!TLS_KEY_PATH && !TLS_CERT_PATH) return null;
  if (!TLS_KEY_PATH || !TLS_CERT_PATH) {
    throw new Error('Set both TLS_KEY_PATH and TLS_CERT_PATH to enable HTTPS.');
  }

  return {
    key: fs.readFileSync(path.resolve(__dirname, '..', TLS_KEY_PATH)),
    cert: fs.readFileSync(path.resolve(__dirname, '..', TLS_CERT_PATH))
  };
};

let httpServer = null;
let shuttingDown = false;

const shutdown = async (signal, error) => {
  if (shuttingDown) return;
  shuttingDown = true;

  if (error) logger.error(String(signal), error);
  else logger.warn(`Shutdown signal: ${signal}`);

  const forceExit = setTimeout(() => {
    logger.error('Forced exit after shutdown timeout');
    process.exit(1);
  }, SHUTDOWN_MS);
  forceExit.unref?.();

  try {
    // Stop accepting new HTTP connections first.
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(() => resolve());
        // Node 18+: closeIdleConnections helps drain faster when available.
        if (typeof httpServer.closeIdleConnections === 'function') {
          httpServer.closeIdleConnections();
        }
      });
    }

    await closeCollabWs();
    await disconnectDatabase();
    clearTimeout(forceExit);
    logger.info('Graceful shutdown complete');
    process.exit(error ? 1 : 0);
  } catch (shutdownError) {
    logger.error('Error during shutdown', shutdownError);
    process.exit(1);
  }
};

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', error);
  // Log loudly but do not force-exit on every rejection — many transient
  // promise errors should not tear down the whole process in production.
  // Still exit on uncaughtException (true process-corrupt state).
  if (process.env.FATAL_ON_UNHANDLED_REJECTION === 'true') {
    shutdown('unhandledRejection', error);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  shutdown('uncaughtException', error);
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  shutdown('SIGINT');
});

const startServer = async () => {
  try {
    await connectDatabase();
    startReminderService();

    const tlsOptions = getTlsOptions();
    const server = tlsOptions ? https.createServer(tlsOptions, app) : http.createServer(app);
    httpServer = server;

    // Bound slow/hung clients so workers are not stuck indefinitely.
    server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 120_000);
    server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 65_000);
    server.keepAliveTimeout = Number(process.env.HTTP_KEEPALIVE_TIMEOUT_MS || 65_000);

    attachCollabWs(server, { sessionMiddleware, isAllowedOrigin });

    server.listen(PORT, HOST, () => {
      logger.info(`Teamora backend running at ${tlsOptions ? 'https' : 'http'}://${HOST}:${PORT}`, {
        nodeEnv: process.env.NODE_ENV || 'development',
        health: '/health',
        readiness: '/health/ready'
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
