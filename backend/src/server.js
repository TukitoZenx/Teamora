const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { sessionMiddleware } = require('./app');
const connectDatabase = require('./config/database');
const { attachCollabWs } = require('./collab/wsHub');

const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

const startServer = async () => {
  try {
    await connectDatabase();

    const server = http.createServer(app);
    attachCollabWs(server, { sessionMiddleware });

    server.listen(PORT, () => {
      console.log(`Teamora backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
