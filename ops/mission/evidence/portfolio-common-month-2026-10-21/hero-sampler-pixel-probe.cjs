const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');const {performance}=require('node:perf_hooks');
const app=path.resolve('apps/web'),out=path.resolve('.superpowers/sdd/2026-10-21-common-month/hero-sampler-pixel-probe');
const {chromium}=require(path.join(app,'node_modules/playwright-core'));
const {findBrowserExecutable,getHeadlessChromiumArgs}=require(path.join(app,'scripts/browser-harness.cjs'));
const {startBuiltServer,stopServer}=require(path.join(app,'scripts/built-server-harness.cjs'));
const pixels=require(path.join(app,'scripts/png-pixel-proof.cjs'));
const ts=require(path.join(app,'node_modules/typescript'));
const source=fs.readFileSync(path.join(app,'scripts/smoke-heroes.cjs'),'utf8');
const sourceHash=createHash('sha256').update(source).digest('hex');
const ast=ts.createSourceFile('smoke-heroes.cjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['beforeDeadline','primeMotionFrame','advanceMotionSample','pauseAtVisibleHero','loadControlledStage','captureStage','visibleBounds'];
const selected=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)).map(node=>node.getText(ast)).join('\n');
const context=vm.createContext({assert,Buffer,setTimeout,clearTimeout,Date,stageTimeout:120000});
vm.runInContext(selected,context);const api=vm.runInContext('({beforeDeadline,primeMotionFrame,advanceMotionSample,pauseAtVisibleHero,loadControlledStage,captureStage,visibleBounds})',context);
fs.mkdirSync(out,{recursive:true});
const union=boxes=>({left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))});
(async()=>{
 const started=await startBuiltServer(app);const browser=await chromium.launch({executablePath:findBrowserExecutable(),headless:true,args:getHeadlessChromiumArgs()});
 const results=[];
 try{
  for(const mode of ['normalized-reference-60hz','fixed-sampler-10hz']){
   const browserContext=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const page=await browserContext.newPage();page.setDefaultTimeout(120000);
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.clock.install();await page.goto(started.origin,{waitUntil:'networkidle'});
   await page.getByRole('tab',{name:'Switch to Credit Card domain',exact:true}).click();
   await api.pauseAtVisibleHero(page);await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
   await api.loadControlledStage(page);await api.primeMotionFrame(page);const stage=page.getByTestId('asset-hero-canvas');
   const a=await api.captureStage(page,stage);fs.writeFileSync(path.join(out,mode+'-initial.png'),a);
   const start=performance.now();
   if(mode==='normalized-reference-60hz')await api.beforeDeadline(Date.now()+120000,()=>page.clock.runFor(1500),'Reference advancement');
   else await api.advanceMotionSample(page);
   const dispatchMilliseconds=performance.now()-start;
   const b=await api.captureStage(page,stage);const advanceAndCaptureMilliseconds=performance.now()-start;
   fs.writeFileSync(path.join(out,mode+'-end.png'),b);
   const first=pixels.decodePngRgba(a),second=pixels.decodePngRgba(b);
   const bounds=union([api.visibleBounds(first),api.visibleBounds(second)]);
   const firstSample=pixels.samplePngPixels(first,31,bounds),secondSample=pixels.samplePngPixels(second,31,bounds);
   assert.ok(firstSample.colorCount>12);assert.ok(pixels.hasMaterialSpatialChange(pixels.compareSpatialDescriptors(firstSample.stabilityDescriptor,secondSample.stabilityDescriptor)));
   assert.deepEqual(errors,[]);
   results.push({mode,dispatchMilliseconds,advanceAndCaptureMilliseconds,first,second,bounds,colors:firstSample.colorCount});
   console.log(JSON.stringify({mode,dispatchMilliseconds,advanceAndCaptureMilliseconds,colors:firstSample.colorCount,visibilityAndMotionPassed:true}));
   await browserContext.close();
  }
 }finally{await browser.close();await stopServer(started.server);}
 const bounds=union(results.map(r=>r.bounds));const comparisons={};
 for(const frame of ['first','second']){
  const distance=pixels.compareSpatialDescriptors(pixels.samplePngPixels(results[0][frame],31,bounds).stabilityDescriptor,pixels.samplePngPixels(results[1][frame],31,bounds).stabilityDescriptor);
  assert.ok(distance.maxCellDistance<=pixels.MAX_SETTLED_SPATIAL_CELL_DISTANCE&&distance.meanCellDistance<=pixels.MAX_SETTLED_SPATIAL_MEAN_DISTANCE,frame+' normalized endpoint differs');
  comparisons[frame]=distance;
 }
 const report={verifiedAt:new Date().toISOString(),sourceHash,asset:'creditCard',width:1440,backend:'requested software renderer',
  modes:results.map(({first,second,...rest})=>rest),comparisons,originalVisibilityAndMotionGuardsPassed:true,
  observedAdvanceCaptureRatio:results[0].advanceAndCaptureMilliseconds/results[1].advanceAndCaptureMilliseconds,
  scope:'One-asset normalized reference versus fixed10Hz two-pose test sampling. Both use the same16ms primer. Timing is observational, not a device FPS/smoothness or legacy-D6 bit-identity claim.'};
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
