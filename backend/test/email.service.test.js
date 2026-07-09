const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const emailService = require('../src/services/email.service');

describe('Email Service', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASS = 'secretpass';
    process.env.EMAIL_FROM = 'no-reply@example.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    mock.restoreAll();
  });

  test('verifyPasswordResetEmailConfiguration succeeds when all required env vars are present', () => {
    const result = emailService.verifyPasswordResetEmailConfiguration();
    assert.equal(result, true);
  });

  test('verifyPasswordResetEmailConfiguration throws when required env vars are missing', () => {
    delete process.env.SMTP_USER;
    assert.throws(
      () => emailService.verifyPasswordResetEmailConfiguration(),
      (err) => err.message.includes('Email service is not configured')
    );
  });

  test('sendPasswordResetEmail uses explicit host, port, and secure settings', async () => {
    let capturedTransportOptions = null;
    let sentMailOptions = null;

    mock.method(nodemailer, 'createTransport', (options) => {
      capturedTransportOptions = options;
      return {
        sendMail: async (mailOpts) => {
          sentMailOptions = mailOpts;
          return { response: '250 2.0.0 OK' };
        }
      };
    });

    await emailService.sendPasswordResetEmail({
      to: 'recipient@example.com',
      resetUrl: 'http://localhost:5173/reset-password/test-token-123'
    });

    assert.equal(capturedTransportOptions.host, 'smtp.example.com');
    assert.equal(capturedTransportOptions.port, 587);
    assert.equal(capturedTransportOptions.secure, false);
    assert.equal(capturedTransportOptions.auth.user, 'user@example.com');
    assert.equal(capturedTransportOptions.auth.pass, 'secretpass');

    assert.equal(sentMailOptions.to, 'recipient@example.com');
    assert.equal(sentMailOptions.from, 'no-reply@example.com');
    assert.match(sentMailOptions.subject, /Reset your Teamora password/);
    assert.match(sentMailOptions.html, /test-token-123/);
  });
});
