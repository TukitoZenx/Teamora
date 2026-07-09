const nodemailer = require('nodemailer');

const createEmailError = (message, statusCode = 503) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getEmailConfig = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, EMAIL_FROM, SMTP_FROM } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    throw createEmailError('Email service is not configured (Missing credentials).', 500);
  }

  const host = (SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(SMTP_PORT || 465);

  if (!Number.isInteger(port) || port <= 0) {
    throw createEmailError('Email service port is invalid.', 500);
  }

  const cleanPass = SMTP_PASS.replace(/\s+/g, '');
  const cleanUser = SMTP_USER.trim();

  return {
    host,
    port,
    secure: SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465,
    user: cleanUser,
    pass: cleanPass,
    from: (EMAIL_FROM || SMTP_FROM || cleanUser).trim()
  };
};

const getTransport = () => {
  const config = getEmailConfig();

  return nodemailer.createTransport({
    // Use the explicit host/port/secure from config instead of the 'gmail'
    // service shorthand so SMTP_HOST/SMTP_PORT/SMTP_SECURE are actually honored.
    // Defaults (smtp.gmail.com:465, secure) match Gmail's settings exactly, so
    // this is behavior-compatible with the previous hardcoded 'gmail' service
    // while also supporting any other SMTP provider via env vars.
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    // Increased timeouts to prevent Render/Cloud network drops
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000
  });
};

const verifyPasswordResetEmailConfiguration = () => {
  getEmailConfig();
  return true;
};

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

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  let transport;
  let config;

  try {
    config = getEmailConfig();
    transport = getTransport();
  } catch (error) {
    console.error('Teamora email configuration error:', {
      message: error.message,
      statusCode: error.statusCode
    });
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
      smtpResponse: info.response
    });
  } catch (error) {
    console.error('Teamora password reset email failed. Full error stack:', error.stack || error);
    if (error.statusCode) throw error;
    throw createEmailError('Unable to send reset email. Please try again later.', 503);
  }
};

const getClientLogoUrl = () => `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/teamora.png`;

module.exports = {
  verifyPasswordResetEmailConfiguration,
  sendPasswordResetEmail
};
