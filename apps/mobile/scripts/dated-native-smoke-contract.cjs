/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { execFileSync } = require('node:child_process');
const file = path.join(__dirname, 'portfolio-dated-smoke.cjs'), source = fs.readFileSync(file, 'utf8');
const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const fixture = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'baseBook');
assert.ok(fixture); const book = new Function(`return (${fixture.getText(tree)})();`)();
assert.equal(book.loc.apr, .365); assert.equal(book.loc.lenderTerms.transactionFeePercent, .01, 'The 2-dollar fee oracle requires the existing fractional .01 rate for one percent.');
assert.equal(book.loc.lenderTerms.annualFee, 25); assert.equal(book.loc.balance, 900);
assert.equal(typeof require('./portfolio-dated-smoke.cjs').runNativeDatedFixtures, 'function');
console.log('PASS native dated browser fixture expresses the literal one-percent draw-fee oracle without running a browser at import');
execFileSync(process.execPath, ['--test', path.join(__dirname, 'native-accessibility-output-tests.cjs')], { stdio: 'inherit', windowsHide: true });
