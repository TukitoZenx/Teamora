const { test, describe, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Workspace = require('../src/models/Workspace');
const WorkspaceContent = require('../src/models/WorkspaceContent');
const contentService = require('../src/services/content.service');

describe('Content Service', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('rejects non-members from reading content', async () => {
    const workspaceId = new mongoose.Types.ObjectId();
    const outsiderId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();

    mock.method(Workspace, 'findById', () => ({
      select: () =>
        Promise.resolve({
          _id: workspaceId,
          members: [ownerId],
          archivedAt: null
        })
    }));

    await assert.rejects(
      () => contentService.getContent(outsiderId, workspaceId.toString(), 'files'),
      (error) => {
        assert.equal(error.statusCode, 404);
        return true;
      }
    );
  });

  test('rejects non-members from writing content (membership guard)', async () => {
    const workspaceId = new mongoose.Types.ObjectId();
    const outsiderId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();

    mock.method(Workspace, 'findById', () => ({
      select: () =>
        Promise.resolve({
          _id: workspaceId,
          members: [ownerId],
          archivedAt: null
        })
    }));

    await assert.rejects(
      () => contentService.putContent(outsiderId, workspaceId.toString(), 'files', { format: 'files-v1', files: [] }),
      (error) => {
        assert.equal(error.statusCode, 404);
        return true;
      }
    );
  });

  test('rejects invalid content keys', async () => {
    const workspaceId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    mock.method(Workspace, 'findById', () => ({
      select: () =>
        Promise.resolve({
          _id: workspaceId,
          members: [userId],
          archivedAt: null
        })
    }));

    await assert.rejects(
      () => contentService.putContent(userId, workspaceId.toString(), '../evil', { a: 1 }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /invalid/i);
        return true;
      }
    );
  });

  test('stores content for workspace members', async () => {
    const workspaceId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const payload = { html: '<p>Hello multi-device</p>' };

    mock.method(Workspace, 'findById', () => ({
      select: () =>
        Promise.resolve({
          _id: workspaceId,
          members: [userId],
          archivedAt: null
        })
    }));

    mock.method(WorkspaceContent, 'findOne', () => ({
      lean: async () => null
    }));

    mock.method(WorkspaceContent, 'findOneAndUpdate', async () => ({
      key: 'documents:doc1',
      data: payload,
      updatedAt: new Date(),
      updatedBy: userId
    }));

    const result = await contentService.putContent(userId, workspaceId.toString(), 'documents:doc1', payload);

    assert.equal(result.key, 'documents:doc1');
    assert.equal(result.data.html, payload.html);
  });

  test('merges concurrent file tree creates as files-v1', async () => {
    const workspaceId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    mock.method(Workspace, 'findById', () => ({
      select: () =>
        Promise.resolve({
          _id: workspaceId,
          members: [userId],
          archivedAt: null
        })
    }));

    mock.method(WorkspaceContent, 'findOne', () => ({
      lean: async () => ({
        data: {
          format: 'files-v1',
          files: [{ id: 'a', name: 'A', updatedAt: '2026-06-01T00:00:00.000Z' }],
          removed: {}
        }
      })
    }));

    let saved = null;
    mock.method(WorkspaceContent, 'findOneAndUpdate', async (_q, update) => {
      saved = update.$set.data;
      return {
        key: 'files',
        data: saved,
        updatedAt: new Date(),
        updatedBy: userId
      };
    });

    const result = await contentService.putContent(userId, workspaceId.toString(), 'files', {
      format: 'files-v1',
      files: [{ id: 'b', name: 'B', updatedAt: '2026-06-01T00:00:01.000Z' }],
      removed: {}
    });

    assert.equal(result.data.format, 'files-v1');
    assert.equal(result.data.files.length, 2);
    assert.ok(result.data.files.some((f) => f.id === 'a'));
    assert.ok(result.data.files.some((f) => f.id === 'b'));
  });
});
