const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateRegistrationInput,
  validateLoginInput,
  validatePassword,
  sanitizeAvatar
} = require('../src/services/auth.service');

const assertThrows = (fn, messageMatch, statusCode) => {
  let err;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  assert.ok(err, 'expected throw');
  if (messageMatch) assert.match(err.message, messageMatch);
  if (statusCode !== undefined) assert.equal(err.statusCode, statusCode);
};

describe('auth.service pure validation', () => {
  it('accepts valid registration input and normalizes email/username', () => {
    const input = validateRegistrationInput({
      fullName: ' Ada Lovelace ',
      username: 'Ada_Lovelace',
      email: 'Ada@Example.COM',
      password: 'password1'
    });
    assert.equal(input.fullName, 'Ada Lovelace');
    assert.equal(input.username, 'ada_lovelace');
    assert.equal(input.email, 'ada@example.com');
    assert.equal(input.password, 'password1');
  });

  it('rejects short passwords on register', () => {
    assertThrows(
      () =>
        validateRegistrationInput({
          fullName: 'Test User',
          username: 'test_user',
          email: 't@example.com',
          password: 'short'
        }),
      /at least 8/i
    );
  });

  it('rejects passwords longer than bcrypt limit (72)', () => {
    assertThrows(
      () =>
        validateRegistrationInput({
          fullName: 'Test User',
          username: 'test_user',
          email: 't@example.com',
          password: 'x'.repeat(73)
        }),
      /at most 72/i
    );
  });

  it('rejects invalid usernames', () => {
    assertThrows(
      () =>
        validateRegistrationInput({
          fullName: 'Test User',
          username: 'ab',
          email: 't@example.com',
          password: 'password1'
        }),
      /Username must be/i
    );
  });

  it('rejects invalid emails on login', () => {
    assertThrows(() => validateLoginInput({ email: 'not-an-email', password: 'password1' }), /valid email/i);
  });

  it('validatePassword enforces min/max', () => {
    assert.doesNotThrow(() => validatePassword('12345678'));
    assertThrows(() => validatePassword('1234567'), /at least 8/i);
    assertThrows(() => validatePassword('x'.repeat(73)), /at most 72/i);
  });

  it('sanitizeAvatar allows https and raster data URLs only', () => {
    assert.equal(sanitizeAvatar('https://cdn.example.com/a.png'), 'https://cdn.example.com/a.png');
    assert.equal(sanitizeAvatar('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
    assertThrows(() => sanitizeAvatar('data:image/svg+xml;base64,PHN2Zz4='), /PNG, JPEG/i);
    assertThrows(() => sanitizeAvatar('javascript:alert(1)'), /PNG, JPEG/i);
  });

  it('sanitizeAvatar rejects oversized payloads', () => {
    const huge = `data:image/png;base64,${'A'.repeat(190_001)}`;
    assertThrows(() => sanitizeAvatar(huge), /140 KB/i);
  });
});
