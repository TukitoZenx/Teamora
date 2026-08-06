const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { verifyCsrf, generateToken, isExempt } = require('../src/middleware/csrf.middleware');

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
};

describe('CSRF middleware', () => {
  test('generateToken returns a non-empty hex string', () => {
    const token = generateToken();
    assert.equal(typeof token, 'string');
    assert.ok(token.length >= 32);
  });

  test('GET requests are not blocked', () => {
    const req = { method: 'GET', session: { csrfToken: 'abc' }, get: () => null, cookies: {} };
    const res = mockRes();
    let nextCalled = false;
    verifyCsrf(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });

  test('POST without token is rejected with 403', () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/v1/workspaces',
      path: '/api/v1/workspaces',
      session: { csrfToken: 'secret-token' },
      get: () => null,
      cookies: {}
    };
    const res = mockRes();
    let nextCalled = false;
    verifyCsrf(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /CSRF/i);
  });

  test('POST with matching header token is allowed', () => {
    const token = 'matching-csrf-token';
    const req = {
      method: 'POST',
      originalUrl: '/api/v1/workspaces',
      path: '/api/v1/workspaces',
      session: { csrfToken: token },
      get: (name) => (name.toLowerCase() === 'x-xsrf-token' ? token : null),
      cookies: { 'XSRF-TOKEN': token }
    };
    const res = mockRes();
    let nextCalled = false;
    verifyCsrf(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });

  test('Google OAuth paths are exempt', () => {
    assert.equal(isExempt({ originalUrl: '/api/auth/google' }), true);
    assert.equal(isExempt({ originalUrl: '/api/auth/google/callback?code=1' }), true);
    assert.equal(isExempt({ originalUrl: '/api/v1/workspaces' }), false);
  });
});
