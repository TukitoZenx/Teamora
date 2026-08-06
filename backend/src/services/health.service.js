const mongoose = require('mongoose');
const { getCollabStats } = require('../collab/wsHub');

const startedAt = Date.now();

const packageVersion = (() => {
  try {
    // package.json sits one level above src/
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require('../../package.json').version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

/**
 * Mongo readyState: 0=disconnected 1=connected 2=connecting 3=disconnecting
 */
const getMongoStatus = () => {
  const state = mongoose.connection.readyState;
  const labels = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return {
    readyState: state,
    status: labels[state] || 'unknown'
  };
};

/**
 * Liveness: process is running. Used by platform "is the process up?" probes.
 * Does not check Mongo — a process can be alive while temporarily reconnecting.
 */
const getLiveness = () => ({
  status: 'ok',
  service: 'teamora-backend',
  version: packageVersion,
  uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
  timestamp: new Date().toISOString()
});

/**
 * Readiness: safe to receive traffic. Requires Mongo connected.
 * Platform load balancers should use this for routing decisions.
 */
const getReadiness = () => {
  const mongo = getMongoStatus();
  const ready = mongo.readyState === 1;
  const collab = getCollabStats();

  return {
    status: ready ? 'ready' : 'not_ready',
    ready,
    service: 'teamora-backend',
    version: packageVersion,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    checks: {
      mongodb: mongo,
      collab
    },
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  getLiveness,
  getReadiness,
  getMongoStatus,
  startedAt
};
