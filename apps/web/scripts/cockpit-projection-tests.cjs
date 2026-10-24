/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
const cache=new Map();
function load(file) {
  if(cache.has(file))return cache.get(file).exports;
  const loaded={exports:{}};cache.set(file,loaded);
  const localRequire=request=>request==='@interestshield/financial-engine'
    ? load(path.resolve(__dirname,'../../../packages/financial-engine/src/index.ts'))
    : request.startsWith('.') ? load(path.resolve(path.dirname(file),request+'.ts')) : require(request);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
    {require:localRequire,module:loaded,exports:loaded.exports,console},{filename:file});
  return loaded.exports;
}
const file=path.resolve(__dirname,'../src/app/cockpit-model.ts'),model=load(file),view=model.buildCockpitProjectionView;
const actual=load(path.resolve(__dirname,'../src/engine/calculations.ts'));
const fixture=()=>({debtBalance:18450,locBalance:3200,baseline:{months:48,totalInterest:4000,isPayoffPossible:true},
  velocity:{months:14,totalInterest:1500,isPayoffPossible:true},emergencyActive:false,depositIncomeToLoc:true,expenseCardOn:true});
let tests=0,failures=0;
function test(name,run){tests++;try{run();console.log('PASS Cockpit projection '+name);}catch(error){failures++;console.error('FAIL Cockpit projection '+name+': '+error.message);}}
test('healthy ETA comes from the actual projection',()=>{const result=view(fixture());assert.equal(result.state,'projected');assert.equal(result.eta,'14 mo');assert.equal(result.interestDelta,'+$2,500.00');});
test('higher Velocity interest is a signed negative difference, not zero savings',()=>{const input=fixture();input.baseline.totalInterest=100;input.velocity.totalInterest=130;assert.equal(view(input).interestDelta,'-$30.00');});
test('an actual zero difference remains zero',()=>{const input=fixture();input.baseline.totalInterest=input.velocity.totalInterest=100;assert.equal(view(input).interestDelta,'$0.00');});
test('explicit failed zero-month projection is review, never payoff',()=>{const input=fixture();input.velocity={months:0,totalInterest:0,isPayoffPossible:false};const result=view(input);assert.equal(result.state,'review');assert.equal(result.eta,'Review inputs');assert.equal(result.interestDelta,'Not projected');});
test('failed projection cannot retain a positive date',()=>{const input=fixture();input.velocity.isPayoffPossible=false;assert.equal(view(input).eta,'Review inputs');});
test('missing payoff availability cannot claim success',()=>{const input=fixture();delete input.velocity.isPayoffPossible;assert.equal(view(input).eta,'Review inputs');});
test('missing projection cannot claim success',()=>{const input=fixture();delete input.velocity;assert.equal(view(input).eta,'Review inputs');});
test('infinite date cannot be formatted as a projection',()=>{const input=fixture();input.velocity.months=Infinity;assert.equal(view(input).eta,'Review inputs');});
test('fractional date cannot be silently rounded into a modeled month',()=>{const input=fixture();input.velocity.months=1.5;assert.equal(view(input).eta,'Review inputs');});
test('nonfinite interest prevents a positive projection claim',()=>{const input=fixture();input.velocity.totalInterest=Infinity;assert.equal(view(input).eta,'Review inputs');assert.equal(view(input).interestDelta,'Not projected');});
test('negative projected interest is invalid',()=>{const input=fixture();input.velocity.totalInterest=-1;assert.equal(view(input).eta,'Review inputs');});
test('nonzero zero-month output is not confirmed payoff',()=>{const input=fixture();input.velocity.months=0;assert.equal(view(input).eta,'Review inputs');});
test('nonzero below-cent balances are not confirmed paid',()=>{const input=fixture();input.debtBalance=input.locBalance=0.005;input.velocity.months=0;assert.equal(view(input).eta,'Review inputs');});
test('exact cleared balances have no debt remaining',()=>{const input=fixture();input.debtBalance=input.locBalance=0;input.baseline=input.velocity={months:0,totalInterest:0,isPayoffPossible:true};const result=view(input);assert.equal(result.state,'cleared');assert.equal(result.eta,'No debt remaining');assert.equal(result.interestDelta,'$0.00');});
test('LOC-only liability is not mistaken for cleared',()=>{const input=fixture();input.debtBalance=0;input.velocity.months=2;assert.equal(view(input).eta,'2 mo');});
test('missing baseline suppresses only the comparison',()=>{const input=fixture();delete input.baseline;assert.equal(view(input).eta,'14 mo');assert.equal(view(input).interestDelta,'Not projected');});
test('failed baseline cannot produce zero savings',()=>{const input=fixture();input.baseline.isPayoffPossible=false;assert.equal(view(input).interestDelta,'Not projected');});
test('nonfinite baseline cannot produce savings',()=>{const input=fixture();input.baseline.totalInterest=Infinity;assert.equal(view(input).interestDelta,'Not projected');});
test('healthy emergency drill does not add invented months',()=>{const input=fixture();input.emergencyActive=true;const result=view(input);assert.equal(result.state,'unmodeled');assert.equal(result.eta,'Not projected');assert.equal(result.interestDelta,'Not projected');assert.match(result.detail,/not.*modeled|not.*included/i);});
test('failed emergency drill cannot manufacture a two-month payoff',()=>{const input=fixture();input.emergencyActive=true;input.velocity={months:0,totalInterest:0,isPayoffPossible:false};assert.equal(view(input).eta,'Not projected');});
test('alternate income routing cannot claim a newly modeled result',()=>{const input=fixture();input.depositIncomeToLoc=false;assert.equal(view(input).state,'unmodeled');assert.equal(view(input).eta,'Not projected');});
test('alternate expense routing cannot claim a newly modeled result',()=>{const input=fixture();input.expenseCardOn=false;assert.equal(view(input).interestDelta,'Not projected');});
test('invalid balances do not fabricate a cleared book',()=>{for(const value of [-1,NaN,Infinity]){const input=fixture();input.debtBalance=value;assert.equal(view(input).eta,'Review inputs');}});
test('individually finite balances cannot hide an overflowing cohort total',()=>{const input=fixture();input.debtBalance=input.locBalance=Number.MAX_VALUE;assert.equal(view(input).eta,'Review inputs');});
test('exact cleared balances are authoritative even when a stale projection is positive',()=>{const input=fixture();input.debtBalance=input.locBalance=0;assert.equal(view(input).eta,'No debt remaining');});
test('large and tiny signed differences stay finite and nonzero',()=>{const input=fixture();input.velocity.totalInterest=0;input.baseline.totalInterest=1e23;assert.equal(view(input).interestDelta,'+$1.00E23');input.baseline.totalInterest=0.0055;assert.equal(view(input).interestDelta,'+$5.50E-3');});
test('frozen projection facts and scenario flags are not changed',()=>{const input=fixture();input.emergencyActive=true;Object.freeze(input.baseline);Object.freeze(input.velocity);Object.freeze(input);const before=JSON.stringify(input);view(input);assert.equal(JSON.stringify(input),before);});
const scenario=()=>({monthlyIncome:8200,monthlyExpenses:4700,carLoan:{balance:18450,apr:0.069,monthlyPayment:425},
  loc:{limit:25000,balance:3200,apr:0.085},extraPayment:1000,useVelocity:true});
const flags={emergencyActive:false,depositIncomeToLoc:true,expenseCardOn:true};
test('Cockpit entry uses one equal-budget equal-liability simulation, not the old minimum-only baseline',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../src/app/cockpit/page.tsx'),'utf8');
  assert.ok(source.includes('buildCockpitScenario('));assert.ok(!source.includes('getBaselinePayoff('));
  const input=scenario(),result=model.buildCockpitScenario(input,flags),expected=actual.runSimulation(input);
  assert.equal(result.baseline.months,expected.baseline.payoffMonths);
  assert.equal(result.baseline.months,7);assert.equal(result.projection.interestDelta,'-$294.47');
  assert.equal(result.baseline.totalInterest,expected.baseline.totalInterest);
  assert.equal(result.velocity.totalInterest,expected.velocity.totalInterest);
  assert.match(result.projection.detail,/same.*budget|equal.*budget/i);
  assert.match(result.projection.detail,/LOC/);
  assert.notEqual(result.baseline.totalInterest,actual.simulateBaseline(input).totalInterest);
});
test('the actual Cockpit comparison baseline responds to existing LOC liability',()=>{
  const input=scenario(),withLoc=model.buildCockpitScenario(input,flags);input.loc.balance=0;
  const without=model.buildCockpitScenario(input,flags);
  assert.notEqual(withLoc.baseline.totalInterest,without.baseline.totalInterest);
});
for(const [name,change]of [['missing LOC setup',input=>{input.loc.limit=0;}],['zero cash flow',input=>{input.monthlyIncome=input.monthlyExpenses;}]])
  test('exactly cleared actual engine inputs stay cleared despite '+name,()=>{
    const input=scenario();input.carLoan.balance=input.loc.balance=0;change(input);
    const simulation=actual.runSimulation(input);assert.equal(simulation.velocity.isPayoffPossible,false);
    const result=model.buildCockpitScenario(input,flags);
    assert.equal(result.projection.state,'cleared');assert.equal(result.projection.eta,'No debt remaining');
    assert.equal(result.projection.interestDelta,'$0.00');
  });
console.log(`${tests} Cockpit projection contracts ${failures?'failed':'passed'}.`);if(failures)process.exitCode=1;
