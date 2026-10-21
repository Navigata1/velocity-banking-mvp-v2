const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file).exports;
  if(!fs.existsSync(file))return{};
  const m={exports:{}};cache.set(file,m);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const local=id=>{
    if(id.startsWith('@interestshield/financial-engine'))return load(fs.realpathSync(require.resolve(id)));
    if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));
    return require(id);
  };
  vm.runInNewContext(source,{module:m,exports:m.exports,require:local,console},{filename:file});return m.exports;
}
const api=load(path.resolve(__dirname,'../lib/mobile-portfolio-model.ts'));
const engine=load(fs.realpathSync(require.resolve('@interestshield/financial-engine')));
const plain=x=>JSON.parse(JSON.stringify(x));
let count=0;
function test(name,run){count++;try{run();console.log(`PASS Portfolio model ${name}`);}catch(e){console.error(`FAIL Portfolio model ${name}`);console.error(e);process.exitCode=1;}}
function call(name,...args){assert.equal(typeof api[name],'function',`native whole-book ${name} must exist`);return api[name](...args);}
const debt={id:'a',name:'A',category:'custom',kind:'amortized',balance:1200,apr:2,minPaymentRule:{type:'fixed',amount:300},paymentSource:'checking'};
const book=()=>({...call('createBlankMobilePortfolio'),monthlyIncome:1000,monthlyExpenses:0,extraMonthlyPayment:20,debts:[{...debt}]});
test('blank creation is explicit and creates fresh zeroed nested values',()=>{
  const a=call('createBlankMobilePortfolio'),b=call('createBlankMobilePortfolio');
  assert.equal(a.debts.length,0);assert.equal(a.monthlyIncome,0);assert.equal(a.loc.balance,0);
  assert.notEqual(a.loc,b.loc);assert.notEqual(a.debts,b.debts);
});
test('copy converts legacy rates once without changing source or hiding metadata',()=>{
  const source=plain(engine.defaultMobileDashboardInput);source.activeDebt.apr=6.5;source.loc.apr=8.5;
  const before=JSON.stringify(source),result=call('copyMobileScenarioToPortfolio',source,'synthetic-id');
  assert.equal(JSON.stringify(source),before);assert.equal(result.debts[0].apr,0.065);assert.equal(result.loc.apr,0.085);
  assert.equal(result.debts[0].id,'synthetic-id');assert.equal(result.debts[0].termMonths,source.activeDebt.termMonths);
  assert.equal(result.debts[0].minPaymentRule.amount,source.activeDebt.monthlyPayment);
});
test('whole-book model retains explicit 200-percent APR and funded cash',()=>{
  const b=book(),before=JSON.stringify(b),v=call('buildMobilePortfolioBookView',b);
  assert.equal(JSON.stringify(b),before);assert.equal(v.result.monthResults[0].interestCharges.a,200);
  assert.equal(v.result.monthResults[0].cashBalance,680);assert.equal(v.startingBalance,1200);
  assert.equal(v.result.monthResults[0].balances.a,1080);
});
test('LOC-only inventory remains a liability and an actual payoff target',()=>{
  const b={...book(),debts:[],loc:{limit:5000,balance:900,apr:0.12},extraMonthlyPayment:0};
  const v=call('buildMobilePortfolioBookView',b);
  assert.equal(v.startingBalance,900);assert.equal(v.path.sampledPoints[0].balance,900);
  assert.equal(v.result.isPayoffPossible,true);assert.ok(v.result.monthResults.some(r=>r.locIsTarget));
});
test('explicitly cleared inventory differs from absence and never claims household freedom',()=>{
  const v=call('buildMobilePortfolioBookView',call('createBlankMobilePortfolio'));
  assert.equal(v.state,'cleared');assert.match(v.payoffLabel,/modeled balances/i);
  assert.doesNotMatch(v.payoffLabel,/debt.free|freedom/i);assert.equal(v.path.sampledPoints.length,1);
});
test('nonzero sub-cent liabilities are labeled as model tolerance rather than absent balances',()=>{
  const b={...book(),debts:[{...debt,balance:0.005}],loc:{limit:1,balance:0.005,apr:0.1}};
  const v=call('buildMobilePortfolioBookView',b);
  assert.match(v.payoffLabel,/cent tolerance/i);assert.doesNotMatch(v.payoffLabel,/no modeled balances|paid off/i);
  assert.equal(v.path.startingBalance,0.01);assert.equal(v.path.sampledPoints[0].balance,0.01);
  assert.equal(v.interestLabel,'Not projected');assert.equal(v.cashLabel,'Not projected');assert.equal(v.targetLabel,'Not projected');
  assert.match(v.warnings.join(' '),/lender|confirmation/i);
});
test('failed inputs and unapproved horizon do not become a payoff or zero interest claim',()=>{
  const v=call('buildMobilePortfolioBookView',{...book(),monthlyIncome:0});
  assert.equal(v.state,'review');assert.equal(v.path.isProjected,false);
  assert.equal(v.interestLabel,'Not projected');assert.equal(v.payoffLabel,'Review inputs');
  assert.ok(v.warnings.length>0);
});
test('multi-debt view uses the aggregate result and includes LOC charges in sampled points',()=>{
  const b={...book(),monthlyIncome:5000,extraMonthlyPayment:0,debts:[{...debt,apr:0.12},{...debt,id:'b',balance:800,apr:0.08}],loc:{limit:5000,balance:200,apr:0.1}};
  const v=call('buildMobilePortfolioBookView',b),first=v.result.monthResults[0];
  assert.equal(v.startingBalance,2200);assert.equal(v.path.totalInterest,v.result.totalInterest);
  assert.equal(v.path.sampledPoints[1].interest,Object.values(first.interestCharges).reduce((a,b)=>a+b,0)+first.locInterest);
  assert.equal(v.path.sampledPoints.at(-1).balance,0);assert.ok(v.path.sampledPoints.length<=9);
});
console.log(`${count} whole-book Portfolio model contracts ${process.exitCode?'failed':'passed'}.`);
