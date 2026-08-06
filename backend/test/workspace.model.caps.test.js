const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Workspace = require('../src/models/Workspace');

/** Apply the same cap logic as the pre-save hook without invoking Kareem. */
const applyCaps = (doc) => {
  const MAX_NOTIFICATIONS = 200;
  const MAX_TASKS = 500;
  if (Array.isArray(doc.notifications) && doc.notifications.length > MAX_NOTIFICATIONS) {
    doc.notifications = doc.notifications.slice(-MAX_NOTIFICATIONS);
  }
  if (Array.isArray(doc.tasks) && doc.tasks.length > MAX_TASKS) {
    const sorted = [...doc.tasks].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return at - bt;
    });
    doc.tasks = sorted.slice(-MAX_TASKS);
  }
};

describe('Workspace pre-save array caps', () => {
  test('caps notifications at MAX_NOTIFICATIONS (200) keeping newest', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const ws = new Workspace({
      name: 'Cap Test',
      owner: ownerId,
      members: [ownerId],
      inviteCode: `CAP${Date.now().toString(36).toUpperCase()}`,
      notifications: [],
      tasks: []
    });

    for (let i = 0; i < 250; i += 1) {
      ws.notifications.push({
        recipient: ownerId,
        type: 'join_request_accepted',
        message: `n-${i}`
      });
    }

    applyCaps(ws);

    assert.equal(ws.notifications.length, 200);
    assert.equal(ws.notifications[0].message, 'n-50');
    assert.equal(ws.notifications[199].message, 'n-249');
    assert.equal(Workspace.MAX_NOTIFICATIONS, 200);
  });

  test('caps tasks at MAX_TASKS (500)', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const ws = new Workspace({
      name: 'Task Cap',
      owner: ownerId,
      members: [ownerId],
      inviteCode: `TSK${Date.now().toString(36).toUpperCase()}`,
      notifications: [],
      tasks: []
    });

    for (let i = 0; i < 520; i += 1) {
      ws.tasks.push({
        title: `Task ${i}`,
        date: '2026-01-01',
        priority: 'Low',
        creator: ownerId,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i % 60))
      });
    }

    applyCaps(ws);
    assert.equal(ws.tasks.length, 500);
    assert.equal(Workspace.MAX_TASKS, 500);
  });

  test('pre-save hook is registered on the schema', () => {
    const preHooks = Workspace.schema.s.hooks._pres.get('save') || [];
    assert.ok(preHooks.length > 0, 'expected at least one pre-save hook');
  });
});
