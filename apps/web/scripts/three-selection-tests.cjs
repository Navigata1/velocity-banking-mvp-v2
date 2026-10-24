/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../src/components');
function source(file) {
  return ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function nodes(tree, predicate) {
  const result = [];
  function walk(node) { if (predicate(node)) result.push(node); ts.forEachChild(node, walk); }
  walk(tree);
  return result;
}
function evaluate(text, dependencies = {}) {
  const code = ts.transpileModule(`module.exports = (${text});`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  return new Function(...Object.keys(dependencies), `const module = { exports: {} }; ${code}; return module.exports;`)(...Object.values(dependencies));
}
function motionModule() {
  const loaded = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'money-loop-3d/selection-motion.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('module', 'exports', code)(loaded, loaded.exports);
  return loaded.exports;
}

function runSelectionTests() {
  const motion = motionModule();
  const stage = source('money-loop-3d/MoneyLoopThreeStage.tsx');
  const scene = source('money-loop-3d/MoneyLoopThreeScene.tsx');
  const rail = source('MoneyLoopArtifactRail.tsx');
  let count = 0, failures = 0;
  function test(name, fn) {
    count++;
    try { fn(); console.log('PASS selection revision ' + name); }
    catch (error) { failures++; console.error('FAIL selection revision ' + name + ': ' + error.message); }
  }

  test('selection revisions survive zero timestamps and returning to an earlier ID', () => {
    assert.equal(typeof motion.advanceMoneyLoopSelection, 'function');
    const initial = { id: 'income', revision: 0, startedAt: 0 };
    assert.equal(motion.advanceMoneyLoopSelection(initial, 'income', 99), initial, 'current selection remains an exact no-op');
    const away = motion.advanceMoneyLoopSelection(initial, 'loc', 0);
    const back = motion.advanceMoneyLoopSelection(away, 'income', 0);
    assert.deepEqual(initial, { id: 'income', revision: 0, startedAt: 0 });
    assert.deepEqual(away, { id: 'loc', revision: 1, startedAt: 0 });
    assert.deepEqual(back, { id: 'income', revision: 2, startedAt: 0 });
    assert.equal(motion.advanceMoneyLoopSelection(back, 'income', 500), back);
    assert.deepEqual(motion.advanceMoneyLoopSelection(back, 'expenses', 42), { id: 'expenses', revision: 3, startedAt: 42 });
    assert.equal(motion.MONEY_LOOP_SELECTION_DURATION_SECONDS, 0.45);
  });

  test('terminal notification deduplicates a selection instance, not every use of its ID', () => {
    const events = [], notify = motion.createSelectionSettledNotifier((id, revision) => events.push({ id, revision }));
    assert.equal(notify('income', 0), true);
    assert.equal(notify('income', 0), false);
    assert.equal(notify('income', 2), true, 'an interrupted return is a new selection even with the same ID');
    assert.equal(notify('income', 2), false);
    assert.equal(notify('loc', 3), true);
    assert.equal(notify('income', 4), true);
    assert.deepEqual(events, [{ id: 'income', revision: 0 }, { id: 'income', revision: 2 }, { id: 'loc', revision: 3 }, { id: 'income', revision: 4 }]);
  });

  test('the actual stage label cannot borrow an older completion for the same artifact', () => {
    const attribute = nodes(stage, n => ts.isJsxAttribute(n) && n.name.getText(stage) === 'data-selection-state')[0];
    assert.ok(attribute && ts.isJsxExpression(attribute.initializer));
    const render = (settledSelection, activeArtifactId, selectionRevision) => evaluate(attribute.initializer.expression.getText(stage), {
      settledArtifactId: settledSelection?.id ?? null, settledSelection, activeArtifactId, selectionRevision,
      isMoneyLoopSelectionSettled: motion.isMoneyLoopSelectionSettled,
    });
    assert.equal(render({ id: 'income', revision: 0 }, 'income', 0), 'settled');
    assert.equal(render({ id: 'income', revision: 0 }, 'income', 2), 'transitioning');
    assert.equal(render({ id: 'income', revision: 2 }, 'income', 2), 'settled');
    assert.equal(render({ id: 'loc', revision: 2 }, 'income', 2), 'transitioning');
    assert.equal(render(null, 'income', 2), 'transitioning');
  });

  test('the actual completion callback rejects stale IDs and revisions without clobbering current settlement', () => {
    const declaration = nodes(stage, n => ts.isVariableDeclaration(n) && n.name.getText(stage) === 'onSelectionSettled')[0];
    assert.ok(declaration && ts.isCallExpression(declaration.initializer));
    const activeSelectionRef = { current: { id: 'income', revision: 2 } };
    let settled = null, changes = 0;
    const setSettledSelection = next => { const value = typeof next === 'function' ? next(settled) : next; if (value !== settled) changes++; settled = value; };
    const accept = evaluate(declaration.initializer.arguments[0].getText(stage), {
      activeSelectionRef, setSettledSelection, setSettledArtifactId: id => { settled = id; changes++; },
      isMoneyLoopSelectionSettled: motion.isMoneyLoopSelectionSettled,
    });
    accept('income', 0); accept('loc', 2);
    assert.equal(changes, 0, 'stale completion must not update settlement state');
    accept('income', 2);
    assert.deepEqual(settled, { id: 'income', revision: 2 });
    accept('income', 2); assert.equal(changes, 1, 'duplicate completion must preserve the same state object');
    activeSelectionRef.current = { id: 'loc', revision: 3 };
    accept('loc', 3); const latest = settled;
    accept('income', 2); assert.equal(settled, latest);
  });

  test('the actual rail handler uses current functional state for a batched away-and-back', () => {
    const handler = nodes(rail, n => ts.isFunctionDeclaration(n) && n.name?.text === 'selectArtifactById')[0];
    assert.ok(handler);
    let selection = { id: 'income', revision: 0, startedAt: 0 };
    const select = evaluate(handler.getText(rail), {
      displayArtifacts: ['income', 'loc', 'expenses'].map(id => ({ id })), activeArtifactId: 'income',
      setSelection: update => { selection = update(selection); },
      setActiveArtifactId: id => { selection = { ...selection, id }; },
      setSelectionStartedAt: startedAt => { selection = { ...selection, startedAt }; },
      advanceMoneyLoopSelection: motion.advanceMoneyLoopSelection,
    });
    select('loc', 0); select('income', 0);
    assert.deepEqual(selection, { id: 'income', revision: 2, startedAt: 0 });
    const unchanged = selection; select('income', 99); select('unknown', 99);
    assert.equal(selection, unchanged, 'current and unknown IDs do not create new revisions');
  });

  test('the DOM token restarts for a new instance of an ID without restarting no-op selections', () => {
    const token = nodes(rail, n => ts.isJsxOpeningElement(n) && n.attributes.properties.some(p => ts.isJsxAttribute(p) && p.name.getText(rail) === 'data-testid' && p.initializer?.text === 'money-loop-active-artifact-token'))[0];
    assert.ok(token);
    const key = token.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(rail) === 'key');
    assert.ok(key && ts.isJsxExpression(key.initializer));
    const value = revision => evaluate(key.initializer.expression.getText(rail), { activeArtifact: { id: 'income' }, selectionRevision: revision });
    assert.notEqual(value(0), value(2), 'batched return must restart the corresponding DOM token as well as the Three scene');
    assert.equal(value(2), value(2));
  });

  test('the actual first frame reports readiness without settling a changed in-flight selection', () => {
    const initial = nodes(scene, n => ts.isVariableDeclaration(n) && n.name.getText(scene) === 'initialSelectionRef')[0];
    assert.ok(initial);
    assert.deepEqual(evaluate(initial.initializer.getText(scene), { useRef: current => ({ current }), activeArtifact: null, selectionRevision: 0 }), { current: null }, 'empty scenes retain their defensive no-active-artifact path');
    const callback = nodes(scene, n => ts.isCallExpression(n) && n.expression.getText(scene) === 'useFrame' && n.arguments[0]?.getText(scene).includes('firstFrameReported'))[0];
    assert.ok(callback);
    function run(initial, current) {
      const firstFrameReported = { current: false }, events = []; let ready = 0;
      const frame = evaluate(callback.arguments[0].getText(scene), {
        firstFrameReported, initialSelectionRef: { current: initial }, activeArtifact: current ? { id: current.id } : null, selectionRevision: current?.revision ?? 0,
        onFirstFrame: () => ready++, notifySelectionSettled: (id, revision) => events.push({ id, revision }),
        isMoneyLoopSelectionSettled: motion.isMoneyLoopSelectionSettled,
      });
      frame(); frame(); assert.equal(ready, current ? 1 : 0); return events;
    }
    assert.deepEqual(run({ id: 'income', revision: 0 }, { id: 'loc', revision: 1 }), []);
    assert.deepEqual(run({ id: 'income', revision: 0 }, { id: 'income', revision: 2 }), []);
    assert.deepEqual(run({ id: 'income', revision: 0 }, { id: 'income', revision: 0 }), [{ id: 'income', revision: 0 }]);
    assert.deepEqual(run(null, null), []);
  });

  assert.equal(failures, 0, `${failures}/${count} selection revision contracts failed`);
  console.log(`${count} selection revision contracts passed.`);
}
module.exports = { runSelectionTests };
if (require.main === module) runSelectionTests();
