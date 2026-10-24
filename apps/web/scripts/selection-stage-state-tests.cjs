/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { readSelectionStageState } = require(process.env.SELECTION_STAGE_STATE_FILE || './selection-stage-state.cjs');
const plain = value => value === undefined ? value : JSON.parse(JSON.stringify(value));
class NativeHtml {
  constructor(id = 'income', state = 'settled', revision = '0', connected = true) {
    this.isConnected = connected; this.tagName = 'DIV';
    this.attributes = Object.freeze({ 'data-active-artifact': id, 'data-selection-state': state, 'data-selection-revision': revision });
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  setAttribute() { throw Error('page writes forbidden'); }
}
function boundary(initial = [new NativeHtml()]) {
  let nodes = initial, evaluations = 0, queries = 0;
  const document = Object.freeze({ querySelectorAll: selector => {
    queries++; assert.equal(selector, '[data-testid="money-loop-three-stage"]'); return nodes;
  }, createElement: () => { throw Error('DOM allocation forbidden'); } });
  const globals = { document, HTMLElement: NativeHtml };
  for (const key of ['localStorage', 'sessionStorage', 'fetch']) Object.defineProperty(globals, key, { get() { throw Error('unrelated state access forbidden'); } });
  const page = new Proxy({ evaluate: async callback => { evaluations++; return plain(vm.runInNewContext(`'use strict'; (${callback.toString()})()`, globals)); } },
    { get(target, key) { assert.equal(key, 'evaluate', 'only direct evaluate is permitted'); return target[key]; } });
  return { page, replace: next => { nodes = next; }, counts: () => ({ evaluations, queries }) };
}
test('read all five current artifacts and both transition states without changing raw revisions', async () => {
  for (const id of ['income', 'loc', 'expenses', 'cash-flow', 'principal']) for (const state of ['settled', 'transitioning']) {
    const b = boundary([new NativeHtml(id, state, '12')]);
    assert.deepEqual(await readSelectionStageState(b.page), { id, state, revision: '12' });
  }
});
test('reject missing and duplicate current stages instead of selecting a convenient match', async () => {
  for (const nodes of [[], [new NativeHtml(), new NativeHtml()]]) await assert.rejects(() => readSelectionStageState(boundary(nodes).page), /one current stage/);
});
test('reject disconnected and non-native stage impostors', async () => {
  for (const node of [new NativeHtml('income', 'settled', '0', false), { isConnected: true,
    getAttribute: key => ({ 'data-active-artifact': 'income', 'data-selection-state': 'settled', 'data-selection-revision': '0' })[key] ?? null }]) {
    await assert.rejects(() => readSelectionStageState(boundary([node]).page), /connected HTML stage/);
  }
});
test('reject absent or unknown artifact and transition state', async () => {
  for (const [id, state] of [[null, 'settled'], ['other', 'settled'], ['income', null], ['income', 'complete']]) {
    await assert.rejects(() => readSelectionStageState(boundary([new NativeHtml(id, state)]).page), /current artifact and transition state/);
  }
});
test('nullable and raw revision strings remain observations, not coerced calculations', async () => {
  for (const revision of [null, '', '0002', '9007199254740993']) assert.deepEqual(
    await readSelectionStageState(boundary([new NativeHtml('income', 'transitioning', revision)]).page),
    { id: 'income', state: 'transitioning', revision });
});
test('each call reads the current replacement stage rather than cached handles or old state', async () => {
  const b = boundary(); const first = await readSelectionStageState(b.page);
  b.replace([new NativeHtml('loc', 'transitioning', '1')]); const second = await readSelectionStageState(b.page);
  assert.deepEqual([first, second], [{ id: 'income', state: 'settled', revision: '0' }, { id: 'loc', state: 'transitioning', revision: '1' }]);
  assert.deepEqual(b.counts(), { evaluations: 2, queries: 2 });
});
test('one read-only evaluate and one exact query, with no locator lifecycle or unrelated state', async () => {
  const node = Object.freeze(new NativeHtml()), b = boundary([node]);
  assert.deepEqual(await readSelectionStageState(b.page), { id: 'income', state: 'settled', revision: '0' });
  assert.deepEqual(b.counts(), { evaluations: 1, queries: 1 });
});
test('real six-case workflow binds its existing five state reads to the helper', () => {
  const file = process.env.SELECTION_STAGE_WORKFLOW_FILE || path.join(__dirname, 'smoke-three-selection.cjs');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), nodes = [];
  function walk(node) { nodes.push(node); ts.forEachChild(node, walk); } walk(source);
  const binding = nodes.filter(node => ts.isVariableDeclaration(node) && node.name.getText(source) === 'state');
  assert.equal(binding.length, 1); assert.equal(binding[0].initializer?.getText(source), 'readSelectionStageState');
  assert.equal(nodes.filter(node => ts.isCallExpression(node) && node.expression.getText(source) === 'require'
    && node.arguments[0]?.text === './selection-stage-state.cjs').length, 1);
  assert.equal(nodes.filter(node => ts.isCallExpression(node) && node.expression.getText(source) === 'state').length, 5);
});
