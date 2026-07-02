const nodemailer = require('nodemailer');

const createEmailError = (message, statusCode = 502) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getTransport = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  const values = [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS];
  const configuredValues = values.filter(Boolean);

  if (configuredValues.length > 0 && configuredValues.length < values.length) {
    throw createEmailError('Email service is not fully configured.', 503);
  }

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

const verifyPasswordResetEmailConfiguration = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const values = [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS];
  const configuredValues = values.filter(Boolean);

  if (configuredValues.length > 0 && configuredValues.length < values.length) {
    throw createEmailError('Email service is not fully configured.', 503);
  }

  if (configuredValues.length === 0 && process.env.NODE_ENV === 'production') {
    throw createEmailError('Email service is not configured.', 503);
  }
};

const buildResetEmail = ({ resetUrl }) => `
  <div style="margin:0;padding:32px;background:#ffffff;font-family:Inter,Arial,sans-serif;color:#111111;">
    <div style="max-width:520px;margin:0 auto;border:1px solid #E5E7EB;border-radius:16px;padding:32px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:24px;color:#6D28FF;">Teamora</div>
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 12px;">Reset your Teamora password</h1>
      <p style="font-size:15px;line-height:1.7;color:#6B7280;margin:0 0 24px;">
        Use the button below to create a new password for your Teamora account.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#6D28FF;color:#ffffff;text-decoration:none;font-weight:700;border-radius:14px;padding:14px 22px;">
        Reset Password
      </a>
      <p style="font-size:13px;line-height:1.6;color:#6B7280;margin:24px 0 0;">
        This link expires in 15 minutes. If you didn't request this, ignore this email.
      </p>
    </div>
  </div>
`;

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  let transport;

  try {
    transport = getTransport();
  } catch (error) {
    console.error('Teamora email configuration error:', error);
    throw error;
  }

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Teamora SMTP is not configured. Password reset link was not emailed.');
      console.info(`Teamora password reset link for ${to}: ${resetUrl}`);
      return;
    }

    throw createEmailError('Email service is not configured.', 503);
  }

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'Teamora <no-reply@teamora.app>',
      to,
      subject: 'Reset your Teamora password',
      html: buildResetEmail({ resetUrl })
    });
  } catch (error) {
    console.error('Teamora password reset email failed:', {
      to,
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw createEmailError('Unable to send reset email. Please try again later.');
  }
};

module.exports = {
  verifyPasswordResetEmailConfiguration,
  sendPasswordResetEmail
};
