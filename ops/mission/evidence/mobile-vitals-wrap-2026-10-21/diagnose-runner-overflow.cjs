const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const req=createRequire(path.resolve('apps/web/package.json')),{chromium}=req('playwright-core'),{findBrowserExecutable,getHeadlessChromiumArgs}=req('./scripts/browser-harness.cjs'),{startBuiltServer,stopServer}=req('./scripts/built-server-harness.cjs');
(async()=>{let server,browser;try{
 server=await startBuiltServer(path.resolve('apps/web'));browser=await chromium.launch({executablePath:findBrowserExecutable(),headless:true,args:getHeadlessChromiumArgs()});
 const context=await browser.newContext({viewport:{width:280,height:900},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('velocity-bank-storage',JSON.stringify({state:{activeDomain:'house',monthlyIncome:100000001,monthlyExpenses:10000001,chunkAmount:20000001,chunkFrequency:'weekly',debts:{house:{balance:100000000,interestRate:.365,minimumPayment:10000001}},loc:{limit:200000000,balance:100000000,interestRate:.365}},version:0})));
 const page=await context.newPage();await page.goto(server.origin,{waitUntil:'networkidle'});await page.getByTestId('dashboard-mobile-vital-interest-burn').waitFor();
 const value=page.getByTestId('dashboard-mobile-vital-interest-burn').locator('p').nth(1),results=[];
 for(const family of ['', 'Arial','Verdana','Tahoma','Times New Roman','Segoe UI','Georgia','Consolas','monospace']){
  await value.evaluate((el,family)=>{el.style.fontFamily=family},family);
  const result=await value.evaluate(el=>{const css=getComputedStyle(el),range=document.createRange();range.selectNodeContents(el);return{text:el.textContent,bodyFont:getComputedStyle(document.body).fontFamily,font:css.fontFamily,fontSize:css.fontSize,weight:css.fontWeight,fontStatus:document.fonts.status,client:el.clientWidth,scroll:el.scrollWidth,rects:[...range.getClientRects()].map(r=>({width:r.width,height:r.height,top:r.top,left:r.left})),fontFaces:[...document.fonts].map(f=>({family:f.family,status:f.status}))}});
  results.push({requested:family||'unmodified',...result});console.log(JSON.stringify(results.at(-1)));
  if(result.scroll>result.client+1)await page.screenshot({path:path.join(__dirname,`overflow-${family.replace(/ /g,'-')||'unmodified'}.png`)});
 }
 fs.writeFileSync(path.join(__dirname,'runner-font-diagnostics.json'),JSON.stringify({origin:server.origin,results},null,2)+'\n');await context.close();
}finally{await browser?.close();await stopServer(server?.server);}})().catch(e=>{console.error(e);process.exitCode=1});
