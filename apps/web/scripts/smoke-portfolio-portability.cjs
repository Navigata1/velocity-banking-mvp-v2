/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const {findBrowserExecutable,getHeadlessChromiumArgs}=require('./browser-harness.cjs');
const {startBuiltServer,stopServer}=require('./built-server-harness.cjs');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test-results/portfolio-portability');
const oldKey='interestshield-portfolio-v1',newKey='interestshield-portfolio-v2';
const book={monthlyIncome:1000,monthlyExpenses:0,extraMonthlyPayment:20,chunkAmount:0,
  loc:{limit:0,balance:0,apr:0},strategy:'avalanche',focusMode:'single',splitRatioPrimary:0.7,
  debts:[{id:'native-source',name:'Mobile high APR',category:'custom',kind:'amortized',balance:1200,apr:2,
    minPaymentRule:{type:'fixed',amount:300},paymentSource:'checking',termMonths:61,notes:'  Preserve exact notes  '}]};
const document=JSON.stringify({version:2,aprUnit:'decimal',data:book},null,2);
const legacy={...book,debts:book.debts.map(d=>({...d,apr:200}))};
const original=' \n'+JSON.stringify({version:1,state:legacy},null,4)+'\n';
async function exportDocument(page){
  const pending=page.waitForEvent('download');await page.getByTestId('portfolio-export-backup').click();
  const download=await pending;return JSON.parse(fs.readFileSync(await download.path(),'utf8'));
}
async function runPortfolioPortabilityFixtures({browser,origin,output:destination=output}){
  fs.mkdirSync(destination,{recursive:true});const receipts=[];
  for(const width of [375,1440])for(const name of ['canonical-round-trip','corrupt-primary','failed-publication']){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
    await context.addInitScript(({oldKey,newKey,name,document,original})=>{
      if(localStorage.getItem('portability-seeded'))return;
      localStorage.setItem(oldKey,original);
      localStorage.setItem('velocity-bank-storage',JSON.stringify({state:{monthlyIncome:8111,monthlyExpenses:4222},version:0}));
      if(name!=='failed-publication')localStorage.setItem(newKey,name==='corrupt-primary'?'{bad canonical':document);
      localStorage.setItem('portability-seeded','yes');
      if(name==='failed-publication'){
        const set=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){if(key===newKey)throw new DOMException('Synthetic Portfolio quota failure','QuotaExceededError');return set.call(this,key,value);};
      }
    },{oldKey,newKey,name,document,original});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
      assert.equal((await page.goto(`${origin}/portfolio`,{waitUntil:'networkidle'})).status(),200);
      if(name==='canonical-round-trip'){
        assert.match(await page.getByTestId('portfolio-total-debt').innerText(),/\$1,200/);
        assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(),/7 mo/);
        assert.deepEqual(await exportDocument(page),JSON.parse(document),'web export must be a native-readable canonical document');
        await page.getByTestId('portfolio-import-backup-json').fill(JSON.stringify({version:99,aprUnit:'decimal',data:book}));
        const before=await page.evaluate(key=>localStorage.getItem(key),newKey);
        await page.getByTestId('portfolio-import-backup-json-submit').click();
        await page.getByRole('status').filter({hasText:/Import failed/}).waitFor({state:'visible'});
        assert.equal(await page.evaluate(key=>localStorage.getItem(key),newKey),before);
        const imported={...book,debts:book.debts.map(d=>({...d,apr:6.5}))};
        await page.getByTestId('portfolio-import-backup-json').fill(JSON.stringify({version:1,data:imported}));
        await page.getByTestId('portfolio-import-backup-json-submit').click();
        await page.getByRole('status').filter({hasText:/Import complete/}).waitFor({state:'visible'});
        const converted=await exportDocument(page);assert.equal(converted.version,2);assert.equal(converted.aprUnit,'decimal');
        assert.equal(converted.data.debts[0].apr,0.065);assert.equal(converted.data.debts[0].notes,book.debts[0].notes);
        await page.reload({waitUntil:'networkidle'});assert.deepEqual(await exportDocument(page),converted);
      }else{
        assert.equal(await page.getByTestId('portfolio-storage-error').count(),1,'unreadable or unsaved Portfolio must suppress projections and offer recovery');
        assert.equal(await page.getByTestId('portfolio-payoff-summary').count(),0,'failed storage cannot show a starter payoff');
        const value=await page.evaluate(key=>localStorage.getItem(key),newKey);
        assert.equal(value,name==='corrupt-primary'?'{bad canonical':null);
      }
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),oldKey),original,'original legacy source remains byte-identical');
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('velocity-bank-storage')).state),{monthlyIncome:8111,monthlyExpenses:4222});
      assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.screenshot({path:path.join(destination,`${name}-${width}.png`),fullPage:true});
      receipts.push({name,width,passed:true});console.log(`PASS web Portfolio portability ${name} ${width}px`);
    }catch(error){receipts.push({name,width,passed:false,message:error.message,errors});console.error(`FAIL web Portfolio portability ${name} ${width}px: ${error.message}`);
      await page.screenshot({path:path.join(destination,`${name}-${width}-failure.png`),fullPage:true}).catch(()=>{});
    }finally{await context.close();}
  }
  receipts.push(...await require('./smoke-lender-terms.cjs').runLenderTermsFixtures({browser,origin,output:path.join(destination,'lender-terms')}));
  fs.writeFileSync(path.join(destination,'verification.json'),JSON.stringify({origin,receipts},null,2)+'\n');
  assert.equal(receipts.filter(r=>!r.passed).length,0,'Portfolio portability browser fixtures must all pass');return receipts;
}
module.exports={runPortfolioPortabilityFixtures};
async function main(){let server,browser;try{
  server=process.env.PORTFOLIO_PORTABILITY_ORIGIN?null:await startBuiltServer(root);
  browser=await chromium.launch({executablePath:findBrowserExecutable(),headless:true,args:getHeadlessChromiumArgs()});
  await runPortfolioPortabilityFixtures({browser,origin:process.env.PORTFOLIO_PORTABILITY_ORIGIN??server.origin});
}finally{await browser?.close();await stopServer(server?.server);}}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
