const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, comparePassword } = require('../src/utils/password');

describe('password utils', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('correct-horse-battery');
    assert.equal(typeof hash, 'string');
    assert.notEqual(hash, 'correct-horse-battery');
    assert.equal(await comparePassword('correct-horse-battery', hash), true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('secret-value-12');
    assert.equal(await comparePassword('wrong-password', hash), false);
  });

  it('produces different hashes for the same password (salted)', async () => {
    const a = await hashPassword('same-password-ok');
    const b = await hashPassword('same-password-ok');
    assert.notEqual(a, b);
    assert.equal(await comparePassword('same-password-ok', a), true);
    assert.equal(await comparePassword('same-password-ok', b), true);
  });
});
