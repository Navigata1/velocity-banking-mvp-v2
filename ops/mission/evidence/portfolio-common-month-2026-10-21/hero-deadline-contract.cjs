const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ts=require('../../../apps/web/node_modules/typescript');
const source=fs.readFileSync('apps/web/scripts/smoke-heroes.cjs','utf8');
const ast=ts.createSourceFile('smoke-heroes.cjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['beforeDeadline','loadControlledStage','captureStage'];
const declarations=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)).map(node=>node.getText(ast)).join('\n');
function harness(options={}) {
  let wall=0;
  const context=vm.createContext({assert,Buffer,setTimeout,clearTimeout,stageTimeout:options.realTime?25:120000,Date:options.realTime?Date:{now:()=>wall}});
  vm.runInContext(declarations,context);
  return {api:vm.runInContext('({loadControlledStage,captureStage})',context),setWall:value=>{wall=value;}};
}
const cases=[];
async function test(name,run) {try{await run();cases.push({name,passed:true});console.log('PASS '+name);}catch(error){cases.push({name,passed:false,error:error.message});console.error('FAIL '+name+': '+error.message);}}
(async()=>{
  await test('readiness observed after the wall deadline is rejected',async()=>{
    const h=harness();let reads=0;
    const page={locator:()=>({isVisible:async()=>{reads++;h.setWall(reads===1?119999:120010);return reads>1;}}),clock:{runFor:async()=>h.setWall(120010)}};
    await assert.rejects(h.api.loadControlledStage(page),/deadline/);
  });
  await test('opacity observed after the wall deadline is rejected',async()=>{
    const h=harness();
    const page={getByTestId:()=>({locator:()=>({evaluate:async()=>{h.setWall(120010);return '0';}})}),screenshot:async()=>Buffer.alloc(1)};
    await assert.rejects(h.api.captureStage(page,{boundingBox:async()=>({x:0,y:0,width:100,height:100})}),/deadline/);
  });
  await test('readiness before the deadline succeeds without extra loading ticks',async()=>{
    const h=harness();let reads=0,ticks=0;
    await h.api.loadControlledStage({locator:()=>({isVisible:async()=>++reads===2}),clock:{runFor:async value=>{assert.equal(value,16);ticks++;}}});
    assert.equal(ticks,1);assert.equal(reads,2);
  });
  await test('poster opacity succeeds before capture at the original dimensions',async()=>{
    const h=harness();const clip={x:0,y:0,width:100,height:100};let captures=0;
    const bytes=await h.api.captureStage({getByTestId:()=>({locator:()=>({evaluate:async()=>'0'})}),screenshot:async options=>{captures++;assert.deepEqual(options.clip,clip);assert.equal(options.timeout,120000);return Buffer.from('image');}},{boundingBox:async()=>clip});
    assert.equal(bytes.toString(),'image');assert.equal(captures,1);
  });
  if(process.argv.includes('--inflight'))await test('a pending loading operation is bounded by the unchanged wall deadline',async()=>{
    const h=harness({realTime:true});const started=Date.now();
    await assert.rejects(Promise.race([h.api.loadControlledStage({locator:()=>({isVisible:()=>new Promise(()=>{})})}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('outer watchdog: missing deadline rejection')),200))]),/deadline/);
    assert.ok(Date.now()-started<200);
  });
  console.log(JSON.stringify({passed:cases.filter(c=>c.passed).length,failed:cases.filter(c=>!c.passed).length,cases}));
  if(cases.some(c=>!c.passed))process.exitCode=1;
})();
