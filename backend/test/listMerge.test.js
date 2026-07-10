const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  mergeCommentsPayload,
  mergeVersionsPayload,
  mergeMessagesPayload,
  MAX_VERSIONS
} = require('../src/services/listMerge');

describe('Comments merge (comments-v1)', () => {
  test('concurrent creates of different comments both survive', () => {
    const a = {
      format: 'comments-v1',
      comments: [{ id: 'c1', text: 'Alice', createdAt: '2026-01-01T00:00:00.000Z' }],
      removed: {}
    };
    const b = {
      format: 'comments-v1',
      comments: [{ id: 'c2', text: 'Bob', createdAt: '2026-01-01T00:00:01.000Z' }],
      removed: {}
    };
    const merged = mergeCommentsPayload(a, b);
    assert.equal(merged.format, 'comments-v1');
    assert.equal(merged.comments.length, 2);
    assert.ok(merged.comments.some((c) => c.id === 'c1'));
    assert.ok(merged.comments.some((c) => c.id === 'c2'));
  });

  test('tombstone removes comment unless resurrected with newer timestamp', () => {
    const existing = {
      comments: [{ id: 'c1', text: 'Hi', createdAt: '2026-01-01T00:00:00.000Z' }],
      removed: {}
    };
    const deleted = mergeCommentsPayload(existing, {
      comments: [],
      removed: { c1: '2026-01-02T00:00:00.000Z' }
    });
    assert.equal(deleted.comments.length, 0);

    const resurrected = mergeCommentsPayload(deleted, {
      comments: [
        {
          id: 'c1',
          text: 'Back',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z'
        }
      ],
      removed: {}
    });
    assert.equal(resurrected.comments.length, 1);
    assert.equal(resurrected.comments[0].text, 'Back');
  });
});

describe('Versions merge (versions-v1)', () => {
  test('concurrent draft versions both survive', () => {
    const a = {
      versions: [
        {
          versionId: 'v1',
          user: 'A',
          data: '<p>A</p>',
          createdAt: '2026-01-01T00:00:00.000Z',
          timestamp: 't1'
        }
      ]
    };
    const b = {
      versions: [
        {
          versionId: 'v2',
          user: 'B',
          data: '<p>B</p>',
          createdAt: '2026-01-01T00:00:01.000Z',
          timestamp: 't2'
        }
      ]
    };
    const merged = mergeVersionsPayload(a, b);
    assert.equal(merged.format, 'versions-v1');
    assert.equal(merged.versions.length, 2);
    assert.ok(merged.versions.some((v) => v.versionId === 'v1'));
    assert.ok(merged.versions.some((v) => v.versionId === 'v2'));
  });

  test('caps at MAX_VERSIONS keeping newest', () => {
    const many = Array.from({ length: MAX_VERSIONS + 10 }, (_, i) => ({
      versionId: `v${i}`,
      data: String(i),
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString()
    }));
    const merged = mergeVersionsPayload({ versions: [] }, { versions: many });
    assert.equal(merged.versions.length, MAX_VERSIONS);
    assert.equal(merged.versions[0].versionId, `v${MAX_VERSIONS + 9}`);
  });
});

describe('Messages merge (messages-v1)', () => {
  test('concurrent chat messages both survive', () => {
    const a = {
      messages: [{ id: 'm1', text: 'hi', createdAt: '2026-01-01T00:00:00.000Z' }]
    };
    const b = {
      messages: [{ id: 'm2', text: 'hello', createdAt: '2026-01-01T00:00:01.000Z' }]
    };
    const merged = mergeMessagesPayload(a, b);
    assert.equal(merged.format, 'messages-v1');
    assert.equal(merged.messages.length, 2);
  });
});
