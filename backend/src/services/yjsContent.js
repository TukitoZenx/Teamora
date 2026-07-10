const Y = require('yjs');

/**
 * Merge Yjs updates into a stored base64 state.
 * @param {string|null|undefined} existingStateB64 - encodeStateAsUpdate base64
 * @param {{ update?: string, state?: string }} payload - base64 update and/or full state
 * @returns {{ format: 'yjs-v1', state: string }}
 */
const mergeYjsPayload = (existingStateB64, payload = {}) => {
  const doc = new Y.Doc();

  if (existingStateB64) {
    Y.applyUpdate(doc, Buffer.from(existingStateB64, 'base64'));
  }

  if (payload.state) {
    // Full snapshot from a client — merge into current (CRDT union).
    Y.applyUpdate(doc, Buffer.from(payload.state, 'base64'));
  }

  if (payload.update) {
    Y.applyUpdate(doc, Buffer.from(payload.update, 'base64'));
  }

  const state = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64');
  doc.destroy();

  return { format: 'yjs-v1', state };
};

/**
 * Apply two independent client updates in either order; final state must be equal.
 * Used by tests to prove CRDT merge.
 */
const mergeTwoClientUpdates = (updateA, updateB) => {
  const order1 = new Y.Doc();
  Y.applyUpdate(order1, updateA);
  Y.applyUpdate(order1, updateB);
  const state1 = Buffer.from(Y.encodeStateAsUpdate(order1));

  const order2 = new Y.Doc();
  Y.applyUpdate(order2, updateB);
  Y.applyUpdate(order2, updateA);
  const state2 = Buffer.from(Y.encodeStateAsUpdate(order2));

  order1.destroy();
  order2.destroy();

  return { state1, state2, equal: Buffer.compare(state1, state2) === 0 };
};

module.exports = {
  mergeYjsPayload,
  mergeTwoClientUpdates
};
