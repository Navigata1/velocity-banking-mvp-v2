/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const web=path.resolve(__dirname,'..');
const ts=createRequire(path.join(web,'package.json'))('typescript');
const source=fs.readFileSync(path.join(web,'scripts/smoke-heroes.cjs'),'utf8');
const parse=text=>ts.createSourceFile('smoke.cjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const tree=parse(source),find=name=>tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
const replay=find('verifyReplay'),run=find('run');assert.ok(replay&&run);
const helperNames=['beforeDeadline','primeMotionFrame','advanceMotionSample','pauseAtVisibleHero','captureStage','verifyReplay'];
const helperText=helperNames.map(name=>{const node=find(name);assert.ok(node,name+' must exist');return node.getText(tree);});

function resumes(node) {
  let count=0;
  const visit=n=>{
    if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='resume'){
      const receiver=n.expression.expression;
      if(ts.isPropertyAccessExpression(receiver)&&receiver.name.text==='clock'&&ts.isIdentifier(receiver.expression)&&receiver.expression.text==='page')count++;
    }
    ts.forEachChild(n,visit);
  };
  visit(node);return count;
}
async function protocol(replacement=helperText.at(-1)) {
  const trace=[],writes=[],requests=['https://example.test/heroes/car.glb'];let paused=true,now=10000,shot=0;
  const canvas={evaluate:async fn=>fn({isConnected:true}),dispose:async()=>trace.push(['dispose'])};
  const stage={locator:()=>({elementHandle:async()=>canvas}),getAttribute:async()=> 'true',boundingBox:async()=>({x:0,y:0,width:100,height:100})};
  const page={
    clock:{
      resume:async()=>{paused=false;trace.push(['resume']);},
      pauseAt:async target=>{now+=250;if(target<now)throw new Error('Cannot fast-forward to the past');paused=true;},
      runFor:async ticks=>{assert.equal(paused,true,'primer must keep the existing paused sample');trace.push(['primer',ticks]);},
      fastForward:async ticks=>{assert.equal(paused,true,'sample must stay paused');trace.push(['sample',ticks]);},
    },
    waitForFunction:async()=>true,evaluate:async()=>now+100,
    getByRole:()=>({click:async()=>{assert.equal(paused,true,'Replay must use the caller paused sample');trace.push(['click']);}}),
    getByTestId:()=>({locator:()=>({evaluate:async()=> '0'})}),
    screenshot:async()=>shot++,
  };
  const exports={};
  // Phase fixtures isolate clock ownership; actual browser suites still decode real PNGs.
  vm.runInNewContext(helperText.slice(0,-1).join('\n')+'\n'+replacement+'\nexports.verifyReplay=verifyReplay;',{
    exports,assert,URL,stageTimeout:120000,setTimeout,clearTimeout,path,output:'.',fs:{writeFileSync:(file,bytes)=>writes.push([file,bytes])},
    decodePngRgba:phase=>({phase}),visibleBounds:()=>({left:10,top:10,right:90,bottom:90}),
    samplePngPixels:image=>({stabilityDescriptor:image.phase}),compareSpatialDescriptors:(a,b)=>a!==b,hasMaterialSpatialChange:value=>value,
    console:{log(){}},
  });
  await exports.verifyReplay(page,stage,'car',1440,requests,0,1);
  assert.deepEqual(trace,[['click'],['primer',16],...Array.from({length:15},()=>['sample',100]),['dispose'],['resume']]);
  assert.equal(writes.length,2);assert.equal(shot,2);assert.equal(paused,false);
}
const awaitCall=(object,method,args=[])=>ts.factory.createExpressionStatement(ts.factory.createAwaitExpression(ts.factory.createCallExpression(
  method?ts.factory.createPropertyAccessExpression(object,method):object,undefined,args)));
const prepend=(node,statement)=>ts.factory.updateFunctionDeclaration(node,node.modifiers,node.asteriskToken,node.name,node.typeParameters,node.parameters,node.type,
  ts.factory.updateBlock(node.body,[statement,...node.body.statements]));
const print=node=>ts.createPrinter().printNode(ts.EmitHint.Unspecified,node,tree);
(async()=>{
  await protocol();assert.equal(resumes(run),0,'callers must not resume between the original capture and Replay');
  console.log('PASS hero replay clock: one paused sample, no resume or re-pause before Replay');
  console.log('PASS hero replay clock: original 16ms primer and 15x100ms samples retained');
  const rePause=prepend(replay,awaitCall(ts.factory.createIdentifier('pauseAtVisibleHero'),undefined,[ts.factory.createIdentifier('page')]));
  await assert.rejects(protocol(print(rePause)),/Cannot fast-forward to the past/);
  const earlyResume=prepend(run,awaitCall(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('page'),'clock'),'resume'));
  assert.equal(resumes(earlyResume),1,'caller negative control must insert a resume');
  assert.throws(()=>assert.equal(resumes(earlyResume),0,'callers must not resume between the original capture and Replay'),/callers must not resume/);
  console.log('PASS hero replay clock negative controls: delayed re-pause and premature caller resume rejected');
})().catch(error=>{console.error(error);process.exitCode=1;});
