const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { sessionMiddleware, isAllowedOrigin } = require('./app');
const connectDatabase = require('./config/database');
const { attachCollabWs } = require('./collab/wsHub');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

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

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

const startServer = async () => {
  try {
    await connectDatabase();

    const tlsOptions = getTlsOptions();
    const server = tlsOptions ? https.createServer(tlsOptions, app) : http.createServer(app);
    attachCollabWs(server, { sessionMiddleware, isAllowedOrigin });

    server.listen(PORT, HOST, () => {
      console.log(`Teamora backend running at ${tlsOptions ? 'https' : 'http'}://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
