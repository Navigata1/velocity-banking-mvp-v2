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
  let guest=null,guestBook=null,fail='',activeOwner=owner,portfolioVersion,guestVersion,claimsGate;
  const cache=new Map();
  const withLock=async(id,action)=>{const token=Object.freeze({ownerId:id});tokens.add(token);try{return await action(token);}finally{tokens.delete(token);}};
  const storage={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>{order.push('journal');if(fail==='stage'){fail='';throw new Error('stage interrupted');}values.set(k,v);},removeItem:async k=>values.delete(k)};
  const assumptionPort={encodeMobileAssumptions:encoded,decodeMobileAssumptions:(raw,id)=>{try{const x=JSON.parse(raw);return x.ownerId===id?x.input:null;}catch{return null;}},
    loadMobileAssumptionsForOwner:async id=>({backend:'secure-store',input:clone(id===null?(guest??scenario(0)):local),restored:id===null?guest!==null:true,revision}),
    saveMobileAssumptionsForOwner:async(id,input,{expectedRevision,ownerLock}={})=>{assert.ok(tokens.has(ownerLock));assert.equal(expectedRevision,revision);order.push('scenario');
      if(fail==='scenario'){fail='';throw new Error('scenario interrupted');}local=clone(input);return{backend:'secure-store',revision:++revision};}};
  const portfolioPort={loadMobilePortfolioForOwner:async id=>({backend:'secure-store',book:clone(id===null?guestBook:portfolio),revision:bookRevision,
      ...((id===null?guestVersion:portfolioVersion)===3?{documentVersion:3}:{})}),
    saveMobilePortfolioForOwner:async(id,input,{expectedRevision,ownerLock,documentVersion}={})=>{assert.ok(tokens.has(ownerLock));assert.equal(expectedRevision,bookRevision);order.push('book');
      if(fail==='book'){fail='';throw new Error('book interrupted');}portfolio=clone(input);
      if(documentVersion===3||portfolioVersion===3||input.loc.lenderTerms!==undefined)portfolioVersion=3;
      return{backend:'secure-store',revision:++bookRevision,...(portfolioVersion===3?{documentVersion:3}:{})};}};
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
  const client={auth:{getClaims:async()=>{const gate=claimsGate;claimsGate=null;if(gate)await gate.promise;return{data:{claims:{sub:activeOwner}},error:null};}},from:()=>{
    const filters=[];const query={select:()=>query,eq:(k,v)=>{filters.push([k,v]);return query;},order:()=>query,limit:()=>query,
      then:resolve=>Promise.resolve({data:rows.filter(r=>filters.every(([k,v])=>r[k]===v)),error:null}).then(resolve)};return query;}};
  const addRow=(input,p=undefined)=>{const entries=[];if(input!==null)entries.push({key:'interestshield-mobile-assumptions-v1',value:encoded(input)});
    if(p!==undefined)entries.push({key:logical,value:typeof p==='string'?p:codec.encodePortfolioDocument(p)});
    const row={owner_id:owner,id:`snapshot-${rows.length}`,idempotency_key:stream,client_revision:7,snapshot_version:1,updated_at:'2026-10-20T00:00:00Z',assumptions_json:{contract_version:1,storage:entries}};
    rows.push(row);return row;};
  const signatures=()=>{assert.equal(typeof recovery.serializeMobileRecoveryPortfolio,'function','paired Portfolio review fingerprint must exist');return{
    reviewedLocalAssumptions:recovery.serializeMobileRecoveryAssumptions(local),reviewedLocalPortfolio:recovery.serializeMobileRecoveryPortfolio(portfolio,portfolioVersion)};};
  const review=async()=>{const options=await recovery.loadMobileSnapshotRecoveryOptions(client,owner),snapshot=options.snapshots[0];assert.ok(snapshot);return{...signatures(),
    expectedOwnerId:owner,source:{kind:'remote',snapshot},confirmation:{snapshotId:snapshot.snapshotId,clientRevision:snapshot.clientRevision}};};
  const dependencies=outbox=>({outbox,replaceAssumptions:async(input,l,r)=>(await assumptionPort.saveMobileAssumptionsForOwner(owner,input,{ownerLock:l,expectedRevision:r})).backend,
    replacePortfolio:async(input,l,r,documentVersion)=>(await portfolioPort.saveMobilePortfolioForOwner(owner,input,{ownerLock:l,expectedRevision:r,documentVersion})).backend});
  return{codec,sync,recovery,rows,client,order,sent,values,createOutbox,addRow,signatures,review,dependencies,
    local:()=>clone(local),portfolio:()=>clone(portfolio),portfolioVersion:()=>portfolioVersion,setLocal:x=>{local=clone(x);},setPortfolio:(x,v)=>{portfolio=clone(x);portfolioVersion=v;},
    fail:x=>{fail=x;},guest:(s,b,v)=>{guest=s;guestBook=b;guestVersion=v;},setOwner:x=>{activeOwner=x;},
    holdClaims:()=>{let resolve;const promise=new Promise(r=>{resolve=r;});claimsGate={promise,resolve};return claimsGate;}};
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
  await test('explicit3 no-profile sync preparation and fingerprint retain document identity',async()=>{
    const e=environment(),prepared=await e.sync.prepareMobileSnapshotSync({assumptions:scenario(7200),portfolio:book(7200),portfolioDocumentVersion:3,
      expectedOwnerId:owner,clientRevision:1,operationIdempotencyKey:'operation:prepared-1234',snapshotIdempotencyKey:stream});
    assert.equal(JSON.parse(prepared.assumptionsJson.storage.find(x=>x.key===logical).value).version,3);
    const signature=e.recovery.serializeMobileRecoveryPortfolio(book(7200),3);assert.equal(JSON.parse(signature).version,3);
  });
  await test('remote and guest previews expose optional3 without changing old preview shapes',async()=>{
    const e=environment();e.addRow(null,JSON.stringify({version:3,aprUnit:'decimal',data:book(8000)}));e.addRow(scenario(8000),book(8000));
    e.guest(null,book(8100),3);const options=await e.recovery.loadMobileSnapshotRecoveryOptions(e.client,owner);
    assert.equal(options.snapshots[0].portfolioDocumentVersion,3);assert.equal('portfolioDocumentVersion' in options.snapshots[1],false);
    assert.equal(options.guestPortfolioDocumentVersion,3);
  });
  await test('recovery explicitly adopts3 without terms even when semantic books match',async()=>{
    const e=environment();e.addRow(null,JSON.stringify({version:3,aprUnit:'decimal',data:e.portfolio()}));
    const input=await e.review();await e.recovery.applyMobileSnapshotRecovery(e.client,input,e.dependencies(e.createOutbox()));
    assert.equal(e.portfolioVersion(),3);assert.equal(JSON.parse(e.sent[0].assumptionsJson.storage.find(x=>x.key===logical).value).version,3);
  });
  await test('active3 after profile removal remains3 when recovering a scenario-only source',async()=>{
    const e=environment();e.setPortfolio(e.portfolio(),3);e.addRow(scenario(8100));
    await e.recovery.applyMobileSnapshotRecovery(e.client,await e.review(),e.dependencies(e.createOutbox()));
    assert.equal(e.portfolioVersion(),3);assert.equal(JSON.parse(e.sent[0].assumptionsJson.storage.find(x=>x.key===logical).value).version,3);
  });
  await test('explicit3 survives interrupted recovery and resumes without rebuilding prepared operations',async()=>{
    const e=environment();e.addRow(scenario(8000),JSON.stringify({version:3,aprUnit:'decimal',data:book(9000)}));const outbox=e.createOutbox();e.fail('book');
    const input=await e.review();await assert.rejects(()=>e.recovery.applyMobileSnapshotRecovery(e.client,input,e.dependencies(outbox)));
    const pending=await outbox.readRecovery(owner);assert.equal(pending.portfolioDocumentVersion,3);const frozen=clone(pending.item);
    const fresh=e.createOutbox();await e.recovery.resumePendingMobileSnapshotRecovery(owner,e.dependencies(fresh));
    assert.equal(e.portfolioVersion(),3);assert.deepEqual(clone((await fresh.read(owner))[0]),frozen);
    await fresh.flush(e.client,owner);assert.deepEqual(e.sent[0],frozen);
  });
  await test('transport-only local adoption and terms-only edits invalidate recovery reviews before staging',async()=>{
    for(const mode of ['version','terms']){
      const e=environment();e.addRow(scenario(8000),book(9000));const input=await e.review(),outbox=e.createOutbox();
      const changed=e.portfolio();if(mode==='terms')changed.loc.lenderTerms={annualFee:0};e.setPortfolio(changed,mode==='version'?3:undefined);
      await assert.rejects(()=>e.recovery.applyMobileSnapshotRecovery(e.client,input,e.dependencies(outbox)),/changed|review/i);
      assert.equal(await outbox.readRecovery(owner),null);assert.equal(e.sent.length,0);
    }
  });
  await test('outbox captures nested profile values and explicit version before asynchronous identity work',async()=>{
    const e=environment();let release;const gate=new Promise(r=>{release=r;});const outbox=e.createOutbox({getSnapshotIdempotencyKey:()=>gate});
    const input={assumptions:scenario(7200),portfolio:book(7200),portfolioDocumentVersion:3,expectedOwnerId:owner};
    input.portfolio.loc.lenderTerms={annualFee:0,minimumPayment:{mode:'fixed',value:0},sources:{annualFee:'lender-document'}};
    const queued=outbox.enqueue(input);input.portfolio.loc.lenderTerms.annualFee=999;input.portfolio.loc.lenderTerms.minimumPayment.value=999;
    input.portfolio.loc.lenderTerms.sources.annualFee='model-default';input.portfolioDocumentVersion=undefined;release(stream);await queued;
    const first=clone((await outbox.read(owner))[0]),data=JSON.parse(first.assumptionsJson.storage.find(x=>x.key===logical).value);
    assert.equal(data.version,3);assert.deepEqual(data.data.loc.lenderTerms,{annualFee:0,minimumPayment:{mode:'fixed',value:0},sources:{annualFee:'lender-document'}});
    await e.createOutbox().enqueue({assumptions:scenario(7300),portfolio:book(7300),portfolioDocumentVersion:3,expectedOwnerId:owner});
    assert.deepEqual(clone((await outbox.read(owner))[0]),first);
    assert.equal(JSON.parse((await outbox.read(owner))[1].assumptionsJson.storage.find(x=>x.key===logical).value).version,3);
  });
  await test('staging rejects preparation that silently downgrades an explicit3 target',async()=>{
    const e=environment(),outbox=e.createOutbox({prepareSnapshot:input=>e.sync.prepareMobileSnapshotSync({...input,portfolioDocumentVersion:undefined})});
    await assert.rejects(()=>outbox.stageRecovery({assumptions:scenario(7200),portfolio:book(7200),portfolioDocumentVersion:3,
      expectedLocalAssumptions:e.signatures().reviewedLocalAssumptions,expectedLocalPortfolio:e.signatures().reviewedLocalPortfolio,
      expectedOwnerId:owner,serverRevision:7,snapshotIdempotencyKey:stream,sourceKind:'remote'}),/target|Portfolio/i);
    assert.equal(await outbox.readRecovery(owner),null);
  });
  await test('recovery deep-captures nested source profiles before its first owner check',async()=>{
    const e=environment(),incoming=book(9000);incoming.loc.lenderTerms={annualFee:0,minimumPayment:{mode:'fixed',value:0},sources:{annualFee:'lender-document'}};
    e.addRow(scenario(8000),incoming);const input=await e.review(),gate=e.holdClaims();
    const applied=e.recovery.applyMobileSnapshotRecovery(e.client,input,e.dependencies(e.createOutbox()));
    input.source.snapshot.portfolio.loc.lenderTerms.minimumPayment.value=999;input.source.snapshot.portfolio.loc.lenderTerms.sources.annualFee='model-default';
    gate.resolve();await applied;assert.deepEqual(e.portfolio().loc.lenderTerms,incoming.loc.lenderTerms);
  });
  await test('scenario1 fingerprint and new preparation reject supplied lender extensions instead of stripping',async()=>{
    const e=environment(),input=scenario(7200);input.loc.lenderTerms={annualFee:0};
    assert.throws(()=>e.recovery.serializeMobileRecoveryAssumptions(input),/terms|version|scenario/i);
    await assert.rejects(()=>e.sync.prepareMobileSnapshotSync({assumptions:input,expectedOwnerId:owner,clientRevision:1,
      operationIdempotencyKey:'operation:legacy-1234',snapshotIdempotencyKey:stream}),/terms|version|scenario/i);
    const outbox=e.createOutbox(),before=clone([...e.values]);await assert.rejects(()=>outbox.enqueue({assumptions:input,expectedOwnerId:owner}),/terms|version|scenario/i);
    assert.deepEqual(clone([...e.values]),before);
  });
  await test('remote scenario1 term extensions are rejected even beside a valid Portfolio',async()=>{
    const e=environment(),input=scenario(7200);input.loc.lenderTerms={annualFee:0};e.addRow(input,book(9000));
    const options=await e.recovery.loadMobileSnapshotRecoveryOptions(e.client,owner);assert.equal(options.snapshots.length,0);assert.equal(options.rejectedCount,1);
  });
  await test('pending recovery with unsupported scenario1 extensions fails without mutating its frozen body',async()=>{
    const e=environment(),outbox=e.createOutbox();await outbox.stageRecovery({assumptions:scenario(8000),
      expectedLocalAssumptions:e.signatures().reviewedLocalAssumptions,expectedOwnerId:owner,serverRevision:7,snapshotIdempotencyKey:stream,sourceKind:'remote'});
    const [key,raw]=[...e.values][0],payload=JSON.parse(raw),entry=payload.recovery.item.assumptionsJson.storage[0],assumptions=JSON.parse(entry.value);
    assumptions.input.loc.lenderTerms={annualFee:0};entry.value=JSON.stringify(assumptions);e.values.set(key,JSON.stringify(payload));const before=e.values.get(key);
    await assert.rejects(()=>outbox.readRecovery(owner),/assumptions|scenario|terms/i);assert.equal(e.values.get(key),before);
  });
  await test('direct preparation captures transport identity before asynchronous installation lookup',async()=>{
    const e=environment(),input={assumptions:scenario(7200),portfolio:book(7200),portfolioDocumentVersion:3,
      expectedOwnerId:owner,clientRevision:1,operationIdempotencyKey:'operation:captured-1234'};
    const preparing=e.sync.prepareMobileSnapshotSync(input);input.expectedOwnerId='00000000-0000-4000-8000-00000000000b';
    input.clientRevision=99;input.operationIdempotencyKey='operation:mutated-1234';input.portfolio.monthlyIncome=9999;
    const prepared=await preparing;assert.equal(prepared.expectedOwnerId,owner);assert.equal(prepared.clientRevision,1);
    assert.equal(prepared.operationIdempotencyKey,'operation:captured-1234');
    const document=JSON.parse(prepared.assumptionsJson.storage.find(x=>x.key===logical).value);assert.equal(document.version,3);assert.equal(document.data.monthlyIncome,7200);
  });
  await test('transport markers without a Portfolio target reject instead of disappearing into scenario1',async()=>{
    const e=environment(),outbox=e.createOutbox();
    for(const portfolio of [null,undefined]){
      await assert.rejects(()=>e.sync.prepareMobileSnapshotSync({assumptions:scenario(7200),portfolio,portfolioDocumentVersion:3,
        expectedOwnerId:owner,clientRevision:1,operationIdempotencyKey:'operation:missing-1234',snapshotIdempotencyKey:stream}),/Portfolio|version|target/i);
      await assert.rejects(()=>outbox.enqueue({assumptions:scenario(7200),portfolio,portfolioDocumentVersion:3,expectedOwnerId:owner}),/Portfolio|version|target/i);
    }
    assert.equal(e.values.size,0);
  });
  console.log(`${count} paired Portfolio snapshot contracts ${process.exitCode?'failed':'passed'}. Memory ports, not device or hosted API proof.`);
}
const watchdog=setTimeout(()=>{console.error('Paired Portfolio contracts timed out.');process.exit(1);},15000);
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
