const { WebSocketServer, WebSocket } = require('ws');
const Workspace = require('../models/Workspace');
const logger = require('../utils/logger');

/**
 * Lightweight collab WebSocket hub.
 * - Auth via existing express-session cookie on upgrade
 * - Rooms: `${workspaceId}::${contentKey}`
 * - Fanout only (REST remains durable store for Yjs / lists)
 * - Meetings: server-authoritative roster. Participants are removed only on
 *   explicit leave or after a disconnect grace period (so refresh can rejoin).
 */

const roomKey = (workspaceId, key) => `${workspaceId}::${key}`;

const DISCONNECT_GRACE_MS = Number(process.env.MEETING_DISCONNECT_GRACE_MS || 12000);

const DEFAULT_STUN = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun.cloudflare.com:3478'
];

const splitUrls = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const getMeetingIceServers = () => {
  const stunUrls = splitUrls(process.env.STUN_URLS);
  const turnUrls = splitUrls(process.env.TURN_URLS);
  const username = process.env.TURN_USERNAME || process.env.TURN_USER || '';
  const credential = process.env.TURN_CREDENTIAL || process.env.TURN_SECRET || '';
  const iceServers = [];
  (stunUrls.length ? stunUrls : DEFAULT_STUN).forEach((urls) => {
    iceServers.push({ urls });
  });
  if (turnUrls.length) {
    const entry = { urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls };
    if (username) entry.username = username;
    if (credential) entry.credential = credential;
    iceServers.push(entry);
  }
  return iceServers;
};

/** Set by attachCollabWs so services can kick clients when a workspace is deleted. */
let activeHub = null;
/** Active WebSocketServer instance for graceful shutdown / stats. */
let activeWss = null;

const isWorkspaceMember = (workspace, userId) =>
  workspace.members.some((memberId) => {
    const id = memberId._id || memberId;
    return id.toString() === userId.toString();
  });

/**
 * Notify and disconnect every collab/meeting socket for a deleted workspace.
 * Safe no-op if the hub is not attached (e.g. unit tests).
 */
const forceCloseWorkspace = (workspaceId) => {
  if (!activeHub || !workspaceId) return;
  activeHub.forceCloseWorkspace(String(workspaceId));
};

/** Snapshot for readiness / ops probes (no secrets). */
const getCollabStats = () => {
  if (!activeWss) {
    return { attached: false, clients: 0 };
  }
  return {
    attached: true,
    clients: activeWss.clients?.size || 0
  };
};

/**
 * Close all collab sockets and stop the hub (graceful process shutdown).
 */
const closeCollabWs = async () => {
  const wss = activeWss;
  activeWss = null;
  activeHub = null;
  if (!wss) return;

  for (const client of wss.clients) {
    try {
      client.close(1001, 'server shutting down');
    } catch {
      try {
        client.terminate();
      } catch {
        // ignore
      }
    }
  }

  await new Promise((resolve) => {
    try {
      wss.close(() => resolve());
    } catch {
      resolve();
    }
  });
  logger.info('Collab WebSocket hub closed');
};

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

const meetingEventName = (msg) => {
  if (msg?.event && typeof msg.event === 'string') return msg.event;
  const type = msg?.payload?.type;
  if (type === 'meeting-started') return 'receive-meeting-started';
  if (type === 'meeting-join') return 'receive-meeting-join';
  if (type === 'meeting-leave' || type === 'participant-left') return 'receive-meeting-leave';
  if (type === 'meeting-state-change') return 'receive-meeting-state-change';
  if (type === 'meeting-ended') return 'receive-meeting-ended';
  if (type === 'meeting-signal') return 'receive-meeting-signal';
  if (type === 'meeting-claim-host') return 'receive-meeting-host';
  return '';
};

const normalizeParticipant = (raw, extras = {}) => {
  if (!raw || typeof raw !== 'object') return null;
  const nested = raw.participant && typeof raw.participant === 'object' ? raw.participant : raw;
  const socketId = String(nested.socketId || extras.socketId || extras.clientId || '');
  if (!socketId) return null;
  return {
    socketId,
    clientId: String(nested.clientId || extras.clientId || socketId),
    userId: String(nested.userId || extras.userId || ''),
    user: nested.user || extras.user || 'User',
    micActive: nested.micActive !== false,
    camActive: nested.camActive !== false,
    handRaised: Boolean(nested.handRaised)
  };
};

/**
 * @param {import('http').Server} server
 * @param {{ sessionMiddleware: Function, isAllowedOrigin?: (origin: string) => boolean }} opts
 */
const attachCollabWs = (server, { sessionMiddleware, isAllowedOrigin = () => true }) => {
  // Cap frame size to reduce memory DoS from huge yjs/signaling payloads.
  const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024 });
  /** @type {Map<string, Set<import('ws').WebSocket>>} */
  const rooms = new Map();
  /** @type {Map<string, Object>} */
  const activeMeetings = new Map();
  /** @type {Map<string, ReturnType<typeof setTimeout>>} */
  const pendingDisconnects = new Map();

  const disconnectKey = (workspaceId, identity) => `${workspaceId}::${identity}`;

  const cancelPendingDisconnect = (workspaceId, identities = []) => {
    for (const identity of identities) {
      if (!identity) continue;
      const key = disconnectKey(workspaceId, identity);
      const timer = pendingDisconnects.get(key);
      if (timer) {
        clearTimeout(timer);
        pendingDisconnects.delete(key);
      }
    }
  };

  const findParticipantKey = (meeting, ids = []) => {
    if (!meeting?.participants) return null;
    const wanted = new Set(ids.filter(Boolean).map(String));
    if (!wanted.size) return null;
    for (const [key, part] of Object.entries(meeting.participants)) {
      if (
        wanted.has(key) ||
        wanted.has(String(part.socketId || '')) ||
        wanted.has(String(part.clientId || '')) ||
        (part.userId && wanted.has(String(part.userId)))
      ) {
        return key;
      }
    }
    return null;
  };

  const snapshotMeeting = (meeting) => {
    if (!meeting) return null;
    return {
      meetingId: meeting.meetingId,
      title: meeting.title,
      organizer: meeting.organizer,
      startedAt: meeting.startedAt,
      hostSocketId: meeting.hostSocketId || '',
      hostName: meeting.hostName || '',
      participants: { ...meeting.participants }
    };
  };

  const sendMeetingSession = (ws, workspaceId) => {
    const meeting = activeMeetings.get(workspaceId);
    const rk = roomKey(workspaceId, 'meetings');
    if (meeting) {
      ws.send(
        JSON.stringify({
          type: 'meeting-event',
          workspaceId,
          key: 'meetings',
          event: 'meeting-active-session',
          payload: {
            type: 'meeting-active-session',
            ...snapshotMeeting(meeting)
          }
        })
      );
    } else {
      ws.send(
        JSON.stringify({
          type: 'meeting-event',
          workspaceId,
          key: 'meetings',
          event: 'meeting-not-active',
          payload: { type: 'meeting-not-active' }
        })
      );
    }
    return rk;
  };

  const ensureMeeting = (workspaceId, seed = {}) => {
    let meeting = activeMeetings.get(workspaceId);
    if (!meeting) {
      meeting = {
        meetingId: seed.meetingId || `meet-${workspaceId}`,
        title: seed.title || 'Teamora Call',
        organizer: seed.organizer || 'Host',
        startedAt: seed.startedAt || new Date().toISOString(),
        hostSocketId: seed.hostSocketId || '',
        hostName: seed.hostName || seed.organizer || '',
        participants: {}
      };
      activeMeetings.set(workspaceId, meeting);
    } else {
      if (seed.title) meeting.title = seed.title;
      if (seed.organizer) meeting.organizer = seed.organizer;
      if (seed.hostSocketId) meeting.hostSocketId = seed.hostSocketId;
      if (seed.hostName) meeting.hostName = seed.hostName;
    }
    return meeting;
  };

  const broadcastMeetingLeave = (workspaceId, socketId) => {
    const rk = roomKey(workspaceId, 'meetings');
    broadcast(rk, {
      type: 'meeting-event',
      workspaceId,
      key: 'meetings',
      event: 'receive-meeting-leave',
      payload: socketId
    });
  };

  const broadcastMeetingEnded = (workspaceId, meetingId) => {
    const rk = roomKey(workspaceId, 'meetings');
    broadcast(rk, {
      type: 'meeting-event',
      workspaceId,
      key: 'meetings',
      event: 'receive-meeting-ended',
      payload: { type: 'meeting-ended', workspaceId, meetingId }
    });
  };

  const removeParticipantNow = (workspaceId, socketId, { endIfEmpty = true } = {}) => {
    const meeting = activeMeetings.get(workspaceId);
    if (!meeting || !socketId) return;
    const key = findParticipantKey(meeting, [socketId]) || socketId;
    const existing = meeting.participants[key];
    if (!existing) return;
    delete meeting.participants[key];
    cancelPendingDisconnect(workspaceId, [key, existing.socketId, existing.clientId, existing.userId]);
    broadcastMeetingLeave(workspaceId, existing.socketId || key);
    if (endIfEmpty && Object.keys(meeting.participants).length === 0) {
      activeMeetings.delete(workspaceId);
      broadcastMeetingEnded(workspaceId, meeting.meetingId);
    }
  };

  const scheduleParticipantRemoval = (workspaceId, ws) => {
    const meeting = activeMeetings.get(workspaceId);
    if (!meeting) return;
    const key = findParticipantKey(meeting, [ws.socketId, ws.clientId, ws.userId]);
    if (!key) return;
    const part = meeting.participants[key];
    const identities = [key, part?.socketId, part?.clientId, part?.userId, ws.socketId, ws.clientId, ws.userId];
    cancelPendingDisconnect(workspaceId, identities);
    const timerKey = disconnectKey(workspaceId, part?.userId || key);
    const timer = setTimeout(() => {
      pendingDisconnects.delete(timerKey);
      const current = activeMeetings.get(workspaceId);
      if (!current) return;
      const still = findParticipantKey(current, identities);
      if (!still) return;
      // Someone else with a live socket may have taken over this identity.
      const live = [...(rooms.get(roomKey(workspaceId, 'meetings')) || [])].some((peer) => {
        if (peer.readyState !== WebSocket.OPEN) return false;
        return (
          peer !== ws &&
          (peer.socketId === still ||
            peer.clientId === still ||
            (current.participants[still]?.userId && peer.userId === current.participants[still].userId))
        );
      });
      if (live) return;
      removeParticipantNow(workspaceId, still);
    }, DISCONNECT_GRACE_MS);
    pendingDisconnects.set(timerKey, timer);
  };

  const upsertParticipant = (workspaceId, participant, ws) => {
    if (!participant?.socketId) return null;
    const meeting = ensureMeeting(workspaceId, {
      organizer: participant.user,
      hostSocketId: participant.socketId,
      hostName: participant.user
    });
    const previousKey = findParticipantKey(meeting, [
      participant.socketId,
      participant.clientId,
      participant.userId,
      ws?.socketId,
      ws?.clientId,
      ws?.userId
    ]);
    const previous = previousKey ? meeting.participants[previousKey] : null;
    if (previousKey && previousKey !== participant.socketId) {
      delete meeting.participants[previousKey];
      if (previous && previous.socketId && previous.socketId !== participant.socketId) {
        broadcastMeetingLeave(workspaceId, previous.socketId);
      }
    }
    meeting.participants[participant.socketId] = {
      ...(previous || {}),
      ...participant
    };
    cancelPendingDisconnect(workspaceId, [participant.socketId, participant.clientId, participant.userId, previousKey]);
    if (ws) {
      ws.socketId = participant.socketId;
      ws.clientId = participant.clientId || participant.socketId;
    }
    return meeting;
  };

  const forceCloseWorkspaceInner = (workspaceId) => {
    const id = String(workspaceId || '');
    if (!id) return;

    activeMeetings.delete(id);
    for (const key of [...pendingDisconnects.keys()]) {
      if (key.startsWith(`${id}::`)) {
        clearTimeout(pendingDisconnects.get(key));
        pendingDisconnects.delete(key);
      }
    }

    const prefix = `${id}::`;
    const toClose = [];
    for (const [rk, set] of rooms.entries()) {
      if (!rk.startsWith(prefix)) continue;
      toClose.push([rk, set]);
    }

    const payload = JSON.stringify({
      type: 'workspace-deleted',
      workspaceId: id,
      message: 'This workspace was deleted by the owner'
    });

    for (const [rk, set] of toClose) {
      for (const peer of set) {
        try {
          if (peer.readyState === WebSocket.OPEN) {
            peer.send(payload);
          }
        } catch {
          // ignore send errors
        }
        try {
          peer.rooms?.clear?.();
          peer.close(4000, 'workspace deleted');
        } catch {
          try {
            peer.terminate();
          } catch {
            // ignore
          }
        }
      }
      rooms.delete(rk);
    }
  };

  activeHub = { forceCloseWorkspace: forceCloseWorkspaceInner };

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
        socket.destroy();
        return;
      }

      if (!isAllowedOrigin(req.headers.origin || '')) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
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
          if (msg.clientId) ws.clientId = String(msg.clientId);
          if (msg.socketId) ws.socketId = String(msg.socketId);
          if (!ws.socketId && ws.clientId) ws.socketId = ws.clientId;
          if (msg.userId) ws.claimedUserId = String(msg.userId);

          const joinAck = {
            type: 'joined',
            workspaceId,
            key,
            peers: (rooms.get(rk)?.size || 1) - 1,
            iceServers: key === 'meetings' ? getMeetingIceServers() : undefined
          };
          ws.send(JSON.stringify(joinAck));

          if (key === 'meetings') {
            cancelPendingDisconnect(workspaceId, [ws.socketId, ws.clientId, ws.userId]);
            const meeting = activeMeetings.get(workspaceId);
            if (meeting) {
              const existingKey = findParticipantKey(meeting, [ws.socketId, ws.clientId, ws.userId]);
              if (existingKey && meeting.participants[existingKey]) {
                const existing = meeting.participants[existingKey];
                const nextId = ws.socketId || existing.socketId;
                if (existingKey !== nextId) {
                  delete meeting.participants[existingKey];
                  if (existing.socketId && existing.socketId !== nextId) {
                    broadcastMeetingLeave(workspaceId, existing.socketId);
                  }
                }
                meeting.participants[nextId] = {
                  ...existing,
                  socketId: nextId,
                  clientId: ws.clientId || existing.clientId,
                  userId: ws.userId || existing.userId
                };
                ws.socketId = nextId;
              }
            }
            sendMeetingSession(ws, workspaceId);
          }

          broadcast(
            rk,
            {
              type: 'peer-join',
              workspaceId,
              key,
              user: ws.userMeta,
              clientId: ws.clientId || ws.userMeta?.clientId
            },
            ws
          );
          return;
        }

        if (msg.type === 'leave') {
          const workspaceId = String(msg.workspaceId || '');
          const key = String(msg.key || '');
          const rk = roomKey(workspaceId, key);
          const set = rooms.get(rk);
          set?.delete(ws);
          if (set && set.size === 0) rooms.delete(rk);
          ws.rooms?.delete(rk);
          if (key === 'meetings') {
            removeParticipantNow(workspaceId, msg.socketId || msg.clientId || ws.socketId || ws.clientId);
          }
          broadcast(
            rk,
            {
              type: 'peer-leave',
              workspaceId: msg.workspaceId,
              key: msg.key,
              clientId: msg.clientId || ws.clientId || ws.userMeta?.clientId
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
          const workspaceId = String(msg.workspaceId || '');
          const rk = roomKey(workspaceId, String(msg.key || 'meetings'));
          if (!ws.rooms?.has(rk)) return;

          if (msg.socketId) ws.socketId = String(msg.socketId);
          if (msg.clientId) ws.clientId = String(msg.clientId);
          if (!ws.socketId && ws.clientId) ws.socketId = ws.clientId;

          const event = meetingEventName(msg);
          const p = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
          const payloadType = p.type || event.replace(/^receive-/, '');

          if (payloadType === 'meeting-started' || event === 'receive-meeting-started') {
            ensureMeeting(workspaceId, {
              meetingId: p.meetingId,
              title: p.title,
              organizer: p.organizer,
              startedAt: p.startedAt,
              hostSocketId: p.organizerId || p.hostSocketId || ws.socketId,
              hostName: p.organizer || p.hostName
            });
          } else if (payloadType === 'meeting-join' || event === 'receive-meeting-join') {
            const participant = normalizeParticipant(p, {
              socketId: p.socketId || ws.socketId || ws.clientId,
              clientId: msg.clientId || ws.clientId,
              userId: ws.userId,
              user: p.user || ws.userMeta?.name
            });
            if (participant) {
              upsertParticipant(workspaceId, participant, ws);
              msg.payload = participant;
              msg.event = 'receive-meeting-join';
            }
          } else if (payloadType === 'meeting-state-change' || event === 'receive-meeting-state-change') {
            const meeting = activeMeetings.get(workspaceId);
            const state = p.state || p;
            const sid = p.socketId || msg.socketId || ws.socketId;
            const key = meeting ? findParticipantKey(meeting, [sid, ws.clientId, ws.userId]) : null;
            if (meeting && key) {
              meeting.participants[key] = {
                ...meeting.participants[key],
                ...state
              };
            }
          } else if (payloadType === 'meeting-leave' || event === 'receive-meeting-leave') {
            const leaveId =
              (typeof msg.payload === 'string' && msg.payload) || p.socketId || msg.socketId || ws.socketId;
            removeParticipantNow(workspaceId, leaveId);
            // Fanout already handled by removeParticipantNow; skip duplicate broadcast.
            return;
          } else if (payloadType === 'meeting-ended' || event === 'receive-meeting-ended') {
            const meeting = activeMeetings.get(workspaceId);
            activeMeetings.delete(workspaceId);
            msg.event = 'receive-meeting-ended';
            msg.payload = { type: 'meeting-ended', workspaceId, meetingId: meeting?.meetingId || p.meetingId };
          } else if (event === 'receive-meeting-host' || payloadType === 'meeting-claim-host') {
            const meeting = activeMeetings.get(workspaceId);
            if (meeting) {
              meeting.hostSocketId = p.hostSocketId || ws.socketId;
              meeting.hostName = p.hostName || meeting.hostName;
            }
          }

          if (!msg.event && event) msg.event = event;
          broadcast(rk, msg, ws);
        }
      } catch (error) {
        console.error('[collab-ws] message error', error.message);
      }
    });

    ws.on('close', () => {
      if (ws.rooms) {
        for (const rk of ws.rooms) {
          const [workspaceId, key] = rk.split('::');
          if (key === 'meetings') {
            // Refresh/reconnect: keep roster until grace expires or they rejoin.
            scheduleParticipantRemoval(workspaceId, ws);
          }
          broadcast(
            rk,
            {
              type: 'peer-leave',
              workspaceId,
              key,
              clientId: ws.clientId || ws.userMeta?.clientId || ws.socketId
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

  wss.on('close', () => {
    clearInterval(heartbeat);
    for (const timer of pendingDisconnects.values()) {
      clearTimeout(timer);
    }
    pendingDisconnects.clear();
  });

  activeWss = wss;
  logger.info('Collab WebSocket attached at path /collab');
  return wss;
};

module.exports = {
  attachCollabWs,
  forceCloseWorkspace,
  closeCollabWs,
  getCollabStats,
  roomKey
};
