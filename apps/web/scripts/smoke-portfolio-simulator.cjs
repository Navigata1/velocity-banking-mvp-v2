/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const {startBuiltServer,stopServer}=require('./built-server-harness.cjs');
const {findBrowserExecutable,getHeadlessChromiumArgs}=require('./browser-harness.cjs');
const {decodePngRgba}=require('./png-pixel-proof.cjs');
const {presentationBounds}=require('./hero-presentation-proof.cjs');
const {geometry,assertGeometry,originalNodeControls}=require('./portfolio-simulator-proof.cjs');
const {randomUUID,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),key='interestshield-portfolio-v2',legacyKey='velocity-bank-storage',oldKey='interestshield-portfolio-v1';
const legacy=' \n'+JSON.stringify({state:{monthlyIncome:8111,monthlyExpenses:4222},version:0})+'\n',oldPortfolio='{"untouched":"legacy sentinel"}';
const fixture=()=>({monthlyIncome:100,monthlyExpenses:0,extraMonthlyPayment:0,chunkAmount:100,loc:{limit:1000,balance:0,apr:0},strategy:'velocity',focusMode:'single',splitRatioPrimary:.7,debts:[{id:'a',name:'Loan A',category:'auto',kind:'amortized',balance:200,apr:0,minPaymentRule:{type:'fixed',amount:50},paymentSource:'checking',notes:'  Keep original metadata  '}]});
const encode=book=>JSON.stringify({version:2,aprUnit:'decimal',data:book},null,2);
const stored=page=>page.evaluate(key=>localStorage.getItem(key),key);
async function unchangedLegacy(page){assert.equal(await page.evaluate(k=>localStorage.getItem(k),legacyKey),legacy);assert.equal(await page.evaluate(k=>localStorage.getItem(k),oldKey),oldPortfolio);}
async function edit(page,label,value){await page.getByRole('button',{name:new RegExp(`^Edit ${label},`)}).click();const input=page.getByRole('textbox',{name:label+' value',exact:true});await input.fill(value);await input.press('Enter');}
async function settled(page){await page.waitForFunction(()=>{const root=document.querySelector('[data-testid="portfolio-simulator"]');if(!root)return false;for(let node=root;node;node=node.parentElement){const s=getComputedStyle(node);if(Number(s.opacity)!==1||s.display==='none'||s.visibility==='hidden')return false;}return true;});}
async function open(page,origin){await page.goto(origin+'/simulator?scenario=portfolio',{waitUntil:'networkidle'});await page.getByTestId('portfolio-simulator').waitFor();await settled(page);}
async function importBook(page,origin,book){
  await page.goto(origin+'/portfolio',{waitUntil:'networkidle'});await page.getByTestId('portfolio-import-backup-json').fill(encode(book));
  await page.getByTestId('portfolio-import-backup-json-submit').click();await page.getByRole('status').filter({hasText:/Import complete/}).waitFor();
  await page.getByRole('link',{name:'Compare strategies',exact:true}).click();await page.getByTestId('portfolio-simulator').waitFor();await settled(page);assert.deepEqual(JSON.parse(await stored(page)).data,book);
}
async function plan(page,strategy,payoff,interest='Not available',cash='Not available'){
  assert.equal(await page.getByTestId('simulator-payoff-'+strategy).innerText(),payoff);
  assert.equal(await page.getByTestId('simulator-interest-'+strategy).innerText(),interest);
  assert.equal(await page.getByTestId('simulator-cash-'+strategy).innerText(),cash);
}
async function readable(page){await settled(page);const proof=await page.getByTestId('portfolio-simulator').evaluate(geometry);assertGeometry(proof);return proof;}
async function history(page,status,body){
  const panel=page.getByTestId('portfolio-run-comparison');await panel.waitFor();
  const text=await panel.innerText();assert.equal(await panel.getByText(status,{exact:true}).count(),1,'expected '+status+' comparison; actual '+text);assert.ok(text.includes(body),text);return text;
}
async function sharedEdits(page,origin,output,width){
  await page.goto(origin+'/portfolio',{waitUntil:'networkidle'});await history(page,'Baseline','The next edit will compare against this projection.');
  await page.getByRole('link',{name:'Compare strategies',exact:true}).click();
  try{await page.getByTestId('portfolio-simulator').waitFor({timeout:15000});}catch{throw new Error('explicit shared route must render canonical Simulator; actual headings='+JSON.stringify(await page.locator('h1').allTextContents()));}
  assert.equal(await page.getByTestId('portfolio-simulator').count(),1);assert.equal(await page.getByRole('heading',{name:'What-If Simulator',exact:true}).count(),0);
  assert.equal(await stored(page),encode(fixture()));
  assert.equal(await page.getByTestId('portfolio-simulator-cash-flow').innerText(),'$100.00');assert.equal(await page.getByTestId('portfolio-simulator-total-debt').innerText(),'$200.00');
  for(const strategy of ['velocity','snowball','avalanche']){assert.equal(await page.getByTestId('simulator-payoff-'+strategy).innerText(),'2 mo');assert.equal(await page.getByTestId('simulator-interest-'+strategy).innerText(),'$0.00');assert.equal(await page.getByTestId('simulator-cash-'+strategy).innerText(),'$0.00');}
  const original=await stored(page);await edit(page,'Shared simulator monthly income','100');assert.equal(await stored(page),original);
  await edit(page,'Shared simulator monthly income','abc');await page.getByRole('alert').filter({hasText:'Enter a valid non-negative number.'}).waitFor();await page.getByRole('textbox',{name:'Shared simulator monthly income value',exact:true}).press('Escape');assert.equal(await stored(page),original);
  await edit(page,'Shared simulator monthly income','150');const expected=fixture();expected.monthlyIncome=150;assert.deepEqual(JSON.parse(await stored(page)).data,expected);
  await page.getByRole('link',{name:'Edit portfolio',exact:true}).click();await page.getByRole('button',{name:/^Edit Portfolio monthly income, current value \$150/}).waitFor();
  const incomeHistory=await history(page,'Updated','Monthly cash flow moved from $100 to $150.');assert.ok(incomeHistory.includes('+$50'));
  assert.equal(await page.getByTestId('portfolio-payoff-a').count(),1,'accepted plans retain their per-debt payoff dates');
  await edit(page,'Portfolio monthly expenses','25');expected.monthlyExpenses=25;const expenseHistory=await history(page,'Updated','Monthly cash flow moved from $150 to $125.');assert.ok(expenseHistory.includes('-$25'));
  await page.getByRole('link',{name:'Compare strategies',exact:true}).click();await page.getByTestId('portfolio-simulator').waitFor();
  await page.getByRole('link',{name:'Edit portfolio',exact:true}).click();assert.equal(await history(page,'Updated','Monthly cash flow moved from $150 to $125.'),expenseHistory,'read-only navigation must preserve the exact previous/current edit comparison');
  await page.getByRole('link',{name:'Compare strategies',exact:true}).click();await page.getByTestId('portfolio-simulator').waitFor();
  assert.equal(await page.getByTestId('portfolio-simulator-cash-flow').innerText(),'$125.00');await page.reload({waitUntil:'networkidle'});assert.deepEqual(JSON.parse(await stored(page)).data,expected);
  await page.getByRole('link',{name:'Portfolio dashboard',exact:true}).click();await page.getByTestId('shared-portfolio-dashboard').waitFor();assert.equal(await page.getByTestId('shared-value-cash-flow').innerText(),'$125.00');
  await page.getByRole('link',{name:'Compare strategies',exact:true}).click();await page.getByTestId('portfolio-simulator').waitFor();
  await page.getByRole('link',{name:'Edit portfolio',exact:true}).click();const reloadHistory=await history(page,'Baseline','The next edit will compare against this projection.');assert.ok(!reloadHistory.includes('+$50')&&!reloadHistory.includes('-$25'),'session-only comparison must not fabricate history after a fresh reload');
  await page.getByRole('link',{name:'Compare strategies',exact:true}).click();await page.getByTestId('portfolio-simulator').waitFor();await settled(page);await unchangedLegacy(page);
  await page.keyboard.press('Control+Home');await page.screenshot({path:path.join(output,`shared-edits-${width}-viewport.png`)});
  if(width!==280){await page.getByRole('button',{name:'Inspect 3D model',exact:true}).click();const stage=page.getByTestId('asset-hero-canvas');await stage.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-testid="asset-hero-canvas"]')?.dataset.ready==='true'&&getComputedStyle(document.querySelector('[data-testid="asset-hero"] img')).opacity==='0');presentationBounds(decodePngRgba(await stage.locator('canvas').screenshot()),'car');}
  const proof=await readable(page),controls=await originalNodeControls(page),contrasts=[];
  for(const theme of ['light','dark','original']){await page.evaluate(theme=>localStorage.setItem('interestshield-theme',JSON.stringify({state:{theme},version:0})),theme);await page.reload({waitUntil:'networkidle'});const proof=await readable(page);contrasts.push({theme,minimum:Math.min(...proof.metrics.map(m=>m.contrast)),values:proof.metrics.length});}
  await unchangedLegacy(page);assert.deepEqual(JSON.parse(await stored(page)).data,expected);
  return {bidirectional:true,canonicalWrites:true,legacyBytesPreserved:true,historyNavigation:{incomeHistory,expenseHistory,reloadHistory,sessionOnly:true},modelChecked:width!==280,geometry:proof,controls,contrasts};
}
async function sourceIsolation(page,origin){
  await open(page,origin);const before=await stored(page);
  for(const suffix of ['', '?scenario=unknown','?scenario=Portfolio']){await page.goto(origin+'/simulator'+suffix,{waitUntil:'networkidle'});await page.getByRole('heading',{name:'What-If Simulator',exact:true}).waitFor();assert.equal(await page.getByTestId('portfolio-simulator').count(),0);assert.equal(await stored(page),before);await unchangedLegacy(page);}
  await page.getByRole('link',{name:'Portfolio scenario',exact:true}).click();await page.getByTestId('portfolio-simulator').waitFor();
  const book=fixture();book.debts.push({...book.debts[0],id:'b',name:'Loan B',category:'personal_loan',balance:100,minPaymentRule:{type:'fixed',amount:25}});await importBook(page,origin,book);
  const document=await stored(page),summaries=await page.locator('[data-testid^="simulator-plan-"]').allTextContents();
  await page.getByLabel('Portfolio simulator debt',{exact:true}).selectOption('b');assert.equal(await page.getByTestId('asset-hero').getAttribute('data-hero'),'personal');
  assert.match(await page.getByTestId('simulator-selected-debt').innerText(),/Loan B[\s\S]*\$100.00/);assert.deepEqual(await page.locator('[data-testid^="simulator-plan-"]').allTextContents(),summaries);assert.equal(await stored(page),document);
  assert.equal(await page.getByTestId('portfolio-simulator-total-debt').innerText(),'$300.00');
  const month=page.getByLabel('Comparison month',{exact:true});await month.fill('3');await month.press('Tab');assert.equal(await page.getByTestId('common-month-net-snowball').innerText(),'$0.00');assert.equal(await stored(page),document);await unchangedLegacy(page);
  return {defaultAndUnknownStayLegacy:true,selectionIsInspectionOnly:true,wholeBook:true,geometry:await readable(page)};
}
async function adverse(page,origin){
  const book=fixture();book.loc.balance=100;book.loc.limit=100;await importBook(page,origin,book);
  await plan(page,'velocity','Review inputs');for(const s of ['snowball','avalanche'])await plan(page,s,'3 mo','$0.00','$0.00');
  assert.match(await page.getByTestId('portfolio-simulator').innerText(),/utilization is above 80%/);let proof=await readable(page);
  book.monthlyIncome=0;await importBook(page,origin,book);for(const s of ['velocity','snowball','avalanche'])await plan(page,s,'Review inputs');assert.match(await page.getByTestId('portfolio-simulator').innerText(),/Cash flow is not positive/);
  book.monthlyExpenses=100;await importBook(page,origin,book);assert.equal(await page.getByTestId('portfolio-simulator-cash-flow').innerText(),'-$100.00');for(const s of ['velocity','snowball','avalanche'])await plan(page,s,'Review inputs');
  const failed=fixture();failed.monthlyIncome=20;failed.chunkAmount=0;failed.debts[0].balance=100;failed.debts[0].minPaymentRule.amount=10;failed.debts[0].promo={introApr:0,monthsRemaining:1,postIntroApr:2.4};await importBook(page,origin,failed);await plan(page,'velocity','Review inputs');
  const month=page.getByLabel('Comparison month',{exact:true});await month.fill('2');await month.press('Tab');assert.equal(await page.getByTestId('common-month-net-snowball').innerText(),'-$76.00');assert.equal(await page.getByTestId('common-month-net-velocity').innerText(),'Not available');
  await unchangedLegacy(page);return {blockedVelocityDirectAvailable:true,unfundedAndNegative:true,failedPrefixNotPayoff:true,geometry:proof};
}
async function residuals(page,origin){
  const book=fixture();book.debts=[];await importBook(page,origin,book);for(const s of ['velocity','snowball','avalanche'])await plan(page,s,'Already paid off','$0.00','$0.00');assert.equal(await page.getByTestId('portfolio-simulator-total-debt').innerText(),'$0.00');
  for(const target of ['debt','loc']){const b=fixture();b.debts=target==='debt'?[{...b.debts[0],balance:.005}]:[];b.loc.balance=target==='loc'?.005:0;await importBook(page,origin,b);for(const s of ['velocity','snowball','avalanche'])await plan(page,s,'Nonzero balance remains');assert.notEqual(await page.getByTestId('portfolio-simulator-total-debt').innerText(),'$0.00');await readable(page);}
  const own=fixture();own.monthlyIncome=10;own.chunkAmount=0;own.loc.limit=0;own.debts[0].balance=10.005;own.debts[0].minPaymentRule.amount=10;await importBook(page,origin,own);for(const s of ['velocity','snowball','avalanche'])await plan(page,s,'Nonzero balance remains');
  await page.getByRole('link',{name:'Edit portfolio',exact:true}).click();await page.getByTestId('portfolio-payoff-summary').filter({hasText:/Nonzero balance remains|Review inputs/}).waitFor();assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(),/Nonzero balance remains|Review inputs/,'Portfolio must not contradict shared Simulator residual review');assert.match(await page.getByTestId('portfolio-cash-at-payoff').innerText(),/Not projected/);assert.equal(await page.getByTestId('portfolio-payoff-path-review').count(),1);assert.equal(await page.getByTestId('portfolio-payoff-path-visual').count(),0);
  const residualHistory=page.getByTestId('portfolio-run-comparison');assert.deepEqual({reviewLabels:await residualHistory.getByText('Review inputs',{exact:true}).count(),paidDates:await page.getByTestId('portfolio-payoff-a').count()},{reviewLabels:1,paidDates:0},'unpaid residual cannot receive history payoff success or a paid-off date; '+await residualHistory.innerText());
  await edit(page,'Portfolio monthly income','20');assert.match(await residualHistory.innerText(),/Projection restored/);assert.equal(await page.getByTestId('portfolio-payoff-a').count(),1,'genuine accepted payoff restores the dated order');
  await edit(page,'Portfolio monthly income','10');assert.match(await residualHistory.innerText(),/Needs review/);assert.equal(await page.getByTestId('portfolio-payoff-a').count(),0,'returning to residual removes dated success');
  await page.getByRole('link',{name:'Open dashboard',exact:true}).click();await page.getByTestId('shared-value-eta').waitFor();assert.equal(await page.getByTestId('shared-value-eta').innerText(),'Below model tolerance');assert.equal(await page.getByTestId('shared-value-next-move').innerText(),'Review payoff inputs');await page.getByRole('link',{name:'Compare strategies',exact:true}).click();await page.getByTestId('portfolio-simulator').waitFor();
  const early=fixture();early.monthlyIncome=2;early.extraMonthlyPayment=1;early.chunkAmount=0;early.loc.limit=0;early.debts=[{...early.debts[0],balance:1.000005,minPaymentRule:{type:'fixed',amount:1}},{...early.debts[0],id:'b',name:'Loan B',balance:5,minPaymentRule:{type:'fixed',amount:1}}];await importBook(page,origin,early);for(const s of ['velocity','snowball','avalanche'])await plan(page,s,'Nonzero balance remains');
  await unchangedLegacy(page);return {clearedAndTinyDistinct:true,ownResidual:true,earlyToleranceErasure:true,geometry:await readable(page)};
}
async function precision(page,origin){
  const book=fixture();book.monthlyIncome=1000;book.chunkAmount=0;book.loc.limit=0;book.loc.apr=.1234567890123;book.debts[0].balance=1200;book.debts[0].minPaymentRule.amount=300;book.debts[0].apr=2;await importBook(page,origin,book);
  assert.match(await page.getByTestId('simulator-selected-debt').innerText(),/200%/);for(const s of ['snowball','avalanche'])await plan(page,s,'2 mo','$266.67','$533.33');
  const before=await stored(page);await edit(page,'Shared simulator line of credit APR','12.34567890123');assert.equal(await stored(page),before);await edit(page,'Shared simulator line of credit APR','200');book.loc.apr=2;assert.deepEqual(JSON.parse(await stored(page)).data,book);
  const promo=fixture();promo.chunkAmount=0;promo.debts[0].apr=.6;promo.debts[0].promo={introApr:0,monthsRemaining:1,postIntroApr:.12};await importBook(page,origin,promo);assert.match(await page.getByTestId('simulator-selected-debt').innerText(),/Current APR: 0%/);await plan(page,'snowball','3 mo','$1.01','$98.99');
  promo.debts[0].promo.monthsRemaining=0;await importBook(page,origin,promo);assert.match(await page.getByTestId('simulator-selected-debt').innerText(),/Current APR: 12%/);await plan(page,'snowball','3 mo','$3.05','$96.95');
  const large=fixture();large.monthlyIncome=1e21;large.debts[0].balance=1e23;large.debts[0].name='Large original household liability';await importBook(page,origin,large);const proof=await readable(page);await edit(page,'Shared simulator monthly income','1000000000000000000000');assert.deepEqual(JSON.parse(await stored(page)).data,large);await unchangedLegacy(page);
  return {decimal200:true,noopPrecision:true,promoTransition:true,metadataPreserved:true,largeValues:true,geometry:proof};
}
async function storageFailures(page,origin){
  await open(page,origin);const before=await stored(page);await page.evaluate(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('Synthetic quota failure','QuotaExceededError');return set.call(this,name,value);};},key);
  await edit(page,'Shared simulator monthly income','150');await page.getByTestId('portfolio-simulator-storage-error').waitFor();assert.equal(await stored(page),before);assert.equal(await page.getByTestId('portfolio-simulator').count(),0);await unchangedLegacy(page);
  await page.getByRole('button',{name:'Reload saved portfolio and discard unsaved edits',exact:true}).click();await page.getByTestId('portfolio-simulator').waitFor();assert.equal(await stored(page),before);assert.equal(await page.getByTestId('portfolio-simulator-cash-flow').innerText(),'$100.00');
  await page.evaluate(key=>localStorage.setItem(key,'{corrupt canonical'),key);await page.reload({waitUntil:'networkidle'});await page.getByTestId('portfolio-simulator-storage-error').waitFor();assert.equal(await stored(page),'{corrupt canonical');assert.equal(await page.getByTestId('portfolio-simulator').count(),0);await unchangedLegacy(page);
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Synthetic storage unavailable','SecurityError');}}));await page.reload({waitUntil:'networkidle'});await page.getByTestId('portfolio-simulator-storage-error').waitFor();assert.match(await page.getByTestId('portfolio-simulator-storage-error').innerText(),/storage is unavailable/);assert.equal(await page.getByTestId('portfolio-simulator').count(),0);
  return {failedWritePaused:true,reloadRestoredPhysicalData:true,malformedPaused:true,deniedPaused:true,noDemoFallback:true};
}
const capacityWarning='The modeled LOC balance exceeds the entered limit. Review cash flow, planned draws and lender terms before relying on a payoff date.';
async function projectedCapacity(page,origin){
  const book=fixture();book.monthlyIncome=2000;book.monthlyExpenses=500;book.chunkAmount=0;book.loc={limit:100000,balance:99990,apr:.12};book.debts[0].balance=10000;book.debts[0].minPaymentRule.amount=1000;
  await importBook(page,origin,book);await plan(page,'velocity','Review inputs');
  assert.ok((await page.getByTestId('simulator-plan-velocity').innerText()).includes(capacityWarning));
  const month=page.getByLabel('Comparison month',{exact:true});await month.fill('1');await month.press('Tab');assert.equal(await page.getByTestId('common-month-net-velocity').innerText(),'Not available');
  const proof=await readable(page);await page.getByRole('link',{name:'Edit portfolio',exact:true}).click();
  async function rejected(){assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(),/Review inputs/);const path=await page.getByTestId('portfolio-payoff-path-visual').innerText();assert.match(path,/Review inputs/);assert.match(path,/Timeline unavailable/);assert.doesNotMatch(path,/100%|Projected path/);assert.equal(await page.getByTestId('portfolio-payoff-path-node').count(),1);assert.equal(await page.getByTestId('portfolio-payoff-a').count(),0);assert.match(await page.getByTestId('portfolio-cash-at-payoff').innerText(),/Not projected/);}
  await rejected();await page.getByRole('link',{name:'Open dashboard',exact:true}).click();await page.getByTestId('shared-portfolio-dashboard').waitFor();
  assert.equal(await page.getByTestId('shared-value-eta').innerText(),'Review inputs');assert.equal(await page.getByTestId('shared-value-next-move').innerText(),'Review LOC capacity');
  await page.getByRole('link',{name:'Edit portfolio',exact:true}).click();await edit(page,'Portfolio line of credit APR','0');book.loc.apr=0;
  assert.equal(await page.getByTestId('portfolio-payoff-a').count(),1,'zero-APR high utilization remains an accepted positive control');await history(page,'Updated','Projection restored');
  await edit(page,'Portfolio line of credit APR','12');book.loc.apr=.12;await rejected();await history(page,'Updated','Needs review');
  assert.deepEqual(JSON.parse(await stored(page)).data,book);await page.reload({waitUntil:'networkidle'});await rejected();assert.deepEqual(JSON.parse(await stored(page)).data,book);await unchangedLegacy(page);
  await page.getByRole('link',{name:'Compare strategies',exact:true}).click();await page.getByTestId('portfolio-simulator').waitFor();await plan(page,'velocity','Review inputs');
  return {laterCapacityRejected:true,invalidMonthNotComparable:true,noPayoffOrderOrCash:true,capacityNextMove:true,healthyRestoresAndAdverseWithdraws:true,reloadPreservesInputs:true,legacyBytesPreserved:true,geometry:proof};
}
async function legacyCapacity(page,origin){
  const canonical=encode(fixture());await page.goto(origin+'/simulator',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'What-If Simulator',exact:true}).waitFor();
  for(const [label,value]of [['Simulator monthly income','2000'],['Simulator monthly expenses','500'],['Car balance','10000'],['Car APR','0'],['Car monthly payment','1000'],['Simulator line of credit limit','100000'],['Simulator line of credit balance','99990'],['Simulator line of credit APR','12'],['Simulator extra payment chunk','0']])await edit(page,label,value);
  const card=page.getByTestId('strategy-projection-velocity');assert.match(await card.innerText(),/Review inputs/);assert.match(await card.innerText(),/Projected LOC limit exceeded/);assert.match(await card.innerText(),/Not projected/);assert.doesNotMatch(await card.innerText(),/127 mo|Fastest|months faster/);
  await page.getByTestId('simulator-strategy-comparison').scrollIntoViewIfNeeded();
  const bounds=await card.evaluate(element=>{const b=element.getBoundingClientRect(),s=[...element.querySelectorAll('p,span')].map(node=>{const box=node.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(node);return{text:node.textContent,contained:[...range.getClientRects()].every(r=>r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1),fits:node.scrollWidth<=node.clientWidth+1,font:parseFloat(getComputedStyle(node).fontSize),box:{width:box.width,height:box.height}};});return{overflow:document.documentElement.scrollWidth>innerWidth+1,text:s};});
  assert.equal(bounds.overflow,false);assert.ok(bounds.text.every(t=>t.contained&&t.fits&&t.font>=12),'legacy capacity label must fit: '+JSON.stringify(bounds));
  await edit(page,'Simulator line of credit APR','0');assert.doesNotMatch(await card.innerText(),/Review inputs|Projected LOC limit exceeded/);assert.match(await card.innerText(),/\d+ mo/);
  await edit(page,'Simulator line of credit APR','12');assert.match(await card.innerText(),/Projected LOC limit exceeded/);await page.reload({waitUntil:'networkidle'});assert.match(await card.innerText(),/Projected LOC limit exceeded/);
  const saved=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),legacyKey)).state;assert.equal(saved.monthlyIncome,2000);assert.equal(saved.monthlyExpenses,500);assert.deepEqual(saved.loc,{limit:100000,balance:99990,interestRate:.12});assert.equal(saved.chunkAmount,0);assert.equal(saved.debts.car.balance,10000);assert.equal(saved.debts.car.minimumPayment,1000);assert.equal(saved.debts.car.interestRate,0);
  assert.equal(await stored(page),canonical);assert.equal(await page.evaluate(k=>localStorage.getItem(k),oldKey),oldPortfolio);
  await page.goto(origin+'/',{waitUntil:'networkidle'});const nextMove=page.locator('[data-testid="dashboard-mobile-vital-next-move"]:visible,[data-testid="dashboard-vital-next-move"]:visible');await nextMove.getByText('Review LOC capacity',{exact:true}).waitFor();assert.ok((await page.locator('main').innerText()).includes(capacityWarning));assert.equal(await stored(page),canonical);assert.equal(await page.evaluate(k=>localStorage.getItem(k),oldKey),oldPortfolio);
  return{legacyCapacityLabel:true,noFalsePayoffOrSavings:true,healthyRestoresAndAdverseWithdraws:true,reloadPreservesInputs:true,dashboardCapacityNextMove:true,canonicalAndOlderBytesPreserved:true,geometry:bounds};
}
async function runPortfolioSimulator({browser,origin,output=path.join(root,'test-results/portfolio-simulator')}){
  fs.mkdirSync(output,{recursive:true});const receipts=[],resources={contextsOpened:0,contextsClosed:0},runId=randomUUID(),startedAt=new Date().toISOString();
  const workflows={'shared-edits':sharedEdits,'source-isolation':sourceIsolation,'adverse-policies':adverse,'residuals':residuals,'precision':precision,'storage-failures':storageFailures,'projected-capacity':projectedCapacity,'legacy-capacity':legacyCapacity};
  for(const width of [280,375,1440])for(const [name,workflow]of Object.entries(workflows)){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});resources.contextsOpened++;
    await context.addInitScript(({key,legacyKey,oldKey,document,legacy,oldPortfolio})=>{if(localStorage.getItem('portfolio-simulator-seeded'))return;localStorage.setItem(key,document);localStorage.setItem(legacyKey,legacy);localStorage.setItem(oldKey,oldPortfolio);localStorage.setItem('portfolio-simulator-seeded','yes');},{key,legacyKey,oldKey,document:encode(fixture()),legacy,oldPortfolio});
    const page=await context.newPage(),errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());if(e.type()==='warning')warnings.push(e.text());});
    try{const details=await workflow(page,origin,output,width);assert.deepEqual(errors,[]);assert.ok(warnings.every(w=>/^\[\.WebGL-[^\]]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels/.test(w)||name==='storage-failures'&&w==="[zustand persist middleware] Unable to update item 'interestshield-preferences-v1', the given storage is currently unavailable."),'unexpected browser warning');await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true});receipts.push({name,width,passed:true,details,errors,warnings});console.log(`PASS Portfolio Simulator ${name} ${width}px`);}
    catch(error){receipts.push({name,width,passed:false,message:error.message,errors,warnings});await page.screenshot({path:path.join(output,`${name}-${width}-failure.png`),fullPage:true}).catch(()=>{});console.error(error.stack);}
    finally{await context.close();resources.contextsClosed++;}
  }
  const screenshots=receipts.map(r=>`${r.name}-${r.width}${r.passed?'':'-failure'}.png`).filter(file=>fs.existsSync(path.join(output,file)));
  const evidence=screenshots.map(file=>{const bytes=fs.readFileSync(path.join(output,file));return{file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({runId,startedAt,completedAt:new Date().toISOString(),origin,scope:'Eight workflows at three widths; financial/scenario text excludes existing asset attribution; synthetic records only',receipts,resources,screenshots:evidence},null,2)+'\n');
  // Retain the existing CI upload identity and path while including the new proof.
  if(output===path.join(root,'test-results/portfolio-simulator')){const upload=path.join(root,'test-results/comparison/portfolio-simulator');fs.mkdirSync(upload,{recursive:true});for(const file of ['verification.json',...screenshots])fs.copyFileSync(path.join(output,file),path.join(upload,file));}
  assert.equal(receipts.length,24);assert.ok(receipts.every(r=>r.passed),'Portfolio Simulator workflows must all pass');return receipts;
}
module.exports={runPortfolioSimulator};
async function main(){let browser,server;try{server=process.env.PORTFOLIO_SIMULATOR_ORIGIN?null:await startBuiltServer(root);browser=await chromium.launch({executablePath:findBrowserExecutable(),headless:true,args:getHeadlessChromiumArgs()});await runPortfolioSimulator({browser,origin:process.env.PORTFOLIO_SIMULATOR_ORIGIN??server.origin});}finally{await browser?.close();await stopServer(server?.server);}}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
