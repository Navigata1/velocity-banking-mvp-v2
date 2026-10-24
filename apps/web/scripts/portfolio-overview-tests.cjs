/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../../..'),cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const loaded={exports:{}};cache.set(file,loaded);
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(output,{module:loaded,exports:loaded.exports,require:id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id),console},{filename:file});return loaded.exports;
}
const fixture=()=>({monthlyIncome:2000,monthlyExpenses:1500,extraMonthlyPayment:0,chunkAmount:100,
  loc:{limit:5000,balance:300,apr:0.1},strategy:'avalanche',focusMode:'single',splitRatioPrimary:0.7,
  debts:[{id:'a',name:'Loan A',category:'auto',kind:'amortized',balance:1200,apr:0.12,minPaymentRule:{type:'fixed',amount:120},paymentSource:'checking'},
    {id:'b',name:'Loan B',category:'personal_loan',kind:'amortized',balance:600,apr:0.24,minPaymentRule:{type:'fixed',amount:60},paymentSource:'checking'}]});
const overview=book=>load(path.join(root,'packages/financial-engine/src/portfolio-overview.ts')).buildPortfolioOverview(book);
const one=()=>{const book=fixture();book.debts=book.debts.slice(0,1);book.loc.balance=0;return book;};
let tests=0,failures=0;
function test(name,run){tests++;try{run();console.log('PASS Portfolio overview '+name);}catch(error){failures++;console.error('FAIL Portfolio overview '+name+': '+error.message);}}

test('typed package subpath resolves for both web and native',()=>{
  const entry=require.resolve('@interestshield/financial-engine/portfolio-overview');assert.equal(fs.realpathSync(entry),fs.realpathSync(path.join(root,'packages/financial-engine/src/portfolio-overview.ts')));
  const exp=JSON.parse(fs.readFileSync(path.join(root,'packages/financial-engine/package.json'))).exports['./portfolio-overview'];assert.equal(exp.types,exp['react-native']);assert.equal(exp.default,exp.types);
});
test('vitals use the entire canonical debt book and LOC',()=>{
  const model=overview(fixture());assert.equal(model.cashFlow,500);assert.equal(model.totalDebt,2100);assert.ok(Math.abs(model.dailyInterestBurn-318/365)<1e-12);
  assert.equal(model.state,'projected');assert.equal(model.payoffMonths,5);
});
test('next target comes from the actual first allocation, not the inspected asset',()=>{
  const model=overview(fixture());assert.deepEqual(Array.from(model.nextTargetIds),['b']);assert.deepEqual(Array.from(model.nextTargetLabels),['Loan B']);assert.equal(model.locIsTarget,false);
});
test('another listed liability is never excluded from daily burn',()=>{
  const a=fixture(),b=fixture();b.debts[1].balance=1200;assert.ok(Math.abs(overview(b).dailyInterestBurn-overview(a).dailyInterestBurn-144/365)<1e-12);
});
test('LOC-only inventory remains a real target without a fabricated debt ID',()=>{
  const book=fixture();book.debts=[];book.loc.balance=600;book.loc.apr=0;const model=overview(book);
  assert.equal(model.totalDebt,600);assert.equal(model.state,'projected');assert.equal(model.payoffMonths,2);assert.equal(model.locIsTarget,true);
  assert.deepEqual(Array.from(model.nextTargetIds),[]);assert.deepEqual(Array.from(model.nextTargetLabels),['Line of credit']);
});
test('canonical debt APR2 is200 percent',()=>{
  const book=one();book.monthlyIncome=5000;book.debts[0].apr=2;book.debts[0].minPaymentRule.amount=1000;
  const model=overview(book);assert.ok(Math.abs(model.dailyInterestBurn-2400/365)<1e-12);assert.equal(model.payoffMonths,1);
});
test('canonical LOC APR2 is200 percent',()=>{
  const book=one();book.debts=[];book.loc.balance=1200;book.loc.apr=2;book.monthlyIncome=5000;const model=overview(book);
  assert.ok(Math.abs(model.dailyInterestBurn-2400/365)<1e-12);assert.equal(model.payoffMonths,1);
});
test('active zero-rate promo uses current intro APR',()=>{
  const book=one();book.debts[0].promo={introApr:0,monthsRemaining:2,postIntroApr:0.24};assert.equal(overview(book).dailyInterestBurn,0);
});
test('expired promo uses post-intro APR instead of base or intro',()=>{
  const book=one();book.debts[0].promo={introApr:0,monthsRemaining:0,postIntroApr:0.24};assert.ok(Math.abs(overview(book).dailyInterestBurn-288/365)<1e-12);
});
test('promo decimal2 is not legacy-normalized a second time',()=>{
  const book=one();book.monthlyIncome=5000;book.debts[0].minPaymentRule.amount=1000;book.debts[0].promo={introApr:2,monthsRemaining:2,postIntroApr:0.24};
  assert.ok(Math.abs(overview(book).dailyInterestBurn-2400/365)<1e-12);
});
test('unfunded minimums do not retain an ETA or positive target',()=>{
  const book=fixture();book.monthlyIncome=1600;const model=overview(book);assert.equal(model.state,'review');assert.equal(model.payoffMonths,null);assert.equal(model.result.failureReason,'cashflow-below-minimums');assert.deepEqual(Array.from(model.nextTargetIds),[]);assert.deepEqual(Array.from(model.nextTargetLabels),[]);
});
test('unfunded interest does not expose a positive target',()=>{
  const book=one();book.debts[0].apr=2;book.debts[0].minPaymentRule.amount=1;const model=overview(book);assert.equal(model.state,'review');assert.equal(model.payoffMonths,null);assert.equal(model.nextTargetLabels.length,0);
});
test('a horizon failure is not a zero-month payoff',()=>{
  const book=one();book.monthlyIncome=1502;book.debts[0].balance=1000000;book.debts[0].apr=0;book.debts[0].minPaymentRule.amount=1;const model=overview(book);
  assert.equal(model.state,'review');assert.equal(model.payoffMonths,null);assert.equal(model.result.failureReason,'payoff-horizon-exceeded');
});
test('exact zero inventory is distinct from failed projections',()=>{
  const book=one();book.debts[0].balance=0;book.monthlyIncome=book.monthlyExpenses=0;const model=overview(book);assert.equal(model.state,'cleared');assert.equal(model.payoffMonths,0);assert.equal(model.totalDebt,0);assert.equal(model.nextTargetIds.length,0);
});
test('nonzero per-liability cent tolerance is not confirmed payoff',()=>{
  const book=fixture();book.debts.forEach(debt=>debt.balance=0.005);book.loc.balance=0.005;const model=overview(book);
  assert.equal(model.state,'tolerance');assert.equal(model.payoffMonths,null);assert.ok(model.totalDebt>0);assert.equal(model.nextTargetLabels.length,0);
});
test('tiny meaningful inventory and daily interest are not rounded out of the model',()=>{
  const book=one();book.debts[0].balance=1e-8;const model=overview(book);assert.equal(model.state,'tolerance');assert.equal(model.totalDebt,1e-8);assert.ok(model.dailyInterestBurn>0);
});
test('nonfinite daily interest is unavailable rather than Infinity or zero',()=>{
  const book=one();book.debts[0].balance=Number.MAX_VALUE;book.debts[0].apr=Number.MAX_VALUE;const model=overview(book);assert.equal(model.dailyInterestBurn,null);assert.equal(model.state,'review');assert.equal(model.payoffMonths,null);
});
test('very large finite daily interest is retained instead of capped or hidden',()=>{
  const book=one();book.debts[0].balance=Number.MAX_VALUE;book.debts[0].apr=2;const model=overview(book);assert.ok(Number.isFinite(model.dailyInterestBurn)&&model.dailyInterestBurn>1e305);assert.equal(model.state,'review');
});
test('strict invalid books fail before producing a financial snapshot',()=>{
  const book=fixture();book.debts[1].apr=-1;assert.throws(()=>overview(book),/APR/i);
});
test('duplicate debt identities do not silently select another liability',()=>{
  const book=fixture();book.debts[1].id='a';assert.throws(()=>overview(book),/duplicate/i);
});
test('frozen source precision, metadata and nested policy objects survive',()=>{
  const book=fixture();book.monthlyIncome=2000.751;book.debts[0].notes='Original metadata';book.debts[0].createdAt='2026-10-21T00:00:00Z';book.debts[0].promo={introApr:0.001,monthsRemaining:2,postIntroApr:0.24};
  const before=JSON.stringify(book);function freeze(value){Object.freeze(value);for(const child of Object.values(value))if(child&&typeof child==='object'&&!Object.isFrozen(child))freeze(child);}freeze(book);
  const model=overview(book);assert.equal(JSON.stringify(book),before);assert.deepEqual(JSON.parse(JSON.stringify(model.book)),JSON.parse(before));assert.notEqual(model.book,book);assert.notEqual(model.book.debts[0],book.debts[0]);
});
console.log(`${tests} Portfolio overview contracts ${failures?'failed':'passed'}.`);if(failures)process.exitCode=1;
