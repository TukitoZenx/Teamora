const path = require('path'); //  used to path
const http = require('http');
const https = require('https');
const fs = require('fs');
// load .env file then it access the values like port , mongodb , etc...
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app'); // used as handler for the http server
const { sessionMiddleware, isAllowedOrigin } = require('./app'); // used for the websocket server
const connectDatabase = require('./config/database'); // used to connect to the database
const { attachCollabWs } = require('./collab/wsHub'); // used to attach the websocket server

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
