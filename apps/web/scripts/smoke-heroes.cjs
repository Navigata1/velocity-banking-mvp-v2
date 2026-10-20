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
async function run() {
  const started = await startBuiltServer(root);
  const browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true,
    args: getHeadlessChromiumArgs().filter(arg => !arg.includes('swiftshader')).concat('--use-angle=d3d11') });
  try {
    for (const width of [1440,375]) {
      const context = await browser.newContext({ viewport: {width,height:900}, deviceScaleFactor:1 });
      const page = await context.newPage(); const errors = [], requests=[];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
      page.on('request', request => requests.push(request.url()));
      await page.goto(started.origin, { waitUntil:'networkidle' });
      await page.getByTestId('asset-hero').waitFor();
      await page.screenshot({path:path.join(output,`dashboard-${width}.png`)});
      assert.equal(requests.filter(url=>url.endsWith('.glb')).length,0,'model must not download before opt-in');
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
        await page.getByRole('button',{name:'Inspect authored 3D model',exact:true}).click();
        const stage=page.getByTestId('asset-hero-canvas');
        await page.waitForFunction(() => document.querySelector('[data-testid="asset-hero-canvas"]')?.dataset.ready==='true');
        const a=await stage.screenshot();
        await page.waitForTimeout(1500);
        const b=await stage.screenshot();
        fs.writeFileSync(path.join(output,`${width}-${id}-3d-start.png`),a);
        fs.writeFileSync(path.join(output,`${width}-${id}-3d.png`),b);
        const image=decodePngRgba(a),lastImage=decodePngRgba(b);
        const boundsA=visibleBounds(image),boundsB=visibleBounds(lastImage);
        const bounds={left:Math.min(boundsA.left,boundsB.left),top:Math.min(boundsA.top,boundsB.top),
          right:Math.max(boundsA.right,boundsB.right),bottom:Math.max(boundsA.bottom,boundsB.bottom)};
        const first=samplePngPixels(image,31,bounds),second=samplePngPixels(lastImage,31,bounds);
        console.log(`${width}px ${id} color samples: ${first.colorCount}, ${second.colorCount}`);
        assert.ok(first.colorCount>12,`${id} blank canvas`);
        assert.ok(hasMaterialSpatialChange(compareSpatialDescriptors(first.stabilityDescriptor,second.stabilityDescriptor)),`${id} did not visibly rotate`);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
        assert.ok(overflow<=1,`${width} ${id} overflows by ${overflow}px`);
        console.log(`PASS ${width}px ${id}: poster, real GLB, nonblank pixels, visible rotation, containment`);
      }
      await page.goto(`${started.origin}/vault`,{waitUntil:'networkidle'});
      assert.equal(await page.getByTestId('asset-hero').getAttribute('data-hero'),'vault');
      await page.getByRole('button',{name:'Inspect authored 3D model',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('[data-testid="asset-hero-canvas"]')?.dataset.ready==='true');
      const vault=page.getByTestId('asset-hero-canvas');
      const start=decodePngRgba(await vault.screenshot());
      await page.waitForTimeout(1500);
      const end=decodePngRgba(await vault.screenshot());
      const va=visibleBounds(start),vb=visibleBounds(end);
      const region={left:Math.min(va.left,vb.left),right:Math.max(va.right,vb.right),top:Math.min(va.top,vb.top),bottom:Math.max(va.bottom,vb.bottom)};
      assert.ok(hasMaterialSpatialChange(compareSpatialDescriptors(samplePngPixels(start,31,region).stabilityDescriptor,samplePngPixels(end,31,region).stabilityDescriptor)),'vault did not rotate');
      console.log(`PASS ${width}px vault: nonblank, framed, moving`);
      await page.screenshot({path:path.join(output,`${width}-vault.png`)});
      assert.deepEqual(errors,[]); await context.close();
    }
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    const page=await context.newPage(); await page.goto(started.origin,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Inspect authored 3D model',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-testid="asset-hero-canvas"]')?.dataset.ready==='true');
    const stage=page.getByTestId('asset-hero-canvas');
    const first=await stage.screenshot(); await page.waitForTimeout(1200); const last=await stage.screenshot();
    assert.equal(samplePngPixels(decodePngRgba(first)).fingerprint,samplePngPixels(decodePngRgba(last)).fingerprint,'reduced-motion must be still');
    await context.close(); console.log('PASS reduced-motion still frame');
  } finally { await browser.close(); await stopServer(started.server); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
