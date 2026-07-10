# Teamora Backend API

Express 5 + Mongoose 9 REST API providing authentication, session management, and workspace collaboration management for Teamora.

## Environment Variables

Create a `.env` file in `backend/` based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/teamora
CLIENT_URL=http://localhost:5173
SESSION_SECRET=your-session-secret
SESSION_COOKIE_NAME=teamora.sid
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=no-reply@teamora.com
```

## Running the API

- **Development**: `npm run dev`
- **Production**: `npm start`

## Running Tests

Automated unit tests use Node's native test runner (`node:test`) and run in isolation without requiring MongoDB:

```bash
npm test
```

## Formatting Check

```bash
npm run format:check
```

## Meetings WebRTC ICE / TURN

Cross-device audio/video uses a WebRTC mesh. STUN is enabled by default. For peers behind restrictive NATs, configure TURN in the **frontend** env (Vite):

```env
VITE_TURN_URLS=turn:turn.example.com:3478,turns:turn.example.com:5349
VITE_TURN_USERNAME=your-user
VITE_TURN_CREDENTIAL=your-secret
# Optional STUN override:
# VITE_STUN_URLS=stun:stun.l.google.com:19302
```

Meeting join toast indicates whether TURN is configured. Signaling uses WebSocket `/collab` room `meetings` plus same-browser BroadcastChannel.
