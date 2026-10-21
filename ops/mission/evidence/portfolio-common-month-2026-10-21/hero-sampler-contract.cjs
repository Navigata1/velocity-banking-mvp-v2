const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('../../../apps/web/node_modules/typescript');
const source=fs.readFileSync('apps/web/scripts/smoke-heroes.cjs','utf8');
const ast=ts.createSourceFile('smoke-heroes.cjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['beforeDeadline','primeMotionFrame','advanceMotionSample'];
const text=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)).map(node=>node.getText(ast)).join('\n');
function harness(realTime=false){let wall=0;const context=vm.createContext({assert,setTimeout,clearTimeout,stageTimeout:realTime?25:120000,Date:realTime?Date:{now:()=>wall}});vm.runInContext(text,context);return {api:vm.runInContext('({prime:typeof primeMotionFrame===\'function\'?primeMotionFrame:null,advance:typeof advanceMotionSample===\'function\'?advanceMotionSample:null})',context),setWall:n=>{wall=n;}};}
const cases=[];
async function test(name,run){try{await run();cases.push({name,passed:true});console.log('PASS '+name);}catch(error){cases.push({name,passed:false,error:error.message});console.error('FAIL '+name+': '+error.message);}}
function requireFunctions(h){assert.equal(typeof h.api.prime,'function','primer declaration required');assert.equal(typeof h.api.advance,'function','bounded sampler declaration required');}
async function watchdog(run){let timer;try{return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('missing bounded sampler rejection')),200);})]);}finally{clearTimeout(timer);}}
(async()=>{
 await test('one16ms primer and exactly fifteen100ms samples, in fixed order',async()=>{const h=harness();requireFunctions(h);const trace=[];const page={clock:{runFor:async n=>trace.push(['primer',n]),fastForward:async n=>trace.push(['sample',n])}};await h.api.prime(page);await h.api.advance(page);assert.deepEqual(trace,[['primer',16],...Array.from({length:15},()=>['sample',100])]);});
 await test('dispatch failure stops on that sample with no retries or extra ticks',async()=>{const h=harness();requireFunctions(h);let calls=0;await assert.rejects(h.api.advance({clock:{fastForward:async n=>{assert.equal(n,100);if(++calls===7)throw new Error('injected dispatch failure');}}}),/injected dispatch failure/);assert.equal(calls,7);});
 await test('all samples share one original wall deadline',async()=>{const h=harness();requireFunctions(h);let calls=0;await assert.rejects(h.api.advance({clock:{fastForward:async()=>h.setWall(++calls===1?119999:120010)}}),/original deadline/);assert.equal(calls,2);});
 await test('a pending sample rejects within its remaining wall budget',async()=>{const h=harness(true);requireFunctions(h);await assert.rejects(watchdog(()=>h.api.advance({clock:{fastForward:()=>new Promise(()=>{})}})),/original deadline/);});
 await test('a pending primer rejects within the unchanged wall budget',async()=>{const h=harness(true);requireFunctions(h);await assert.rejects(watchdog(()=>h.api.prime({clock:{runFor:()=>new Promise(()=>{})}})),/original deadline/);});
 console.log(JSON.stringify({passed:cases.filter(c=>c.passed).length,failed:cases.filter(c=>!c.passed).length,cases}));if(cases.some(c=>!c.passed))process.exitCode=1;
})();
