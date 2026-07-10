const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Y = require('yjs');
const { mergeYjsPayload, mergeTwoClientUpdates } = require('../src/services/yjsContent');

describe('Yjs content merge', () => {
  test('two concurrent client updates commute (no data loss)', () => {
    const clientA = new Y.Doc();
    const clientB = new Y.Doc();
    const textA = clientA.getText('quill');
    const textB = clientB.getText('quill');

    textA.insert(0, 'Hello ');
    textB.insert(0, 'World');

    const updateA = Y.encodeStateAsUpdate(clientA);
    const updateB = Y.encodeStateAsUpdate(clientB);

    const { equal, state1, state2 } = mergeTwoClientUpdates(updateA, updateB);
    assert.equal(equal, true);

    const check = new Y.Doc();
    Y.applyUpdate(check, state1);
    const result = check.getText('quill').toString();
    // Both contributions present (order may vary by client id).
    assert.match(result, /Hello/);
    assert.match(result, /World/);

    clientA.destroy();
    clientB.destroy();
    check.destroy();
    assert.ok(state2.length > 0);
  });

  test('server mergeYjsPayload applies incremental updates onto existing state', () => {
    const seed = new Y.Doc();
    seed.getText('quill').insert(0, 'Alpha');
    const seedState = Buffer.from(Y.encodeStateAsUpdate(seed)).toString('base64');

    const client = new Y.Doc();
    Y.applyUpdate(client, Buffer.from(seedState, 'base64'));
    client.getText('quill').insert(client.getText('quill').length, ' Beta');
    const update = Buffer.from(Y.encodeStateAsUpdate(client)).toString('base64');

    // Incremental relative to empty would re-apply full; using update as full state encode is valid.
    const merged = mergeYjsPayload(seedState, { update });
    assert.equal(merged.format, 'yjs-v1');

    const out = new Y.Doc();
    Y.applyUpdate(out, Buffer.from(merged.state, 'base64'));
    assert.match(out.getText('quill').toString(), /Alpha/);
    assert.match(out.getText('quill').toString(), /Beta/);

    seed.destroy();
    client.destroy();
    out.destroy();
  });

  test('offline client update merges after remote already advanced', () => {
    // Server has S0
    const server = new Y.Doc();
    server.getText('quill').insert(0, 'Base ');
    let serverState = Buffer.from(Y.encodeStateAsUpdate(server)).toString('base64');

    // Online remote appends
    const remote = new Y.Doc();
    Y.applyUpdate(remote, Buffer.from(serverState, 'base64'));
    remote.getText('quill').insert(remote.getText('quill').length, 'Remote');
    serverState = mergeYjsPayload(serverState, {
      update: Buffer.from(Y.encodeStateAsUpdate(remote)).toString('base64')
    }).state;

    // Offline local started from old S0
    const offline = new Y.Doc();
    Y.applyUpdate(offline, Buffer.from(Buffer.from(serverState, 'base64'))); // wrong - start from initial
    offline.destroy();

    const offline2 = new Y.Doc();
    const s0 = new Y.Doc();
    s0.getText('quill').insert(0, 'Base ');
    const s0b = Buffer.from(Y.encodeStateAsUpdate(s0)).toString('base64');
    Y.applyUpdate(offline2, Buffer.from(s0b, 'base64'));
    offline2.getText('quill').insert(offline2.getText('quill').length, 'Offline');
    const offlineUpdate = Buffer.from(Y.encodeStateAsUpdate(offline2)).toString('base64');

    const finalState = mergeYjsPayload(serverState, { update: offlineUpdate }).state;
    const finalDoc = new Y.Doc();
    Y.applyUpdate(finalDoc, Buffer.from(finalState, 'base64'));
    const text = finalDoc.getText('quill').toString();
    assert.match(text, /Base/);
    assert.match(text, /Remote/);
    assert.match(text, /Offline/);

    server.destroy();
    remote.destroy();
    offline2.destroy();
    s0.destroy();
    finalDoc.destroy();
  });
});

describe('Yjs spreadsheet cell map merge', () => {
  const cellKey = (row, col) => `${row}:${col}`;

  test('concurrent edits to different cells both survive', () => {
    const clientA = new Y.Doc();
    const clientB = new Y.Doc();
    clientA.getMap('cells').set(cellKey(0, 0), 'Alice');
    clientB.getMap('cells').set(cellKey(0, 1), 'Bob');

    const updateA = Y.encodeStateAsUpdate(clientA);
    const updateB = Y.encodeStateAsUpdate(clientB);
    const { equal, state1 } = mergeTwoClientUpdates(updateA, updateB);
    assert.equal(equal, true);

    const check = new Y.Doc();
    Y.applyUpdate(check, state1);
    const cells = check.getMap('cells');
    assert.equal(cells.get(cellKey(0, 0)), 'Alice');
    assert.equal(cells.get(cellKey(0, 1)), 'Bob');

    clientA.destroy();
    clientB.destroy();
    check.destroy();
  });

  test('server merge applies spreadsheet cell update onto existing state', () => {
    const seed = new Y.Doc();
    seed.getMap('cells').set(cellKey(1, 0), '10');
    const seedState = Buffer.from(Y.encodeStateAsUpdate(seed)).toString('base64');

    const client = new Y.Doc();
    Y.applyUpdate(client, Buffer.from(seedState, 'base64'));
    client.getMap('cells').set(cellKey(1, 1), '20');
    const update = Buffer.from(Y.encodeStateAsUpdate(client)).toString('base64');

    const merged = mergeYjsPayload(seedState, { update });
    assert.equal(merged.format, 'yjs-v1');

    const out = new Y.Doc();
    Y.applyUpdate(out, Buffer.from(merged.state, 'base64'));
    const cells = out.getMap('cells');
    assert.equal(cells.get(cellKey(1, 0)), '10');
    assert.equal(cells.get(cellKey(1, 1)), '20');

    seed.destroy();
    client.destroy();
    out.destroy();
  });

  test('offline spreadsheet cell merges after remote advanced', () => {
    const s0 = new Y.Doc();
    s0.getMap('cells').set(cellKey(0, 0), 'Base');
    const s0b = Buffer.from(Y.encodeStateAsUpdate(s0)).toString('base64');

    const remote = new Y.Doc();
    Y.applyUpdate(remote, Buffer.from(s0b, 'base64'));
    remote.getMap('cells').set(cellKey(0, 1), 'Remote');
    let serverState = mergeYjsPayload(s0b, {
      update: Buffer.from(Y.encodeStateAsUpdate(remote)).toString('base64')
    }).state;

    const offline = new Y.Doc();
    Y.applyUpdate(offline, Buffer.from(s0b, 'base64'));
    offline.getMap('cells').set(cellKey(1, 0), 'Offline');
    const offlineUpdate = Buffer.from(Y.encodeStateAsUpdate(offline)).toString('base64');

    serverState = mergeYjsPayload(serverState, { update: offlineUpdate }).state;
    const finalDoc = new Y.Doc();
    Y.applyUpdate(finalDoc, Buffer.from(serverState, 'base64'));
    const cells = finalDoc.getMap('cells');
    assert.equal(cells.get(cellKey(0, 0)), 'Base');
    assert.equal(cells.get(cellKey(0, 1)), 'Remote');
    assert.equal(cells.get(cellKey(1, 0)), 'Offline');

    s0.destroy();
    remote.destroy();
    offline.destroy();
    finalDoc.destroy();
  });

  test('same-cell concurrent edit resolves to a single survivor (no crash)', () => {
    const clientA = new Y.Doc();
    const clientB = new Y.Doc();
    clientA.getMap('cells').set(cellKey(5, 5), 'A');
    clientB.getMap('cells').set(cellKey(5, 5), 'B');

    const { equal, state1 } = mergeTwoClientUpdates(
      Y.encodeStateAsUpdate(clientA),
      Y.encodeStateAsUpdate(clientB)
    );
    assert.equal(equal, true);

    const check = new Y.Doc();
    Y.applyUpdate(check, state1);
    const winner = check.getMap('cells').get(cellKey(5, 5));
    assert.ok(winner === 'A' || winner === 'B');

    clientA.destroy();
    clientB.destroy();
    check.destroy();
  });
});

describe('Yjs whiteboard element map merge', () => {
  test('concurrent creates of different elements both survive', () => {
    const clientA = new Y.Doc();
    const clientB = new Y.Doc();
    clientA.getMap('elements').set('sticky-a', {
      id: 'sticky-a',
      type: 'sticky',
      text: 'Alice',
      order: 0
    });
    clientB.getMap('elements').set('shape-b', {
      id: 'shape-b',
      type: 'rect',
      text: '',
      order: 0
    });

    const { equal, state1 } = mergeTwoClientUpdates(
      Y.encodeStateAsUpdate(clientA),
      Y.encodeStateAsUpdate(clientB)
    );
    assert.equal(equal, true);

    const check = new Y.Doc();
    Y.applyUpdate(check, state1);
    const elements = check.getMap('elements');
    assert.equal(elements.get('sticky-a')?.text, 'Alice');
    assert.equal(elements.get('shape-b')?.type, 'rect');
    assert.equal(elements.size, 2);

    clientA.destroy();
    clientB.destroy();
    check.destroy();
  });

  test('server merge applies whiteboard element update onto existing state', () => {
    const seed = new Y.Doc();
    seed.getMap('elements').set('e1', { id: 'e1', type: 'text', text: 'Hello', order: 0 });
    const seedState = Buffer.from(Y.encodeStateAsUpdate(seed)).toString('base64');

    const client = new Y.Doc();
    Y.applyUpdate(client, Buffer.from(seedState, 'base64'));
    client.getMap('elements').set('e2', { id: 'e2', type: 'sticky', text: 'Note', order: 1 });
    const update = Buffer.from(Y.encodeStateAsUpdate(client)).toString('base64');

    const merged = mergeYjsPayload(seedState, { update });
    assert.equal(merged.format, 'yjs-v1');

    const out = new Y.Doc();
    Y.applyUpdate(out, Buffer.from(merged.state, 'base64'));
    assert.equal(out.getMap('elements').get('e1')?.text, 'Hello');
    assert.equal(out.getMap('elements').get('e2')?.text, 'Note');

    seed.destroy();
    client.destroy();
    out.destroy();
  });

  test('offline whiteboard element merges after remote advanced', () => {
    const s0 = new Y.Doc();
    s0.getMap('elements').set('base', { id: 'base', type: 'sticky', text: 'Base', order: 0 });
    const s0b = Buffer.from(Y.encodeStateAsUpdate(s0)).toString('base64');

    const remote = new Y.Doc();
    Y.applyUpdate(remote, Buffer.from(s0b, 'base64'));
    remote.getMap('elements').set('remote', { id: 'remote', type: 'circle', order: 1 });
    let serverState = mergeYjsPayload(s0b, {
      update: Buffer.from(Y.encodeStateAsUpdate(remote)).toString('base64')
    }).state;

    const offline = new Y.Doc();
    Y.applyUpdate(offline, Buffer.from(s0b, 'base64'));
    offline.getMap('elements').set('offline', { id: 'offline', type: 'text', text: 'Later', order: 1 });
    const offlineUpdate = Buffer.from(Y.encodeStateAsUpdate(offline)).toString('base64');

    serverState = mergeYjsPayload(serverState, { update: offlineUpdate }).state;
    const finalDoc = new Y.Doc();
    Y.applyUpdate(finalDoc, Buffer.from(serverState, 'base64'));
    const elements = finalDoc.getMap('elements');
    assert.ok(elements.has('base'));
    assert.ok(elements.has('remote'));
    assert.ok(elements.has('offline'));
    assert.equal(elements.size, 3);

    s0.destroy();
    remote.destroy();
    offline.destroy();
    finalDoc.destroy();
  });

  test('local full-array apply does not delete remote-only ids', () => {
    // Mirrors WhiteboardSection applyLocalElementsArray semantics.
    const doc = new Y.Doc();
    const map = doc.getMap('elements');
    map.set('local-1', { id: 'local-1', type: 'sticky', text: 'L', order: 0 });
    map.set('remote-only', { id: 'remote-only', type: 'rect', order: 1 });

    const prevLocal = [{ id: 'local-1', type: 'sticky', text: 'L', order: 0 }];
    const nextLocal = [{ id: 'local-1', type: 'sticky', text: 'L-edited', order: 0 }];

    const prevIds = new Set(prevLocal.map((el) => el.id));
    const nextIds = new Set(nextLocal.map((el) => el.id));
    doc.transact(() => {
      nextLocal.forEach((el, index) => {
        map.set(el.id, { ...el, order: index });
        nextIds.add(el.id);
      });
      for (const id of prevIds) {
        if (!nextIds.has(id)) map.delete(id);
      }
    });

    assert.equal(map.get('local-1')?.text, 'L-edited');
    assert.ok(map.has('remote-only'), 'remote-only element must survive local full-array replace');

    doc.destroy();
  });
});

describe('Yjs presentation slide map merge', () => {
  test('concurrent creates of different slides both survive', () => {
    const clientA = new Y.Doc();
    const clientB = new Y.Doc();
    clientA.getMap('slides').set('slide-a', {
      id: 'slide-a',
      title: 'Alice',
      content: 'A',
      notes: '',
      elements: [],
      layout: 'title',
      order: 0
    });
    clientB.getMap('slides').set('slide-b', {
      id: 'slide-b',
      title: 'Bob',
      content: 'B',
      notes: '',
      elements: [],
      layout: 'title',
      order: 0
    });

    const { equal, state1 } = mergeTwoClientUpdates(
      Y.encodeStateAsUpdate(clientA),
      Y.encodeStateAsUpdate(clientB)
    );
    assert.equal(equal, true);

    const check = new Y.Doc();
    Y.applyUpdate(check, state1);
    const slides = check.getMap('slides');
    assert.equal(slides.get('slide-a')?.title, 'Alice');
    assert.equal(slides.get('slide-b')?.title, 'Bob');
    assert.equal(slides.size, 2);

    clientA.destroy();
    clientB.destroy();
    check.destroy();
  });

  test('server merge applies presentation slide update onto existing state', () => {
    const seed = new Y.Doc();
    seed.getMap('slides').set('s1', {
      id: 's1',
      title: 'Intro',
      content: 'Hello',
      notes: '',
      elements: [],
      layout: 'title',
      order: 0
    });
    const seedState = Buffer.from(Y.encodeStateAsUpdate(seed)).toString('base64');

    const client = new Y.Doc();
    Y.applyUpdate(client, Buffer.from(seedState, 'base64'));
    client.getMap('slides').set('s2', {
      id: 's2',
      title: 'Agenda',
      content: 'Items',
      notes: '',
      elements: [],
      layout: 'title',
      order: 1
    });
    const update = Buffer.from(Y.encodeStateAsUpdate(client)).toString('base64');

    const merged = mergeYjsPayload(seedState, { update });
    assert.equal(merged.format, 'yjs-v1');

    const out = new Y.Doc();
    Y.applyUpdate(out, Buffer.from(merged.state, 'base64'));
    assert.equal(out.getMap('slides').get('s1')?.title, 'Intro');
    assert.equal(out.getMap('slides').get('s2')?.title, 'Agenda');

    seed.destroy();
    client.destroy();
    out.destroy();
  });

  test('offline presentation slide merges after remote advanced', () => {
    const s0 = new Y.Doc();
    s0.getMap('slides').set('base', {
      id: 'base',
      title: 'Base',
      content: '',
      notes: '',
      elements: [],
      layout: 'title',
      order: 0
    });
    const s0b = Buffer.from(Y.encodeStateAsUpdate(s0)).toString('base64');

    const remote = new Y.Doc();
    Y.applyUpdate(remote, Buffer.from(s0b, 'base64'));
    remote.getMap('slides').set('remote', {
      id: 'remote',
      title: 'Remote',
      content: '',
      notes: '',
      elements: [],
      layout: 'title',
      order: 1
    });
    let serverState = mergeYjsPayload(s0b, {
      update: Buffer.from(Y.encodeStateAsUpdate(remote)).toString('base64')
    }).state;

    const offline = new Y.Doc();
    Y.applyUpdate(offline, Buffer.from(s0b, 'base64'));
    offline.getMap('slides').set('offline', {
      id: 'offline',
      title: 'Offline',
      content: '',
      notes: '',
      elements: [],
      layout: 'title',
      order: 1
    });
    const offlineUpdate = Buffer.from(Y.encodeStateAsUpdate(offline)).toString('base64');

    serverState = mergeYjsPayload(serverState, { update: offlineUpdate }).state;
    const finalDoc = new Y.Doc();
    Y.applyUpdate(finalDoc, Buffer.from(serverState, 'base64'));
    const slides = finalDoc.getMap('slides');
    assert.ok(slides.has('base'));
    assert.ok(slides.has('remote'));
    assert.ok(slides.has('offline'));
    assert.equal(slides.size, 3);

    s0.destroy();
    remote.destroy();
    offline.destroy();
    finalDoc.destroy();
  });

  test('local full-array apply does not delete remote-only slides', () => {
    const doc = new Y.Doc();
    const map = doc.getMap('slides');
    map.set('local-1', { id: 'local-1', title: 'L', content: '', notes: '', elements: [], layout: 'title', order: 0 });
    map.set('remote-only', {
      id: 'remote-only',
      title: 'R',
      content: '',
      notes: '',
      elements: [],
      layout: 'title',
      order: 1
    });

    const prevLocal = [{ id: 'local-1', title: 'L', content: '', notes: '', elements: [], layout: 'title', order: 0 }];
    const nextLocal = [
      { id: 'local-1', title: 'L-edited', content: '', notes: '', elements: [], layout: 'title', order: 0 }
    ];

    const prevIds = new Set(prevLocal.map((s) => s.id));
    const nextIds = new Set(nextLocal.map((s) => s.id));
    doc.transact(() => {
      nextLocal.forEach((slide, index) => {
        map.set(slide.id, { ...slide, order: index });
      });
      for (const id of prevIds) {
        if (!nextIds.has(id)) map.delete(id);
      }
    });

    assert.equal(map.get('local-1')?.title, 'L-edited');
    assert.ok(map.has('remote-only'), 'remote-only slide must survive local full-array replace');

    doc.destroy();
  });
});
