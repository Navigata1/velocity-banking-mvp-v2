import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

test('updating one refined hero preserves other assets and stable inventory order', async () => {
  const { saveRefinedHero }=await import('./refined-hero-record.mjs');
  const directory=await mkdtemp(path.join(os.tmpdir(),'interestshield-heroes-'));
  try {
    const imported=path.join(directory,'imported.json'), inventory=path.join(directory,'models.json');
    const car={id:'car',sha256:'car-v1'}, vault={id:'vault',sha256:'vault-v1'}, house={id:'house',quality:'study'};
    await writeFile(imported,JSON.stringify([car,vault]));
    await writeFile(inventory,JSON.stringify([car,house,vault]));
    const updated={...car,sha256:'car-v2'};
    await saveRefinedHero(updated,{imported,inventory});
    assert.deepEqual(JSON.parse(await readFile(imported,'utf8')),[updated,vault]);
    assert.deepEqual(JSON.parse(await readFile(inventory,'utf8')),[updated,house,vault]);
    await saveRefinedHero({...house,quality:'refined-textured'},{imported,inventory});
    assert.equal(JSON.parse(await readFile(imported,'utf8')).length,3);
    await saveRefinedHero(updated,{imported,inventory});
    assert.equal(JSON.parse(await readFile(imported,'utf8')).length,3,'a repeat import must not duplicate or drop records');
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('an import overlapping a real study rebuild remains the final asset and inventory', async () => {
  const directory=await mkdtemp(path.join(os.tmpdir(),'interestshield-rebuild-heroes-'));
  try {
    const paths={imported:path.join(directory,'imported.json'),inventory:path.join(directory,'models.json')};
    const output=pathToFileURL(path.join(directory,'assets')+path.sep).href;
    const initial=[{id:'car',sha256:'car-v1'},{id:'vault',sha256:'vault-v1'}];
    await mkdir(new URL(output));
    await writeFile(paths.imported,JSON.stringify(initial)); await writeFile(paths.inventory,JSON.stringify(initial));
    await writeFile(new URL('vault.glb',output),'vault-v1');
    const builder=new URL('./build-hero-models.mjs',import.meta.url).href;
    const child=spawn(process.execPath,['--input-type=module','-e',`import {buildHeroModels} from ${JSON.stringify(builder)}; await buildHeroModels({...${JSON.stringify(paths)},output:new URL(${JSON.stringify(output)})});`],{windowsHide:true});
    let stdout='',stderr='';
    child.stdout.on('data',data=>{stdout+=data;}); child.stderr.on('data',data=>{stderr+=data;});
    const exited=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>resolve(code));});
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Study rebuild did not reach its imported-car checkpoint')),10000);
      child.stdout.on('data',()=>{if(stdout.includes('car: preserving imported refined asset')){clearTimeout(timer);resolve();}});
      child.once('close',()=>{clearTimeout(timer);if(!stdout.includes('car: preserving imported refined asset'))reject(new Error(stderr||stdout));});
    });
    const importer=new URL('./refined-hero-record.mjs',import.meta.url).href;
    const results=await Promise.allSettled([
      exited,
      promisify(execFile)(process.execPath,['--input-type=module','-e',`import {saveRefinedHero} from ${JSON.stringify(importer)}; import {writeFile} from 'node:fs/promises'; await saveRefinedHero({id:'vault',sha256:'vault-v2'},${JSON.stringify(paths)},async()=>writeFile(new URL('vault.glb',${JSON.stringify(output)}),'vault-v2'));`],{windowsHide:true}),
    ]);
    assert.ok(results.every(result=>result.status==='fulfilled'),JSON.stringify(results));
    assert.equal(results[0].value,0,stderr);
    for(const filename of Object.values(paths)) assert.equal(JSON.parse(await readFile(filename,'utf8')).find(asset=>asset.id==='vault').sha256,'vault-v2');
    assert.equal(await readFile(new URL('vault.glb',output),'utf8'),'vault-v2','study generation must not overwrite the latest protected GLB');
    assert.deepEqual(JSON.parse(await readFile(paths.inventory,'utf8')).map(asset=>asset.id),['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault']);
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('concurrent importer processes retain every refined record in both manifests', async () => {
  const directory=await mkdtemp(path.join(os.tmpdir(),'interestshield-concurrent-heroes-'));
  try {
    const paths={imported:path.join(directory,'imported.json'),inventory:path.join(directory,'models.json')};
    await writeFile(paths.imported,'[]'); await writeFile(paths.inventory,'[]');
    const run=promisify(execFile), module=new URL('./refined-hero-record.mjs',import.meta.url).href;
    const records=Array.from({length:8},(_,i)=>({id:`asset-${i}`,sha256:`version-${i}`}));
    const results=await Promise.allSettled(records.map(record=>run(process.execPath,['--input-type=module','-e',
      `import {saveRefinedHero} from ${JSON.stringify(module)}; await saveRefinedHero(${JSON.stringify(record)},${JSON.stringify(paths)});`],{windowsHide:true})));
    assert.ok(results.every(result=>result.status==='fulfilled'),JSON.stringify(results));
    for(const filename of Object.values(paths)) {
      const saved=JSON.parse(await readFile(filename,'utf8')).sort((a,b)=>a.id.localeCompare(b.id));
      assert.deepEqual(saved,records,'concurrent writes must not lose another importer update');
    }
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('Windows sharing errors retry exclusive lock acquisition without weakening ownership', async () => {
  const directory=await mkdtemp(path.join(os.tmpdir(),'interestshield-windows-lock-'));
  try {
    const paths={imported:path.join(directory,'imported.json'),inventory:path.join(directory,'models.json')};
    const require=createRequire(import.meta.url), fs=require('node:fs/promises');
    const source=await readFile(new URL('./refined-hero-record.mjs',import.meta.url),'utf8');
    const compiled=ts.transpileModule(source,{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
      transformers:{before:[context=>root=>ts.visitNode(root,function visit(node){
        if(ts.isPropertyAccessExpression(node) && ts.isMetaProperty(node.expression) && node.name.text==='url') {
          return ts.factory.createStringLiteral(new URL('./refined-hero-record.mjs',import.meta.url).href);
        }
        return ts.visitEachChild(node,visit,context);
      })]},
    }).outputText;
    for(const code of ['EPERM','EACCES']) {
      await writeFile(paths.imported,'[]'); await writeFile(paths.inventory,'[]');
      let attempts=0;
      const output={exports:{}};
      vm.runInNewContext(compiled,{exports:output.exports,module:output,URL,process:{platform:'win32',pid:process.pid},require:name=>{
        if(name!=='node:fs/promises') return require(name);
        return {...fs,open:async(...args)=>{
          assert.equal(args[1],'wx','retries must retain exclusive creation');
          if(attempts++<2) throw Object.assign(new Error('Windows sharing violation'),{code});
          return fs.open(...args);
        }};
      }});
      await output.exports.saveRefinedHero({id:'vault',sha256:'latest'},paths);
      assert.equal(attempts,3);
      assert.equal(JSON.parse(await readFile(paths.inventory,'utf8'))[0].sha256,'latest');
      await assert.rejects(readFile(paths.imported+'.lock'),{code:'ENOENT'});
    }
  } finally { await rm(directory,{recursive:true,force:true}); }
});
