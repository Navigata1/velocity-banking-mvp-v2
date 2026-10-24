/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash,randomUUID}=require('node:crypto'),{chromium}=require('playwright-core');
const {startBuiltServer,stopServer,createGracefulShutdown}=require('./built-server-harness.cjs');
const {findBrowserExecutable,getHeadlessChromiumArgs}=require('./browser-harness.cjs');
const {compareSpatialDescriptors,MAX_SETTLED_SPATIAL_CELL_DISTANCE,MAX_SETTLED_SPATIAL_MEAN_DISTANCE}=require('./png-pixel-proof.cjs');
const {createPhaseTiming}=require('./three-stage-timing.cjs');
const {readSelectionStageState}=require('./selection-stage-state.cjs');
const {waitForNormalStage,waitForStageSettled,assertGenuineWebgl2,captureIsolatedCanvasPng,proveCanvasPng,prepareStageAndTargetForClick}=require('./test-three-stage.cjs');
const root=path.resolve(__dirname,'..'),motionMs=450,settleMs=700,stabilityMs=300;
const keys=['velocity-bank-storage','interestshield-portfolio-v2','interestshield-portfolio-v1'];
const documents=[
 ' \n'+JSON.stringify({version:0,state:{monthlyIncome:8200,monthlyExpenses:4700,chunkAmount:1000,activeDomain:'car',loc:{limit:25000,balance:3200,interestRate:8.5}}})+'\n',
 JSON.stringify({version:2,aprUnit:'decimal',data:{monthlyIncome:9876,monthlyExpenses:4321,extraMonthlyPayment:0,chunkAmount:0,loc:{limit:1000,balance:0,apr:0},strategy:'velocity',focusMode:'single',splitRatioPrimary:.7,debts:[]}}),
 '{"untouched":"original selection QA portfolio"}',
];
const state=readSelectionStageState;
const vitals=page=>page.locator('[data-testid^="dashboard-vital-"],[data-testid^="dashboard-mobile-vital-"]').allTextContents();
const bytes=page=>page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),keys);
async function settledPixels(page,started,id,label,output){
 const deadline=started+settleMs,timing=createPhaseTiming();
 const snapshot={label,startedAt:started,deadline,phaseOriginElapsedMs:Date.now()-started,phases:timing.phases};
 try{
 await timing.measure('selection.settled.wait',()=>waitForStageSettled(page,id,deadline));
 const candidate=await captureIsolatedCanvasPng(page,label,deadline,null,timing,'candidate'),proof=timing.measureSync('candidate.decode',()=>proveCanvasPng(candidate.screenshot,label)),decodedAt=Date.now();
 assert.ok(decodedAt<=deadline,'decode and overlay restoration must remain inside the unchanged700ms bound');
 const confirmationDeadline=decodedAt+stabilityMs,confirmation=await captureIsolatedCanvasPng(page,label,confirmationDeadline,candidate.canvasClip,timing,'confirmation'),confirmed=timing.measureSync('confirmation.decode',()=>proveCanvasPng(confirmation.screenshot,label));
 assert.ok(Date.now()<=confirmationDeadline,'stability decode and restoration must remain inside300ms');
 const distance=compareSpatialDescriptors(proof.stabilityDescriptor,confirmed.stabilityDescriptor);
 assert.ok(distance.maxCellDistance<=MAX_SETTLED_SPATIAL_CELL_DISTANCE&&distance.meanCellDistance<=MAX_SETTLED_SPATIAL_MEAN_DISTANCE,'completed rapid selection must retain stable actual canvas pixels: '+JSON.stringify(distance));
 const file=label+'-canvas.png';fs.writeFileSync(path.join(output,file),candidate.screenshot);
 return{settledAndDecodedMs:decodedAt-started,stableThroughMs:Date.now()-started,colors:proof.colorCount,opaquePixels:proof.opaquePixels,distance,file,bytes:candidate.screenshot.length,sha256:createHash('sha256').update(candidate.screenshot).digest('hex'),timing:snapshot};
 }catch(error){error.selectionTiming=snapshot;throw error;}
}
async function runSelectionSmoke({browser,origin,output=path.join(root,'test-results/three-selection')}){
 fs.mkdirSync(output,{recursive:true});const receipts=[],resources={contextsOpened:0,contextsClosed:0},runId=randomUUID(),startedAt=new Date().toISOString();
 for(const {label,width,height,mode}of [{label:'desktop',width:1440,height:900,mode:'full'},{label:'mobile',width:390,height:844,mode:'efficient'}])for(const workflow of ['rapid-return','settled-return','current-noop']){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'no-preference'});resources.contextsOpened++;
  await context.addInitScript(({keys,documents})=>{Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:8});Object.defineProperty(navigator,'deviceMemory',{configurable:true,value:8});for(let i=0;i<keys.length;i++)localStorage.setItem(keys[i],documents[i]);},{keys,documents});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const name=label+'-'+workflow;
  let returnObservation;
  try{
   const response=await page.goto(origin,{waitUntil:'networkidle'});assert.equal(response.status(),200);
   await page.getByText('Explore the Money Loop',{exact:true}).click();await waitForNormalStage(page,label,mode);await waitForStageSettled(page,'income',Date.now()+15000);
   const webgl=await assertGenuineWebgl2(page,label);await prepareStageAndTargetForClick(page,'income');
   const baseline=await vitals(page);assert.deepEqual(await bytes(page),documents);const initial=await state(page);let details;
   if(workflow==='current-noop'){
    const token=page.getByTestId('money-loop-active-artifact-token'),original=await token.evaluateHandle(element=>element),started=Date.now();
    try{await page.getByTestId('money-loop-artifact-node-income').click();const after=await state(page);assert.deepEqual(after,initial);assert.equal(await token.evaluate((element,original)=>element===original,original),true,'current-item no-op cannot remount its DOM token');details={initial,after,pixels:await settledPixels(page,started,'income',name,output),sameDomToken:true};}finally{await original.dispose();}
   }else{
    const next=page.getByRole('button',{name:'Next Money Loop artifact',exact:true}),previous=page.getByRole('button',{name:'Previous Money Loop artifact',exact:true});
    const awayStarted=Date.now();await next.click();const away=await state(page);assert.equal(away.id,'loc');let awayPixels;
    if(workflow==='rapid-return'){assert.equal(away.state,'transitioning');assert.ok(Date.now()-awayStarted<motionMs,'rapid stimulus did not leave before the450ms transition');}
    else awayPixels=await settledPixels(page,awayStarted,'loc',name+'-away',output);
    const returnStarted=Date.now();
    const returnTiming=createPhaseTiming();
    returnObservation={label:name,startedAt:returnStarted,scope:'Node client-call roundtrips; not DOM event or GPU timing',phases:returnTiming.phases};
    await returnTiming.measure('return.previous.click.client-call',()=>previous.click());
    const returned=await returnTiming.measure('return.state.read',()=>state(page)),readMs=Date.now()-returnStarted;
    assert.equal(returned.id,'income');assert.ok(readMs<motionMs,'return observation must precede the end of450ms motion');assert.equal(returned.state,'transitioning','return cannot reuse the previous Income completion');
    if(initial.revision!==null)assert.equal(Number(returned.revision),Number(initial.revision)+2);
    const pixels=await settledPixels(page,returnStarted,'income',name,output),final=await state(page);assert.equal(final.state,'settled');assert.equal(final.revision,returned.revision);
    assert.equal(await previous.evaluate(element=>element===document.activeElement),true,'visual callbacks cannot move focus from the explicit control');
    details={initial,away,returned,returnReadMs:readMs,returnObservation,final,pixels,...(awayPixels?{awayPixels}:{})};
   }
   assert.deepEqual(await bytes(page),documents);assert.deepEqual(await vitals(page),baseline);assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(output,name+'-viewport.png')});receipts.push({name,width,height,mode,passed:true,webgl,details,errors,sourceBytesPreserved:true,financialVitalsUnchanged:true});console.log('PASS Three selection '+name);
   if(returnObservation)console.log('THREE_SELECTION_RETURN_OBSERVATION '+JSON.stringify(returnObservation));
  }catch(error){receipts.push({name,width,height,mode,passed:false,error:error.message,errors,selectionTiming:error.selectionTiming??null,returnObservation:returnObservation??null});console.error(error.stack);if(error.selectionTiming)console.error('THREE_SELECTION_TIMING '+JSON.stringify(error.selectionTiming));if(returnObservation)console.error('THREE_SELECTION_RETURN_OBSERVATION '+JSON.stringify(returnObservation));await page.screenshot({path:path.join(output,name+'-failure.png')}).catch(()=>{});}
  finally{await context.close();resources.contextsClosed++;}
 }
 const files=fs.readdirSync(output).filter(file=>file.endsWith('.png')).sort().map(file=>{const data=fs.readFileSync(path.join(output,file));return{file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};});
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({runId,origin,startedAt,completedAt:new Date().toISOString(),receipts,resources,screenshots:files,scope:'Six real UI workflows; full/efficient software-WebGL fixture,450ms motion/700ms decode/300ms stability unchanged; no physical hardware claim'},null,2)+'\n');
 assert.equal(receipts.length,6);assert.equal(resources.contextsOpened,resources.contextsClosed);assert.ok(receipts.every(r=>r.passed),'Three selection workflows must all pass');return receipts;
}
module.exports={runSelectionSmoke};
let activeBrowser,activeServer;const shutdown=createGracefulShutdown({closeBrowser:async()=>{await activeBrowser?.close();activeBrowser=undefined;},stopServer:async()=>{await stopServer(activeServer);activeServer=undefined;},exit:code=>process.exit(code)});
async function main(){try{const started=process.env.THREE_SELECTION_ORIGIN?null:await startBuiltServer(root);activeServer=started?.server;activeBrowser=await chromium.launch({executablePath:findBrowserExecutable(),headless:true,args:getHeadlessChromiumArgs()});await runSelectionSmoke({browser:activeBrowser,origin:process.env.THREE_SELECTION_ORIGIN??started.origin});}finally{await activeBrowser?.close();await stopServer(activeServer);}}
if(require.main===module){process.once('SIGINT',()=>{void shutdown(130);});process.once('SIGTERM',()=>{void shutdown(143);});main().catch(error=>{console.error(error);process.exitCode=1;});}
