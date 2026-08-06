const { test, describe, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const contentController = require('../src/controllers/content.controller');
const workspaceService = require('../src/services/workspace.service');

describe('exportDocx workspace membership', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('rejects non-members before generating DOCX', async () => {
    const workspaceId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId();

    mock.method(workspaceService, 'getWorkspaceById', async () => {
      const err = new Error('Workspace not found');
      err.statusCode = 404;
      throw err;
    });

    const req = {
      user: { _id: userId },
      params: { id: workspaceId },
      body: { html: '<p>secret</p>', title: 'Doc' }
    };
    let nextError = null;
    await contentController.exportDocx(req, {}, (err) => {
      nextError = err;
    });
    assert.ok(nextError);
    assert.equal(nextError.statusCode, 404);
  });

  test('rejects oversized HTML payloads with 413', async () => {
    const workspaceId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId();

    mock.method(workspaceService, 'getWorkspaceById', async () => ({ _id: workspaceId }));

    const huge = 'x'.repeat(1_500_001);
    const req = {
      user: { _id: userId },
      params: { id: workspaceId },
      body: { html: huge, title: 'Huge' }
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
    await contentController.exportDocx(req, res, () => {});
    assert.equal(statusCode, 413);
    assert.match(body.message, /too large/i);
  });
});
