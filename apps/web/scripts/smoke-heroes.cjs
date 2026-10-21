/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');
const { decodePngRgba, samplePngPixels, compareSpatialDescriptors, hasMaterialSpatialChange } = require('./png-pixel-proof.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results/heroes');
fs.mkdirSync(output, { recursive: true });
const stageTimeout = 120000;
function visibleBounds(image) {
  let left=image.width,top=image.height,right=0,bottom=0,foreground=0;
  for(let y=0;y<image.height;y++) for(let x=0;x<image.width;x++) {
    const i=(y*image.width+x)*image.bytesPerPixel;
    const delta=Math.abs(image.pixels[i]-image.pixels[0])+Math.abs(image.pixels[i+1]-image.pixels[1])+Math.abs(image.pixels[i+2]-image.pixels[2]);
    if(delta<=40) continue;
    foreground++; left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);
  }
  assert.ok(foreground>image.width*image.height*0.02,'insufficient visible geometry');
  assert.ok(left>1 && top>1 && right<image.width-1 && bottom<image.height-1,'model touches canvas edge');
  return {left,right,top,bottom};
}
const domains = [['car','Auto'],['house','House'],['land','Land'],['creditCard','Credit Card'],
  ['studentLoan','Student Loan'],['medical','Medical'],['personal','Personal'],['recreation','Recreation'],['custom','Custom']];
function verifyVisibilityControls() {
  const fixture = (left, top, right, bottom) => {
    const pixels=Buffer.alloc(100*100*4);
    for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)pixels[(y*100+x)*4]=255;
    return {width:100,height:100,bytesPerPixel:4,pixels};
  };
  assert.throws(()=>visibleBounds(fixture(0,0,0,0)),/insufficient visible geometry/);
  assert.throws(()=>visibleBounds(fixture(40,40,50,50)),/insufficient visible geometry/);
  assert.throws(()=>visibleBounds(fixture(0,20,30,80)),/model touches canvas edge/);
  assert.deepEqual(visibleBounds(fixture(20,20,80,80)),{left:20,right:80,top:20,bottom:80});
  console.log('PASS hero visibility controls: blank, undersized and clipped frames rejected');
}
async function beforeDeadline(deadline, action, label) {
  const remaining=deadline-Date.now();
  assert.ok(remaining>0,label+' exceeded the original deadline');
  let timer;
  try {
    const result=await Promise.race([action(),new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error(label+' exceeded the original deadline')),remaining);
    })]);
    assert.ok(Date.now()<deadline,label+' exceeded the original deadline');
    return result;
  } finally {clearTimeout(timer);}
}
async function verifyDeadlineControls() {
  let called=false;
  await assert.rejects(beforeDeadline(Date.now()-1,async()=>{called=true;},'Expired action'),/original deadline/);
  assert.equal(called,false,'expired action must not start');
  await assert.rejects(beforeDeadline(Date.now()+5,()=>new Promise(resolve=>setTimeout(()=>resolve(true),15)),'Late action'),/original deadline/);
  let watchdog;
  try {
    await assert.rejects(Promise.race([
      beforeDeadline(Date.now()+5,()=>new Promise(()=>{}),'Pending action'),
      new Promise((_,reject)=>{watchdog=setTimeout(()=>reject(new Error('missing deadline rejection')),200);}),
    ]),/original deadline/);
  } finally {clearTimeout(watchdog);}
  assert.equal(await beforeDeadline(Date.now()+1000,async()=>true,'Immediate action'),true);
  console.log('PASS hero readiness deadline controls: late results and pending waits rejected');
}
async function primeMotionFrame(page) {
  await beforeDeadline(Date.now()+stageTimeout,()=>page.clock.runFor(16),'Animation primer');
}
async function advanceMotionSample(page) {
  const deadline=Date.now()+stageTimeout;
  // Fixed 10Hz test samples respect the runtime's 100ms delta cap; this is not an FPS test.
  for(let sample=0;sample<15;sample++) {
    await beforeDeadline(deadline,()=>page.clock.fastForward(100),'Animation sample');
  }
}
async function verifyCadenceControls() {
  const trace=[];
  const page={clock:{runFor:async time=>trace.push(['primer',time]),fastForward:async time=>trace.push(['sample',time])}};
  await primeMotionFrame(page);await advanceMotionSample(page);
  assert.deepEqual(trace,[['primer',16],...Array.from({length:15},()=>['sample',100])]);
  let calls=0;
  await assert.rejects(advanceMotionSample({clock:{fastForward:async()=>{
    if(++calls===7)throw new Error('injected sample failure');
  }}}),/injected sample failure/);
  assert.equal(calls,7,'failed sample must not trigger retries or extra ticks');
  console.log('PASS hero cadence controls: primer 16ms and 15x100ms samples');
}
async function pauseAtVisibleHero(page) {
  await page.clock.resume();
  await page.waitForFunction(()=>{
    const hero=document.querySelector('[data-testid="asset-hero"]');
    if(!hero)return false;
    for(let node=hero;node;node=node.parentElement){
      const style=getComputedStyle(node);
      if(Number(style.opacity)!==1||style.visibility==='hidden'||style.display==='none')return false;
    }
    return true;
  });
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
}
async function loadControlledStage(page) {
  const deadline=Date.now()+stageTimeout;
  // Tick loading timers without letting GPU/capture latency choose the turn phase.
  while(!await beforeDeadline(deadline,()=>page.locator('[data-testid="asset-hero-canvas"][data-ready="true"]').isVisible(),'3D readiness')) {
    await beforeDeadline(deadline,()=>page.clock.runFor(16),'3D loading tick');
  }
}
async function captureStage(page, stage) {
  const deadline=Date.now()+stageTimeout;
  while(await beforeDeadline(deadline,()=>page.getByTestId('asset-hero').locator('img').evaluate(image=>getComputedStyle(image).opacity),'Poster opacity')!=='0') {
    await beforeDeadline(deadline,()=>new Promise(resolve=>setTimeout(resolve,25)),'Poster fade');
  }
  const clip = await stage.boundingBox();
  assert.ok(clip && clip.width > 0 && clip.height > 0, 'stage must have stable dimensions');
  // Fixed stage bounds avoid locator screenshot stability polling during GPU work.
  return page.screenshot({ clip, timeout: 120000 });
}
async function run() {
  verifyVisibilityControls();
  await verifyDeadlineControls();
  await verifyCadenceControls();
  const started = await startBuiltServer(root);
  const browserArgs = getHeadlessChromiumArgs();
  const browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true,
    args: process.platform === 'win32' && process.env.HERO_SMOKE_SOFTWARE_GPU !== '1' ? browserArgs.filter(arg => !arg.includes('swiftshader')).concat('--use-angle=d3d11') : browserArgs });
  try {
    for (const width of [1440,375]) {
      const context = await browser.newContext({ viewport: {width,height:900}, deviceScaleFactor:1 });
      const page = await context.newPage(); const errors = [], requests=[];
      page.setDefaultTimeout(120000);
      await page.clock.install();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
      page.on('request', request => requests.push(request.url()));
      await page.goto(started.origin, { waitUntil:'networkidle' });
      await page.getByTestId('asset-hero').waitFor();
      await page.screenshot({path:path.join(output,`dashboard-${width}.png`)});
      assert.equal(requests.filter(url=>url.endsWith('.glb')).length,0,'model must not download before opt-in');
      let releaseModel, requestedModel;
      const blocked=new Promise(resolve=>{releaseModel=resolve;});
      const requested=new Promise(resolve=>{requestedModel=resolve;});
      await page.route('**/heroes/car.glb',async route=>{requestedModel();await blocked;await route.continue();});
      await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
      let timer;
      try { await Promise.race([requested,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('model request did not start')),10000);})]); }
      finally { clearTimeout(timer); }
      const poster=page.getByTestId('asset-hero').locator('img');
      assert.equal(await poster.evaluate(image=>getComputedStyle(image).opacity),'1','artwork disappears before model is loaded');
      releaseModel();
      await page.waitForFunction(()=>document.querySelector('[data-testid="asset-hero-canvas"]')?.dataset.ready==='true');
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-testid="asset-hero"] img')).opacity==='0');
      await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
      await page.waitForTimeout(250);
      assert.equal(await poster.evaluate(image=>getComputedStyle(image).opacity),'0','selected mode click reopens poster');
      await page.unroute('**/heroes/car.glb');
      await page.getByRole('button',{name:'Studio artwork',exact:true}).click();
      console.log(`PASS ${width}px slow-network poster continuity and selected-mode stability`);
      for (const [id,label] of domains) {
        if(id!=='car') await page.getByRole('tab',{name:`Switch to ${label} domain`,exact:true}).click();
        const hero=page.getByTestId('asset-hero');
        await hero.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => {
          const image=document.querySelector('[data-testid="asset-hero"] img');
          return image?.complete && image.naturalWidth > 0;
        });
        assert.equal(await hero.getAttribute('data-hero'),id);
        await page.screenshot({path:path.join(output,`${width}-${id}-poster.png`)});
        await pauseAtVisibleHero(page);
        await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
        const stage=page.getByTestId('asset-hero-canvas');
        await loadControlledStage(page);
        await primeMotionFrame(page);
        const a=await captureStage(page,stage);
        await advanceMotionSample(page);
        const b=await captureStage(page,stage);
        await page.clock.resume();
        fs.writeFileSync(path.join(output,`${width}-${id}-3d-start.png`),a);
        fs.writeFileSync(path.join(output,`${width}-${id}-3d.png`),b);
        const image=decodePngRgba(a),lastImage=decodePngRgba(b);
        const boundsA=visibleBounds(image),boundsB=visibleBounds(lastImage);
        const bounds={left:Math.min(boundsA.left,boundsB.left),top:Math.min(boundsA.top,boundsB.top),
          right:Math.max(boundsA.right,boundsB.right),bottom:Math.max(boundsA.bottom,boundsB.bottom)};
        const first=samplePngPixels(image,31,bounds),second=samplePngPixels(lastImage,31,bounds);
        assert.equal(hasMaterialSpatialChange(compareSpatialDescriptors(first.stabilityDescriptor,first.stabilityDescriptor)),false,'unchanged frame must fail motion proof');
        console.log(`${width}px ${id} color samples: ${first.colorCount}, ${second.colorCount}`);
        assert.ok(first.colorCount>12,`${id} blank canvas`);
        assert.ok(hasMaterialSpatialChange(compareSpatialDescriptors(first.stabilityDescriptor,second.stabilityDescriptor)),`${id} did not visibly rotate`);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
        assert.ok(overflow<=1,`${width} ${id} overflows by ${overflow}px`);
        console.log(`PASS ${width}px ${id}: poster, real GLB, nonblank pixels, visible rotation, containment`);
      }
      await page.goto(`${started.origin}/vault`,{waitUntil:'networkidle'});
      assert.equal(await page.getByTestId('asset-hero').getAttribute('data-hero'),'vault');
      await pauseAtVisibleHero(page);
      await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
      await loadControlledStage(page);
      const vault=page.getByTestId('asset-hero-canvas');
      await primeMotionFrame(page);
      const startBytes=await captureStage(page,vault);
      fs.writeFileSync(path.join(output,`${width}-vault-3d-start.png`),startBytes);
      const start=decodePngRgba(startBytes);
      await advanceMotionSample(page);
      const endBytes=await captureStage(page,vault);
      fs.writeFileSync(path.join(output,`${width}-vault-3d.png`),endBytes);
      const end=decodePngRgba(endBytes);
      await page.clock.resume();
      const va=visibleBounds(start),vb=visibleBounds(end);
      const region={left:Math.min(va.left,vb.left),right:Math.max(va.right,vb.right),top:Math.min(va.top,vb.top),bottom:Math.max(va.bottom,vb.bottom)};
      assert.ok(hasMaterialSpatialChange(compareSpatialDescriptors(samplePngPixels(start,31,region).stabilityDescriptor,samplePngPixels(end,31,region).stabilityDescriptor)),'vault did not rotate');
      console.log(`PASS ${width}px vault: nonblank, framed, moving`);
      await page.screenshot({path:path.join(output,`${width}-vault.png`)});
      assert.deepEqual(errors,[]); await context.close();
    }
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    const page=await context.newPage(); page.setDefaultTimeout(120000); await page.goto(started.origin,{waitUntil:'networkidle'});
    assert.equal(await page.getByTestId('asset-hero').locator('img').evaluate(image=>getComputedStyle(image).transitionProperty),'none','reduced-motion must not fade the artwork');
    await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-testid="asset-hero-canvas"]')?.dataset.ready==='true');
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-testid="asset-hero"] img')).opacity==='0');
    const stage=page.getByTestId('asset-hero-canvas');
    const first=await captureStage(page,stage); await page.waitForTimeout(1200); const last=await captureStage(page,stage);
    assert.equal(samplePngPixels(decodePngRgba(first)).fingerprint,samplePngPixels(decodePngRgba(last)).fingerprint,'reduced-motion must be still');
    await context.close(); console.log('PASS reduced-motion still frame');
  } finally { await browser.close(); await stopServer(started.server); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
