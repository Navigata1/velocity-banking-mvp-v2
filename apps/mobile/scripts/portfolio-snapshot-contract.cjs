const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const owner='00000000-0000-4000-8000-00000000000a';
const stream='mobile-install:00000000-0000-4000-8000-000000000111';
const logical='interestshield-portfolio-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const scenario=n=>({monthlyIncome:n,monthlyExpenses:4500,chunkAmount:1000,activeDebtName:'Synthetic loan',
  activeDebt:{balance:12000,apr:0.065,monthlyPayment:400,termMonths:60},loc:{limit:25000,balance:3200,apr:0.085}});
const book=n=>({monthlyIncome:n,monthlyExpenses:4500,extraMonthlyPayment:50,chunkAmount:1000,loc:{limit:25000,balance:3200,apr:2},
  strategy:'velocity',focusMode:'single',splitRatioPrimary:0.7,debts:[{id:'a',name:'Synthetic card',category:'credit_card',kind:'revolving',
    balance:1200,apr:2,minPaymentRule:{type:'fixed',amount:300},paymentSource:'checking'}]});
const encoded=(input,id=owner)=>JSON.stringify({version:1,ownerId:id,input,savedAt:'2026-10-20T00:00:00Z'});
function environment(){
  const values=new Map(),order=[],tokens=new WeakSet();let seq=0,local=scenario(7200),portfolio=book(7200),revision=5,bookRevision=11;
  let guest=null,guestBook=null,fail='',activeOwner=owner;
  const cache=new Map();
  const withLock=async(id,action)=>{const token=Object.freeze({ownerId:id});tokens.add(token);try{return await action(token);}finally{tokens.delete(token);}};
  const storage={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>{order.push('journal');if(fail==='stage'){fail='';throw new Error('stage interrupted');}values.set(k,v);},removeItem:async k=>values.delete(k)};
  const assumptionPort={encodeMobileAssumptions:encoded,decodeMobileAssumptions:(raw,id)=>{try{const x=JSON.parse(raw);return x.ownerId===id?x.input:null;}catch{return null;}},
    loadMobileAssumptionsForOwner:async id=>({backend:'secure-store',input:clone(id===null?(guest??scenario(0)):local),restored:id===null?guest!==null:true,revision}),
    saveMobileAssumptionsForOwner:async(id,input,{expectedRevision,ownerLock}={})=>{assert.ok(tokens.has(ownerLock));assert.equal(expectedRevision,revision);order.push('scenario');
      if(fail==='scenario'){fail='';throw new Error('scenario interrupted');}local=clone(input);return{backend:'secure-store',revision:++revision};}};
  const portfolioPort={loadMobilePortfolioForOwner:async id=>({backend:'secure-store',book:clone(id===null?guestBook:portfolio),revision:bookRevision}),
    saveMobilePortfolioForOwner:async(id,input,{expectedRevision,ownerLock}={})=>{assert.ok(tokens.has(ownerLock));assert.equal(expectedRevision,bookRevision);order.push('book');
      if(fail==='book'){fail='';throw new Error('book interrupted');}portfolio=clone(input);return{backend:'secure-store',revision:++bookRevision};}};
  const auth={withMobileSnapshotOwnerLock:withLock,isMobileSnapshotOwnerLock:(l,id)=>tokens.has(l)&&l.ownerId===id,createMobileAuthStorage:()=>storage};
  function load(file){
    if(cache.has(file))return cache.get(file).exports;
    const m={exports:{}};cache.set(file,m);
    const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const localRequire=id=>{
      if(id==='../mobile-assumption-storage')return assumptionPort;
      if(id==='../mobile-portfolio-storage')return portfolioPort;
      if(id==='./auth-storage')return auth;
      if(id==='./sync-identity')return{getOrCreateMobileSyncIdempotencyKey:async()=>stream,createMobileSyncOperationIdempotencyKey:()=>`operation:portfolio-${String(++seq).padStart(8,'0')}`};
      if(id.startsWith('@interestshield/'))return load(fs.realpathSync(require.resolve(id)));
      if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));
      return require(id);
    };
    vm.runInNewContext(output,{module:m,exports:m.exports,require:localRequire,console},{filename:file});return m.exports;
  }
  const codec=load(fs.realpathSync(require.resolve('@interestshield/financial-engine/portfolio-book')));
  const sync=load(path.resolve(__dirname,'../lib/supabase/snapshot-sync.ts'));
  const outboxApi=load(path.resolve(__dirname,'../lib/supabase/snapshot-outbox.ts'));
  const recovery=load(path.resolve(__dirname,'../lib/supabase/snapshot-recovery.ts'));
  const sent=[];
  const createOutbox=(overrides={})=>outboxApi.createMobileSnapshotOutbox({storage,withOwnerCrossContextLock:withLock,
    getSnapshotIdempotencyKey:async()=>stream,createOperationIdempotencyKey:()=>`operation:portfolio-${String(++seq).padStart(8,'0')}`,
    sendSnapshot:async(_client,input)=>{order.push('send');sent.push(clone(input));return{ownerId:owner,snapshotId:'receipt',clientRevision:input.clientRevision};},...overrides});
  const rows=[];
  const client={auth:{getClaims:async()=>({data:{claims:{sub:activeOwner}},error:null})},from:()=>{
    const filters=[];const query={select:()=>query,eq:(k,v)=>{filters.push([k,v]);return query;},order:()=>query,limit:()=>query,
      then:resolve=>Promise.resolve({data:rows.filter(r=>filters.every(([k,v])=>r[k]===v)),error:null}).then(resolve)};return query;}};
  const addRow=(input,p=undefined)=>{const entries=[];if(input!==null)entries.push({key:'interestshield-mobile-assumptions-v1',value:encoded(input)});
    if(p!==undefined)entries.push({key:logical,value:typeof p==='string'?p:codec.encodePortfolioDocument(p)});
    const row={owner_id:owner,id:`snapshot-${rows.length}`,idempotency_key:stream,client_revision:7,snapshot_version:1,updated_at:'2026-10-20T00:00:00Z',assumptions_json:{contract_version:1,storage:entries}};
    rows.push(row);return row;};
  const signatures=()=>{assert.equal(typeof recovery.serializeMobileRecoveryPortfolio,'function','paired Portfolio review fingerprint must exist');return{
    reviewedLocalAssumptions:recovery.serializeMobileRecoveryAssumptions(local),reviewedLocalPortfolio:recovery.serializeMobileRecoveryPortfolio(portfolio)};};
  const review=async()=>{const options=await recovery.loadMobileSnapshotRecoveryOptions(client,owner),snapshot=options.snapshots[0];assert.ok(snapshot);return{...signatures(),
    expectedOwnerId:owner,source:{kind:'remote',snapshot},confirmation:{snapshotId:snapshot.snapshotId,clientRevision:snapshot.clientRevision}};};
  const dependencies=outbox=>({outbox,replaceAssumptions:async(input,l,r)=>(await assumptionPort.saveMobileAssumptionsForOwner(owner,input,{ownerLock:l,expectedRevision:r})).backend,
    replacePortfolio:async(input,l,r)=>(await portfolioPort.saveMobilePortfolioForOwner(owner,input,{ownerLock:l,expectedRevision:r})).backend});
  return{codec,sync,recovery,rows,client,order,sent,values,createOutbox,addRow,signatures,review,dependencies,
    local:()=>clone(local),portfolio:()=>clone(portfolio),setLocal:x=>{local=clone(x);},setPortfolio:x=>{portfolio=clone(x);},
    fail:x=>{fail=x;},guest:(s,b)=>{guest=s;guestBook=b;},setOwner:x=>{activeOwner=x;}};
}
let count=0;
async function test(name,run){count++;try{await run();console.log(`PASS Portfolio snapshot ${name}`);}catch(e){console.error(`FAIL Portfolio snapshot ${name}`);console.error(e);process.exitCode=1;}}
async function main(){
  await test('new prepared bodies use canonical logical entries and do not leak physical owner storage',async()=>{
    const e=environment(),prepared=await e.sync.prepareMobileSnapshotSync({assumptions:scenario(7200),portfolio:book(7200),expectedOwnerId:owner,clientRevision:1,operationIdempotencyKey:'operation:prepared-1234'});
    const entries=clone(prepared.assumptionsJson.storage);assert.equal(entries.length,2);const entry=entries.find(x=>x.key===logical);assert.ok(entry);
    assert.deepEqual(clone(e.codec.decodePortfolioDocument(entry.value)),book(7200));assert.ok(!JSON.stringify(entries).includes('interestshield.mobile.portfolio'));
  });
  await test('book-only snapshots are valid and malformed or duplicate present books are rejected',async()=>{
    const e=environment();e.addRow(null,book(8000));e.addRow(scenario(8000),'{');const duplicate=e.addRow(scenario(8000),book(8000));duplicate.assumptions_json.storage.push(duplicate.assumptions_json.storage[1]);
    const options=await e.recovery.loadMobileSnapshotRecoveryOptions(e.client,owner);
    assert.equal(options.snapshots.length,1);assert.equal(options.rejectedCount,2);assert.equal(options.snapshots[0].assumptions,null);
    assert.deepEqual(clone(options.snapshots[0].portfolio),book(8000));
  });
  await test('legacy source preserves the destination book in both local state and the newly prepared body',async()=>{
    const e=environment();e.addRow(scenario(8000));const review=await e.review(),outbox=e.createOutbox();
    await e.recovery.applyMobileSnapshotRecovery(e.client,review,e.dependencies(outbox));
    assert.equal(e.local().monthlyIncome,8000);assert.deepEqual(e.portfolio(),book(7200));
    const entry=e.sent[0].assumptionsJson.storage.find(x=>x.key===logical);assert.ok(entry);assert.deepEqual(clone(e.codec.decodePortfolioDocument(entry.value)),book(7200));
  });
  await test('explicit empty book replaces inventory while a book-only source preserves the scenario',async()=>{
    const e=environment(),empty={...book(0),debts:[],loc:{limit:0,balance:0,apr:0}};e.addRow(null,empty);const review=await e.review();
    await e.recovery.applyMobileSnapshotRecovery(e.client,review,e.dependencies(e.createOutbox()));
    assert.deepEqual(e.portfolio(),empty);assert.deepEqual(e.local(),scenario(7200));
  });
  for(const interruption of ['stage','scenario','book','commit'])await test(`interruption at ${interruption} retains a recoverable pair without premature send`,async()=>{
    const e=environment();e.addRow(scenario(8000),book(9000));const review=await e.review(),outbox=e.createOutbox();
    const deps=e.dependencies(outbox);if(interruption==='commit')deps.outbox={...outbox,commitRecovery:async()=>{throw new Error('commit interrupted');}};else e.fail(interruption);
    await assert.rejects(()=>e.recovery.applyMobileSnapshotRecovery(e.client,review,deps));assert.equal(e.sent.length,0);
    const fresh=e.createOutbox();
    if(interruption==='stage'){assert.equal(await fresh.readRecovery(owner),null);assert.deepEqual(e.local(),scenario(7200));assert.deepEqual(e.portfolio(),book(7200));return;}
    assert.ok(await fresh.readRecovery(owner));
    await e.recovery.resumePendingMobileSnapshotRecovery(owner,{...e.dependencies(fresh)});
    assert.deepEqual(e.local(),scenario(8000));assert.deepEqual(e.portfolio(),book(9000));assert.equal(await fresh.readRecovery(owner),null);
    await fresh.flush(e.client,owner);assert.equal(e.sent.length,1);assert.ok(e.order.indexOf('send')>e.order.lastIndexOf('book'));
  });
  await test('a third-state book edit stops crash recovery without replacing it or sending',async()=>{
    const e=environment();e.addRow(scenario(8000),book(9000));const review=await e.review(),outbox=e.createOutbox();e.fail('book');
    await assert.rejects(()=>e.recovery.applyMobileSnapshotRecovery(e.client,review,e.dependencies(outbox)));
    e.setPortfolio(book(9500));await assert.rejects(()=>e.recovery.resumePendingMobileSnapshotRecovery(owner,e.dependencies(e.createOutbox())),/changed|review/i);
    assert.deepEqual(e.portfolio(),book(9500));assert.ok(await outbox.readRecovery(owner));assert.equal(e.sent.length,0);
  });
  await test('source-only and destination-only book changes invalidate review before a journal is staged',async()=>{
    for(const sourceChanged of [true,false]){const e=environment();const row=e.addRow(scenario(8000),book(9000)),review=await e.review(),outbox=e.createOutbox();
      if(sourceChanged)row.assumptions_json.storage[1].value=e.codec.encodePortfolioDocument(book(9999));else e.setPortfolio(book(9999));
      await assert.rejects(()=>e.recovery.applyMobileSnapshotRecovery(e.client,review,e.dependencies(outbox)),/changed|review/i);
      assert.equal(await outbox.readRecovery(owner),null);assert.equal(e.sent.length,0);
    }
  });
  await test('device source mutations after staging cannot diverge local replacement from its durable target',async()=>{
    const e=environment(),source={kind:'device',assumptions:e.local(),portfolio:e.portfolio()},outbox=e.createOutbox();
    const review={...e.signatures(),expectedOwnerId:owner,source,confirmation:{kind:'device',ownerId:owner,
      reviewedAssumptions:e.recovery.serializeMobileRecoveryAssumptions(source.assumptions),reviewedPortfolio:e.recovery.serializeMobileRecoveryPortfolio(source.portfolio)}};
    const deps=e.dependencies({...outbox,stageRecovery:async(...args)=>{const r=await outbox.stageRecovery(...args);source.portfolio.monthlyIncome=9999;return r;}});
    await e.recovery.applyMobileSnapshotRecovery(e.client,review,deps);
    assert.deepEqual(e.portfolio(),book(7200));
    const entry=e.sent[0].assumptionsJson.storage.find(x=>x.key===logical);assert.deepEqual(clone(e.codec.decodePortfolioDocument(entry.value)),e.portfolio());
  });
  await test('new paired staging requires the destination fingerprint before creating a journal',async()=>{
    const e=environment(),outbox=e.createOutbox();
    await assert.rejects(()=>outbox.stageRecovery({assumptions:scenario(8000),portfolio:book(9000),
      expectedLocalAssumptions:e.recovery.serializeMobileRecoveryAssumptions(e.local()),expectedOwnerId:owner,
      serverRevision:7,snapshotIdempotencyKey:stream,sourceKind:'remote'}),/portfolio.*review|fingerprint|paired/i);
    assert.equal(await outbox.readRecovery(owner),null);assert.equal((await outbox.read(owner)).length,0);
  });
  for(const variant of ['missing-target','null-target','changed-preparation'])await test(`paired staging rejects ${variant} without silently omitting an existing book`,async()=>{
      const e=environment(),outbox=e.createOutbox(variant==='changed-preparation'?{prepareSnapshot:input=>e.sync.prepareMobileSnapshotSync({...input,portfolio:null})}:{});
      const input={assumptions:scenario(8000),expectedLocalAssumptions:e.recovery.serializeMobileRecoveryAssumptions(e.local()),
        expectedLocalPortfolio:e.recovery.serializeMobileRecoveryPortfolio(e.portfolio()),expectedOwnerId:owner,
        serverRevision:7,snapshotIdempotencyKey:stream,sourceKind:'remote'};
      if(variant!=='missing-target')input.portfolio=variant==='null-target'?null:book(9000);
      await assert.rejects(()=>outbox.stageRecovery(input),/portfolio|paired|target/i);
      assert.equal(await outbox.readRecovery(owner),null);assert.deepEqual(e.portfolio(),book(7200));
  });
  await test('book-only guest adoption copies without deleting guest data and rejects a changed guest book',async()=>{
    for(const changed of [false,true]){
      const e=environment();e.guest(null,book(8100));const options=await e.recovery.loadMobileSnapshotRecoveryOptions(e.client,owner),outbox=e.createOutbox();
      const source={kind:'guest',assumptions:options.guestAssumptions,portfolio:options.guestPortfolio};
      const input={...e.signatures(),source,expectedOwnerId:owner,confirmation:{kind:'guest',ownerId:owner,
        reviewedAssumptions:'null',reviewedPortfolio:e.recovery.serializeMobileRecoveryPortfolio(source.portfolio)}};
      if(changed){e.guest(null,book(9999));await assert.rejects(()=>e.recovery.applyMobileSnapshotRecovery(e.client,input,e.dependencies(outbox)),/changed|review/i);
        assert.equal(await outbox.readRecovery(owner),null);continue;}
      await e.recovery.applyMobileSnapshotRecovery(e.client,input,e.dependencies(outbox));assert.deepEqual(e.local(),scenario(7200));assert.deepEqual(e.portfolio(),book(8100));
      const after=await e.recovery.loadMobileSnapshotRecoveryOptions(e.client,owner);assert.deepEqual(clone(after.guestPortfolio),book(8100));
    }
  });
  await test('legacy queued bodies remain immutable across restart and do not gain a new book under an old operation id',async()=>{
    const e=environment(),first=e.createOutbox();await first.enqueue({assumptions:scenario(7000),expectedOwnerId:owner});
    const original=clone(await first.read(owner));e.setPortfolio(book(9999));const fresh=e.createOutbox();
    assert.deepEqual(clone(await fresh.read(owner)),original);await fresh.flush(e.client,owner);assert.deepEqual(e.sent,original);
  });
  await test('unavailable replacement cannot clear a paired journal or send a partially restored inventory',async()=>{
    const e=environment();e.addRow(scenario(8000),book(9000));const input=await e.review(),outbox=e.createOutbox();
    await assert.rejects(()=>e.recovery.applyMobileSnapshotRecovery(e.client,input,{...e.dependencies(outbox),replacePortfolio:async()=> 'unavailable'}),/durable Portfolio/i);
    assert.equal(e.sent.length,0);assert.ok(await outbox.readRecovery(owner));assert.deepEqual(e.portfolio(),book(7200));
    await e.recovery.resumePendingMobileSnapshotRecovery(owner,e.dependencies(e.createOutbox()));assert.deepEqual(e.portfolio(),book(9000));
  });
  console.log(`${count} paired Portfolio snapshot contracts ${process.exitCode?'failed':'passed'}. Memory ports, not device or hosted API proof.`);
}
const watchdog=setTimeout(()=>{console.error('Paired Portfolio contracts timed out.');process.exit(1);},15000);
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
