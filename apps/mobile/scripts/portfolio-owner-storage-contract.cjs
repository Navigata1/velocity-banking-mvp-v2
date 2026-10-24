/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const ownerA='00000000-0000-4000-8000-00000000000a',ownerB='00000000-0000-4000-8000-00000000000b';
const base={monthlyIncome:8200.451,monthlyExpenses:4700.125,extraMonthlyPayment:50.125,chunkAmount:1000,
  loc:{limit:1000,balance:50.125,apr:1.2},strategy:'avalanche',focusMode:'single',splitRatioPrimary:0.7,
  debts:[{id:'loan',name:'Loan',category:'custom',kind:'amortized',balance:120.70001,apr:2,
    minPaymentRule:{type:'fixed',amount:30.005},paymentSource:'checking',termMonths:12}]};
const clone=value=>JSON.parse(JSON.stringify(value));
function harness(platform='web',available=true){
  const values=new Map(),secureValues=new Map(),cache=new Map(),locks=new Map();
  let generation=0,writeFailure=null;
  const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const global={localStorage,navigator:{locks:{request:(key,_options,action)=>{
    const previous=locks.get(key)??Promise.resolve();
    const next=previous.catch(()=>undefined).then(action);locks.set(key,next.then(()=>undefined,()=>undefined));return next;
  }}}};
  const secure={isAvailableAsync:async()=>available,getItemAsync:async key=>secureValues.get(key)??null,
    setItemAsync:async(key,value)=>{
      if(writeFailure?.(key)){writeFailure=null;throw new Error('injected write failure');}
      assert.ok(Buffer.byteLength(value,'utf8')<=2048,'native byte budget');secureValues.set(key,value);
    },deleteItemAsync:async key=>secureValues.delete(key)};
  const mocks={'expo-crypto':{randomUUID:()=>`owner-generation-${++generation}`},'expo-secure-store':secure,'react-native':{Platform:{OS:platform}}};
  function load(file){
    if(cache.has(file)) return cache.get(file).exports;
    if(!fs.existsSync(file))return{};
    const testModule={exports:{}};cache.set(file,testModule);
    const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
    const resolve=id=>{
      if(Object.hasOwn(mocks,id))return mocks[id];
      if(id.startsWith('@interestshield/financial-engine'))return load(fs.realpathSync(require.resolve(id)));
      if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));
      return require(id);
    };
    vm.runInNewContext(source,{module:testModule,exports:testModule.exports,require:resolve,globalThis:global,console},{filename:file});
    return testModule.exports;
  }
  const book=load(path.resolve(__dirname,'../lib/mobile-portfolio-storage.ts'));
  const auth=load(path.resolve(__dirname,'../lib/supabase/auth-storage.ts'));
  const invoke=(name,...args)=>{assert.equal(typeof book[name],'function',`native owner Portfolio ${name} must exist`);return book[name](...args);};
  return{values,secureValues,global,auth,key:owner=>invoke('mobilePortfolioStorageKey',owner),
    read:(owner,lock)=>invoke('loadMobilePortfolioForOwner',owner,lock),
    save:(owner,input,options)=>invoke('saveMobilePortfolioForOwner',owner,input,options),
    failWrite:predicate=>{writeFailure=predicate;}};
}
let cases=0;
async function test(name,action){cases++;try{await action();console.log(`PASS owner Portfolio ${name}`);}
  catch(error){console.error(`FAIL owner Portfolio ${name}`);console.error(error);process.exitCode=1;}}
async function main(){
  await test('absence is explicit and creation preserves precise values on reload',async()=>{
    const h=harness(),first=await h.read(null);assert.equal(first.book,null);assert.equal(first.revision,0);
    assert.equal(first.backend,'local-storage');
    assert.equal((await h.save(null,base,{expectedRevision:0})).revision,1);
    const restored=await h.read(null);assert.deepEqual(clone(restored.book),base);assert.equal(restored.revision,1);
  });
  await test('guest A and B have isolated keys with no implicit adoption',async()=>{
    const h=harness();await h.save(null,base,{expectedRevision:0});
    assert.equal((await h.read(ownerA)).book,null);assert.equal((await h.read(ownerB)).book,null);
    await h.save(ownerA,{...base,monthlyIncome:9100},{expectedRevision:0});
    await h.save(ownerB,{...base,monthlyIncome:7200},{expectedRevision:0});
    assert.equal((await h.read(null)).book.monthlyIncome,base.monthlyIncome);
    assert.equal((await h.read(ownerA)).book.monthlyIncome,9100);assert.equal((await h.read(ownerB)).book.monthlyIncome,7200);
    assert.equal(h.key(ownerA.toUpperCase()),h.key(ownerA));assert.notEqual(h.key(null),h.key(ownerA));
  });
  await test('stale concurrent revisions cannot overwrite the winning book',async()=>{
    const h=harness();const results=await Promise.allSettled([
      h.save(ownerA,base,{expectedRevision:0}),h.save(ownerA,{...base,monthlyIncome:9999},{expectedRevision:0})]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected').length,1);
    assert.equal((await h.read(ownerA)).revision,1);
    await assert.rejects(()=>h.save(ownerA,base,{expectedRevision:0}),/revision|changed/i);
  });
  await test('authentic owner locks nest but forged and wrong-owner locks reject',async()=>{
    const h=harness();await h.auth.withMobileSnapshotOwnerLock(ownerA,async lock=>{
      await h.save(ownerA,base,{expectedRevision:0,ownerLock:lock});
      assert.equal((await h.read(ownerA,lock)).revision,1);
      await assert.rejects(()=>h.save(ownerB,base,{expectedRevision:0,ownerLock:lock}),/lock|owner/i);
    });
    await assert.rejects(()=>h.save(ownerA,base,{expectedRevision:1,ownerLock:{ownerId:ownerA}}),/lock|owner/i);
  });
  await test('saving freezes the exact candidate before a queued owner lock',async()=>{
    const h=harness();let release;const gate=new Promise(r=>{release=r;});
    const holding=h.auth.withMobileSnapshotOwnerLock(ownerA,()=>gate);
    const input=clone(base),saving=h.save(ownerA,input,{expectedRevision:0});input.debts[0].balance=999;
    release();await holding;await saving;assert.equal((await h.read(ownerA)).book.debts[0].balance,120.70001);
  });
  await test('queued CAS options are frozen with the candidate on web and native',async()=>{
    for(const platform of ['web','ios']){
      const h=harness(platform);let release;const gate=new Promise(r=>{release=r;});
      const holding=h.auth.withMobileSnapshotOwnerLock(ownerA,()=>gate);
      const options={expectedRevision:0};
      const first=h.save(ownerA,base,{expectedRevision:0});
      const stale=h.save(ownerA,{...base,monthlyIncome:9999},options);options.expectedRevision=1;
      release();await holding;const results=await Promise.allSettled([first,stale]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.equal((await h.read(ownerA)).book.monthlyIncome,base.monthlyIncome);
      assert.equal((await h.read(ownerA)).revision,1);
    }
  });
  await test('expired authentic tokens cannot bypass a newly acquired owner lock',async()=>{
    for(const platform of ['web','ios']){
      const h=harness(platform);let expired;
      await h.auth.withMobileSnapshotOwnerLock(ownerA,async lock=>{expired=lock;});
      await h.auth.withMobileSnapshotOwnerLock(ownerA,async lock=>{
        const current=h.save(ownerA,base,{expectedRevision:0,ownerLock:lock});
        const stale=h.save(ownerA,{...base,monthlyIncome:9999},{expectedRevision:0,ownerLock:expired});
        const results=await Promise.allSettled([current,stale]);
        assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');
        await assert.rejects(()=>h.read(ownerA,expired),/lock|owner/i);
      });
      assert.equal((await h.read(ownerA)).book.monthlyIncome,base.monthlyIncome);
      assert.equal((await h.read(ownerA)).revision,1);
    }
  });
  await test('authentic token ownership cannot be retagged during its callback',async()=>{
    for(const platform of ['web','ios']){
      const h=harness(platform);await h.auth.withMobileSnapshotOwnerLock(ownerA,async lock=>{
        try{lock.ownerId=ownerB;}catch{}
        assert.equal(lock.ownerId,ownerA);
        await assert.rejects(()=>h.save(ownerB,base,{expectedRevision:0,ownerLock:lock}),/lock|owner/i);
        await h.save(ownerA,base,{expectedRevision:0,ownerLock:lock});
      });
      assert.equal((await h.read(ownerB)).book,null);
    }
  });
  await test('existing single-debt and unowned web bytes are never modified',async()=>{
    const h=harness();const old={'interestshield.mobile.assumptions.v1':'preserved-guest',
      [`interestshield.mobile.assumptions.v1.owner.${ownerA}`]:'preserved-owner','interestshield-portfolio-v1':'preserved-web'};
    for(const[key,value]of Object.entries(old))h.values.set(key,value);
    await h.save(ownerA,base,{expectedRevision:0});
    for(const[key,value]of Object.entries(old))assert.equal(h.values.get(key),value);
  });
  await test('native books use strict encrypted Unicode chunks and preserve a failed publication',async()=>{
    const h=harness('ios'),input=clone(base);input.debts[0].notes='\u5b89\u5168\u{1f4b0}'.repeat(600);
    await h.save(ownerA,input,{expectedRevision:0});assert.deepEqual(clone((await h.read(ownerA)).book),input);
    h.failWrite(key=>key.endsWith('.manifest'));
    await assert.rejects(()=>h.save(ownerA,{...input,monthlyIncome:9999},{expectedRevision:1}),/injected write failure/);
    assert.equal((await h.read(ownerA)).book.monthlyIncome,input.monthlyIncome);
    assert.equal((await h.read(ownerA)).revision,1);assert.equal(h.values.size,0);
  });
  await test('corrupt encrypted generations never become a fresh empty book',async()=>{
    const h=harness('ios');await h.save(ownerA,base,{expectedRevision:0});
    const key=h.key(ownerA),m=JSON.parse(h.secureValues.get(key+'.manifest'));
    h.secureValues.delete(`${key}.${m.generation}.0`);const before=JSON.stringify([...h.secureValues]);
    await assert.rejects(()=>h.read(ownerA),/incomplete|corrupt/i);
    await assert.rejects(()=>h.save(ownerA,base,{expectedRevision:0}),/incomplete|corrupt/i);
    assert.equal(JSON.stringify([...h.secureValues]),before);
  });
  await test('wrong-owner and malformed present payloads reject without replacement',async()=>{
    for(const corrupt of [p=>p.ownerId=ownerB,p=>p.version=2,p=>p.revision=-1,p=>p.revision=1.5,
      p=>p.document='{',p=>p.savedAt='invalid',p=>p.extra=true]){
      const h=harness();await h.save(ownerA,base,{expectedRevision:0});const key=h.key(ownerA);
      const payload=JSON.parse(h.values.get(key));corrupt(payload);h.values.set(key,JSON.stringify(payload));const before=h.values.get(key);
      await assert.rejects(()=>h.read(ownerA));await assert.rejects(()=>h.save(ownerA,base,{expectedRevision:0}));
      assert.equal(h.values.get(key),before);
    }
  });
  await test('unavailable native encryption never falls back to plaintext or reports saved',async()=>{
    const h=harness('ios',false);assert.equal((await h.read(ownerA)).backend,'unavailable');
    await assert.rejects(()=>h.save(ownerA,base,{expectedRevision:0}),/unavailable/i);
    assert.equal(h.values.size,0);assert.equal(h.secureValues.size,0);
  });
  await test('blocked browser storage and revision exhaustion leave existing bytes intact',async()=>{
    const h=harness();await h.save(ownerA,base,{expectedRevision:0});const key=h.key(ownerA),p=JSON.parse(h.values.get(key));
    p.revision=Number.MAX_SAFE_INTEGER;h.values.set(key,JSON.stringify(p));const before=h.values.get(key);
    await assert.rejects(()=>h.save(ownerA,base,{expectedRevision:Number.MAX_SAFE_INTEGER}),/revision/i);
    assert.equal(h.values.get(key),before);
    Object.defineProperty(h.global,'localStorage',{get(){throw new Error('storage blocked');}});
    assert.equal((await h.read(ownerA)).backend,'unavailable');
    await assert.rejects(()=>h.save(ownerA,base,{expectedRevision:0}),/unavailable/i);
    assert.equal(h.values.get(key),before);
  });
  console.log(`${cases} owner-scoped Portfolio storage contracts ${process.exitCode?'failed':'passed'}. UI lifecycle and real devices remain separate.`);
}
const watchdog=setTimeout(()=>{console.error('Owner Portfolio contracts timed out before completion.');process.exit(1);},10000);
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
