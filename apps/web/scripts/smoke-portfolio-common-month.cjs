/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const {findBrowserExecutable,getHeadlessChromiumArgs}=require('./browser-harness.cjs');
const {startBuiltServer,stopServer}=require('./built-server-harness.cjs');
const root=path.resolve(__dirname,'..');
const debt=(id,balance,min=10,apr=0)=>({id,name:id,category:'custom',kind:'amortized',balance,apr,minPaymentRule:{type:'fixed',amount:min},paymentSource:'checking'});
const fixture=()=>({monthlyIncome:100,monthlyExpenses:0,extraMonthlyPayment:20,chunkAmount:10,
  loc:{limit:1000,balance:40,apr:0},strategy:'snowball',focusMode:'single',splitRatioPrimary:0.7,debts:[debt('a',120),debt('b',20)]});
const cases=[
  {name:'cash-versus-wealth',book:fixture(),month:'3',expected:{snowball:{cash:'$200.00',debt:'$80.00',loc:'$0.00',net:'$120.00',difference:'$0.00'},velocity:{cash:'$120.00',debt:'$0.00',loc:'$0.00',net:'$120.00',difference:'$0.00'}},edits:true},
  {name:'adverse',book:{...fixture(),strategy:'avalanche',extraMonthlyPayment:0,debts:[debt('a',120,10,0.12)]},month:'2',expected:{velocity:{net:'$37.79',difference:'-$0.80'},avalanche:{net:'$38.59',difference:'$0.00'}}},
  {name:'blocked-reference',book:{...fixture(),strategy:'velocity',loc:{limit:40,balance:40,apr:0}},month:'1',expected:{velocity:{net:'Not available',difference:'Not available'},snowball:{net:'-$80.00',difference:'Not available'}}},
  {name:'failed-attempt',book:{...fixture(),strategy:'velocity',monthlyIncome:20,extraMonthlyPayment:0,chunkAmount:0,loc:{limit:1000,balance:0,apr:0},debts:[{...debt('a',100),promo:{introApr:0,monthsRemaining:1,postIntroApr:2.4}}]},month:'2',expected:{velocity:{net:'Not available'},snowball:{net:'-$76.00'}}},
  {name:'nonzero-tolerance',book:{...fixture(),debts:[debt('a',0.005)],loc:{limit:1,balance:0.005,apr:0}},month:'1',expected:{velocity:{net:'Not available'},snowball:{net:'Not available'}}},
  {name:'cleared',book:{...fixture(),debts:[],loc:{limit:0,balance:0,apr:0}},month:'3',expected:{velocity:{cash:'$300.00',net:'$300.00'},snowball:{net:'$300.00'}}},
  {name:'large-values',book:{...fixture(),monthlyIncome:10000000,extraMonthlyPayment:0,chunkAmount:0,debts:[debt('a',100000000,1000000)],loc:{limit:200000000,balance:100000000,apr:0}},month:'1',expected:{snowball:{net:'-$190,000,000.00'}}},
];
function comparisonGeometry(element){
  return{pageOverflow:document.documentElement.scrollWidth>innerWidth+1,sectionOverflow:element.scrollWidth>element.clientWidth+1,
    metrics:Array.from(element.querySelectorAll('[data-testid^="common-month-cash-"],[data-testid^="common-month-debt-"],[data-testid^="common-month-loc-"],[data-testid^="common-month-net-"],[data-testid^="common-month-difference-"]')).map(node=>{
      const box=node.getBoundingClientRect(),style=getComputedStyle(node),walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),characters=[];
      let visible=box.width>0&&box.height>0,contained=true,textNode;
      while((textNode=walker.nextNode()))for(let index=0;index<textNode.data.length;index++){
        const character=textNode.data[index];if(/\s/.test(character)){characters.push({character,rect:null});continue;}
        const range=document.createRange();range.setStart(textNode,index);range.setEnd(textNode,index+1);const rect=range.getBoundingClientRect();
        if(rect.width<=0||rect.height<=0)visible=false;
        contained&&=rect.left>=box.left-1&&rect.right<=box.right+1&&rect.top>=box.top-1&&rect.bottom<=box.bottom+1;
        for(let ancestor=textNode.parentElement;ancestor;ancestor=ancestor.parentElement){
          const paint=getComputedStyle(ancestor),bounds=ancestor.getBoundingClientRect();
          if(paint.display==='none'||paint.visibility!=='visible'||Number(paint.opacity)<=0)visible=false;
          if(/hidden|clip/.test(paint.overflowX)&& (rect.left<bounds.left-1||rect.right>bounds.right+1))contained=false;
          if(/hidden|clip/.test(paint.overflowY)&& (rect.top<bounds.top-1||rect.bottom>bounds.bottom+1))contained=false;
        }
        characters.push({character,rect:{top:rect.top,bottom:rect.bottom}});
      }
      const tokens=[];let current=[];const finish=()=>{if(current.length){tokens.push({text:current.map(c=>c.character).join(''),oneLine:current.every(c=>Math.abs(c.rect.top-current[0].rect.top)<=1&&Math.abs(c.rect.bottom-current[0].rect.bottom)<=1)});current=[];}};
      for(const character of characters){if(character.rect)current.push(character);else finish();}finish();
      return{text:node.textContent,width:box.width,fontSize:parseFloat(style.fontSize),fits:node.scrollWidth<=node.clientWidth+1,visible,contained,tokens};
    })};
}
function assertGeometry(geometry){
  assert.equal(geometry.pageOverflow,false);assert.equal(geometry.sectionOverflow,false);assert.equal(geometry.metrics.length,15);
  assert.ok(geometry.metrics.every(metric=>metric.visible&&metric.fits&&metric.contained&&metric.fontSize>=12&&metric.text.trim()&&metric.tokens.length&&metric.tokens.every(token=>token.oneLine)));
}
async function runCommonMonthFixtures({browser,origin,output,native=false,widths=[1440,375,280]}){
  fs.mkdirSync(output,{recursive:true});const receipts=[];
  for(const width of widths)for(const entry of cases){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    try{
      await context.addInitScript(({book,native})=>{
        if(localStorage.getItem('common-month-seeded'))return;
        const document=JSON.stringify({version:2,aprUnit:'decimal',data:book});
        if(native){localStorage.setItem('interestshield.mobile.portfolio.v1',JSON.stringify({version:1,ownerId:null,revision:11,savedAt:'2026-10-21T00:00:00Z',document}));}
        else{localStorage.setItem('interestshield-portfolio-v2',document);localStorage.setItem('interestshield-portfolio-v1',' \n'+JSON.stringify({version:1,state:book},null,3));}
        localStorage.setItem('velocity-bank-storage',JSON.stringify({state:{monthlyIncome:8111,monthlyExpenses:4222,chunkFrequency:'weekly'},version:0}));
        localStorage.setItem('common-month-seeded','yes');
      },{book:entry.book,native});
      const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',entry=>{if(entry.type()==='error')errors.push(entry.text());});
      const response=await page.goto(origin+'/portfolio',{waitUntil:'networkidle'});assert.equal(response.status(),200);
      await page.getByTestId(native?'native-portfolio-book':'portfolio-liability-scope').waitFor({state:'visible'});
      const section=page.getByTestId('common-month-comparison');assert.equal(await section.count(),1,'same-month comparison surface must exist');
      const storage=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(key=>key!=='common-month-seeded').sort().map(key=>[key,localStorage.getItem(key)])));
      const before=await storage(),input=page.getByLabel('Comparison month',{exact:true});
      await input.fill(entry.month);await input.press('Tab');
      await page.getByTestId('common-month-period').filter({hasText:'Month '+entry.month}).waitFor({state:'visible'});
      for(const [policy,expected]of Object.entries(entry.expected))for(const [field,text]of Object.entries(expected))assert.equal(await page.getByTestId(`common-month-${field}-${policy}`).innerText(),text,entry.name+' '+field+' '+policy);
      if(entry.edits){
        for(const [month,net]of [['0','-$180.00'],['6','$420.00'],['600','$59,820.00']]){
          await input.fill(month);await input.press('Tab');await page.getByTestId('common-month-period').filter({hasText:'Month '+month}).waitFor({state:'visible'});
          assert.equal(await page.getByTestId('common-month-net-velocity').innerText(),net);assert.equal(await page.getByTestId('common-month-net-snowball').innerText(),net);
        }
        for(const invalid of ['1.9','601','']){await input.fill(invalid);await input.press('Tab');assert.equal(await input.inputValue(),invalid);await page.getByTestId('common-month-error').waitFor({state:'visible'});assert.equal(await page.getByTestId('common-month-net-snowball').innerText(),'Not available');}
        await input.fill('3');await input.press('Tab');assert.equal(await page.getByTestId('common-month-net-snowball').innerText(),'$120.00');
      }
      assert.deepEqual(await storage(),before,'comparison-only horizon edits must not write any stored record');
      await section.scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>{let element=document.querySelector('[data-testid="common-month-comparison"]');while(element){if(Number(getComputedStyle(element).opacity)<0.99)return false;element=element.parentElement;}return true;});
      const geometry=await section.evaluate(comparisonGeometry);assertGeometry(geometry);assert.deepEqual(errors,[]);const oracleControls=[];
      if(entry.edits&&width===375){
        const original=await section.getAttribute('style');
        try{await section.evaluate(element=>{element.style.opacity='0';});const hidden=await section.evaluate(comparisonGeometry);assert.throws(()=>assertGeometry(hidden),'an ancestor-hidden comparison must be rejected');}
        finally{await section.evaluate((element,style)=>{if(style===null)element.removeAttribute('style');else element.setAttribute('style',style);},original);}
        assert.deepEqual(await section.evaluate(comparisonGeometry),geometry);oracleControls.push({kind:'ancestor-opacity',rejected:true,restored:true});
        const value=page.getByTestId('common-month-net-velocity'),snapshot=await value.evaluateHandle(element=>{const node=document.createTreeWalker(element,NodeFilter.SHOW_TEXT).nextNode();return{node,data:node.data,style:element.getAttribute('style')};});
        try{for(const kind of ['value-opacity','value-clip','empty-value']){
          try{
            if(kind==='empty-value')await snapshot.evaluate(state=>{state.node.data='';});
            else await value.evaluate((element,kind)=>{if(kind==='value-opacity')element.style.opacity='0';else{element.style.maxWidth='1px';element.style.overflow='hidden';element.style.whiteSpace='nowrap';}},kind);
            const broken=await section.evaluate(comparisonGeometry);assert.throws(()=>assertGeometry(broken),kind+' must be rejected');
          }finally{await value.evaluate((element,state)=>{state.node.data=state.data;if(state.style===null)element.removeAttribute('style');else element.setAttribute('style',state.style);},snapshot);}
          const originalNode=await value.evaluate((element,state)=>document.createTreeWalker(element,NodeFilter.SHOW_TEXT).nextNode()===state.node,snapshot);assert.ok(originalNode);assert.deepEqual(await section.evaluate(comparisonGeometry),geometry);oracleControls.push({kind,rejected:true,restored:true,originalNode});
        }}finally{await snapshot.dispose();}
      }
      await section.evaluate(element=>{element.scrollIntoView({block:'start'});for(let parent=element.parentElement;parent;parent=parent.parentElement){const style=getComputedStyle(parent);if(/auto|scroll/.test(style.overflowY)&&parent.scrollHeight>parent.clientHeight&&parent.scrollTop>0){parent.scrollTop=Math.max(0,parent.scrollTop-80);return;}}window.scrollBy(0,-80);});
      await page.screenshot({path:path.join(output,`${native?'native':'web'}-${entry.name}-${width}.png`)});
      receipts.push({name:entry.name,width,native,expected:entry.expected,geometry,oracleControls,storagePreserved:true,errors});console.log(`PASS ${native?'native':'web'} common month ${entry.name} ${width}px`);
    }finally{await context.close();}
  }
  fs.writeFileSync(path.join(output,native?'native-common-month-verification.json':'verification.json'),JSON.stringify({origin,receipts},null,2)+'\n');return receipts;
}
async function main(){let browser,server;try{server=process.env.COMMON_MONTH_SMOKE_ORIGIN?null:await startBuiltServer(root);const origin=process.env.COMMON_MONTH_SMOKE_ORIGIN??server.origin;browser=await chromium.launch({executablePath:findBrowserExecutable(),headless:true,args:getHeadlessChromiumArgs()});await runCommonMonthFixtures({browser,origin,output:path.join(root,'test-results/portfolio-common-month')});}finally{await browser?.close();await stopServer(server?.server);}}
module.exports={runCommonMonthFixtures};if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
