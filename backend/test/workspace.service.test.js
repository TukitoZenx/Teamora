const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Workspace = require('../src/models/Workspace');
const User = require('../src/models/User');
const workspaceService = require('../src/services/workspace.service');

describe('Workspace Service - leaveWorkspace', () => {
  beforeEach(() => {
    mock.method(User, 'updateOne', async () => ({ acknowledged: true }));
    mock.method(User, 'updateMany', async () => ({ acknowledged: true }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  test('owner can leave anytime without transferring ownership to remaining members', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();

    const mockWorkspace = {
      _id: workspaceId,
      name: 'Teamora Test Workspace',
      owner: ownerId,
      members: [ownerId, memberId],
      memberRoles: [],
      approvedMembers: [
        { user: ownerId, approvedAt: new Date('2024-01-01') },
        { user: memberId, approvedAt: new Date('2024-01-02') }
      ],
      notifications: [],
      joinRequests: [],
      active: true,
      save: async function () {
        return this;
      }
    };

    mock.method(Workspace, 'findById', () => {
      const mockQuery = {
        populate: () => mockQuery,
        then: (onResolve) => Promise.resolve(mockWorkspace).then(onResolve),
        catch: (onReject) => Promise.resolve(mockWorkspace).catch(onReject)
      };
      return mockQuery;
    });

    const result = await workspaceService.leaveWorkspace(ownerId, workspaceId.toString());

    assert.equal(result.success, true);
    assert.equal(result.ownershipTransferred, false);
    assert.equal(result.newOwnerId, null);
    // Creator remains host of record; no member is promoted.
    assert.equal(mockWorkspace.owner.toString(), ownerId.toString());
    assert.equal(mockWorkspace.members.length, 1);
    assert.equal(mockWorkspace.members[0].toString(), memberId.toString());
  });

  test('should close workspace without trash when sole remaining member leaves', async () => {
    const soleMemberId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();

    let saveCalled = false;
    let recentStatus = null;

    mock.method(User, 'updateOne', async (_filter, update) => {
      const entry = update?.$push?.recentWorkspaces?.$each?.[0];
      if (entry?.status) recentStatus = entry.status;
      return { acknowledged: true };
    });

    const mockWorkspace = {
      _id: workspaceId,
      name: 'Solo Workspace',
      owner: soleMemberId,
      members: [soleMemberId],
      memberRoles: [],
      notifications: [],
      joinRequests: [],
      approvedMembers: [{ user: soleMemberId }],
      save: async function () {
        saveCalled = true;
        return this;
      }
    };

    mock.method(Workspace, 'findById', () => {
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
    // Leave must never mark history as trash.
    assert.equal(recentStatus, 'previously_joined');
  });

  test('should keep permanent approval when a non-owner leaves so they can rejoin freely', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();

    const mockWorkspace = {
      _id: workspaceId,
      name: 'Approval Workspace',
      owner: ownerId,
      members: [ownerId, memberId],
      memberRoles: [],
      approvedMembers: [{ user: ownerId }, { user: memberId, revokedAt: null }],
      notifications: [],
      joinRequests: [],
      active: true,
      save: async function () {
        return this;
      }
    };

    mock.method(Workspace, 'findById', () => {
      const mockQuery = {
        populate: () => mockQuery,
        then: (onResolve) => Promise.resolve(mockWorkspace).then(onResolve),
        catch: (onReject) => Promise.resolve(mockWorkspace).catch(onReject)
      };
      return mockQuery;
    });

    const result = await workspaceService.leaveWorkspace(memberId, workspaceId.toString());
    const approval = mockWorkspace.approvedMembers.find((item) => item.user.toString() === memberId.toString());

    assert.equal(result.success, true);
    assert.equal(result.ownershipTransferred, false);
    assert.equal(approval.revokedAt, null);
  });
});

describe('Workspace Service - createWorkspace', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('should reject creating more than 6 owned workspaces', async () => {
    const ownerId = new mongoose.Types.ObjectId();

    mock.method(Workspace, 'countDocuments', async () => 6);

    await assert.rejects(
      () => workspaceService.createWorkspace(ownerId, { name: 'Overflow Workspace' }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /Maximum 6 workspaces/i);
        return true;
      }
    );
  });
});

describe('Workspace Service - visibility', () => {
  beforeEach(() => {
    mock.method(User, 'updateOne', async () => ({ acknowledged: true }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  test('should reject invite joins when workspace is private', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();

    const mockWorkspace = {
      _id: workspaceId,
      name: 'Private Workspace',
      owner: ownerId,
      members: [ownerId],
      visibility: 'private',
      joinApproval: true,
      joinRequests: [],
      approvedMembers: [],
      notifications: [],
      inviteCode: 'PRIVATE1',
      save: async function () {
        return this;
      }
    };

    mock.method(Workspace, 'findOne', () => ({
      populate: () => Promise.resolve(mockWorkspace)
    }));

    await assert.rejects(
      () => workspaceService.requestWorkspaceAccess(userId, 'private1'),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.match(error.message, /private/i);
        return true;
      }
    );
  });

  test('invite preview marks private workspaces as not joinable', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();

    mock.method(Workspace, 'findOne', async () => ({
      _id: workspaceId,
      name: 'Private WS',
      description: '',
      owner: ownerId,
      members: [ownerId],
      visibility: 'private',
      joinApproval: true,
      joinRequests: [],
      inviteCode: 'PRIVATE2'
    }));

    const preview = await workspaceService.getInvitePreview(userId, 'private2');
    assert.equal(preview.allowsJoin, false);
    assert.equal(preview.visibility, 'private');
    assert.equal(preview.isMember, false);
  });
});

describe('Workspace Service - requestWorkspaceAccess', () => {
  beforeEach(() => {
    mock.method(User, 'updateOne', async () => ({ acknowledged: true }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  test('should immediately join invite holder when join approval is disabled', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();
    const pendingRequestId = new mongoose.Types.ObjectId();

    const mockWorkspace = {
      _id: workspaceId,
      name: 'Auto Join Workspace',
      description: '',
      owner: ownerId,
      members: [ownerId],
      approvedMembers: [],
      joinApproval: false,
      joinRequests: [
        {
          _id: pendingRequestId,
          requester: userId,
          status: 'pending',
          resolvedAt: null
        }
      ],
      notifications: [],
      tasks: [],
      inviteCode: 'AUTOJOIN',
      save: async function () {
        return this;
      },
      toObject: function () {
        return {
          ...this,
          members: [...this.members],
          approvedMembers: this.approvedMembers.map((approval) => ({ ...approval })),
          joinRequests: this.joinRequests.map((request) => ({ ...request })),
          notifications: [...this.notifications],
          tasks: [...this.tasks]
        };
      }
    };

    mock.method(Workspace, 'findOne', () => ({
      populate: () => Promise.resolve(mockWorkspace)
    }));

    mock.method(Workspace, 'findById', () => {
      const mockQuery = {
        populate: () => mockQuery,
        then: (onResolve) => Promise.resolve(mockWorkspace).then(onResolve),
        catch: (onReject) => Promise.resolve(mockWorkspace).catch(onReject)
      };
      return mockQuery;
    });

    const result = await workspaceService.requestWorkspaceAccess(userId, 'autojoin');

    assert.equal(result.joined, true);
    assert.equal(result.workspace.workspaceId, workspaceId.toString());
    assert.ok(mockWorkspace.members.some((memberId) => memberId.toString() === userId.toString()));
    assert.ok(
      mockWorkspace.approvedMembers.some(
        (approval) => approval.user.toString() === userId.toString() && !approval.revokedAt
      )
    );
    assert.equal(mockWorkspace.joinRequests[0].status, 'accepted');
    assert.ok(mockWorkspace.joinRequests[0].resolvedAt instanceof Date);
  });
});
