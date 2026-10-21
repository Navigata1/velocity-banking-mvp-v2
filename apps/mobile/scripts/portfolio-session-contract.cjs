/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const ownerA='00000000-0000-4000-8000-00000000000a';
const base={monthlyIncome:8200.451,monthlyExpenses:4700.125,extraMonthlyPayment:50,chunkAmount:1000,
  loc:{limit:1000,balance:50.125,apr:0.12},strategy:'avalanche',focusMode:'single',splitRatioPrimary:0.7,
  debts:[{id:'loan',name:'Loan',category:'custom',kind:'amortized',balance:120.70001,apr:2,
    minPaymentRule:{type:'fixed',amount:30.005},paymentSource:'checking'}]};
const clone=v=>v===null?null:JSON.parse(JSON.stringify(v));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function environment(initial=base,revision=1){
  let stored=clone(initial),rev=revision,current=true,saveGate=null,loadGate=null;
  const calls=[],tokens=new WeakSet(),cache=new Map(),started=deferred();
  const io={load:async()=>{if(loadGate)await loadGate.promise;return{backend:'local-storage',book:clone(stored),revision:rev};},
    save:async(owner,book,options)=>{
      calls.push({owner,book:clone(book),expectedRevision:options.expectedRevision,ownerLock:options.ownerLock});
      started.resolve();
      if(saveGate){const gate=saveGate;saveGate=null;await gate.promise;}
      if(options.expectedRevision!==rev)throw new Error('stale revision');stored=clone(book);return{backend:'local-storage',revision:++rev};},
    isCurrent:()=>current};
  function load(file){
    if(cache.has(file))return cache.get(file).exports;if(!fs.existsSync(file))return{};
    const testModule={exports:{}};cache.set(file,testModule);
    const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
    const requireLocal=id=>{
      if(id==='./mobile-portfolio-storage')return{mobilePortfolioStorageKey:o=>`book.${o??'guest'}`,loadMobilePortfolioForOwner:io.load,saveMobilePortfolioForOwner:io.save};
      if(id==='./supabase/auth-storage')return{isMobileSnapshotOwnerLock:(lock,owner)=>tokens.has(lock)&&lock.ownerId===owner};
      if(id.startsWith('@interestshield/financial-engine'))return load(fs.realpathSync(require.resolve(id)));
      if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));return require(id);
    };
    vm.runInNewContext(output,{module:testModule,exports:testModule.exports,require:requireLocal,console},{filename:file});return testModule.exports;
  }
  const api=load(path.resolve(__dirname,'../lib/mobile-portfolio-session.ts'));
  const create=()=>{assert.equal(typeof api.createMobilePortfolioSession,'function','native Portfolio session must exist');return api.createMobilePortfolioSession(ownerA,io);};
  return{create,calls,io,started:started.promise,stored:()=>clone(stored),current:value=>{current=value;},saveGate:gate=>{saveGate=gate;},loadGate:gate=>{loadGate=gate;},
    token:()=>{const lock=Object.freeze({ownerId:ownerA});tokens.add(lock);return lock;}};
}
let count=0;
async function test(name,run){count++;try{await run();console.log(`PASS Portfolio session ${name}`);}
  catch(error){console.error(`FAIL Portfolio session ${name}`);console.error(error);process.exitCode=1;}}
async function main(){
  await test('hydration restores exact book without writing defaults',async()=>{
    const e=environment(),s=e.create();assert.equal(s.getSnapshot().book,null);await s.hydrate();
    assert.deepEqual(clone(s.getSnapshot().book),base);assert.equal(s.getSnapshot().revision,1);
    assert.equal(s.getSnapshot().status,'saved');assert.equal(e.calls.length,0);
  });
  await test('absence requires explicit creation and preserves a genuinely empty book',async()=>{
    const e=environment(null,0),s=e.create();await s.hydrate();assert.equal(s.getSnapshot().status,'empty');
    const empty={...clone(base),debts:[],loc:{limit:0,balance:0,apr:0}};
    await s.create(empty);assert.deepEqual(e.stored(),empty);assert.equal(s.getSnapshot().revision,1);
    await assert.rejects(()=>s.create(base),/already|exists/i);
  });
  await test('queued updates compose current values with ordered revisions',async()=>{
    const e=environment(),s=e.create();await s.hydrate();const gate=deferred();e.saveGate(gate);
    const first=s.update(b=>({...b,monthlyIncome:9000}));
    const second=s.update(b=>({...b,monthlyExpenses:4600}));assert.equal(s.getSnapshot().status,'saving');
    await e.started;gate.resolve();await Promise.all([first,second]);
    assert.deepEqual(e.calls.map(c=>c.expectedRevision),[1,2]);assert.equal(e.stored().monthlyIncome,9000);
    assert.equal(e.stored().monthlyExpenses,4600);assert.equal(s.getSnapshot().status,'saved');assert.equal(s.getSnapshot().revision,3);
  });
  await test('unchanged or invalid candidates never touch stored values',async()=>{
    const e=environment(),s=e.create();await s.hydrate();await s.update(b=>({...b}));
    assert.equal(e.calls.length,0);await assert.rejects(()=>s.update(b=>({...b,splitRatioPrimary:2})));
    assert.deepEqual(e.stored(),base);assert.deepEqual(clone(s.getSnapshot().book),base);
  });
  await test('failed persistence stops queued work without claiming saved or discarding drafts',async()=>{
    const e=environment(),s=e.create();await s.hydrate();const gate=deferred();e.saveGate(gate);
    const first=s.update(b=>({...b,monthlyIncome:9000})),second=s.update(b=>({...b,monthlyExpenses:4600}));
    await e.started;gate.reject(new Error('write failed'));
    const results=await Promise.allSettled([first,second]);assert.ok(results.every(r=>r.status==='rejected'));
    assert.equal(e.calls.length,1);assert.equal(s.getSnapshot().status,'error');
    assert.equal(s.getSnapshot().book.monthlyExpenses,4600);assert.deepEqual(e.stored(),base);
  });
  await test('owner changes cancel queued edits and hide the outgoing book',async()=>{
    const e=environment(),s=e.create();await s.hydrate();let notices=0;s.subscribe(()=>notices++);
    const pending=s.update(b=>({...b,monthlyIncome:9000}));e.current(false);s.deactivate();const before=notices;
    await assert.rejects(()=>pending,/changed|inactive|cancel/i);assert.equal(e.calls.length,0);
    assert.equal(s.getSnapshot().book,null);assert.equal(notices,before);assert.deepEqual(e.stored(),base);
  });
  await test('late hydration and old callbacks cannot reactivate another scope',async()=>{
    const e=environment(),s=e.create(),gate=deferred();e.loadGate(gate);const pending=s.hydrate();
    e.current(false);s.deactivate();gate.resolve();await pending;assert.equal(s.getSnapshot().book,null);
    await assert.rejects(()=>s.create(base),/changed|inactive|cancel/i);assert.equal(e.calls.length,0);
  });
  await test('effect cleanup and reactivation can safely hydrate the same current session',async()=>{
    const e=environment(),s=e.create();await s.hydrate();s.deactivate();await s.hydrate();
    assert.equal(s.getSnapshot().status,'saved');assert.deepEqual(clone(s.getSnapshot().book),base);assert.equal(e.calls.length,0);
  });
  await test('leased replacement cancels old queued edits and uses its reviewed revision',async()=>{
    const e=environment(),s=e.create();await s.hydrate();const old=s.update(b=>({...b,monthlyIncome:9000}));
    const restored={...clone(base),monthlyIncome:10000};const lock=e.token();
    const replacement=s.replace(restored,lock,1);const results=await Promise.allSettled([old,replacement]);
    assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled');
    assert.equal(e.calls.length,1);assert.equal(e.calls[0].ownerLock,lock);
    assert.deepEqual(e.stored(),restored);assert.deepEqual(clone(s.getSnapshot().book),restored);
  });
  await test('invalid replacement token leaves pending edits intact',async()=>{
    const e=environment(),s=e.create();await s.hydrate();const update=s.update(b=>({...b,monthlyIncome:9000}));
    await assert.rejects(()=>s.replace(base,{ownerId:ownerA},1),/lock/i);await update;
    assert.equal(e.stored().monthlyIncome,9000);assert.equal(s.getSnapshot().status,'saved');
  });
  await test('unavailable or corrupt loading never enables writes or supplies defaults',async()=>{
    for(const kind of ['unavailable','corrupt']){
      const e=environment();e.io.load=kind==='unavailable'?async()=>({backend:'unavailable',book:null,revision:0}):async()=>{throw new Error('corrupt data');};
      const s=e.create();await s.hydrate();assert.equal(s.getSnapshot().status,kind==='unavailable'?'unavailable':'error');
      assert.equal(s.getSnapshot().book,null);await assert.rejects(()=>s.create(base));assert.equal(e.calls.length,0);
    }
  });
  await test('published snapshots cannot be mutated outside an update',async()=>{
    const e=environment(),s=e.create();await s.hydrate();const value=s.getSnapshot();
    try{value.book.debts[0].balance=999;}catch{}try{value.book.monthlyIncome=1;}catch{}
    assert.equal(s.getSnapshot().book.debts[0].balance,120.70001);assert.equal(s.getSnapshot().book.monthlyIncome,base.monthlyIncome);
    assert.equal(e.calls.length,0);
  });
  await test('subscriber-triggered updates preserve chronological queue order and saved equality',async()=>{
    const e=environment(),s=e.create();await s.hydrate();let second,triggered=false;
    s.subscribe(()=>{if(s.getSnapshot().status==='saving'&&!triggered){triggered=true;second=s.update(b=>({...b,monthlyExpenses:1234}));}});
    await s.update(b=>({...b,monthlyIncome:9000}));await second;await s.flush();
    assert.deepEqual(e.calls.map(c=>c.book.monthlyExpenses),[base.monthlyExpenses,1234]);
    assert.deepEqual(e.stored(),clone(s.getSnapshot().book));assert.equal(s.getSnapshot().status,'saved');
  });
  console.log(`${count} Portfolio lifecycle contracts ${process.exitCode?'failed':'passed'}. React binding and real devices remain separate.`);
}
const watchdog=setTimeout(()=>{console.error('Portfolio lifecycle contracts timed out before completion.');process.exit(1);},10000);
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
