/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { mount: parentMount } = require('./asset-hero-handoff-tests.cjs');
const lifecycle = fs.readFileSync(path.join(__dirname, 'hero-lifecycle-tests.cjs'), 'utf8');
const ast = ts.createSourceFile('lifecycle.cjs', lifecycle, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const childMount = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'mount');
assert.ok(childMount, 'existing actual-stage lifecycle fixture required');
const output = { exports: {} };
// Borrow only the existing fixture prefix; do not change the actual child source.
vm.runInNewContext(lifecycle.slice(0, childMount.end) + '\nmodule.exports = { mount };', {
  module: output, exports: output.exports, __dirname, require(name) {
    if (name === 'node:test') return () => { throw new Error('no registration in fixture prefix'); };
    assert.ok(['node:assert/strict', 'node:fs', 'node:path', 'node:vm', 'typescript', 'three'].includes(name));
    return require(name);
  },
});
const view = parent => JSON.stringify(parent.view());
function probe(source, event, coalesced, pendingCompletion = false) {
  const parent = parentMount(source), children = [];
  let active;
  function commit() {
    parent.commit(); const stage = parent.stage();
    if (active && (!stage || active.key !== stage.key)) { active.child.unmount(); active = undefined; }
    if (stage && !active) {
      const child = output.exports.mount(undefined, { model: stage.props.model });
      active = { child, key: stage.key, resolved: false }; children.push(active);
      // Forward only readiness events emitted by the actual child callback.
      const events = child.state.ready, push = events.push;
      events.push = value => { stage.props.onReady(value); return push.call(events, value); };
    }
    if (stage) active.child.update({ replay: stage.props.replay });
  }
  function resolvePending() {
    if (active && !active.resolved) { active.resolved = true; active.child.resolve(); }
    commit();
  }
  try {
    parent.click('Inspect 3D model'); commit(); if (!pendingCompletion) resolvePending();
    const first = active, initial = view(parent);
    parent[event](true, false); if (!coalesced) commit();
    parent[event](false, false);
    if (pendingCompletion) { active.resolved = true; active.child.resolve(); }
    commit();
    const pending = view(parent); resolvePending();
    const returned = view(parent), loaded = active, readyCount = loaded.child.state.ready.length;
    loaded.child.tick(16); loaded.child.tick(8000);
    parent.click('Replay full turn'); commit(); loaded.child.tick(16); loaded.child.tick(8000); commit();
    return { event, coalesced, initiallyPending: pendingCompletion, initial, pending, returned, replayed: view(parent),
      children: children.length, requests: children.reduce((sum, entry) => sum + entry.child.loads.length, 0),
      oldDisposed: first.child.renderers[0].disposals, oldFrames: first.child.frames.size,
      oldResources: JSON.stringify(first.child.models[0].counts),
      changedChild: first !== loaded, replayRetained: active === loaded,
      replayAddedReadiness: loaded.child.state.ready.length - readyCount,
      activeReadiness: JSON.stringify([...loaded.child.state.ready]), pendingFrames: loaded.child.frames.size };
  } finally { parent.clean(); for (const entry of children) entry.child.unmount(); }
}
function run(source) {
  return ['hidden', 'offscreen'].flatMap(event => [[false, false], [true, false], [true, true]].map(([coalesced, pendingCompletion]) => {
    const result = probe(source, event, coalesced, pendingCompletion);
    try {
      assert.equal(result.initial, pendingCompletion ? '[true,false]' : '[false,true]', 'initial presentation');
      assert.equal(result.returned, '[false,true]', `${event} coalesced=${coalesced}: actual load must restore the model`);
      assert.equal(result.pending, '[true,false]', 'fresh load keeps only poster');
      assert.equal(result.replayed, '[false,true]', 'Replay keeps only model');
      assert.equal(result.changedChild, true, 'negative edge must own a genuine new stage');
      assert.equal(result.children, 2); assert.equal(result.requests, 2, 'one actual model request per owned stage');
      assert.equal(result.oldDisposed, 1); assert.equal(result.oldFrames, 0);
      assert.equal(result.oldResources, '{"geometry":1,"material":2,"texture":1,"image":1}');
      assert.equal(result.replayRetained, true); assert.equal(result.replayAddedReadiness, 0);
      assert.equal(result.activeReadiness, '[false,true]'); assert.equal(result.pendingFrames, 0);
      return { ...result, passed: true };
    } catch (error) { return { ...result, passed: false, code: error.code, assertion: error.message.split('\n')[0] }; }
  }));
}
function controls(source) {
  return [
    ['constant stage key', 'key={`${id}:${loadGeneration}`}', 'key={id}', 'hidden', false],
    ['hidden generation missing', 'if (document.hidden) {\n        setReadyGeneration(null);\n        setLoadGeneration(g => g + 1);', 'if (document.hidden) {\n        setReadyGeneration(null);', 'hidden', false],
    ['offscreen generation missing', 'if (!entry.isIntersecting) {\n        setReadyGeneration(null);\n        setLoadGeneration(g => g + 1);', 'if (!entry.isIntersecting) {\n        setReadyGeneration(null);', 'offscreen', false],
    ['unscoped readiness', 'const ready = readyGeneration === loadGeneration;', 'const ready = readyGeneration !== null;', 'hidden', true],
  ].map(([name, from, to, event, pending]) => {
    assert.equal(source.split(from).length, 2, name + ': exact mutation required');
    const result = run(source.replace(from, to)).find(row => row.event === event && row.coalesced && row.initiallyPending === pending);
    assert.equal(result.passed, false); assert.equal(result.code, 'ERR_ASSERTION');
    assert.equal(result.assertion, pending ? 'fresh load keeps only poster' : `${event} coalesced=true: actual load must restore the model`);
    return { name, rejected: true, assertion: result.assertion };
  });
}
module.exports = { run, probe, controls };
if (require.main === module) {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/hero/AssetHero.tsx'), 'utf8'), results = run(source);
  for (const result of results) assert.equal(result.passed, true, result.assertion);
  console.log(JSON.stringify({ results, controls: controls(source) }, null, 2));
}
