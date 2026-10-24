const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const local = id => id.startsWith('.') ? load(path.resolve(path.dirname(file), id + '.ts')) : require(id);
  vm.runInNewContext(output, { module, exports: module.exports, require: local, console }, { filename: file });
  return module.exports;
}
const engine = load(fs.realpathSync(require.resolve('@interestshield/financial-engine')));
const fresh = () => JSON.parse(JSON.stringify(engine.defaultMobileDashboardInput));
const failed = () => { const input = fresh(); input.activeDebt.apr = 200; return input; };
const velocity = input => engine.buildMobileSimulatorSnapshot(input).strategies.find(strategy => strategy.name === 'Velocity');
const next = snapshot => snapshot.vitals.find(vital => vital.label === 'Next Move');
let tests = 0, failures = 0;
function test(name, run) { tests++; try { run(); console.log('PASS coaching safety ' + name); } catch (error) { failures++; console.error('FAIL coaching safety ' + name + ': ' + error.message); } }
function review(snapshot, reason) {
  assert.match(snapshot.nextMove, /review.*inputs/i, 'unavailable projection must not suggest a new chunk');
  assert.match(snapshot.warning || '', reason, 'expose the actual failure reason');
  assert.equal(next(snapshot).tone, 'watch');
}

test('healthy default asks for comparison before a bounded principal chunk', () => {
  const input = fresh(), snapshot = engine.buildMobileDashboardSnapshot(input);
  assert.equal(velocity(input).isPayoffPossible, true); assert.equal(snapshot.nextMove, 'Compare payoff paths'); assert.equal(snapshot.warning, null);
});
test('non-amortizing debt cannot earn a positive chunk suggestion', () => {
  const input = failed(); assert.equal(velocity(input).failureReason, 'payment-below-interest');
  review(engine.buildMobileDashboardSnapshot(input), /payment.*interest/i);
});
test('unfunded minimums require review instead of ordinary pause guidance', () => {
  const input = fresh(); input.monthlyIncome = 1000; input.monthlyExpenses = 900;
  assert.equal(velocity(input).failureReason, 'cashflow-below-minimums');
  review(engine.buildMobileDashboardSnapshot(input), /cash flow.*minimum/i);
});
test('a failed horizon is not presented as a workable chunk plan', () => {
  const input = fresh(); input.monthlyIncome = 1000; input.monthlyExpenses = 998; input.chunkAmount = 0;
  input.activeDebt = { balance: 1000000, apr: 0, monthlyPayment: 1 }; input.loc = { limit: 2000, balance: 0, apr: 0 };
  assert.equal(velocity(input).failureReason, 'payoff-horizon-exceeded');
  review(engine.buildMobileDashboardSnapshot(input), /projection horizon/i);
});
for (const [name, edit, move, warning] of [
  ['cash flow', input => { input.monthlyIncome = input.monthlyExpenses; input.loc.limit = 0; }, 'Restore positive cash flow', /income needs to exceed expenses/i],
  ['missing LOC', input => { input.loc.limit = 0; }, 'Enter known LOC terms', /enter known LOC/i],
  ['over-limit LOC', input => { input.loc.balance = input.loc.limit + 1; }, 'Pay down the LOC', /above.*limit/i],
  ['full LOC', input => { input.loc.balance = input.loc.limit; }, 'Create LOC room', /at.*limit/i],
  ['high utilization', input => { input.loc.balance = 20001; }, 'Pay down the LOC', /80%/],
]) test(name + ' keeps its more specific safety priority', () => {
  const input = failed(); edit(input); const snapshot = engine.buildMobileDashboardSnapshot(input);
  assert.equal(snapshot.nextMove, move); assert.match(snapshot.warning, warning); assert.equal(next(snapshot).tone, 'watch');
});
test('exactly80 percent utilization still exposes the actual projection failure', () => {
  const input = failed(); input.loc.balance = 20000; review(engine.buildMobileDashboardSnapshot(input), /payment.*interest/i);
});
for (const [name, balance, apr, expenses, locBalance, months] of [
  ['affordable final payment', 100, 0.12, 800, 0, 1],
  ['zero-surplus scheduled payments', 1000, 0, 575, 500, 4],
]) test(name + ' stays valid and pauses only new chunks', () => {
  const input = fresh(); input.monthlyIncome = 1000; input.monthlyExpenses = expenses; input.chunkAmount = 100;
  input.activeDebt = { balance, apr, monthlyPayment: 425 }; input.loc = { limit: 2000, balance: locBalance, apr: 0 };
  const snapshot = engine.buildMobileDashboardSnapshot(input), projection = velocity(input);
  assert.equal(projection.isPayoffPossible, true); assert.equal(projection.months, months);
  assert.equal(snapshot.nextMove, 'Pause new chunks'); assert.equal(snapshot.warning, null); assert.equal(engine.buildMobileVaultSnapshot(input).guardrail, null);
});
test('Cockpit does not announce readiness for the same unavailable projection', () => {
  const snapshot = engine.buildMobileCockpitSnapshot(failed()); assert.equal(snapshot.flightStatusLabel, 'Review inputs'); assert.match(snapshot.warning || '', /payment.*interest/i);
});
test('Vault does not announce stabilization readiness when debt interest is unfunded', () => {
  const snapshot = engine.buildMobileVaultSnapshot(failed()); assert.equal(snapshot.stages[0].value, 'Review inputs'); assert.match(snapshot.guardrail || '', /payment.*interest/i);
});
test('Learn carries the same safety reason and a non-borrowing next move', () => {
  const snapshot = engine.buildMobileLearnSnapshot(failed()); assert.match(snapshot.guardrail || '', /payment.*interest/i); assert.match(snapshot.lessons[0].value, /review.*inputs/i);
});
test('coaching does not mutate the saved scenario or its precise raw rates', () => {
  const input = failed(); input.loc.apr = 8.5; const bytes = JSON.stringify(input);
  Object.freeze(input.activeDebt); Object.freeze(input.loc); Object.freeze(input);
  for (const name of ['buildMobileDashboardSnapshot', 'buildMobileSimulatorSnapshot', 'buildMobileCockpitSnapshot', 'buildMobileLearnSnapshot', 'buildMobileVaultSnapshot']) engine[name](input);
  assert.equal(JSON.stringify(input), bytes);
});
test('rendered coaching hashes the explicitly selected export without changing its default', () => {
  const file = path.join(__dirname, 'coaching-safety-smoke.cjs');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'exportHashes');
  assert.ok(declaration, 'inspect the real hash selector');
  const visited = [], appRoot = path.resolve('C:/synthetic-mobile');
  const select = vm.runInNewContext('(' + declaration.getText(source) + ')', {
    appRoot, path, filesBelow: directory => { visited.push(directory); return [path.join(directory, 'index.html')]; },
    fs: { readFileSync: () => Buffer.from('synthetic-export') }, sha: bytes => bytes.toString(),
  });
  assert.equal(select()['index.html'], 'synthetic-export');
  assert.equal(select(path.join(appRoot, 'test-results', 'fresh-export'))['index.html'], 'synthetic-export');
  assert.deepEqual(visited, [path.join(appRoot, 'dist-web'), path.join(appRoot, 'test-results', 'fresh-export')]);
});
console.log(`${tests} coaching safety contracts ${failures ? 'failed' : 'passed'}.`);
if (failures) process.exitCode = 1;
