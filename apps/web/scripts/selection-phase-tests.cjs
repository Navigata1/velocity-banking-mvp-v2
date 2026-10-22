/* eslint-disable @typescript-eslint/no-require-imports */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const sourceFile=path.resolve(__dirname,'../../../apps/web/scripts/smoke-three-selection.cjs'),request=createRequire(sourceFile);
function fixture({failAt=null,lateCandidate=0,lateConfirmation=0}={}){
  let now=1000,captures=0,decodes=0;const calls=[],writes=[],failure=new Error('controlled '+failAt,{cause:new Error('original cause')});
  const png=Buffer.from('CPU phase fixture,not rendered pixels'),clip={box:{x:1,y:2,width:3,height:4},scrollY:7};
  const advance=amount=>{now+=amount;},timingFactory=()=>request('./three-stage-timing.cjs').createPhaseTiming(()=>now);
  const helper={
    waitForStageSettled:async(page,id,deadline)=>{calls.push({kind:'wait',deadline});advance(400);if(failAt==='wait')throw failure;},
    captureIsolatedCanvasPng:async(page,label,deadline,supplied,timing,phase)=>{
      const index=++captures;calls.push({kind:'capture',deadline,supplied,timing,phase});
      const operation=async()=>{advance(80);if(failAt==='capture'&&index===1)throw failure;advance(index===1?lateCandidate:lateConfirmation);return{screenshot:png,canvasClip:clip};};
      return timing?timing.measure(phase+'.capture',operation):operation();
    },
    proveCanvasPng:()=>{decodes++;advance(5);if(failAt==='decode')throw failure;return{colorCount:3,opaquePixels:4,stabilityDescriptor:[1,2,3]};},
  };
  const requireForSource=id=>{
    if(id==='./test-three-stage.cjs')return helper;
    if(id==='./three-stage-timing.cjs')return{createPhaseTiming:timingFactory};
    if(id==='./png-pixel-proof.cjs')return{compareSpatialDescriptors:()=>({maxCellDistance:0,meanCellDistance:0}),MAX_SETTLED_SPATIAL_CELL_DISTANCE:1,MAX_SETTLED_SPATIAL_MEAN_DISTANCE:1};
    if(id==='node:fs')return{...fs,writeFileSync:(...args)=>writes.push(args)};
    if(id==='playwright-core')return{};
    return request(id);
  };
  const loaded={exports:{}},source=fs.readFileSync(sourceFile,'utf8');
  new Function('exports','require','module','__filename','__dirname','Date',source+'\nmodule.exports.settledPixels=settledPixels;')
    (loaded.exports,requireForSource,loaded,sourceFile,path.dirname(sourceFile),{now:()=>now});
  return{run:()=>loaded.exports.settledPixels({},1000,'income','desktop-rapid-return','CPU-output'),calls,writes,failure,clip,get captures(){return captures;},get decodes(){return decodes;}};
}
test('selection forwards original absolute budgets and records wait,capture and synchronous decode phases',async()=>{
  const x=fixture(),result=await x.run(),captures=x.calls.filter(c=>c.kind==='capture');
  assert.ok(captures.every(c=>c.timing&&typeof c.timing.measure==='function'),'actual capture helpers must receive timing');
  assert.deepEqual(captures.map(c=>c.phase),['candidate','confirmation']);assert.equal(captures[0].deadline,1700);
  assert.equal(captures[1].deadline,1000+result.settledAndDecodedMs+300);assert.strictEqual(captures[1].supplied,x.clip);
  assert.deepEqual(result.timing.phases.map(p=>p.name),['selection.settled.wait','candidate.capture','candidate.decode','confirmation.capture','confirmation.decode']);
  assert.equal(result.timing.startedAt,1000);assert.equal(result.timing.deadline,1700);assert.equal(x.captures,2);assert.equal(x.decodes,2);assert.equal(x.writes.length,1);
});
test('selection retains and rethrows the exact wait,capture or decode failure with failed phase records',async()=>{
  for(const failAt of ['wait','capture','decode']){
    const x=fixture({failAt});await assert.rejects(x.run(),error=>{
      assert.strictEqual(error,x.failure);assert.equal(error.cause.message,'original cause');assert.ok(error.selectionTiming,'failed selection timing must remain inspectable');
      assert.ok(error.selectionTiming.phases.some(p=>p.status==='failed'));assert.equal(error.selectionTiming.deadline,1700);return true;
    });assert.equal(x.writes.length,0);assert.ok(x.captures<=1,'failure cannot trigger capture retry');
  }
});
test('selection still rejects restored/decoded candidates one millisecond beyond the original700ms bound',async()=>{
  const exact=fixture({lateCandidate:215});assert.equal((await exact.run()).settledAndDecodedMs,700);
  const late=fixture({lateCandidate:216});await assert.rejects(late.run(),error=>{
    assert.match(error.message,/unchanged700ms bound/);assert.ok(error.selectionTiming);assert.equal(error.selectionTiming.deadline,1700);return true;
  });assert.equal(late.captures,1);assert.equal(late.writes.length,0);
});
test('selection still anchors confirmation to actual decode plus300ms and rejects its extra millisecond',async()=>{
  const exact=fixture({lateConfirmation:215});assert.equal((await exact.run()).stableThroughMs,785);
  const late=fixture({lateConfirmation:216});await assert.rejects(late.run(),error=>{
    assert.match(error.message,/inside300ms/);assert.ok(error.selectionTiming);assert.equal(error.selectionTiming.deadline,1700);return true;
  });assert.equal(late.captures,2);assert.equal(late.writes.length,0);
});
test('actual workflow failure handler retains phase data in its receipt and CI stderr after the measured operation',async()=>{
  const ts=request('typescript'),source=fs.readFileSync(sourceFile,'utf8'),tree=ts.createSourceFile(sourceFile,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  let block;function visit(node){if(ts.isCatchClause(node)&&node.block.getText(tree).includes('receipts.push'))block=node.block;ts.forEachChild(node,visit);}visit(tree);assert.ok(block);
  const body=block.getText(tree).slice(1,-1),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const records=[],logs=[],timing={deadline:1700,phases:[{name:'candidate.capture',status:'failed'}]},error=Object.assign(new Error('controlled timing failure'),{selectionTiming:timing});let loggedBeforeFailureCapture=false;
  const run=new AsyncFunction('error','receipts','page','output','name','width','height','mode','errors','path','console',body);
  await run(error,records,{screenshot:async()=>{loggedBeforeFailureCapture=logs.some(line=>line.includes('THREE_SELECTION_TIMING'));return Buffer.from('CPU handler fixture');}},'CPU-output','desktop-rapid-return',1440,900,'full',[],path,{error:(...args)=>logs.push(args.join(' '))});
  assert.strictEqual(records[0].selectionTiming,timing);assert.ok(logs.some(line=>line.includes('THREE_SELECTION_TIMING')&&line.includes(JSON.stringify(timing))));
  assert.equal(loggedBeforeFailureCapture,true,'phase evidence must survive a hanging or cancelled debug screenshot');
});
