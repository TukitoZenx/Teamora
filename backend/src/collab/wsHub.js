const { WebSocketServer, WebSocket } = require('ws');
const Workspace = require('../models/Workspace');

/**
 * Lightweight collab WebSocket hub.
 * - Auth via existing express-session cookie on upgrade
 * - Rooms: `${workspaceId}::${contentKey}`
 * - Fanout only (REST remains durable store for Yjs / lists)
 */

const roomKey = (workspaceId, key) => `${workspaceId}::${key}`;

const isWorkspaceMember = (workspace, userId) =>
  workspace.members.some((memberId) => {
    const id = memberId._id || memberId;
    return id.toString() === userId.toString();
  });

const runSession = (sessionMiddleware, req) =>
  new Promise((resolve, reject) => {
    // Minimal response stub — session only needs setHeader/getHeader for cookies.
    const res = {
      getHeader() {},
      setHeader() {},
      end() {}
    };
    sessionMiddleware(req, res, (err) => {
      if (err) reject(err);
      else resolve(req.session);
    });
  });

/**
 * @param {import('http').Server} server
 * @param {{ sessionMiddleware: Function }} opts
 */
const attachCollabWs = (server, { sessionMiddleware }) => {
  const wss = new WebSocketServer({ noServer: true });
  /** @type {Map<string, Set<import('ws').WebSocket>>} */
  const rooms = new Map();

  const leaveAll = (ws) => {
    if (!ws.rooms) return;
    for (const rk of ws.rooms) {
      const set = rooms.get(rk);
      if (!set) continue;
      set.delete(ws);
      if (set.size === 0) rooms.delete(rk);
    }
    ws.rooms.clear();
  };

  const joinRoom = (ws, rk) => {
    if (!rooms.has(rk)) rooms.set(rk, new Set());
    rooms.get(rk).add(ws);
    if (!ws.rooms) ws.rooms = new Set();
    ws.rooms.add(rk);
  };

  const broadcast = (rk, message, exceptWs) => {
    const set = rooms.get(rk);
    if (!set) return;
    const raw = typeof message === 'string' ? message : JSON.stringify(message);
    for (const peer of set) {
      if (peer !== exceptWs && peer.readyState === WebSocket.OPEN) {
        try {
          peer.send(raw);
        } catch {
          // drop
        }
      }
    }
  };

  server.on('upgrade', async (req, socket, head) => {
    try {
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url || '/', `http://${host}`);
      if (url.pathname !== '/collab') {
        return;
      }

      await runSession(sessionMiddleware, req);
      const userId = req.session?.userId;
      if (!userId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.userId = String(userId);
        ws.rooms = new Set();
        wss.emit('connection', ws, req);
      });
    } catch (error) {
      console.error('[collab-ws] upgrade failed', error.message);
      try {
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      } catch {
        // ignore
      }
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object' || !msg.type) return;

      try {
        if (msg.type === 'join') {
          const workspaceId = String(msg.workspaceId || '');
          const key = String(msg.key || '');
          if (!workspaceId || !key) return;

          const workspace = await Workspace.findById(workspaceId).select('members archivedAt');
          if (!workspace || workspace.archivedAt || !isWorkspaceMember(workspace, ws.userId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not a workspace member' }));
            return;
          }

          const rk = roomKey(workspaceId, key);
          joinRoom(ws, rk);
          ws.userMeta = msg.user && typeof msg.user === 'object' ? msg.user : { name: 'User' };
          ws.send(JSON.stringify({ type: 'joined', workspaceId, key, peers: (rooms.get(rk)?.size || 1) - 1 }));
          broadcast(
            rk,
            {
              type: 'peer-join',
              workspaceId,
              key,
              user: ws.userMeta,
              clientId: ws.userMeta?.clientId
            },
            ws
          );
          return;
        }

        if (msg.type === 'leave') {
          const rk = roomKey(String(msg.workspaceId || ''), String(msg.key || ''));
          const set = rooms.get(rk);
          set?.delete(ws);
          ws.rooms?.delete(rk);
          broadcast(
            rk,
            {
              type: 'peer-leave',
              workspaceId: msg.workspaceId,
              key: msg.key,
              clientId: msg.clientId || ws.userMeta?.clientId
            },
            ws
          );
          return;
        }

        if (msg.type === 'yjs-update' || msg.type === 'awareness' || msg.type === 'list-update') {
          const rk = roomKey(String(msg.workspaceId || ''), String(msg.key || ''));
          if (!ws.rooms?.has(rk)) return;
          broadcast(rk, msg, ws);
          return;
        }

        // Meeting mesh signaling (multi-device). Room fanout; clients filter targets.
        if (msg.type === 'meeting-event') {
          const rk = roomKey(String(msg.workspaceId || ''), String(msg.key || 'meetings'));
          if (!ws.rooms?.has(rk)) return;
          broadcast(rk, msg, ws);
        }
      } catch (error) {
        console.error('[collab-ws] message error', error.message);
      }
    });

    ws.on('close', () => {
      if (ws.rooms) {
        for (const rk of ws.rooms) {
          broadcast(
            rk,
            {
              type: 'peer-leave',
              clientId: ws.userMeta?.clientId
            },
            ws
          );
        }
      }
      leaveAll(ws);
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        try {
          ws.terminate();
        } catch {
          // ignore
        }
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        // ignore
      }
    }
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  console.log('[collab-ws] attached at path /collab');
  return wss;
};

module.exports = {
  attachCollabWs,
  roomKey
};
