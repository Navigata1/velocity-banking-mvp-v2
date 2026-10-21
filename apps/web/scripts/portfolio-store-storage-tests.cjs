/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../src'),key='interestshield-portfolio-v2';
const book=n=>({monthlyIncome:n,monthlyExpenses:4500,extraMonthlyPayment:50,chunkAmount:0,
  loc:{limit:25000,balance:3200,apr:0.085},strategy:'avalanche',focusMode:'single',splitRatioPrimary:0.7,
  debts:[{id:'synthetic-loan',name:'Synthetic loan',category:'custom',kind:'amortized',balance:1200,apr:2,
    minPaymentRule:{type:'fixed',amount:300},paymentSource:'checking'}]});
const document=b=>JSON.stringify({version:2,aprUnit:'decimal',data:b},null,2);
function environment(){
  const values=new Map([[key,document(book(7200))]]),cache=new Map();let fail=false,writes=0;
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
  return{store:api.usePortfolioStore,persistence:api.portfolioPersistence,fail:v=>{fail=v;},saved:()=>values.get(key),writes:()=>writes};
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
console.log(`${count} real-store Portfolio persistence contracts ${process.exitCode?'failed':'passed'}. Memory Web Storage, not browser quota durability.`);
