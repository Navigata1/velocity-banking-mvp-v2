const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const filename = path.resolve(__dirname, '../lib/financial-input-draft.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsObject = {};
new vm.Script(output, { filename }).runInNewContext({ exports: exportsObject });
const { formatFinancialInput, resolveFinancialDraft } = exportsObject;
let count = 0, failures = 0;
function test(name, run) {
  count++;
  try { run(); console.log(`PASS native input ${name}`); }
  catch (error) { failures++; console.error(`FAIL native input ${name}: ${error.message}`); }
}

test('money preserves cents and sub-cent values', () => {
  for (const value of [0, 120.7, 0.00001, 100000000.15]) assert.equal(Number(formatFinancialInput(value, 'money')), value);
});
test('percentage display shifts decimal without multiplication noise', () => {
  assert.equal(formatFinancialInput(0.07123456789, 'percent'), '7.123456789');
  assert.equal(formatFinancialInput(0.00000123, 'percent'), '0.000123');
});
test('small and large scientific representations expand without losing their value', () => {
  for (const value of [1e-25, 1e25, Number.MIN_VALUE, Number.MAX_VALUE]) {
    const text = formatFinancialInput(value, 'money');
    assert.ok(!/e/i.test(text)); assert.equal(Number(text), value);
  }
});
test('all no-op kinds retain the original exact IEEE value', () => {
  for (const kind of ['money', 'percent', 'whole']) for (const value of [0, 120.7, 0.07123456788999999, 1e25]) {
    const r = resolveFinancialDraft(value, formatFinancialInput(value, kind), kind);
    assert.ok(Object.is(r.value, value)); assert.equal(r.error, null);
  }
});
test('money draft is interpreted only as the completed number', () => {
  assert.equal(resolveFinancialDraft(0, '120.70', 'money').value, 120.7);
  assert.equal(resolveFinancialDraft(0, '.25', 'money').value, 0.25);
  assert.equal(resolveFinancialDraft(0, '120.', 'money').value, 120);
});
test('percentage entry shifts exact decimal before Number conversion', () => {
  assert.equal(resolveFinancialDraft(0, '7.123456789', 'percent').value, 0.07123456789);
  assert.equal(resolveFinancialDraft(0, '0.000123', 'percent').value, 0.00000123);
});
test('valid grouped USD money paste is supported', () => {
  assert.equal(resolveFinancialDraft(0, '$ 1,234.56', 'money').value, 1234.56);
});
test('empty, incomplete, negative and malformed drafts preserve previous value', () => {
  for (const draft of ['', '.', '-', '-5', '12..3', 'abc12', '1,23', '1e3', 'Infinity', 'NaN']) {
    const r = resolveFinancialDraft(123.45, draft, 'money');
    assert.equal(r.value, 123.45); assert.ok(r.error);
  }
});
test('fractional and unsafe whole-number changes do not silently round', () => {
  for (const draft of ['12.5', '9007199254740992']) assert.ok(resolveFinancialDraft(60, draft, 'whole').error);
  assert.equal(resolveFinancialDraft(60, '12.0', 'whole').value, 12);
});
test('overflow and meaningful underflow are rejected instead of saved as infinity or zero', () => {
  for (const draft of ['9'.repeat(400), '0.' + '0'.repeat(400) + '1']) {
    const r = resolveFinancialDraft(120.7, draft, 'money'); assert.equal(r.value, 120.7); assert.ok(r.error);
  }
});
test('zero is an explicit valid edit', () => {
  for (const kind of ['money','percent','whole']) assert.equal(resolveFinancialDraft(123, '0', kind).value, 0);
});
test('form resets with account scope and disabled edits cannot commit', () => {
  const inputSource = fs.readFileSync(path.resolve(__dirname, '../components/mobile-shell/number-input.tsx'), 'utf8');
  const route = fs.readFileSync(path.resolve(__dirname, '../components/mobile-routes/route-screen.tsx'), 'utf8');
  const hook = fs.readFileSync(path.resolve(__dirname, '../hooks/use-persisted-mobile-assumptions.ts'), 'utf8');
  assert.match(inputSource, /disabled\s*\|\|/); assert.match(inputSource, /session\.current\s*=\s*null/);
  assert.match(route, /key=\{context\.storageScope\}/); assert.match(hook, /storageScope:\s*scope/);
  assert.match(route, /keyboardDismissMode=\{Platform\.OS === 'web' \? 'none' : 'on-drag'\}/);
  assert.match(inputSource, /selectTextOnFocus=\{Platform\.OS !== 'web'\}/);
});
test('new money edits reject decimal precision already lost during Number conversion', () => {
  for (const draft of ['100000000000000.01', '1000000000000000.01']) {
    const r = resolveFinancialDraft(120.7, draft, 'money'); assert.equal(r.value, 120.7); assert.ok(r.error);
  }
});
test('fractional whole-number digits cannot disappear in IEEE conversion', () => {
  for (const draft of ['12.0000000000000001', '0.99999999999999999']) {
    const r = resolveFinancialDraft(60, draft, 'whole'); assert.equal(r.value, 60); assert.ok(r.error);
  }
});
test('ambiguous comma keyboard amounts never silently become thousandfold values', () => {
  for (const draft of ['120,700', '0,125', '1,234', '$1,234']) {
    const r = resolveFinancialDraft(120.7, draft, 'money'); assert.equal(r.value, 120.7); assert.ok(r.error);
  }
});
assert.equal(failures, 0, `${failures} native input draft contracts failed`);
console.log(`${count} native input draft contracts passed. Scope assertions are static wiring, not signed-in device QA.`);
