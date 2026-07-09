const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Workspace = require('../src/models/Workspace');
const User = require('../src/models/User');
const workspaceService = require('../src/services/workspace.service');

describe('Workspace Service - leaveWorkspace', () => {
  let findByIdMock;

  beforeEach(() => {
    mock.method(User, 'updateOne', async () => ({ acknowledged: true }));
    mock.method(User, 'updateMany', async () => ({ acknowledged: true }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  test('should transfer ownership to the next member when owner leaves a multi-member workspace', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const nextOwnerId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();

    const mockWorkspace = {
      _id: workspaceId,
      name: 'Teamora Test Workspace',
      owner: ownerId,
      members: [ownerId, nextOwnerId],
      approvedMembers: [{ user: ownerId }, { user: nextOwnerId }],
      active: true,
      save: async function () {
        return this;
      }
    };

    findByIdMock = mock.method(Workspace, 'findById', (id) => {
      // Return query object supporting chainable populate calls
      const mockQuery = {
        populate: () => mockQuery,
        then: (onResolve) => Promise.resolve(mockWorkspace).then(onResolve),
        catch: (onReject) => Promise.resolve(mockWorkspace).catch(onReject)
      };
      return mockQuery;
    });

    const result = await workspaceService.leaveWorkspace(ownerId, workspaceId.toString());

    assert.equal(result.success, true);
    assert.equal(result.workspaceDeleted, false);
    assert.equal(result.ownershipTransferred, true);
    assert.equal(result.newOwnerId, nextOwnerId.toString());
    assert.equal(mockWorkspace.owner.toString(), nextOwnerId.toString());
    assert.equal(mockWorkspace.members.length, 1);
  });

  test('should archive the workspace when the sole remaining member leaves', async () => {
    const soleMemberId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();

    let saveCalled = false;

    const mockWorkspace = {
      _id: workspaceId,
      name: 'Solo Workspace',
      owner: soleMemberId,
      members: [soleMemberId],
      save: async function () {
        saveCalled = true;
        return this;
      }
    };

    findByIdMock = mock.method(Workspace, 'findById', () => {
      const mockQuery = {
        populate: () => mockQuery,
        then: (onResolve) => Promise.resolve(mockWorkspace).then(onResolve),
        catch: (onReject) => Promise.resolve(mockWorkspace).catch(onReject)
      };
      return mockQuery;
    });

    const result = await workspaceService.leaveWorkspace(soleMemberId, workspaceId.toString());

    assert.equal(result.success, true);
    assert.equal(result.workspaceDeleted, false);
    assert.equal(result.workspaceInactive, true);
    assert.equal(result.ownershipTransferred, false);
    assert.equal(result.newOwnerId, null);
    assert.equal(saveCalled, true);
    assert.ok(mockWorkspace.archivedAt instanceof Date);
    assert.equal(mockWorkspace.archivedBy.toString(), soleMemberId.toString());
  });
});
