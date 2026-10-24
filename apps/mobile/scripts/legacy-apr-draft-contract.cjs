const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const cache=new Map();
function load(file) {
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const local=id=>id.startsWith('@interestshield/')?load(fs.realpathSync(require.resolve(id))):id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id);
  vm.runInNewContext(output,{module,exports:module.exports,require:local,console},{filename:file});return module.exports;
}
const {formatFinancialInput:format,resolveFinancialDraft:resolve}=load(fs.realpathSync(require.resolve('@interestshield/financial-engine/input-draft')));
const engine=load(fs.realpathSync(require.resolve('@interestshield/financial-engine')));
const model=load(path.resolve(__dirname,'../lib/mobile-portfolio-model.ts'));
const kind='legacy-percent';
let count=0,failures=0;
function test(name,run) {count++;try{run();console.log('PASS legacy APR draft '+name);}catch(error){failures++;console.error('FAIL legacy APR draft '+name+': '+error.message);}}
function accepted(value,draft,bounds) {const result=resolve(value,draft,kind,bounds);assert.equal(result.error,null);return result.value;}

test('single-scenario editor selects the legacy unit policy explicitly',()=>{
  const file=ts.createSourceFile('controls.tsx',fs.readFileSync(path.resolve(__dirname,'../components/mobile-shell/controls.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const fn=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='PercentageInput');assert.ok(fn);
  const kinds=[];function visit(node){if(ts.isJsxAttribute(node)&&node.name.text==='kind')kinds.push(node.initializer.expression?.text||node.initializer.text);ts.forEachChild(node,visit);}visit(fn);
  assert.deepEqual(kinds,[kind]);
});
test('legacy fraction and percent representations display their modeled rate',()=>{
  for(const [value,text]of [[0,'0'],[0.005,'0.5'],[0.069,'6.9'],[1,'100'],[2,'2'],[6.5,'6.5'],[8.5,'8.5'],[200,'200']])assert.equal(format(value,kind),text);
});
test('changed rates up to100 percent store a legacy-compatible fraction',()=>{
  for(const [text,value]of [['0',0],['0.5',0.005],['1',0.01],['6.5',0.065],['100',1]])assert.equal(accepted(0.085,text),value);
});
test('changed rates above100 percent retain a legacy percentage representation',()=>{
  for(const [text,value]of [['101',101],['200',200],['200.5',200.5]])assert.equal(accepted(0.069,text),value);
});
test('exact and equivalent no-ops preserve original legacy bytes',()=>{
  for(const value of [0.069,0.07123456788999999,1,2,6.5,8.5,200,Number.MIN_VALUE,Number.MAX_VALUE]) {
    const text=format(value,kind);
    for(const draft of [text,text.includes('.')?text+'0':text+'.0'])assert.ok(Object.is(accepted(value,draft),value));
  }
});
test('equivalent leading and trailing zeros do not migrate a legacy record',()=>{
  assert.equal(accepted(6.5,'006.500'),6.5);assert.equal(accepted(2,'2.000'),2);
  assert.equal(accepted(0.069,'06.900'),0.069);
});
test('canonical Portfolio decimal APRs remain a separate unchanged policy',()=>{
  assert.equal(format(2,'percent'),'200');assert.equal(resolve(0.069,'200','percent').value,2);
  assert.equal(format(2,kind),'2');
});
test('stored ambiguous legacy2 is not retroactively reinterpreted as200 percent',()=>{
  assert.equal(engine.normalizeApr(accepted(2,'2.0')),0.02);
  assert.equal(accepted(2,'200'),200);
});
test('all supported displayed source values round-trip without overflow',()=>{
  for(const value of [Number.MIN_VALUE,1e-25,0.005,0.1,1,1.0000000000000002,100,1e25,Number.MAX_VALUE]) {
    const text=format(value,kind);assert.ok(!/e/i.test(text));assert.ok(Object.is(accepted(value,text),value));
  }
});
test('malformed drafts retain the exact previous raw value',()=>{
  for(const draft of ['', '.', '-5', '12..3', 'NaN', 'Infinity', '1e3', '$6.50', '6,5']) {
    const result=resolve(6.5,draft,kind);assert.equal(result.value,6.5);assert.ok(result.error);
  }
});
test('overflow, meaningful underflow and precision loss do not silently save',()=>{
  for(const draft of ['9'.repeat(400),'0.'+'0'.repeat(400)+'1','1000000000000000.01']) {
    const result=resolve(6.5,draft,kind);assert.equal(result.value,6.5);assert.ok(result.error);
  }
});
test('bounds compare modeled rates instead of mixed raw scalar order',()=>{
  assert.equal(accepted(0,'15',{minimum:2,maximum:0.9}),0.15);
  assert.equal(accepted(0,'2',{minimum:0.01,maximum:0.03}),0.02);
  const result=resolve(0,'50',kind,{maximum:2});assert.equal(result.value,0);assert.match(result.error,/at most 2%/);
});
test('invalid semantic ranges fail and boundary messages use actual percent',()=>{
  assert.match(resolve(0,'50',kind,{minimum:0.9,maximum:2}).error,/range is invalid/);
  assert.match(resolve(0,'101',kind,{maximum:1}).error,/at most 100%/);
  assert.equal(accepted(0,'100',{maximum:1}),1);
});
test('unmodified out-of-range legacy records remain exact rather than clamped',()=>{
  assert.equal(accepted(6.5,'6.500',{maximum:0}),6.5);
});
test('entered rates agree across display, dashboard and explicit Portfolio copy',()=>{
  for(const text of ['0.5','6.5','100','101','200']) {
    const input=JSON.parse(JSON.stringify(engine.defaultMobileDashboardInput));
    input.monthlyIncome=1000;input.monthlyExpenses=0;input.loc.balance=0;input.loc.limit=5000;
    input.activeDebt.balance=1200;input.activeDebt.monthlyPayment=300;
    input.activeDebt.apr=accepted(input.activeDebt.apr,text);
    const before=JSON.stringify(input),apr=Number(text)/100;
    const copied=model.copyMobileScenarioToPortfolio(input,'rate-copy');
    assert.equal(format(input.activeDebt.apr,kind),text);
    assert.equal(copied.debts[0].apr,apr);
    assert.ok(Math.abs(engine.buildMobileDashboardSnapshot(input).dailyInterestBurn-1200*apr/365)<1e-10);
    const view=model.buildMobilePortfolioBookView({...copied,strategy:'snowball'});
    assert.ok(Math.abs(view.result.monthResults[0].interestCharges['rate-copy']-1200*apr/12)<1e-10);
    assert.equal(JSON.stringify(input),before,'copy/model must not rewrite the source scenario');
  }
});
console.log(`${count} legacy APR draft contracts ${failures?'failed':'passed'}.`);
if(failures)process.exitCode=1;
