const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mergeFilesPayload } = require('../src/services/filesContent');

describe('Files content merge (files-v1)', () => {
  test('concurrent creates on two clients both survive', () => {
    const a = {
      files: [{ id: 'doc-a', name: 'A', type: 'file', kind: 'document', updatedAt: '2026-01-01T00:00:00.000Z' }],
      removed: {}
    };
    const b = {
      files: [{ id: 'doc-b', name: 'B', type: 'file', kind: 'document', updatedAt: '2026-01-01T00:00:01.000Z' }],
      removed: {}
    };

    const ab = mergeFilesPayload(a, b);
    const ba = mergeFilesPayload(b, a);

    assert.equal(ab.files.length, 2);
    assert.equal(ba.files.length, 2);
    assert.ok(ab.files.some((f) => f.id === 'doc-a'));
    assert.ok(ab.files.some((f) => f.id === 'doc-b'));
    assert.deepEqual(ab.files.map((f) => f.id).sort(), ba.files.map((f) => f.id).sort());
  });

  test('newer rename wins for same file id', () => {
    const server = {
      files: [{ id: 'doc-1', name: 'Old', type: 'file', kind: 'document', updatedAt: '2026-01-01T00:00:00.000Z' }],
      removed: {}
    };
    const client = {
      files: [{ id: 'doc-1', name: 'New', type: 'file', kind: 'document', updatedAt: '2026-01-01T00:00:05.000Z' }],
      removed: {}
    };

    const merged = mergeFilesPayload(server, client);
    assert.equal(merged.files.length, 1);
    assert.equal(merged.files[0].name, 'New');
  });

  test('tombstone removes file unless resurrected with newer updatedAt', () => {
    const t0 = new Date(Date.now() - 60_000).toISOString();
    const t1 = new Date(Date.now() - 30_000).toISOString();
    const t2 = new Date().toISOString();

    const server = {
      files: [{ id: 'doc-1', name: 'Keep?', type: 'file', kind: 'document', updatedAt: t0 }],
      removed: {}
    };
    const clientDelete = {
      files: [],
      removed: { 'doc-1': t1 }
    };

    const deleted = mergeFilesPayload(server, clientDelete);
    assert.equal(deleted.files.length, 0);
    assert.ok(deleted.removed['doc-1']);

    const resurrect = {
      files: [{ id: 'doc-1', name: 'Back', type: 'file', kind: 'document', updatedAt: t2 }],
      removed: {}
    };
    const again = mergeFilesPayload(deleted, resurrect);
    assert.equal(again.files.length, 1);
    assert.equal(again.files[0].name, 'Back');
  });
});
