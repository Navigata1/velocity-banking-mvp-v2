/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function harness() {
  const values=new Map(); let generation=0, failSet=null, failDelete=null;
  const store={
    getItemAsync:async key=>values.get(key)??null,
    setItemAsync:async(key,value)=>{
      if(failSet?.(key)){failSet=null;throw new Error('injected storage write failure');}
      if(Buffer.byteLength(value,'utf8')>2048) throw new Error('native encrypted value exceeds2048 bytes');
      values.set(key,value);
    },
    deleteItemAsync:async key=>{
      if(failDelete?.(key)){failDelete=null;throw new Error('injected cleanup failure');}
      values.delete(key);
    },
  };
  const file=path.resolve(__dirname,'../lib/supabase/auth-storage.ts');
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
  }).outputText;
  const testModule={exports:{}};
  vm.runInNewContext(source,{module:testModule,exports:testModule.exports,
    require:id=>id==='expo-crypto'?{randomUUID:()=>`generation-${++generation}`}:
      id==='expo-secure-store'?store:id==='react-native'?{Platform:{OS:'ios'}}:require(id)}, {filename:file});
  return {values,store,
    create:(generate,options)=>testModule.exports.createChunkedSecureAuthStorage(store,generate,options),
    strict:testModule.exports.createChunkedSecureAuthStorage(store,()=>`generation-${++generation}`,{strictRead:true}),
    legacy:testModule.exports.createChunkedSecureAuthStorage(store,()=>`generation-${++generation}`),
    failSet:predicate=>{failSet=predicate;},failDelete:predicate=>{failDelete=predicate;}};
}
let cases=0;
async function test(name,action){
  cases++;
  try{await action();console.log(`PASS Portfolio storage ${name}`);}
  catch(error){console.error(`FAIL Portfolio storage ${name}`);console.error(error);process.exitCode=1;}
}
async function main(){
  await test('Unicode chunks obey byte limits and reassemble the exact book text',async()=>{
    const h=harness(), text='\u5b89\u5168\u{1f4b0}'.repeat(800);
    await h.strict.setItem('book',text);
    assert.equal(await h.strict.getItem('book'),text);
    const chunks=[...h.values].filter(([key])=>!key.endsWith('.manifest'));
    assert.ok(chunks.length>2); assert.ok(chunks.every(([,value])=>Buffer.byteLength(value,'utf8')<=1800));
  });
  await test('missing chunks reject strict reads without deleting bytes or defaulting',async()=>{
    const h=harness();await h.strict.setItem('book','a'.repeat(4000));
    const manifest=JSON.parse(h.values.get('book.manifest'));
    h.values.delete(`book.${manifest.generation}.1`);
    const before=JSON.stringify([...h.values]);
    await assert.rejects(()=>h.strict.getItem('book'),/incomplete|corrupt/i);
    assert.equal(JSON.stringify([...h.values]),before);
    assert.equal(await h.legacy.getItem('book'),null,'existing legacy read contract remains unchanged');
  });
  await test('corrupt or oversized manifests cannot read replace or remove a book',async()=>{
    for(const raw of ['', '{',JSON.stringify({version:1,generation:'x',count:0}),
      JSON.stringify({version:1,generation:'x',count:1.5}),
      JSON.stringify({version:1,generation:'x',count:2049}),
      JSON.stringify({version:1,generation:'',count:1}),
      JSON.stringify({version:2,generation:'x',count:1})]){
      const h=harness();h.values.set('book.manifest',raw);const before=JSON.stringify([...h.values]);
      await assert.rejects(()=>h.strict.getItem('book'),/manifest|corrupt/i);
      await assert.rejects(()=>h.strict.setItem('book','replacement'),/manifest|corrupt/i);
      await assert.rejects(()=>h.strict.removeItem('book'),/manifest|corrupt/i);
      assert.equal(JSON.stringify([...h.values]),before);
    }
  });
  await test('failed chunk and manifest writes leave the prior generation readable',async()=>{
    for(const failedPart of ['.1','.manifest']){
      const h=harness(),original='prior'.repeat(600);await h.strict.setItem('book',original);
      const old=JSON.parse(h.values.get('book.manifest'));
      h.failSet(key=>failedPart==='.manifest'?key.endsWith('.manifest'):!key.includes(old.generation)&&key.endsWith('.1'));
      await assert.rejects(()=>h.strict.setItem('book','next'.repeat(2000)),/injected storage write failure/);
      assert.equal(await h.strict.getItem('book'),original);
      assert.equal(JSON.parse(h.values.get('book.manifest')).generation,old.generation);
    }
  });
  await test('post-publication cleanup failure does not report a false save failure',async()=>{
    const h=harness();await h.strict.setItem('book','prior'.repeat(600));
    const old=JSON.parse(h.values.get('book.manifest'));
    h.failDelete(key=>key.includes(old.generation));
    await h.strict.setItem('book','new'.repeat(1000));
    assert.equal(await h.strict.getItem('book'),'new'.repeat(1000));
  });
  await test('absent and empty encrypted values are distinct',async()=>{
    const h=harness();assert.equal(await h.strict.getItem('book'),null);
    await h.strict.setItem('book','');assert.equal(await h.strict.getItem('book'),'');
  });
  await test('strict publication rejects an unreadably large generation before writing',async()=>{
    const h=harness();await h.strict.setItem('book','prior');const before=JSON.stringify([...h.values]);
    await assert.rejects(()=>h.strict.setItem('book','a'.repeat(1800*2048+1)),/too large|chunk limit/i);
    assert.equal(JSON.stringify([...h.values]),before);
  });
  await test('invalid new generations cannot publish over a readable book',async()=>{
    for(const generation of ['', 'bad generation', 'x/y', 'x'.repeat(129), undefined, 12]){
      const h=harness();await h.strict.setItem('book','prior');const before=JSON.stringify([...h.values]);
      const bad=h.create(()=>generation,{strictRead:true});
      await assert.rejects(()=>bad.setItem('book','next'),/manifest|generation/i);
      assert.equal(JSON.stringify([...h.values]),before);assert.equal(await h.strict.getItem('book'),'prior');
    }
  });
  await test('reused generation identities cannot overwrite then delete the prior book',async()=>{
    const h=harness();await h.strict.setItem('book','prior');const before=JSON.stringify([...h.values]);
    const old=JSON.parse(h.values.get('book.manifest'));
    const reused=h.create(()=>old.generation,{strictRead:true});
    await assert.rejects(()=>reused.setItem('book','next'),/generation/i);
    assert.equal(JSON.stringify([...h.values]),before);assert.equal(await h.strict.getItem('book'),'prior');
  });
  await require('./portfolio-v3-storage-contract.cjs')();
  console.log(`${cases} Portfolio encrypted storage contracts ${process.exitCode?'failed':'passed'}. Owner-book persistence and device QA remain separate.`);
}
const watchdog=setTimeout(()=>{console.error('Portfolio encrypted storage contracts timed out before completion.');process.exit(1);},10000);
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
