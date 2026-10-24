const fs=require('node:fs');const path=require('node:path');
const warm=process.argv.includes('--warm');
const app=path.resolve('apps/web'),out=path.resolve('.superpowers/sdd/2026-10-21-common-month/hero-vault-opacity-probe'+(warm?'-warm':''));
const {chromium}=require(path.join(app,'node_modules/playwright-core'));
const {findBrowserExecutable,getHeadlessChromiumArgs}=require(path.join(app,'scripts/browser-harness.cjs'));
const {startBuiltServer,stopServer}=require(path.join(app,'scripts/built-server-harness.cjs'));
const {decodePngRgba}=require(path.join(app,'scripts/png-pixel-proof.cjs'));
fs.mkdirSync(out,{recursive:true});
const ancestors=element=>{const result=[];for(let e=element;e;e=e.parentElement){const s=getComputedStyle(e);result.push({tag:e.tagName,opacity:s.opacity,visibility:s.visibility,transform:s.transform});}return result;};
(async()=>{
 const started=await startBuiltServer(app);const browser=await chromium.launch({executablePath:findBrowserExecutable(),headless:true,args:getHeadlessChromiumArgs()});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});page.setDefaultTimeout(20000);
  await page.clock.install();
  if(warm){
   await page.goto(started.origin,{waitUntil:'networkidle'});
   await page.getByRole('tab',{name:'Switch to Credit Card domain',exact:true}).click();
   await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
   await page.locator('[data-testid="asset-hero-canvas"][data-ready="true"]').waitFor();
   await page.getByRole('button',{name:'Studio artwork',exact:true}).click();
  }
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  await page.goto(started.origin+'/vault',{waitUntil:'networkidle'});
  console.log('before opt-in',JSON.stringify(await page.getByTestId('asset-hero').evaluate(ancestors)));
  await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
  const deadline=Date.now()+20000;let ticks=0;
  while(!await page.locator('[data-testid="asset-hero-canvas"][data-ready="true"]').isVisible()){
   if(Date.now()>deadline)throw new Error('loading deadline');await page.clock.runFor(16);ticks++;
  }
  const fade=Date.now()+20000;
  while(await page.getByTestId('asset-hero').locator('img').evaluate(e=>getComputedStyle(e).opacity)!=='0'){
   if(Date.now()>fade)throw new Error('poster deadline');await new Promise(resolve=>setTimeout(resolve,25));
  }
  async function capture(name){
   const stage=page.getByTestId('asset-hero-canvas');const clip=await stage.boundingBox();
   const bytes=await page.screenshot({clip});fs.writeFileSync(path.join(out,name+'.png'),bytes);
   const image=decodePngRgba(bytes);let foreground=0;
   for(let i=0;i<image.pixels.length;i+=image.bytesPerPixel)if(Math.abs(image.pixels[i]-image.pixels[0])+Math.abs(image.pixels[i+1]-image.pixels[1])+Math.abs(image.pixels[i+2]-image.pixels[2])>40)foreground++;
   const result={name,ticks,clip,foreground,percent:100*foreground/(image.width*image.height),ancestors:await stage.evaluate(ancestors)};
   console.log(JSON.stringify(result));return result;
  }
  const before=await capture('before-page-settle');
  await page.clock.resume();
  await page.waitForFunction(()=>{for(let e=document.querySelector('[data-testid="asset-hero"]');e;e=e.parentElement)if(Number(getComputedStyle(e).opacity)<.99)return false;return true;});
  await page.getByRole('button',{name:'Studio artwork',exact:true}).click();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();
  const reload=Date.now()+20000;ticks=0;
  while(!await page.locator('[data-testid="asset-hero-canvas"][data-ready="true"]').isVisible()){
   if(Date.now()>reload)throw new Error('reload deadline');await page.clock.runFor(16);ticks++;
  }
  const refade=Date.now()+20000;
  while(await page.getByTestId('asset-hero').locator('img').evaluate(e=>getComputedStyle(e).opacity)!=='0'){
   if(Date.now()>refade)throw new Error('reloaded poster deadline');await new Promise(resolve=>setTimeout(resolve,25));
  }
  const after=await capture('after-page-settle');
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({before,after},null,2)+'\n');
 }finally{await browser.close();await stopServer(started.server);}
})().catch(error=>{console.error(error);process.exitCode=1;});
