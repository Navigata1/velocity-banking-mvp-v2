/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../src'),key='interestshield-portfolio-v2',termsKey='interestshield-portfolio-v3';
const book=n=>({monthlyIncome:n,monthlyExpenses:4500,extraMonthlyPayment:50,chunkAmount:0,
  loc:{limit:25000,balance:3200,apr:0.085},strategy:'avalanche',focusMode:'single',splitRatioPrimary:0.7,
  debts:[{id:'synthetic-loan',name:'Synthetic loan',category:'custom',kind:'amortized',balance:1200,apr:2,
    minPaymentRule:{type:'fixed',amount:300},paymentSource:'checking'}]});
const document=b=>JSON.stringify({version:2,aprUnit:'decimal',data:b},null,2);
function environment(initial={}){
  const values=new Map([[key,document(book(7200))],...Object.entries(initial)]),cache=new Map();let fail=false,writes=0;
  const storage={getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k),setItem:(k,v)=>{
    writes++;if(fail)throw new Error('Synthetic quota failure');values.set(k,v);}};
  function load(file){
    if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
    const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
    const local=id=>{
      if(id.startsWith('@interestshield/financial-engine'))return load(fs.realpathSync(require.resolve(id)));
      if(id.startsWith('@/'))return load(path.resolve(root,id.slice(2)+'.ts'));
      if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));
      return require(id);
    };
    vm.runInNewContext(output,{module:m,exports:m.exports,require:local,console,window:{localStorage:storage}},{filename:file});return m.exports;
  }
  const api=load(path.join(root,'stores/portfolio-store.ts'));
  return{store:api.usePortfolioStore,api,persistence:api.portfolioPersistence,values,fail:v=>{fail=v;},saved:(k=key)=>values.get(k),writes:()=>writes};
}
let count=0;
function test(name,run){count++;try{run();console.log(`PASS web Portfolio store ${name}`);}catch(e){console.error(`FAIL web Portfolio store ${name}`);console.error(e);process.exitCode=1;}}
test('failed import cannot replace active state or be resurrected by a later unrelated edit',()=>{
  const e=environment(),before=e.store.getState().exportState(),durable=e.saved();e.fail(true);
  assert.equal(e.store.getState().importState(document(book(9000))).ok,false);
  assert.equal(e.saved(),durable);assert.equal(e.store.getState().exportState(),before);
  assert.equal(e.persistence.getStatus().status,'error');e.fail(false);
  e.store.getState().setMonthlyExpenses(4600);
  assert.equal(JSON.parse(e.saved()).data.monthlyIncome,7200);assert.equal(JSON.parse(e.saved()).data.monthlyExpenses,4600);
});
test('successful replacement is already durable before subscribers observe the new active book',()=>{
  const e=environment();let observed=0;
  const unsubscribe=e.store.subscribe(state=>{if(state.monthlyIncome===9000){observed++;assert.equal(JSON.parse(e.saved()).data.monthlyIncome,9000);}});
  assert.equal(e.store.getState().importState(document(book(9000))).ok,true);unsubscribe();
  assert.ok(observed>0);assert.equal(e.store.getState().monthlyIncome,9000);assert.equal(e.persistence.getStatus().status,'ready');
});
test('identical import does not publish state or rewrite storage',()=>{
  const e=environment(),before=e.writes();let notices=0;const unsubscribe=e.store.subscribe(()=>notices++);
  assert.equal(e.store.getState().importState(e.store.getState().exportState()).ok,true);unsubscribe();
  assert.equal(e.writes(),before);assert.equal(notices,0);
});
test('term-bearing import and later edits preserve the original book and all nested inputs',()=>{
  const e=environment(),old=e.saved(),supplied=book(9000);
  supplied.loc.lenderTerms={annualFee:0,minimumPayment:{mode:'fixed',value:60},sources:{annualFee:'lender-document'}};
  assert.equal(e.store.getState().importState(JSON.stringify({version:3,aprUnit:'decimal',data:supplied})).ok,true);
  assert.equal(e.saved(),old);
  assert.deepEqual(JSON.parse(e.saved(termsKey)).data,supplied);
  e.store.getState().setMonthlyExpenses(4700);
  e.store.getState().updateLOC({apr:2});
  assert.equal(e.saved(),old);
  assert.deepEqual(JSON.parse(e.saved(termsKey)).data.loc,{...supplied.loc,apr:2});
  assert.equal(JSON.parse(e.store.getState().exportState()).version,3);
});
test('explicit same-data v3 import adopts storage without unnecessary state publication',()=>{
  const e=environment(),old=e.saved();let notices=0;
  const unsubscribe=e.store.subscribe(()=>notices++);
  const current=JSON.parse(e.store.getState().exportState());current.version=3;
  assert.equal(e.store.getState().importState(JSON.stringify(current)).ok,true);unsubscribe();
  assert.equal(e.saved(),old);assert.equal(JSON.parse(e.saved(termsKey)).version,3);assert.equal(notices,0);
  assert.equal(JSON.parse(e.store.getState().exportState()).version,3);
});
test('profile editor captures nested inputs and removal cannot silently downgrade active storage',()=>{
  const e=environment(),old=e.saved(),terms={annualFee:0,minimumPayment:{mode:'fixed',value:50},sources:{annualFee:'user-provided'}};
  assert.equal(typeof e.store.getState().setLenderTerms,'function');
  assert.equal(e.store.getState().setLenderTerms(terms).ok,true);
  terms.minimumPayment.value=999;terms.sources.annualFee='model-default';
  assert.equal(e.store.getState().loc.lenderTerms.minimumPayment.value,50);
  assert.equal(e.store.getState().loc.lenderTerms.sources.annualFee,'user-provided');
  assert.equal(e.store.getState().setLenderTerms(null).ok,true);
  assert.equal('lenderTerms' in e.store.getState().loc,false);
  assert.equal(JSON.parse(e.saved(termsKey)).version,3);
  assert.equal(JSON.parse(e.store.getState().exportState()).version,3);assert.equal(e.saved(),old);
  const reloaded=environment({[termsKey]:e.saved(termsKey)});
  assert.equal('lenderTerms' in reloaded.store.getState().loc,false);
  assert.equal(JSON.parse(reloaded.store.getState().exportState()).version,3);
});
test('failed profile adoption cannot change state, leak into later edits, or overwrite the old book',()=>{
  const e=environment(),before=e.store.getState().exportState(),old=e.saved();e.fail(true);
  assert.equal(typeof e.store.getState().setLenderTerms,'function');
  assert.equal(e.store.getState().setLenderTerms({annualFee:0}).ok,false);
  assert.equal(e.saved(),old);assert.equal(e.saved(termsKey),undefined);
  assert.equal(e.store.getState().exportState(),before);e.fail(false);
  e.store.getState().setMonthlyExpenses(4800);
  assert.equal(e.saved(termsKey),undefined);assert.equal('lenderTerms' in JSON.parse(e.saved()).data.loc,false);
});
test('legacy sanitizer preserves supplied terms losslessly and rejects invalid extensions',()=>{
  const e=environment(),terms={minimumPayment:{value:0},sources:{minimumPayment:'user-provided'}};
  const result=e.api.sanitizePersistedPortfolioState({loc:{...book(1).loc,lenderTerms:terms}},e.store.getState());
  assert.deepEqual(JSON.parse(JSON.stringify(result.loc.lenderTerms)),terms);
  terms.minimumPayment.value=8;assert.equal(result.loc.lenderTerms.minimumPayment.value,0);
  assert.throws(()=>e.api.sanitizePersistedPortfolioState({loc:{lenderTerms:{annualFee:'0'}}},e.store.getState()));
});
test('a transient failed profile publication can retry directly without an unrelated edit',()=>{
  const e=environment(),old=e.saved();e.fail(true);
  assert.equal(e.store.getState().setLenderTerms({annualFee:0}).ok,false);
  e.fail(false);const before=e.writes();
  assert.equal(e.store.getState().setLenderTerms({annualFee:0}).ok,true);
  assert.ok(e.writes()>before);assert.equal(e.saved(),old);
  assert.equal(JSON.parse(e.saved(termsKey)).data.loc.lenderTerms.annualFee,0);
});
test('present corrupt active3 cannot use the retry path to overwrite its bytes',()=>{
  const e=environment({[termsKey]:'{broken active'}),before=e.writes();
  assert.equal(e.store.getState().setLenderTerms({annualFee:0}).ok,false);
  assert.equal(e.writes(),before);assert.equal(e.saved(termsKey),'{broken active');
});
test('an identical explicit save after a transient edit failure cannot falsely acknowledge unsaved active3 state',()=>{
  const e=environment();assert.equal(e.store.getState().setLenderTerms({annualFee:0}).ok,true);
  e.fail(true);e.store.getState().setMonthlyExpenses(4900);
  assert.equal(e.persistence.getStatus().status,'error');assert.equal(JSON.parse(e.saved(termsKey)).data.monthlyExpenses,4500);
  e.fail(false);assert.equal(e.store.getState().setLenderTerms({annualFee:0}).ok,true);
  assert.equal(e.persistence.getStatus().status,'ready');assert.equal(JSON.parse(e.saved(termsKey)).data.monthlyExpenses,4900);
});
test('source field order alone cannot rewrite an equivalent saved profile',()=>{
  const e=environment();
  assert.equal(e.store.getState().setLenderTerms({annualFee:0,minimumDraw:0,sources:{minimumDraw:'user-provided',annualFee:'lender-document'}}).ok,true);
  const before=e.writes(),raw=e.saved(termsKey);
  assert.equal(e.store.getState().setLenderTerms({annualFee:0,minimumDraw:0,sources:{annualFee:'lender-document',minimumDraw:'user-provided'}}).ok,true);
  assert.equal(e.writes(),before);assert.equal(e.saved(termsKey),raw);
});
console.log(`${count} real-store Portfolio persistence contracts ${process.exitCode?'failed':'passed'}. Memory Web Storage, not browser quota durability.`);
