# collab-workspace

## Production Environment

Set these values in Render for the backend:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=<mongodb-connection-string>
SESSION_SECRET=<long-random-session-secret>
CLIENT_URL=https://teamora-frontend.vercel.app
SERVER_URL=https://teamora-backend.onrender.com
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-username>
SMTP_PASS=<smtp-password>
EMAIL_FROM="Teamora <no-reply@your-domain.com>"
```

Set this value in Vercel for the frontend:

```env
VITE_API_URL=https://teamora-backend.onrender.com
```

In Google Cloud Console, add this exact authorized redirect URI:

```text
https://teamora-backend.onrender.com/api/auth/google/callback
```

For local development, use `http://localhost:5000/api/auth/google/callback` as the local Google redirect URI and set `CLIENT_URL=http://localhost:5173`.
