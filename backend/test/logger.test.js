const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('logger', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('logs info/warn/error without throwing', () => {
    // Re-require under controlled NODE_ENV
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    delete require.cache[require.resolve('../src/utils/logger')];
    const logger = require('../src/utils/logger');

    const logs = [];
    mock.method(console, 'log', (...args) => logs.push(['log', ...args]));
    mock.method(console, 'warn', (...args) => logs.push(['warn', ...args]));
    mock.method(console, 'error', (...args) => logs.push(['error', ...args]));

    logger.info('hello', { a: 1 });
    logger.warn('careful');
    logger.error('boom', new Error('x'));
    const child = logger.with({ requestId: 'rid123' });
    child.error('req failed', { statusCode: 500 });

    assert.ok(logs.some((l) => l[0] === 'log'));
    assert.ok(logs.some((l) => l[0] === 'warn'));
    assert.ok(logs.filter((l) => l[0] === 'error').length >= 2);

    process.env.NODE_ENV = prev;
    delete require.cache[require.resolve('../src/utils/logger')];
  });

  it('emits JSON lines in production mode', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete require.cache[require.resolve('../src/utils/logger')];
    const logger = require('../src/utils/logger');

    let line = '';
    mock.method(console, 'log', (msg) => {
      line = msg;
    });
    logger.info('prod-msg', { requestId: 'abc' });
    const parsed = JSON.parse(line);
    assert.equal(parsed.level, 'info');
    assert.equal(parsed.message, 'prod-msg');
    assert.equal(parsed.requestId, 'abc');
    assert.ok(parsed.time);

    process.env.NODE_ENV = prev;
    delete require.cache[require.resolve('../src/utils/logger')];
  });
});
