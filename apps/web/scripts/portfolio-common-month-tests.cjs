/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../../packages/financial-engine/src'),cache=new Map();
function load(name){
  if(cache.has(name))return cache.get(name).exports;
  const file=path.join(root,name+'.ts');if(!fs.existsSync(file))return{};
  const m={exports:{}};cache.set(name,m);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(js,{module:m,exports:m.exports,require:id=>id.startsWith('./')?load(id.slice(2)):require(id),console},{filename:file});return m.exports;
}
const api=load('portfolio-common-month'),trace=load('common-month'),engine=load('portfolio'),codec=load('portfolio-book');
const plain=value=>JSON.parse(JSON.stringify(value));
const close=(actual,expected,tolerance=1e-7)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
function call(target,name,...args){assert.equal(typeof target[name],'function',`${name} portable common-month API must exist`);return target[name](...args);}
const compare=(book,horizon)=>call(api,'comparePortfolioAtMonth',book,horizon);
const at=input=>call(trace,'snapshotAtMonth',input);
const debt=(id,balance,min=10,apr=0)=>({id,name:id,category:'custom',kind:'amortized',balance,apr,minPaymentRule:{type:'fixed',amount:min},paymentSource:'checking'});
const book=()=>({monthlyIncome:100,monthlyExpenses:0,extraMonthlyPayment:20,chunkAmount:10,
  loc:{limit:1000,balance:40,apr:0},strategy:'snowball',focusMode:'single',splitRatioPrimary:0.7,debts:[debt('a',120),debt('b',20)]});
const lane=(result,strategy)=>result.plans.find(plan=>plan.strategy===strategy);
const snapshot=(result,strategy)=>lane(result,strategy).snapshot;
function assertUnavailable(value,reason){
  assert.equal(value.status,'unavailable');if(reason)assert.equal(value.reason,reason);
  for(const key of ['balances','debtBalance','locBalance','cashBalance','netModeledWealth','interestThroughMonth','budgetThroughMonth'])assert.equal(value[key],null,key+' must not fabricate zero');
}
function assertFinite(value){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(assertFinite);}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
let count=0;
function test(name,run){count++;try{run();console.log('PASS Common month '+name);}catch(error){process.exitCode=1;console.error('FAIL Common month '+name);console.error(error);}}

test('all strategies observe the same complete month-zero book',()=>{
  const result=compare(book(),0);assert.equal(result.horizonMonths,0);assert.equal(result.monthlyBudget,100);assert.equal(result.referenceStrategy,'snowball');
  assert.deepEqual(plain(result.plans.map(p=>p.strategy)),['velocity','snowball','avalanche']);
  for(const p of result.plans){const s=p.snapshot;assert.equal(s.status,'initial');assert.deepEqual(plain(s.balances),{a:120,b:20});assert.equal(s.debtBalance,140);assert.equal(s.locBalance,40);assert.equal(s.cashBalance,0);assert.equal(s.netModeledWealth,-180);assert.equal(p.wealthDifference,0);}
});
test('same-month residual debts distinguish retained cash from net wealth',()=>{
  const result=compare(book(),3),direct=snapshot(result,'snowball'),velocity=snapshot(result,'velocity');
  assert.equal(direct.cashBalance,200);assert.equal(direct.debtBalance,80);assert.equal(direct.locBalance,0);assert.equal(direct.netModeledWealth,120);
  assert.equal(velocity.cashBalance,120);assert.equal(velocity.debtBalance,0);assert.equal(velocity.netModeledWealth,120);assert.equal(lane(result,'velocity').wealthDifference,0);
});
test('post-payoff continuation carries only the same external budget',()=>{
  const result=compare(book(),6),v=snapshot(result,'velocity');assert.equal(v.status,'post-payoff-cash');assert.equal(v.cashBalance,420);assert.equal(v.netModeledWealth,420);assert.equal(v.interestThroughMonth,0);assert.equal(v.budgetThroughMonth,600);
  assert.equal(snapshot(result,'snowball').cashBalance,420);assert.equal(lane(result,'velocity').wealthDifference,0);
});
test('all listed IDs plus existing LOC are included in different allocations',()=>{
  const result=compare(book(),1),s=snapshot(result,'snowball'),v=snapshot(result,'velocity');
  assert.deepEqual(plain(s.balances),{a:110,b:0});assert.equal(s.locBalance,30);assert.equal(s.cashBalance,60);
  assert.deepEqual(plain(v.balances),{a:80,b:10});assert.equal(v.locBalance,0);assert.equal(v.cashBalance,10);assert.equal(v.netModeledWealth,-80);assert.equal(s.netModeledWealth,-80);
});
test('signed adverse differences are not clamped or ranked by cash alone',()=>{
  const b={...book(),strategy:'avalanche',extraMonthlyPayment:0,debts:[debt('a',120,10,0.12)]};
  const r=compare(b,2);close(snapshot(r,'avalanche').netModeledWealth,38.588);close(snapshot(r,'velocity').netModeledWealth,37.788);close(lane(r,'velocity').wealthDifference,-0.8);
});
test('accepted prefix is usable even when a later attempted month fails',()=>{
  const b={...book(),monthlyIncome:20,extraMonthlyPayment:0,chunkAmount:0,loc:{limit:1000,balance:0,apr:0},strategy:'velocity',
    debts:[{...debt('a',100),promo:{introApr:0,monthsRemaining:1,postIntroApr:2.4}}]};
  const first=compare(b,1),later=compare(b,2);assert.equal(snapshot(first,'velocity').status,'modeled');close(snapshot(first,'velocity').netModeledWealth,-80);
  assert.equal(lane(first,'velocity').payoff.possible,false);assert.equal(lane(first,'velocity').payoff.reason,'payment-below-interest');assert.equal(lane(first,'velocity').payoff.months,2);
  assertUnavailable(snapshot(later,'velocity'),'incomplete-horizon');assert.equal(snapshot(later,'velocity').coveredThroughMonth,1);
  close(snapshot(later,'snowball').netModeledWealth,-76);assert.equal(lane(later,'snowball').wealthDifference,null);
});
test('blocked borrowing does not suppress independently usable direct columns',()=>{
  const b={...book(),strategy:'velocity',loc:{limit:40,balance:40,apr:0}};const r=compare(b,1);
  assertUnavailable(snapshot(r,'velocity'),'incomplete-horizon');assert.equal(lane(r,'velocity').payoff.reason,'loc-no-capacity');
  assert.equal(snapshot(r,'snowball').status,'modeled');assert.equal(lane(r,'snowball').wealthDifference,null);assert.equal(snapshot(compare(b,0),'velocity').netModeledWealth,-180);
});
test('LOC-only recovery needs no invented loan borrowing capacity',()=>{
  const b={...book(),debts:[],loc:{limit:0,balance:40,apr:0}};const r=compare(b,1);
  for(const p of r.plans){assert.equal(p.snapshot.locBalance,20);assert.equal(p.snapshot.cashBalance,80);assert.equal(p.snapshot.netModeledWealth,60);}
});
test('canonical APR2 remains 200 percent rather than legacy2percent',()=>{
  const b={...book(),monthlyIncome:1000,debts:[debt('a',1200,300,2)],loc:{limit:0,balance:0,apr:0}};
  for(const p of compare(b,1).plans){assert.equal(p.snapshot.interestThroughMonth,200);assert.equal(p.snapshot.debtBalance,1080);assert.equal(p.snapshot.cashBalance,680);assert.equal(p.snapshot.netModeledWealth,-400);}
});
test('horizons are explicit safe whole months from0 through600',()=>{
  for(const h of [-1,0.5,1.9,601,Infinity,-Infinity,NaN,undefined,'3']){
    const r=compare(book(),h);assert.equal(r.horizonMonths,null);for(const p of r.plans){assertUnavailable(p.snapshot,'invalid-horizon');assert.equal(p.wealthDifference,null);}assertFinite(r);
  }
  for(const p of compare(book(),600).plans)close(p.snapshot.netModeledWealth,59820);
});
test('zero-cleared books continue cash but do not invent deficit borrowing',()=>{
  for(const q of [0,100]){const b={...book(),monthlyIncome:q,debts:[],loc:{limit:0,balance:0,apr:0}};for(const p of compare(b,3).plans){assert.equal(p.snapshot.netModeledWealth,3*q);assert.equal(p.snapshot.cashBalance,3*q);}}
  const deficit={...book(),monthlyIncome:0,monthlyExpenses:10,debts:[],loc:{limit:0,balance:0,apr:0}};
  for(const p of compare(deficit,0).plans)assert.equal(p.snapshot.netModeledWealth,0);
  for(const p of compare(deficit,1).plans)assertUnavailable(p.snapshot,'negative-cashflow');
});
test('initial and terminal cent tolerance never become free exact-zero clearance',()=>{
  const b={...book(),debts:[debt('a',0.005)],loc:{limit:1,balance:0.005,apr:0}};
  for(const p of compare(b,0).plans){close(p.snapshot.netModeledWealth,-0.01);assert.equal(p.snapshot.balances.a,0.005);}
  for(const p of compare(b,1).plans)assertUnavailable(p.snapshot,'cent-tolerance');
  const ending={...book(),monthlyIncome:10,extraMonthlyPayment:0,chunkAmount:0,debts:[debt('a',10.005)],loc:{limit:0,balance:0,apr:0}};
  for(const p of compare(ending,1).plans)close(p.snapshot.netModeledWealth,-0.005);
  for(const p of compare(ending,2).plans)assertUnavailable(p.snapshot,'cent-tolerance');
});
test('a small existing LOC can remain in a valid covered month',()=>{
  const b={...book(),debts:[debt('a',120)],loc:{limit:1000,balance:0.005,apr:0}};
  const result=compare(b,1);for(const p of result.plans){assert.equal(p.snapshot.status,'modeled');close(p.snapshot.netModeledWealth,-20.005);}
  assert.equal(snapshot(result,'snowball').locBalance,0.005);
});
test('legacy loan tolerance cannot silently forgive residuals within float allowance',()=>{
  const b={...book(),monthlyIncome:2,extraMonthlyPayment:1,chunkAmount:0,loc:{limit:0,balance:0,apr:0},debts:[debt('a',1.000005,1),debt('b',1e9,1)]};
  for(const p of compare(b,1).plans)assert.equal(p.snapshot.status,'modeled');
  for(const p of compare(b,2).plans)assertUnavailable(p.snapshot,'cent-tolerance');
});
test('malformed or numerically overflowing books do not sanitize to success',()=>{
  const bad=[null,undefined,{}, {...book(),monthlyIncome:NaN},{...book(),debts:[debt('a',-1)]},{...book(),debts:[debt('a',10),debt('a',20)]},{...book(),debts:[debt('__proto__',10)]},{...book(),debts:[debt('a',1e308),debt('b',1e308)]}];
  for(const b of bad){const r=compare(b,1);for(const p of r.plans)assertUnavailable(p.snapshot,'invalid-input');assertFinite(r);}
  const cashOverflow={...book(),monthlyIncome:1e308,debts:[],loc:{limit:0,balance:0,apr:0}};
  for(const p of compare(cashOverflow,600).plans)assertUnavailable(p.snapshot,'numeric-range-exceeded');
});
test('exact entered unpaid dust cannot become clearance below an epsilon bound',()=>{
  for(const [balance,minimum,income]of [[256+2**-40,256,257],[1e10+0.000005,1e10,1e10+1]]){
    const b={...book(),monthlyIncome:income,extraMonthlyPayment:1,chunkAmount:0,loc:{limit:0,balance:0,apr:0},debts:[debt('a',balance,minimum),debt('b',100,1)]};
    const prepared=api.preparePortfolioComparison(b);
    for(const h of [0,1])for(const p of prepared.atMonth(h).plans)assert.notEqual(p.snapshot.status,'unavailable');
    for(const h of [2,52,600])for(const p of prepared.atMonth(h).plans){assertUnavailable(p.snapshot,'cent-tolerance');assert.equal(p.snapshot.coveredThroughMonth,1);assert.equal(p.wealthDifference,null);}
  }
});
test('captured selection and original policy outputs remain immutable',()=>{
  const b=freeze(book()),before=JSON.stringify(b),original=['velocity','snowball','avalanche'].map(strategy=>plain(engine.simulatePortfolio({...codec.portfolioBookInputs(b),settings:{...codec.portfolioBookInputs(b).settings,strategy}})));
  compare(b,3);compare(b,6);assert.equal(JSON.stringify(b),before);
  assert.deepEqual(['velocity','snowball','avalanche'].map(strategy=>plain(engine.simulatePortfolio({...codec.portfolioBookInputs(b),settings:{...codec.portfolioBookInputs(b).settings,strategy}}))),original);
});

const raw=()=>({horizonMonths:1,monthlyBudget:100,initial:{balances:{a:120},locBalance:40,cashBalance:0},projection:{payoffPossible:true,payoffMonth:2,rows:[
  {month:1,balances:{a:20},locBalance:40,cashBalance:0,interest:0},
  {month:2,balances:{a:0},locBalance:0,cashBalance:40,interest:0}]}});
test('generic reducer uses accepted inventory and exact-zero continuation',()=>{
  const input=raw();assert.equal(at(input).netModeledWealth,-60);assert.equal(at({...input,horizonMonths:6}).cashBalance,440);assert.equal(at({...input,horizonMonths:0}).netModeledWealth,-160);
});
test('elapsed counters cannot fill an uncovered failed month',()=>{
  const input=raw();input.projection.rows.length=1;input.projection.payoffPossible=false;input.projection.failureReason='payment-below-interest';input.horizonMonths=2;
  assertUnavailable(at(input),'incomplete-horizon');assert.equal(at(input).coveredThroughMonth,1);
});
test('a generic accepted trace can account for an actually repaid sub-cent liability',()=>{
  const input={horizonMonths:1,monthlyBudget:0.01,initial:{balances:{a:0.005},locBalance:0,cashBalance:0},projection:{payoffPossible:true,payoffMonth:1,rows:[{month:1,balances:{a:0},locBalance:0,cashBalance:0.005,interest:0}]}};
  assert.equal(at(input).status,'modeled');assert.equal(at(input).netModeledWealth,0.005);
});
test('missing duplicate gap or corrupted trace facts fail closed',()=>{
  for(const change of [i=>delete i.projection.rows[0].locBalance,i=>delete i.projection.rows[0].cashBalance,i=>i.projection.rows[0].balances={},i=>i.projection.rows[0].balances.extra=5,i=>i.projection.rows[0].month=2,i=>i.projection.rows[1].month=1,i=>i.projection.rows[0].interest=-1,i=>i.projection.rows[0].cashBalance=Infinity,i=>i.projection.rows[0].cashBalance=1]){
    const input=raw();input.horizonMonths=2;change(input);assertUnavailable(at(input));
  }
});
test('a valid requested prefix is not replaced by unrequested future trace failure',()=>{
  const input=raw();input.projection.rows[1].cashBalance=41;
  assert.equal(at(input).status,'modeled');assert.equal(at(input).netModeledWealth,-60);
  assertUnavailable(at({...input,horizonMonths:2}),'inconsistent-trace');
});
test('null undefined and sparse required rows fail closed after their valid prefix',()=>{
  for(const mode of ['null','undefined','sparse']){
    const input=raw();input.projection.rows[1]=mode==='null'?null:undefined;
    if(mode==='sparse')delete input.projection.rows[1];
    assert.equal(at(input).status,'modeled');
    let result;assert.doesNotThrow(()=>{result=at({...input,horizonMonths:2});});
    assertUnavailable(result,'invalid-trace');assert.equal(result.coveredThroughMonth,1);
  }
});
test('unrounded cumulative interest remains available to signed conservation',()=>{
  const input={horizonMonths:2,monthlyBudget:1e16,initial:{balances:{a:1e16},locBalance:0,cashBalance:0},projection:{payoffPossible:false,payoffMonth:2,rows:[
    {month:1,balances:{a:1e16},locBalance:0,cashBalance:0,interest:1e16},
    {month:2,balances:{a:1e16},locBalance:1,cashBalance:1e16,interest:1}]}};
  const result=at(input);assert.equal(result.status,'modeled');assert.equal(result.netModeledWealth,-1);assert.equal(result.interestThroughMonth,1e16);
});
test('positive cumulative interest range is checked separately from signed conservation',()=>{
  for(const [first,second,valid]of [[Number.MAX_VALUE/2,1,true],[Number.MAX_VALUE,0,true],[Number.MAX_VALUE,1,false]]){
    const input={horizonMonths:2,monthlyBudget:0,initial:{balances:{},locBalance:0,cashBalance:first},projection:{payoffPossible:false,payoffMonth:2,rows:[
      {month:1,balances:{},locBalance:0,cashBalance:0,interest:first},
      {month:2,balances:{},locBalance:second,cashBalance:0,interest:second}]}};
    assert.equal(at({...input,horizonMonths:1}).status,'modeled');
    const result=at(input);if(valid){assert.equal(result.status,'modeled');assert.equal(result.netModeledWealth,second===0?0:-second);}
    else{assertUnavailable(result,'numeric-range-exceeded');assert.equal(result.coveredThroughMonth,1);}
  }
});
test('the generic reducer never mutates or aliases trace positions',()=>{
  const input=freeze(raw()),before=JSON.stringify(input),value=at(input);assert.equal(JSON.stringify(input),before);assert.notEqual(value.balances,input.projection.rows[0].balances);
});
test('same-month monetary formatting preserves signs and tiny nonzero values',()=>{
  const f=value=>call(api,'formatCommonMonthAmount',value);assert.equal(f(2.7),'$2.70');assert.equal(f(-0.8),'-$0.80');assert.equal(f(0),'$0.00');
  for(const n of [1e20,-1e20,0.000005,-0.000005]){const label=f(n);assert.match(label,/E/);assert.ok(label.length<24);assert.notEqual(label,'$0.00');}
  assert.equal(f(null),'Not available');assert.equal(f(Infinity),'Not available');
});
test('horizon drafts retain invalid values instead of numeric coercion',()=>{
  const parse=draft=>call(api,'parseCommonMonthDraft',draft);
  for(const draft of ['', ' ', '-1', '1.9', '1e2', '601', 'Infinity', 'NaN', '3months'])assert.equal(parse(draft),null);
  for(const [draft,expected]of [['0',0],['60',60],['600',600],['003',3]])assert.equal(parse(draft),expected);
});
test('coverage copy distinguishes starting inventory from continuation and failure',()=>{
  const label=s=>call(api,'commonMonthStatusLabel',s);
  assert.equal(label(snapshot(compare(book(),0),'snowball')),'Observed starting book');
  assert.equal(label(snapshot(compare(book(),6),'velocity')),'Cash continued after payoff');
  assert.match(label(snapshot(compare({...book(),strategy:'velocity',loc:{limit:40,balance:40,apr:0}},1),'velocity')),/last accepted month 0/);
});
test('a captured comparison prepares policies once and keeps queries private',()=>{
  const original=engine.simulatePortfolio;let runs=0;
  try{
    engine.simulatePortfolio=input=>{runs++;return original(input);};
    const b=book(),prepared=call(api,'preparePortfolioComparison',b);assert.equal(runs,3);
    for(let horizon=0;horizon<=600;horizon++)assert.equal(prepared.atMonth(horizon).horizonMonths,horizon);
    assert.equal(runs,3,'changing only month must not rerun allocation policies');
    b.debts[0].balance=999;b.strategy='avalanche';
    const one=prepared.atMonth(3);assert.equal(one.referenceStrategy,'snowball');assert.equal(snapshot(one,'snowball').debtBalance,80);
    snapshot(one,'snowball').balances.a=0;lane(one,'snowball').payoff.months=999;
    const again=prepared.atMonth(3);assert.equal(snapshot(again,'snowball').balances.a,80);assert.notEqual(lane(again,'snowball').payoff.months,999);
  }finally{engine.simulatePortfolio=original;}
});
test('portable typed package subpath resolves for both web and native',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'../package.json'),'utf8'));
  assert.deepEqual(manifest.exports['./portfolio-common-month'],{types:'./src/portfolio-common-month.ts','react-native':'./src/portfolio-common-month.ts',default:'./src/portfolio-common-month.ts'});
  assert.equal(fs.realpathSync(require.resolve('@interestshield/financial-engine/portfolio-common-month')),fs.realpathSync(path.join(root,'portfolio-common-month.ts')));
  const program=ts.createProgram([path.join(root,'portfolio-common-month.ts')],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,skipLibCheck:true,types:[],lib:['lib.esnext.d.ts','lib.dom.d.ts']});
  const errors=ts.getPreEmitDiagnostics(program);assert.equal(errors.length,0,ts.formatDiagnostics(errors,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));
});
console.log(`${count} common-month contracts ${process.exitCode?'failed':'passed'}.`);
