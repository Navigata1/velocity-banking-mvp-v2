/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../../packages/financial-engine/src');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const file = path.join(root, name + '.ts');
  if (!fs.existsSync(file)) return {};
  const testModule = { exports: {} }; cache.set(name, testModule);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { module: testModule, exports: testModule.exports,
    require: id => id.startsWith('./') ? load(id.slice(2)) : require(id) }, { filename: file });
  return testModule.exports;
}
const codec = load('portfolio-book');
function call(name, ...args) {
  assert.equal(typeof codec[name], 'function', `portable Portfolio ${name} must exist`);
  return codec[name](...args);
}
const plain = value => JSON.parse(JSON.stringify(value));
function assertFinite(value) {
  if(typeof value==='number') assert.ok(Number.isFinite(value));
  else if(value&&typeof value==='object') Object.values(value).forEach(assertFinite);
}
const book = { monthlyIncome: 8200.45123, monthlyExpenses: 4700.121,
  extraMonthlyPayment: 50.125, chunkAmount: 1000.005,
  loc: { limit: 200000000, balance: 120.70001, apr: 1.23456789 },
  strategy: 'avalanche', focusMode: 'split', splitRatioPrimary: 0.7123456789,
  debts: [{ id: 'loan-1', name: 'Loan \u9ad8', category: 'custom', kind: 'amortized',
    balance: 100000000.125, apr: 2, minPaymentRule: { type: 'fixed', amount: 300.125 },
    paymentSource: 'checking', termMonths: 48, notes: 'Keep exact stored values.', createdAt: '2026-10-20T12:00:00Z' },
  { id: 'card-1', name: 'Card', category: 'credit_card', kind: 'revolving', balance: 0.00123,
    apr: 0.219, minPaymentRule: { type: 'percent', percent: 0.02, floor: 35.125 },
    paymentSource: 'either', promo: { introApr: 0.075, monthsRemaining: 2, postIntroApr: 1.2 } }] };
const document = data => JSON.stringify({ version: 2, aprUnit: 'decimal', data });
let cases = 0;
function test(name, action) {
  cases++;
  try { action(); console.log(`PASS Portfolio book ${name}`); }
  catch(error) { console.error(`FAIL Portfolio book ${name}`); console.error(error); process.exitCode=1; }
}

test('canonical document preserves every supported field and exact number', () => {
  assert.deepEqual(plain(call('decodePortfolioDocument', document(book))), book);
});
test('codec has a typed public web/native package entry', () => {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'../package.json'),'utf8'));
  assert.deepEqual(manifest.exports['./portfolio-book'], { types:'./src/portfolio-book.ts',
    'react-native':'./src/portfolio-book.ts',default:'./src/portfolio-book.ts' });
  assert.equal(fs.realpathSync(require.resolve('@interestshield/financial-engine/portfolio-book')),
    fs.realpathSync(path.join(root,'portfolio-book.ts')));
  const program=ts.createProgram([path.join(root,'portfolio-book.ts')], { strict:true,noEmit:true,
    target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,
    skipLibCheck:true,types:[],lib:['lib.esnext.d.ts','lib.dom.d.ts'] });
  const diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:f=>f,
    getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));
});
test('canonical validation and serialization never mutate their source', () => {
  const before=JSON.stringify(book), decoded=call('decodePortfolioBook',book);
  assert.deepEqual(plain(decoded),book); assert.notEqual(decoded,book);
  assert.notEqual(decoded.debts,book.debts); assert.notEqual(decoded.loc,book.loc);
  assert.equal(JSON.stringify(book),before);
  const a=call('encodePortfolioDocument',book), b=call('encodePortfolioDocument',book);
  assert.equal(a,b); assert.deepEqual(JSON.parse(a),JSON.parse(document(book)));
  assert.equal(JSON.stringify(book),before);
});
test('legacy exported and persisted documents convert mixed APR units exactly once', () => {
  const old=plain(book); old.loc.apr=8.5; old.debts[0].apr=6.5;
  old.debts[1].promo.postIntroApr=120;
  const expected=plain(old); expected.loc.apr=0.085; expected.debts[0].apr=0.065;
  expected.debts[1].promo.postIntroApr=1.2;
  for(const shape of [{version:1,data:old,exportedAt:'2026-10-20T12:00:00Z'}, {version:1,state:old}]) {
    assert.deepEqual(plain(call('decodePortfolioDocument',JSON.stringify(shape))),expected);
  }
});
test('canonical high rates reach the engine with explicit units and no hidden extra cash', () => {
  const input={...plain(book),monthlyIncome:1000,monthlyExpenses:0,extraMonthlyPayment:20,
    loc:{limit:0,balance:0,apr:0},debts:[{...book.debts[0],balance:1200,minPaymentRule:{type:'fixed',amount:300}}]};
  const mapped=call('portfolioBookInputs',input);
  assert.equal(mapped.aprUnit,'decimal'); assert.equal(mapped.maxMonths,600);
  assert.equal(mapped.settings.strategy,'avalanche'); assert.equal(mapped.settings.focusMode,'split');
  const row=load('portfolio').simulatePortfolio(mapped).monthResults[0];
  assert.equal(row.interestCharges['loan-1'],200); assert.equal(row.balances['loan-1'],1080);
  assert.equal(row.cashBalance,680);
});
test('an explicitly empty book is valid but absence is never an empty default', () => {
  const empty={...plain(book),debts:[],loc:{limit:0,balance:0,apr:0}};
  assert.equal(call('decodePortfolioDocument',document(empty)).debts.length,0);
  for(const bad of [null,undefined,{},[]]) assert.throws(()=>call('decodePortfolioBook',bad));
});
test('finite inputs that overflow future cash are not successful or nonfinite projections', () => {
  const input={...plain(book),monthlyIncome:1e308,monthlyExpenses:0,extraMonthlyPayment:1,
    loc:{limit:0,balance:0,apr:0}, debts:[{...book.debts[0],balance:6,apr:0,minPaymentRule:{type:'fixed',amount:1}}]};
  for(const strategy of ['snowball','avalanche','velocity']) for(const focusMode of ['single','split']) {
    input.strategy=strategy; input.focusMode=focusMode;
    for(const aprUnit of [undefined,'decimal']) {
      const mapped=call('portfolioBookInputs',input);
      const result=load('portfolio').simulatePortfolio({...mapped,aprUnit});
      assert.equal(result.isPayoffPossible,false,'overflow cannot be called a valid payoff');
      assert.equal(result.failureReason,'numeric-range-exceeded');
      assert.equal(result.cashAtPayoff,0);
      assertFinite(result);
      assert.ok(result.warnings.some(w=>/numeric range/i.test(w)));
    }
  }
});
test('monthly liability aggregates must remain finite before a row is accepted', () => {
  const input={...plain(book),monthlyIncome:1e307,monthlyExpenses:0,extraMonthlyPayment:0,
    loc:{limit:0,balance:0,apr:0},strategy:'avalanche',focusMode:'single',
    debts:['a','b'].map(id=>({...book.debts[0],id,balance:7e307,apr:0,
      minPaymentRule:{type:'fixed',amount:5e306},promo:{introApr:0,monthsRemaining:1,postIntroApr:12}}))};
  const result=load('portfolio').simulatePortfolio(call('portfolioBookInputs',input));
  assert.equal(result.failureReason,'numeric-range-exceeded'); assert.equal(result.monthResults.length,1);
  for(const row of result.monthResults) assert.ok(Number.isFinite(Object.values(row.balances).reduce((a,b)=>a+b,0)+row.locBalance));
  assertFinite(result);
});

test('aggregate range checks cannot hide debts behind a large LOC or change with order', () => {
  const input={...plain(book),monthlyIncome:1e292,monthlyExpenses:0,extraMonthlyPayment:1,
    loc:{limit:Number.MAX_VALUE,balance:Number.MAX_VALUE,apr:0},strategy:'avalanche',focusMode:'single',
    debts:['a','b'].map(id=>({...book.debts[0],id,balance:9e291,apr:0,minPaymentRule:{type:'fixed',amount:1e290}}))};
  assert.throws(()=>call('decodePortfolioBook',input),/finite|range/i);
  const result=load('portfolio').simulatePortfolio({...input,aprUnit:'decimal',settings:{strategy:input.strategy,focusMode:input.focusMode}});
  assert.equal(result.failureReason,'numeric-range-exceeded'); assert.equal(result.monthResults.length,0); assertFinite(result);
  const {hasFiniteNonNegativeSum}=load('numeric-range');
  for(const values of [[Number.MAX_VALUE,9e291,9e291],[9e291,Number.MAX_VALUE,9e291],
    [9e291,9e291,Number.MAX_VALUE],[Number.MAX_VALUE,Number.MIN_VALUE]]) assert.equal(hasFiniteNonNegativeSum(values),false);
  for(const values of [[Number.MAX_VALUE,0],[1e100,1e100,1e100],[1e308,7e307]]) assert.equal(hasFiniteNonNegativeSum(values),true);
});
test('initial interest overflow is not mislabeled as zero-interest affordability', () => {
  const input={...plain(book),monthlyIncome:1e308,monthlyExpenses:0,extraMonthlyPayment:0,
    loc:{limit:0,balance:0,apr:0},strategy:'avalanche',focusMode:'single',
    debts:[{...book.debts[0],balance:1e308,apr:30,minPaymentRule:{type:'fixed',amount:1e308}}]};
  const result=load('portfolio').simulatePortfolio(call('portfolioBookInputs',input));
  assert.equal(result.failureReason,'numeric-range-exceeded'); assert.equal(result.monthResults.length,0);
  assert.ok(result.warnings.every(w=>!/monthly interest \(\$0\)/i.test(w))); assertFinite(result);
});

test('rounding residue in a derived LOC payment cannot reject an ordinary funded plan', () => {
  const input={...plain(book),monthlyIncome:8200.45,monthlyExpenses:7700.45,extraMonthlyPayment:0,chunkAmount:0,
    loc:{limit:25000,balance:3200.1,apr:0.085},strategy:'velocity',focusMode:'single',
    debts:[{...book.debts[0],balance:10000,apr:0.065,minPaymentRule:{type:'fixed',amount:500}}]};
  const result=load('portfolio').simulatePortfolio(call('portfolioBookInputs',input));
  assert.equal(result.isPayoffPossible,true);assert.equal(result.payoffMonths,28);
  assert.equal(result.monthResults[0].locPayment,0);assertFinite(result);
});
test('overflow rollback retains accepted interest LOC charges and earlier payoff events', () => {
  const input={...plain(book),monthlyIncome:1e308,monthlyExpenses:0,extraMonthlyPayment:1,
    loc:{limit:1000,balance:100,apr:0.1},strategy:'avalanche',focusMode:'single',
    debts:[{...book.debts[0],id:'a',balance:6,apr:0,minPaymentRule:{type:'fixed',amount:6}},
      {...book.debts[0],id:'b',balance:2,apr:0.12,minPaymentRule:{type:'fixed',amount:1}}]};
  const result=load('portfolio').simulatePortfolio(call('portfolioBookInputs',input));
  assert.equal(result.failureReason,'numeric-range-exceeded'); assert.equal(result.monthResults.length,1);
  assert.deepEqual(plain(result.payoffOrder),[{id:'a',name:book.debts[0].name,monthPaidOff:1}]);
  const locCharge=100*0.1*30/365;
  assert.ok(Math.abs(result.totalInterest-(0.02+locCharge))<1e-12);
  assert.ok(Math.abs(result.locInterestPaid-locCharge)<1e-12);assertFinite(result);
});
test('large but representable cash is not subjected to an arbitrary money cap', () => {
  const input={...plain(book),monthlyIncome:1e100,monthlyExpenses:0,extraMonthlyPayment:1,
    loc:{limit:0,balance:0,apr:0},strategy:'avalanche',focusMode:'single',
    debts:[{...book.debts[0],balance:6,apr:0,minPaymentRule:{type:'fixed',amount:1}}]};
  const result=load('portfolio').simulatePortfolio(call('portfolioBookInputs',input));
  assert.equal(result.isPayoffPossible,true);assert.equal(result.payoffMonths,3);
  assert.ok(Math.abs(result.cashAtPayoff-3e100)<=Number.EPSILON*4*3e100);assertFinite(result);
});
test('unknown versions units ambiguous wrappers and malformed JSON are rejected', () => {
  for(const raw of ['{',JSON.stringify({version:3,data:book}),JSON.stringify({version:2,data:book}),
    JSON.stringify({version:2,aprUnit:'percent',data:book}),
    JSON.stringify({version:1,aprUnit:'decimal',data:book}),
    JSON.stringify({version:2,aprUnit:'decimal',data:book,state:book}),JSON.stringify(book)]) {
    assert.throws(()=>call('decodePortfolioDocument',raw));
  }
});
test('duplicate empty and prototype-sensitive debt identities are rejected', () => {
  for(const id of ['loan-1','','  ','__proto__','constructor','prototype']) {
    const input=plain(book); input.debts[1].id=id;
    assert.throws(()=>call('decodePortfolioBook',input),/id|identity|duplicate/i);
  }
});
test('invalid money APR terms ratios minimums and promo fields never coerce or clamp', () => {
  const corruptions=[b=>b.monthlyIncome='8200.45',b=>b.monthlyIncome=Infinity,
    b=>b.debts[0].balance=-1,b=>b.loc.apr=NaN,b=>b.splitRatioPrimary=1.01,
    b=>b.debts[0].termMonths=1.1,b=>b.debts[0].minPaymentRule.amount=null,
    b=>b.debts[1].minPaymentRule.percent='0.02',b=>b.debts[1].promo.monthsRemaining=-1,
    b=>b.debts[1].promo.postIntroApr=Infinity,b=>b.debts[0].paymentSource='bank',
    b=>b.debts[0].kind='guess',b=>b.strategy='fastest',b=>b.debts[0].name='  ',
    b=>b.debts[0].notes=null,b=>b.loc.balance=1e308];
  for(const corrupt of corruptions) {
    const input=plain(book); corrupt(input);
    if(input.loc.balance===1e308) input.debts[0].balance=1e308;
    const before=JSON.stringify(input); assert.throws(()=>call('decodePortfolioBook',input));
    assert.equal(JSON.stringify(input),before);
  }
});
test('unknown present fields fail explicitly instead of disappearing on a round trip', () => {
  for(const corrupt of [b=>b.unrecognized=true,b=>b.debts[0].lenderFee=5,
    b=>b.loc.rateMode='fixed',b=>b.debts[1].promo.otherRate=2]) {
    const input=plain(book); corrupt(input); assert.throws(()=>call('decodePortfolioBook',input),/unknown|unsupported/i);
  }
});
console.log(`${cases} portable Portfolio book contracts ${process.exitCode?'failed':'passed'}. Storage UI and paired recovery remain separate.`);
