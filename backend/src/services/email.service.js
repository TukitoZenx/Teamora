const nodemailer = require('nodemailer');

const createEmailError = (message, statusCode = 503) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

/**
 * Production email config checklist:
 * - SMTP_USER / SMTP_PASS (required) — Gmail needs an App Password
 * - SMTP_HOST (default smtp.gmail.com)
 * - SMTP_PORT 465 (SSL) or 587 (STARTTLS)
 * - SMTP_SECURE true for 465, false for 587
 * - EMAIL_FROM allowed by provider
 * - CLIENT_URL public frontend origin (reset links)
 * Optional: SMTP_URL, EMAIL_DEV_LOG=true for local testing without SMTP
 */
const getEmailConfig = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, EMAIL_FROM, SMTP_FROM, SMTP_URL, EMAIL_SMTP_URL } =
    process.env;

  const connectionUrl = (SMTP_URL || EMAIL_SMTP_URL || '').trim();
  if (connectionUrl) {
    return {
      connectionUrl,
      from: (EMAIL_FROM || SMTP_FROM || 'Teamora <no-reply@teamora.app>').trim()
    };
  }

  if (!SMTP_USER || !SMTP_PASS) {
    throw createEmailError(
      'Email service is not configured. Set SMTP_USER and SMTP_PASS (or SMTP_URL) in the server environment.',
      500
    );
  }

  const host = (SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(SMTP_PORT || 465);

  if (!Number.isInteger(port) || port <= 0) {
    throw createEmailError('Email service port is invalid.', 500);
  }

  const cleanPass = String(SMTP_PASS).replace(/\s+/g, '');
  const cleanUser = String(SMTP_USER).trim();
  const secure = parseBoolean(SMTP_SECURE, port === 465);

  return {
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    user: cleanUser,
    pass: cleanPass,
    from: (EMAIL_FROM || SMTP_FROM || cleanUser).trim()
  };
};

let cachedTransport = null;
let cachedTransportKey = '';

const getTransportKey = (config) =>
  config.connectionUrl || `${config.host}:${config.port}:${config.secure}:${config.user}`;

const getTransport = () => {
  const config = getEmailConfig();
  const key = getTransportKey(config);

  if (cachedTransport && cachedTransportKey === key) {
    return { transport: cachedTransport, config };
  }

  const transport = config.connectionUrl
    ? nodemailer.createTransport(config.connectionUrl)
    : nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        requireTLS: config.requireTLS,
        auth: {
          user: config.user,
          pass: config.pass
        },
        pool: true,
        maxConnections: 2,
        maxMessages: 50,
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        tls: {
          rejectUnauthorized: parseBoolean(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, true)
        }
      });

  cachedTransport = transport;
  cachedTransportKey = key;
  return { transport, config };
};

const verifyPasswordResetEmailConfiguration = () => {
  getEmailConfig();
  return true;
};

const getClientLogoUrl = () =>
  `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/teamora-favicon.png`;

const buildResetEmail = ({ resetUrl }) => `
  <div style="margin:0;padding:32px;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#111111;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #E5E7EB;border-radius:20px;padding:32px;background:#ffffff;box-shadow:0 12px 35px rgba(15,23,42,0.06);">
      <div style="margin-bottom:24px;">
        <img src="${getClientLogoUrl()}" alt="Teamora" width="144" style="display:block;max-width:144px;height:auto;" />
      </div>
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 12px;">Reset Password</h1>
      <p style="font-size:15px;line-height:1.7;color:#6B7280;margin:0 0 24px;">
        We received a request to reset the password for your Teamora account. Use the button below to continue.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#6D28FF;color:#ffffff;text-decoration:none;font-weight:700;border-radius:14px;padding:14px 22px;">
        Reset Password
      </a>
      <p style="font-size:13px;line-height:1.6;color:#6B7280;margin:24px 0 0;">
        This link expires in 15 minutes. If the button does not work, copy and paste this URL into your browser:
      </p>
      <p style="font-size:13px;line-height:1.6;color:#6D28FF;word-break:break-all;margin:8px 0 0;">${resetUrl}</p>
    </div>
  </div>
`;

const describeSmtpFailure = (error) => {
  const code = error?.code || error?.responseCode || '';
  const response = String(error?.response || error?.message || '');

  if (code === 'EAUTH' || /invalid login|authentication failed|badcredentials/i.test(response)) {
    return 'Email authentication failed. Check SMTP_USER/SMTP_PASS (Gmail requires an App Password).';
  }
  if (code === 'ESOCKET' || code === 'ETIMEDOUT' || code === 'ECONNECTION' || /timeout|connect/i.test(response)) {
    return 'Could not connect to the email server. Check SMTP_HOST/SMTP_PORT and outbound network rules.';
  }
  if (/daily limit|rate|too many/i.test(response)) {
    return 'Email provider rate limit reached. Try again later.';
  }
  return 'Unable to send reset email. Please try again later.';
};

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDevLog = parseBoolean(process.env.EMAIL_DEV_LOG, !isProduction);

  let transport;
  let config;

  try {
    ({ transport, config } = getTransport());
  } catch (error) {
    console.error('Teamora email configuration error:', {
      message: error.message,
      statusCode: error.statusCode,
      hasSmtpUser: Boolean(process.env.SMTP_USER),
      hasSmtpPass: Boolean(process.env.SMTP_PASS),
      hasSmtpUrl: Boolean(process.env.SMTP_URL || process.env.EMAIL_SMTP_URL),
      clientUrl: process.env.CLIENT_URL || null
    });

    if (allowDevLog && !isProduction) {
      console.warn('[email-dev] SMTP not configured. Password reset link:', resetUrl);
      return { delivered: false, devLogged: true };
    }

    throw error;
  }

  try {
    const info = await transport.sendMail({
      from: config.from,
      to,
      subject: 'Reset your Teamora password',
      html: buildResetEmail({ resetUrl }),
      text: [
        'Reset your Teamora password',
        '',
        'Use this link to choose a new password:',
        resetUrl,
        '',
        'This link expires in 15 minutes. If you did not request this, you can ignore this email.'
      ].join('\n')
    });

    console.info('Teamora password reset email sent', {
      to,
      from: config.from,
      messageId: info.messageId,
      smtpResponse: info.response
    });

    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    console.error('Teamora password reset email failed:', {
      to,
      code: error.code,
      responseCode: error.responseCode,
      message: error.message
    });
    if (error.statusCode) throw error;
    throw createEmailError(describeSmtpFailure(error), 503);
  }
};

module.exports = {
  verifyPasswordResetEmailConfiguration,
  sendPasswordResetEmail,
  getEmailConfig
};
