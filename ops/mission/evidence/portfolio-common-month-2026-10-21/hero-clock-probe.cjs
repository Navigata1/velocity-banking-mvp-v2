const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const app = path.join(root, 'apps/web');
const {chromium} = require(path.join(app, 'node_modules/playwright-core'));
const {findBrowserExecutable, getHeadlessChromiumArgs} = require(path.join(app, 'scripts/browser-harness.cjs'));
const {startBuiltServer, stopServer} = require(path.join(app, 'scripts/built-server-harness.cjs'));
const {decodePngRgba} = require(path.join(app, 'scripts/png-pixel-proof.cjs'));
const {samplePngPixels,compareSpatialDescriptors,hasMaterialSpatialChange}=require(path.join(app,'scripts/png-pixel-proof.cjs'));
const isVault=process.argv.includes('vault');
const frozen=process.argv.includes('frozen');
const sampled=process.argv.includes('sampled');
const out = path.join(root, '.superpowers/sdd/2026-10-21-common-month/hero-clock-probe'+(isVault?'-vault':'')+(frozen?'-frozen':'')+(sampled?'-sampled':''));
let samplingApi,samplingSourceHash;
if(sampled){
  const vm=require('node:vm'),assert=require('node:assert/strict'),ts=require(path.join(app,'node_modules/typescript'));
  const source=fs.readFileSync(path.join(app,'scripts/smoke-heroes.cjs'),'utf8');
  samplingSourceHash=require('node:crypto').createHash('sha256').update(source).digest('hex');
  const ast=ts.createSourceFile('smoke-heroes.cjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const names=['beforeDeadline','primeMotionFrame','advanceMotionSample'];
  const selected=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)).map(node=>node.getText(ast)).join('\n');
  const context=vm.createContext({assert,setTimeout,clearTimeout,Date,stageTimeout:120000});
  vm.runInContext(selected,context);samplingApi=vm.runInContext('({primeMotionFrame,advanceMotionSample})',context);
}
fs.mkdirSync(out, {recursive:true});
function coverage(bytes) {
  const image=decodePngRgba(bytes); let foreground=0;
  for(let i=0;i<image.pixels.length;i+=image.bytesPerPixel) {
    if(Math.abs(image.pixels[i]-image.pixels[0])+Math.abs(image.pixels[i+1]-image.pixels[1])+Math.abs(image.pixels[i+2]-image.pixels[2])>40) foreground++;
  }
  return {width:image.width,height:image.height,foreground,percent:100*foreground/(image.width*image.height)};
}
(async()=>{
  const started=await startBuiltServer(app);
  const browser=await chromium.launch({executablePath:findBrowserExecutable(),headless:true,args:getHeadlessChromiumArgs()});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
    page.setDefaultTimeout(20000);
    await page.clock.install({time:new Date('2026-10-21T00:00:00Z')});
    await page.goto(started.origin+(isVault?'/vault':''),{waitUntil:'networkidle'});
    if(!isVault) await page.getByRole('tab',{name:'Switch to Credit Card domain',exact:true}).click();
    if(frozen) await page.waitForFunction(()=>{for(let e=document.querySelector('[data-testid="asset-hero"]');e;e=e.parentElement)if(Number(getComputedStyle(e).opacity)!==1)return false;return true;});
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
    if(frozen) await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});
    console.log('clock paused before model opt-in');
    await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
    const deadline=Date.now()+20000;
    while(!await page.locator('[data-testid="asset-hero-canvas"][data-ready="true"]').isVisible()) {
      if(Date.now()>deadline) throw new Error('controlled load timed out');
      await page.clock.runFor(16);
    }
    console.log('loaded with paused clock');
    const stage=page.getByTestId('asset-hero-canvas');
    const clip=await stage.boundingBox();
    const opacityDeadline=Date.now()+20000;
    while(await page.getByTestId('asset-hero').locator('img').evaluate(image=>getComputedStyle(image).opacity)!=='0') {
      if(Date.now()>opacityDeadline) throw new Error('poster transition timed out');
      await new Promise(resolve=>setTimeout(resolve,25));
    }
    if(sampled)await samplingApi.primeMotionFrame(page);
    const a=await page.screenshot({clip});fs.writeFileSync(path.join(out,'rest.png'),a);
    console.log('rest',JSON.stringify(coverage(a)));
    if(sampled)await samplingApi.advanceMotionSample(page);else await page.clock.runFor(1500);
    const b=await page.screenshot({clip});fs.writeFileSync(path.join(out,'1500.png'),b);
    console.log('1500',JSON.stringify(coverage(b)));
    if(frozen){
      const assert=require('node:assert/strict'),vm=require('node:vm'),ts=require(path.join(app,'node_modules/typescript'));
      const source=fs.readFileSync(path.join(app,'scripts/smoke-heroes.cjs'),'utf8');
      const ast=ts.createSourceFile('smoke-heroes.cjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
      const fn=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='visibleBounds');
      const visibleBounds=vm.runInNewContext(fn.getText(ast)+'\nvisibleBounds',{assert});
      const firstImage=decodePngRgba(a),secondImage=decodePngRgba(b),firstBounds=visibleBounds(firstImage),secondBounds=visibleBounds(secondImage);
      const bounds={left:Math.min(firstBounds.left,secondBounds.left),right:Math.max(firstBounds.right,secondBounds.right),top:Math.min(firstBounds.top,secondBounds.top),bottom:Math.max(firstBounds.bottom,secondBounds.bottom)};
      const first=samplePngPixels(firstImage,31,bounds),second=samplePngPixels(secondImage,31,bounds);
      assert.ok(first.colorCount>12);assert.equal(hasMaterialSpatialChange(compareSpatialDescriptors(first.stabilityDescriptor,second.stabilityDescriptor)),false);
      assert.throws(()=>assert.ok(hasMaterialSpatialChange(compareSpatialDescriptors(first.stabilityDescriptor,second.stabilityDescriptor)),'frozen scheduler failed motion proof'),/frozen scheduler failed motion proof/);
      fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({scope:'Actual isolated browser RAF-disabled negative control, not a normal hero pass',sampled,samplingSourceHash,normalGeometryGuardPassed:true,colors:first.colorCount,motionRejected:true,first:coverage(a),second:coverage(b)},null,2)+'\n');
      console.log('PASS actual frozen-scheduler browser control: geometry remains visible and unchanged motion is rejected');
    }
    if(sampled)await samplingApi.advanceMotionSample(page);else await page.clock.runFor(1500);
    const c=await page.screenshot({clip});fs.writeFileSync(path.join(out,'3000.png'),c);
    console.log('3000',JSON.stringify(coverage(c)));
  } finally {await browser.close(); await stopServer(started.server);}
})().catch(error=>{console.error(error);process.exitCode=1;});
