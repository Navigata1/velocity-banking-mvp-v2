/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../../..'),cache=new Map(),engineRoot=path.join(root,'packages/financial-engine/src');
function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const m={exports:{}};cache.set(file,m);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:m,exports:m.exports,require:id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):id.startsWith('@interestshield/financial-engine/')?load(path.join(engineRoot,id.slice('@interestshield/financial-engine/'.length)+'.ts')):require(id),console},{filename:file});return m.exports;
}
const file=path.join(root,'apps/web/src/app/simulator/portfolio-simulator-model.ts'),api=fs.existsSync(file)?load(file):{};
const engine=load(path.join(engineRoot,'portfolio.ts')),codec=load(path.join(engineRoot,'portfolio-book.ts'));
const debt=(id,balance,min=50,apr=0)=>({id,name:id,category:'auto',kind:'amortized',balance,apr,minPaymentRule:{type:'fixed',amount:min},paymentSource:'checking'});
const book=()=>({monthlyIncome:100,monthlyExpenses:0,extraMonthlyPayment:0,chunkAmount:100,loc:{limit:1000,balance:0,apr:0},strategy:'velocity',focusMode:'single',splitRatioPrimary:.7,debts:[debt('a',200)]});
const varied=()=>({...book(),extraMonthlyPayment:20,chunkAmount:10,loc:{limit:1000,balance:40,apr:0},strategy:'snowball',debts:[debt('a',120,10),debt('b',20,10)]});
const plain=value=>JSON.parse(JSON.stringify(value));
const build=value=>{assert.equal(typeof api.buildPortfolioSimulatorModel,'function','canonical Simulator presentation API must exist');return api.buildPortfolioSimulatorModel(value);};
const lane=(model,strategy)=>model.plans.find(p=>p.strategy===strategy);
const close=(actual,expected)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=1e-7,`${actual} != ${expected}`);
function unavailable(plan,state='review'){assert.equal(plan.state,state);for(const key of ['payoffMonths','totalInterest','endingCash'])assert.equal(plan[key],null,key+' cannot fabricate zero');}
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function independent(b,strategy){const input=codec.portfolioBookInputs(b);return engine.simulatePortfolio({...input,settings:{...input.settings,strategy}});}
let tests=0,failures=0;
function test(name,fn){tests++;try{fn();console.log('PASS Portfolio Simulator '+name);}catch(error){failures++;console.error('FAIL Portfolio Simulator '+name+': '+error.message);}}

test('literal zeroAPR conservation uses the complete household budget',()=>{
  const model=build(book());assert.equal(model.cashFlow,100);assert.equal(model.totalDebt,200);
  assert.deepEqual(plain(model.plans.map(p=>p.strategy)),['velocity','snowball','avalanche']);
  for(const p of model.plans){assert.equal(p.state,'projected');assert.equal(p.payoffMonths,2);assert.equal(p.totalInterest,0);assert.equal(p.endingCash,0);}
});
test('initial statistics include every listed debt and existing LOC',()=>{
  const b=book();b.debts.push(debt('b',100,25));b.loc.balance=50;b.monthlyExpenses=10;
  const model=build(b);assert.equal(model.totalDebt,350);assert.equal(model.cashFlow,90);
});
test('each policy uses its own payoff date and cash rather than the selected reference',()=>{
  const b=varied(),model=build(b),months=[];
  for(const p of model.plans){const expected=independent(b,p.strategy);assert.equal(expected.isPayoffPossible,true);assert.equal(p.state,'projected');assert.equal(p.payoffMonths,expected.payoffMonths);close(p.totalInterest,expected.totalInterest);close(p.endingCash,expected.cashAtPayoff);months.push(p.payoffMonths);}
  assert.ok(new Set(months).size>1,'fixture must exercise different payoff dates');
});
test('changing the comparison reference does not rewrite other strategy outcomes',()=>{
  const b=varied(),before=plain(build(b));for(const strategy of ['velocity','avalanche'])assert.deepEqual(plain(build({...b,strategy})),before);
});
test('blocked Velocity does not suppress available direct policies',()=>{
  const b=varied();b.loc.limit=40;b.strategy='velocity';const m=build(b);
  unavailable(lane(m,'velocity'));assert.equal(lane(m,'velocity').reason,'loc-no-capacity');
  for(const s of ['snowball','avalanche'])assert.equal(lane(m,s).state,'projected');assert.equal(m.totalDebt,180);
});
test('an accepted prefix of a later failed projection is not a payoff result',()=>{
  const b={...book(),monthlyIncome:20,chunkAmount:0,debts:[{...debt('a',100,10),promo:{introApr:0,monthsRemaining:1,postIntroApr:2.4}}]};
  const p=lane(build(b),'velocity');unavailable(p);assert.equal(p.reason,'payment-below-interest');
});
test('unfunded minimums suppress positive outcomes',()=>{const b=book();b.monthlyIncome=1;for(const p of build(b).plans)unavailable(p);});
test('exactly cleared liabilities may show monthzero and no invented cash',()=>{
  const b=book();b.debts=[];const m=build(b);assert.equal(m.totalDebt,0);
  for(const p of m.plans){assert.equal(p.state,'cleared');assert.equal(p.payoffMonths,0);assert.equal(p.totalInterest,0);assert.equal(p.endingCash,0);}
});
test('tiny positive initial debt or LOC is not already paid off',()=>{
  for(const target of ['debt','loc']){const b=book();b.debts=target==='debt'?[debt('a',.005,10)]:[];b.loc.balance=target==='loc'?.005:0;const m=build(b);close(m.totalDebt,.005);for(const p of m.plans)unavailable(p,'residual');}
});
test('a positive own-payoff residual cannot become a zero-interest payoff claim',()=>{
  const b={...book(),monthlyIncome:10,chunkAmount:0,loc:{limit:0,balance:0,apr:0},debts:[debt('a',10.005,10)]};
  for(const p of build(b).plans){unavailable(p,'residual');assert.equal(p.reason,'nonzero-residual');}
});
test('an earlier unpaid tolerance writeoff cannot validate a later whole-book payoff',()=>{
  const b={...book(),monthlyIncome:2,extraMonthlyPayment:1,chunkAmount:0,loc:{limit:0,balance:0,apr:0},debts:[debt('a',1.000005,1),debt('b',5,1)]};
  for(const p of build(b).plans){unavailable(p,'residual');assert.equal(p.reason,'cent-tolerance');}
});
test('decimalAPR2 means200percent and retains its actual interest cost',()=>{
  const b={...book(),monthlyIncome:1000,chunkAmount:0,loc:{limit:0,balance:0,apr:0},debts:[debt('a',1200,300,2)]};
  for(const s of ['snowball','avalanche']){const p=lane(build(b),s);assert.equal(p.state,'projected');assert.equal(p.payoffMonths,2);close(p.totalInterest,800/3);close(p.endingCash,1600/3);}
});
test('active introductory APR transitions remain canonical',()=>{
  const b=book();b.chunkAmount=0;b.debts[0].apr=.6;b.debts[0].promo={introApr:0,monthsRemaining:1,postIntroApr:.12};
  const p=lane(build(b),'snowball');assert.equal(p.payoffMonths,3);close(p.totalInterest,1.01);close(p.endingCash,98.99);
});
test('expired promo uses postintro rate rather than base or intro',()=>{
  const b=book();b.chunkAmount=0;b.debts[0].apr=.6;b.debts[0].promo={introApr:0,monthsRemaining:0,postIntroApr:.12};
  const p=lane(build(b),'snowball');assert.equal(p.payoffMonths,3);close(p.totalInterest,3.0502);close(p.endingCash,96.9498);
});
test('frozen input precision and metadata remain byteidentical',()=>{
  const b=varied();b.debts[0].createdAt='2026-10-22T00:00:00.000Z';b.debts[0].notes='original household metadata';b.loc.apr=.1234567890123;
  const before=JSON.stringify(b);freeze(b);build(b);assert.equal(JSON.stringify(b),before);
});
test('malformed books fail closed instead of substituting demo values',()=>{
  const bad=[null,undefined,{}, {...book(),monthlyIncome:NaN},{...book(),debts:[debt('a',-1)]},{...book(),debts:[debt('a',10),debt('a',20)]},{...book(),debts:[debt('__proto__',10)]}];
  for(const b of bad){const m=build(b);assert.equal(m.cashFlow,null);assert.equal(m.totalDebt,null);assert.equal(m.plans.length,3);for(const p of m.plans)unavailable(p);}
});
test('overflowing liability sums never become finite-looking outcomes',()=>{
  const m=build({...book(),debts:[debt('a',1e308),debt('b',1e308)]});assert.equal(m.totalDebt,null);assert.equal(m.cashFlow,null);for(const p of m.plans)unavailable(p);
});
test('cleared initial debt does not imply future positive cashflow',()=>{
  const b={...book(),monthlyIncome:0,monthlyExpenses:100,debts:[]},m=build(b);assert.equal(m.cashFlow,-100);for(const p of m.plans){assert.equal(p.state,'cleared');assert.equal(p.endingCash,0);assert.equal(p.payoffMonths,0);}
});
test('LOC-only recovery includes the existing liability without inventing a loan',()=>{
  const b={...book(),debts:[],loc:{limit:0,balance:40,apr:0}};for(const p of build(b).plans){assert.equal(p.state,'projected');assert.equal(p.payoffMonths,1);assert.equal(p.totalInterest,0);assert.equal(p.endingCash,60);}
});
test('splitfocus settings remain in every independently invoked projection',()=>{
  const b=varied();b.focusMode='split';b.splitRatioPrimary=.3;b.debts[1].apr=.24;const m=build(b);
  for(const p of m.plans){const e=independent(b,p.strategy);assert.equal(e.isPayoffPossible,true);assert.equal(p.state,'projected');assert.equal(p.payoffMonths,e.payoffMonths);close(p.totalInterest,e.totalInterest);close(p.endingCash,e.cashAtPayoff);}
});
test('incomplete600month horizons do not expose a payoff or zero cost',()=>{
  const b={...book(),monthlyIncome:1,chunkAmount:0,debts:[debt('a',1e9,1)]};for(const p of build(b).plans)unavailable(p);
});
if(failures){console.error(`${failures}/${tests} Portfolio Simulator model contracts failed.`);process.exitCode=1;}else console.log(`${tests} Portfolio Simulator model contracts passed.`);
