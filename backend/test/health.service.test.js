const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getLiveness, getReadiness, getMongoStatus } = require('../src/services/health.service');
const { isExempt } = require('../src/middleware/csrf.middleware');
const { requestIdMiddleware } = require('../src/middleware/requestId.middleware');

describe('health.service', () => {
  it('liveness reports ok with uptime and version', () => {
    const body = getLiveness();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'teamora-backend');
    assert.equal(typeof body.uptimeSec, 'number');
    assert.ok(body.uptimeSec >= 0);
    assert.ok(body.version);
    assert.ok(body.timestamp);
  });

  it('readiness includes mongodb and collab checks', () => {
    const body = getReadiness();
    assert.ok(['ready', 'not_ready'].includes(body.status));
    assert.equal(typeof body.ready, 'boolean');
    assert.ok(body.checks);
    assert.ok(body.checks.mongodb);
    assert.ok(body.checks.collab);
    // Unit tests do not open Mongo — expect not ready unless something else connected.
    assert.equal(typeof body.checks.mongodb.readyState, 'number');
    assert.equal(body.checks.collab.attached, false);
  });

  it('getMongoStatus returns a known label', () => {
    const mongo = getMongoStatus();
    assert.ok(['disconnected', 'connected', 'connecting', 'disconnecting', 'unknown'].includes(mongo.status));
  });
});

describe('health CSRF exemption', () => {
  it('exempts /health, /health/live, and /health/ready', () => {
    assert.equal(isExempt({ originalUrl: '/health' }), true);
    assert.equal(isExempt({ originalUrl: '/health/live' }), true);
    assert.equal(isExempt({ originalUrl: '/health/ready' }), true);
    assert.equal(isExempt({ originalUrl: '/api/v1/workspaces' }), false);
  });
});

describe('requestId middleware', () => {
  it('accepts a safe client request id', () => {
    const req = {
      get: (name) => (name.toLowerCase() === 'x-request-id' ? 'abcDEF12-ok_id' : null)
    };
    const headers = {};
    const res = {
      setHeader: (k, v) => {
        headers[k] = v;
      }
    };
    let next = false;
    requestIdMiddleware(req, res, () => {
      next = true;
    });
    assert.equal(next, true);
    assert.equal(req.requestId, 'abcDEF12-ok_id');
    assert.equal(headers['X-Request-Id'], 'abcDEF12-ok_id');
  });

  it('generates an id when none is provided', () => {
    const req = { get: () => null };
    const headers = {};
    const res = {
      setHeader: (k, v) => {
        headers[k] = v;
      }
    };
    requestIdMiddleware(req, res, () => {});
    assert.equal(typeof req.requestId, 'string');
    assert.ok(req.requestId.length >= 8);
    assert.equal(headers['X-Request-Id'], req.requestId);
  });

  it('rejects unsafe client ids and regenerates', () => {
    const req = {
      get: (name) => (name.toLowerCase() === 'x-request-id' ? 'bad id with spaces!!!' : null)
    };
    const res = { setHeader: () => {} };
    requestIdMiddleware(req, res, () => {});
    assert.notEqual(req.requestId, 'bad id with spaces!!!');
    assert.ok(/^[a-f0-9]+$/i.test(req.requestId));
  });
});
