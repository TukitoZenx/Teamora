const { test, describe, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { requireAuth } = require('../src/middleware/auth.middleware');
const authService = require('../src/services/auth.service');

describe('requireAuth response shape', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('returns unified 401 with both message and error when session missing', async () => {
    const req = { session: null };
    let statusCode = 0;
    let body = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      }
    };
    let nextCalled = false;
    await requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(statusCode, 401);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Not authenticated');
    assert.equal(body.error, 'Not authenticated');
  });

  test('loads user and calls next when session is valid', async () => {
    mock.method(authService, 'findById', async () => ({ _id: 'u1', email: 'a@b.com' }));
    const req = { session: { userId: 'u1' } };
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      }
    };
    let nextCalled = false;
    await requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(req.user.email, 'a@b.com');
  });

  test('destroys session and returns 401 when user no longer exists', async () => {
    mock.method(authService, 'findById', async () => null);
    let destroyed = false;
    const req = {
      session: {
        userId: 'missing',
        destroy(cb) {
          destroyed = true;
          if (cb) cb();
        }
      }
    };
    let statusCode = 0;
    let body = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      }
    };
    let nextCalled = false;
    await requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(destroyed, true);
    assert.equal(statusCode, 401);
    assert.equal(body.message, 'Not authenticated');
  });

  test('forwards unexpected errors to next', async () => {
    mock.method(authService, 'findById', async () => {
      throw new Error('db down');
    });
    const req = { session: { userId: 'u1' } };
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      }
    };
    let nextError = null;
    await requireAuth(req, res, (err) => {
      nextError = err;
    });
    assert.ok(nextError);
    assert.equal(nextError.message, 'db down');
  });
});
