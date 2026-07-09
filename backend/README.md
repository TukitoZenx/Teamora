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
