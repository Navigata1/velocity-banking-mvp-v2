import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {validateDeployment,verifyHostedInvocation,publishFiles,recoverPublication,digest} from './shipping-guards.mjs';
import * as guards from './shipping-guards.mjs';
const cache=path.dirname(fileURLToPath(import.meta.url)),deployment=JSON.parse(await fs.readFile(path.join(cache,'../../2026-10-21-mobile-vitals/deployment-final.json'),'utf8'));
let checks=0;const pass=name=>{checks++;console.log('PASS '+name);};
validateDeployment(deployment,deployment.headSha,deployment.preview);pass('actual authenticated deployment positive');
for(const [name,change]of [
  ['raw head',d=>d.metadata.meta.githubCommitSha='0'.repeat(40)],['raw project',d=>d.metadata.project.id='wrong'],['raw url',d=>d.metadata.url='wrong.example'],
  ['raw state',d=>d.metadata.state='ERROR'],['raw ready state',d=>d.metadata.readyState='ERROR'],['raw target',d=>d.metadata.target='production'],
  ['raw id',d=>d.metadata.id='wrong'],['summary team',d=>d.teamId='wrong'],['authenticated team',d=>d.authenticatedTeam.id='wrong'],['team slug',d=>d.authenticatedTeam.slug='wrong'],
  ['query team',d=>d.request.teamId='wrong'],['repository',d=>d.metadata.meta.githubOrg='wrong'],['branch',d=>d.metadata.meta.githubCommitRef='main'],['missing raw',d=>delete d.metadata]
]){const copy=structuredClone(deployment);change(copy);assert.throws(()=>validateDeployment(copy,deployment.headSha,deployment.preview));pass('reject '+name);}
const fixture=await fs.mkdtemp(path.join(cache,'shipping-test-')),stage=path.join(fixture,'stage'),publicRoot=path.join(fixture,'public'),journal=path.join(fixture,'recovery/journal.json');
await fs.mkdir(stage);await fs.mkdir(publicRoot);
const entries=[];
for(const [index,old]of ['old-report','old-readme',null].entries()){
  const staged=path.join(stage,String(index)),target=path.join(publicRoot,String(index));await fs.writeFile(staged,'new-'+index);if(old!==null)await fs.writeFile(target,old);entries.push({staged,target});
}
const original=async()=>{assert.equal(await fs.readFile(entries[0].target,'utf8'),'old-report');assert.equal(await fs.readFile(entries[1].target,'utf8'),'old-readme');await assert.rejects(fs.access(entries[2].target),/ENOENT/);};
await assert.rejects(publishFiles([...entries,{staged:path.join(stage,'missing'),target:path.join(publicRoot,'missing')}],journal,[publicRoot]),/ENOENT/);await original();pass('late missing stage leaves every public target untouched');
await assert.rejects(publishFiles(entries,journal,[publicRoot],async index=>{if(index===2)throw Error('injected after final target write');}),/injected/);await original();assert.equal(JSON.parse(await fs.readFile(journal,'utf8')).state,'rolled-back');pass('late publication fault rolls back report/readme/new file');
assert.ok((await fs.readdir(path.dirname(journal))).some(file=>file.startsWith('recovered-new-')));pass('new artifact retained recoverably rather than deleted');
await publishFiles(entries,journal,[publicRoot]);for(const [index,entry]of entries.entries())assert.equal(await fs.readFile(entry.target,'utf8'),'new-'+index);pass('retry after rollback succeeds');
await publishFiles(entries,journal,[publicRoot],()=>{throw Error('must not write committed checkpoint twice');});pass('committed publication idempotent');
await fs.writeFile(entries[0].target,'user changed report');await assert.rejects(recoverPublication(journal,[publicRoot]));assert.equal(await fs.readFile(entries[0].target,'utf8'),'user changed report');pass('committed drift rejected without overwriting user edit');
await assert.rejects(publishFiles([{staged:entries[0].staged,target:path.join(fixture,'outside')}],path.join(fixture,'other/journal.json'),[publicRoot]),/outside publication scope/);await assert.rejects(fs.access(path.join(fixture,'outside')),/ENOENT/);pass('out-of-scope target rejected before publication');
const interrupted=path.join(fixture,'interrupted'),backup=path.join(interrupted,'backup'),target=path.join(publicRoot,'interrupted');await fs.mkdir(interrupted);await fs.writeFile(backup,'prior');await fs.writeFile(target,'after');
const fp=value=>({bytes:Buffer.byteLength(value),sha256:digest(value)}),interruptedJournal=path.join(interrupted,'journal.json');
await fs.writeFile(interruptedJournal,JSON.stringify({id:'mock-interruption',state:'prepared',files:[{target,backup,before:fp('prior'),after:fp('after')}]}));
await recoverPublication(interruptedJournal,[publicRoot]);assert.equal(await fs.readFile(target,'utf8'),'prior');pass('prepared journal recovery restores a simulated interrupted write');
const faultRoot=path.join(fixture,'journal-fault'),faultJournal=path.join(fixture,'journal-fault-recovery/journal.json');await fs.mkdir(faultRoot);
const faultEntries=entries.slice(0,2).map((entry,index)=>({...entry,target:path.join(faultRoot,String(index))}));for(const [index,entry]of faultEntries.entries())await fs.writeFile(entry.target,'prior-'+index);
const originalWrite=fs.writeFile;let faultInjected=false;
try{
  fs.writeFile=async(file,data,...options)=>{if(String(file).startsWith(faultJournal+'.next-')&&String(data).includes('"state": "committed"')){faultInjected=true;await originalWrite(file,'partial');throw Error('simulated partial journal write');}return originalWrite(file,data,...options);};
  await assert.rejects(publishFiles(faultEntries,faultJournal,[faultRoot]),/simulated partial journal write/);
}finally{fs.writeFile=originalWrite;}
assert.ok(faultInjected);for(const [index,entry]of faultEntries.entries())assert.equal(await fs.readFile(entry.target,'utf8'),'prior-'+index);assert.equal(JSON.parse(await fs.readFile(faultJournal,'utf8')).state,'rolled-back');pass('partial commit-journal write preserves valid recovery and rolls back files');
await publishFiles(faultEntries,faultJournal,[faultRoot]);pass('retry succeeds after partial journal write');
const absent=path.join(fixture,'no-hosted-envelope');await fs.mkdir(absent);await assert.rejects(verifyHostedInvocation(absent,deployment),/ENOENT/);pass('originless predecessor receipts alone cannot satisfy invocation gate');
console.log(JSON.stringify({checks,scope:'Local metadata and filesystem fault probes; not a production or power-loss certification',fixture}));

// These counterexamples catch missing common-month validation without running a browser.
assert.equal(typeof guards.validateCommonMonth,'function','common-month receipt guard required');
const geometry={pageOverflow:false,sectionOverflow:false,metrics:Array.from({length:15},()=>({text:'$120.00',fontSize:12,fits:true,visible:true,contained:true,tokens:[{oneLine:true}]}))};
const common={origin:deployment.preview,receipts:[1440,375,280].flatMap(width=>['cash-versus-wealth','adverse','blocked-reference','failed-attempt','nonzero-tolerance','cleared','large-values'].map(name=>({name,width,native:false,geometry:structuredClone(geometry),storagePreserved:true,errors:[],oracleControls:width===375&&name==='cash-versus-wealth'?['ancestor-opacity','value-opacity','value-clip','empty-value'].map(kind=>({kind,rejected:true,restored:true,...(kind==='ancestor-opacity'?{}:{originalNode:true})})):[]})))};
common.receipts.at(-1).widerFontProbe={fontFamily:'Verdana',passed:true,minFontSize:12};
guards.validateCommonMonth(common,deployment.preview);pass('21 distinct same-month fixtures with four restored actual DOM controls');
for(const [name,change]of [
  ['stale origin',d=>d.origin='http://localhost'],['missing narrow width',d=>d.receipts=d.receipts.filter(r=>r.width!==280)],
  ['duplicate case',d=>d.receipts[0]=structuredClone(d.receipts[1])],['native output on web',d=>d.receipts[0].native=true],
  ['hidden value',d=>d.receipts[0].geometry.metrics[0].visible=false],['clipped value',d=>d.receipts[0].geometry.metrics[0].contained=false],
  ['wrapped token',d=>d.receipts[0].geometry.metrics[0].tokens[0].oneLine=false],['storage write',d=>d.receipts[0].storagePreserved=false],
  ['missing DOM control',d=>d.receipts[7].oracleControls.pop()],['no node restoration',d=>d.receipts[7].oracleControls[1].originalNode=false],
  ['unrestored control',d=>d.receipts[7].oracleControls[0].restored=false],['page error',d=>d.receipts[0].errors.push('error')],
  ['missing wider-font probe',d=>delete d.receipts.at(-1).widerFontProbe],['failed wider-font probe',d=>d.receipts.at(-1).widerFontProbe.passed=false],
  ['shrunk wider-font probe',d=>d.receipts.at(-1).widerFontProbe.minFontSize=11]
]){const copy=structuredClone(common);change(copy);assert.throws(()=>guards.validateCommonMonth(copy,deployment.preview));pass('reject common-month '+name);}
assert.equal(typeof guards.validateCurrencyWidth,'function','permanent currency-width receipt guard required');
const currencyWidths=[280,375,640,690,700,768,1024,1100,1120,1280,1440];
const currency={origin:deployment.preview,receipts:currencyWidths.map(viewportWidth=>({viewportWidth,text:'-$1,000,000,000.00',metricWidth:170,glyphWidth:156.359375,fontSize:14,fontFamilyRequested:'Verdana',fits:true,contained:true,oneLine:true,pageOverflow:false,errors:[]}))};
guards.validateCurrencyWidth(currency,deployment.preview);pass('eleven distinct signed-billion Verdana currency boundaries');
for(const [name,change]of [
  ['missing width',d=>d.receipts=d.receipts.filter(r=>r.viewportWidth!==690)],['duplicate width',d=>d.receipts[0]=structuredClone(d.receipts[1])],
  ['unexpected width',d=>d.receipts[0].viewportWidth=281],['wrong origin',d=>d.origin='http://localhost'],
  ['wrong text',d=>d.receipts[0].text='-$1.00B'],['wrong requested font',d=>d.receipts[0].fontFamilyRequested='Arial'],
  ['failed fit',d=>d.receipts[0].fits=false],['uncontained glyph',d=>d.receipts[0].contained=false],['wrapped text',d=>d.receipts[0].oneLine=false],
  ['shrunk font',d=>d.receipts[0].fontSize=11],['invalid font',d=>d.receipts[0].fontSize=NaN],['overflow',d=>d.receipts[0].pageOverflow=true],
  ['page error',d=>d.receipts[0].errors.push('render failed')],['inconsistent glyph width',d=>d.receipts[0].glyphWidth=180]
]){const copy=structuredClone(currency);change(copy);assert.throws(()=>guards.validateCurrencyWidth(copy,deployment.preview));pass('reject currency-width '+name);}
assert.equal(typeof guards.validateLocalReceipt,'function','local receipt guard required');
const prior=JSON.parse(await fs.readFile(path.join(cache,'../../2026-10-21-mobile-vitals/postflight.json'),'utf8'));
const local={baseline:prior.headSha,priorReceipt:prior.receipt,productionReady:false,allowedSourceChanges:[...guards.modifiedSources,...guards.newSources],sources:{...prior.local.sources,...Object.fromEntries(guards.newSources.map(file=>[file,'a'.repeat(64)]))},
  models:prior.local.models,posters:prior.local.posters,videos:prior.local.videos,
  web:{regressions:348,dashboardCases:18,hostedCasesRequired:120},media:{contracts:145,freshStills:27},native:{browserExecutions:70,commonMonthCases:21},
  commonMonth:{coreContracts:31,webCases:21,nativeCases:21,currencyWidthCases:11,oracleControls:4,widths:[1440,375,280],reference:{passed:123,failed:0,adjudicated:true,logFile:'reference.log',reportFile:'adjudication.md'}},files:{'reference.log':{bytes:1,sha256:'a'.repeat(64)},'adjudication.md':{bytes:1,sha256:'b'.repeat(64)}}};
guards.validateLocalReceipt(local,prior);pass('explicit adjudicated local reference count accepted without a baked-in final count');
for(const [name,change]of [['missing reference',d=>delete d.commonMonth.reference],['failed reference',d=>d.commonMonth.reference.failed=5],['not adjudicated',d=>d.commonMonth.reference.adjudicated=false],['missing reference file',d=>delete d.files['reference.log']],['missing adjudication report',d=>delete d.files['adjudication.md']],['old hosted count',d=>d.web.hostedCasesRequired=88],['old native count',d=>d.native.browserExecutions=49],['missing new pin',d=>delete d.sources[guards.newSources[0]]],['extra modified native',d=>d.allowedSourceChanges.push('apps/mobile/app/index.tsx')],['old109 hosted count',d=>d.web.hostedCasesRequired=109],['missing currency count',d=>delete d.commonMonth.currencyWidthCases],['wrong currency count',d=>d.commonMonth.currencyWidthCases=10],['missing currency pin',d=>delete d.sources['apps/web/scripts/smoke-portfolio-currency-width.cjs']]]){
  const copy=structuredClone(local);change(copy);assert.throws(()=>guards.validateLocalReceipt(copy,prior));pass('reject local '+name);
}
assert.equal(typeof guards.validateReferenceLog,'function');
const referenceSummary={seed:20261021,passed:123,failed:0,testSourceHash:'a'.repeat(64),sourceHashes:{'common-month':'b'.repeat(64)}};
guards.validateReferenceLog('group: 123 passed, 0 failed\n'+JSON.stringify(referenceSummary),local.commonMonth.reference,{testSourceHash:'a'.repeat(64),sourceHashes:{'common-month':'b'.repeat(64)}});pass('reference summary must match configured count and actual source bytes');
for(const change of [s=>s.failed=5,s=>s.passed=122,s=>s.testSourceHash='c'.repeat(64),s=>s.sourceHashes['common-month']='c'.repeat(64)]){const copy=structuredClone(referenceSummary);change(copy);assert.throws(()=>guards.validateReferenceLog(JSON.stringify(copy),local.commonMonth.reference,{testSourceHash:'a'.repeat(64),sourceHashes:{'common-month':'b'.repeat(64)}}));pass('reject unadjudicated/stale reference summary');}
assert.equal(typeof guards.validateCiLogs,'function');
const currencyMarkers=currencyWidths.map(width=>'PASS max-standard-currency boundary '+width+'px');
const heroVisibilityMarker='PASS hero visibility controls: blank, undersized and clipped frames rejected';
const heroCadenceMarker='PASS hero cadence controls: primer 16ms and 15x100ms samples';
const ciLog=[...guards.ciMarkers.filter(marker=>![heroVisibilityMarker,heroCadenceMarker].includes(marker)),heroVisibilityMarker,heroCadenceMarker,'31 common-month contracts passed.','# tests 145','Rendered 27 Remotion matrix stills.',...Array(35).fill('PASS phone-fixture'),...Array(12).fill('PASS native portfolio fixture'),...Array(2).fill('PASS native financial inputs fixture'),...Array(21).fill('PASS native common month fixture'),...Array(21).fill('PASS web common month fixture'),...currencyMarkers,JSON.stringify(referenceSummary)].join('\n');
guards.validateCiLogs(ciLog,'Tests=63\nTests=63',local.commonMonth,{testSourceHash:'a'.repeat(64),sourceHashes:{'common-month':'b'.repeat(64)}});pass('both full CI event log validators require 70 native executions and adjudicated reference');
assert.throws(()=>guards.validateCiLogs(ciLog.replace(heroVisibilityMarker,''),'Tests=63\nTests=63',local.commonMonth,{testSourceHash:'a'.repeat(64),sourceHashes:{'common-month':'b'.repeat(64)}}));pass('reject CI missing actual hero blank/undersized/clipped visibility-control marker');
assert.throws(()=>guards.validateCiLogs(ciLog.replace(heroCadenceMarker,''),'Tests=63\nTests=63',local.commonMonth,{testSourceHash:'a'.repeat(64),sourceHashes:{'common-month':'b'.repeat(64)}}));pass('reject CI missing actual hero 16ms primer and15x100ms cadence-control marker');
for(const [name,web,sql]of [['old native',ciLog.replaceAll('PASS native common month fixture','not executed'),'Tests=63\nTests=63'],['missing regression',ciLog.replace('348 regression tests passed.',''),'Tests=63\nTests=63'],['SQL only once',ciLog,'Tests=63'],['obsolete core count',ciLog.replace('31 common-month','30 common-month'),'Tests=63\nTests=63']]){assert.throws(()=>guards.validateCiLogs(web,sql,local.commonMonth,{testSourceHash:'a'.repeat(64),sourceHashes:{'common-month':'b'.repeat(64)}}));pass('reject CI '+name);}
for(const marker of currencyMarkers){assert.throws(()=>guards.validateCiLogs(ciLog.replace(marker,'missing boundary'),'Tests=63\nTests=63',local.commonMonth,{testSourceHash:'a'.repeat(64),sourceHashes:{'common-month':'b'.repeat(64)}}));pass('reject CI missing actual '+marker);}
for(const [name,log]of [['duplicate currency boundary',ciLog.replace(currencyMarkers[0],currencyMarkers[1])],['currency summary instead of executions',ciLog.replace(currencyMarkers.join('\n'),'11 currency-width cases passed.')],['wrong currency width',ciLog.replace(currencyMarkers[0],'PASS max-standard-currency boundary 281px')]]){assert.throws(()=>guards.validateCiLogs(log,'Tests=63\nTests=63',local.commonMonth,{testSourceHash:'a'.repeat(64),sourceHashes:{'common-month':'b'.repeat(64)}}));pass('reject CI '+name);}
console.log(JSON.stringify({checks,scope:'Bounded synthetic metadata/filesystem tests only; no hosted/CI/publication proof',fixture}));

assert.equal(typeof guards.validateBrowserProof,'function','head-bound actual UI proof guard required');
const uiRun={id:'bound-invocation',headSha:'a'.repeat(40),origin:deployment.preview,startedAt:'2026-10-21T10:00:00Z',suites:{commonMonth:{runId:'bound-invocation',artifacts:{'apps/web/test-results/portfolio-common-month/verification.json':{sha256:'a'.repeat(64)}}}}};
const ui={headSha:uiRun.headSha,invocationId:uiRun.id,capturedAt:'2026-10-21T10:01:00Z',
  house:{url:uiRun.origin+'/',domain:'house',vitalsCount:4,logs:[],interactionVerified:true,before:{cashFlow:'$3,500',interest:'Est. $51.50/day'},after:{cashFlow:'$3,600',interest:'Est. $51.50/day'},restored:{cashFlow:'$3,500',interest:'Est. $51.50/day'}},
  commonMonth:{url:uiRun.origin+'/portfolio',fixture:'cash-versus-wealth',width:375,logs:[],interactionVerified:true,storageProof:{source:'invocation-bound-browser-fixtures',runId:uiRun.id,suite:'commonMonth',storagePreserved:true},
    observations:[{month:0,snowball:{cash:'$0.00',debt:'$140.00',loc:'$40.00',net:'-$180.00'},velocity:{cash:'$0.00',debt:'$140.00',loc:'$40.00',net:'-$180.00'}},
      {month:3,snowball:{cash:'$200.00',debt:'$80.00',loc:'$0.00',net:'$120.00'},velocity:{cash:'$120.00',debt:'$0.00',loc:'$0.00',net:'$120.00'}},
      {month:6,snowball:{cash:'$420.00',debt:'$0.00',loc:'$0.00',net:'$420.00'},velocity:{cash:'$420.00',debt:'$0.00',loc:'$0.00',net:'$420.00'}},
      {month:600,snowball:{cash:'$59,820.00',debt:'$0.00',loc:'$0.00',net:'$59,820.00'},velocity:{cash:'$59,820.00',debt:'$0.00',loc:'$0.00',net:'$59,820.00'}}]}};
ui.commonMonth.restored=structuredClone(ui.commonMonth.observations[1]);guards.validateBrowserProof(ui,uiRun);pass('current-head UI horizon proof references fixture-owned storage evidence');
for(const [name,change]of [['old head',d=>d.headSha=deployment.headSha],['old capture',d=>d.capturedAt='2026-10-20T00:00:00Z'],['wrong invocation',d=>d.invocationId='old'],['missing long horizon',d=>d.commonMonth.observations.pop()],['cash mistaken for wealth',d=>d.commonMonth.observations[1].velocity.net='$200.00'],['storage proof wrong run',d=>d.commonMonth.storageProof.runId='old'],['storage proof false attribution',d=>d.commonMonth.storageProof.source='IAB-localStorage'],['not restored',d=>d.commonMonth.restored.month=600]]){const copy=structuredClone(ui);change(copy);assert.throws(()=>guards.validateBrowserProof(copy,uiRun));pass('reject manual '+name);}
console.log(JSON.stringify({checks,scope:'Bounded helper tests; no hosted calls or Desktop writes',fixture}));

const isolatedRoot=path.join(fixture,'workspace'),isolatedCache=path.join(isolatedRoot,'release');
const put=async(file,bytes)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);};
await put(path.join(isolatedCache,'deployment-final.json'),JSON.stringify(deployment));await put(path.join(isolatedCache,'run-hosted.cjs'),'test-only runner');await put(path.join(isolatedCache,'shipping-guards.mjs'),'test-only guards');await put(path.join(isolatedRoot,guards.localReceiptPath),'test-only receipt');
const runId='12345678-1234-1234-1234-123456789abc',directory='hosted-runs/'+runId;
const envelope={schemaVersion:2,id:runId,directory,headSha:deployment.headSha,origin:deployment.preview,deploymentId:deployment.id,deploymentSha256:digest(JSON.stringify(deployment)),runnerSha256:digest('test-only runner'),guardsSha256:digest('test-only guards'),localReceiptSha256:digest('test-only receipt'),startedAt:new Date(Date.now()-3000).toISOString(),finishedAt:new Date().toISOString(),status:'completed',exitCode:0,suites:{}};
const record=async(live,captured,bytes)=>{await put(live,bytes);await put(path.join(isolatedCache,captured),bytes);return{live,captured,bytes:Buffer.byteLength(bytes),sha256:digest(bytes)};};
for(const [script,name,artifacts]of guards.hostedConfigs){
  const scriptFile='apps/web/scripts/'+script;await put(path.join(isolatedRoot,scriptFile),'test-only '+script);
  const logText=name==='http'?'Production origin: '+deployment.preview+'\n':name==='routes'?'Rendered smoke origin: '+deployment.preview+'\n':'PASS synthetic fixture\n';
  const suite={runId,origin:deployment.preview,startedAt:new Date(Date.now()-1000).toISOString(),finishedAt:new Date().toISOString(),exitCode:0,script:scriptFile,scriptSha256:digest('test-only '+script),command:{cwd:path.join(isolatedRoot,'apps/web'),args:[path.join(isolatedRoot,scriptFile)],executable:process.execPath},environment:guards.hostedEnvironment(deployment.preview),log:await record(path.join(isolatedCache,'hosted',name+'.log'),directory+'/'+name+'/suite.log',logText),artifacts:{}};
  for(const [index,file]of artifacts.entries()){const key='apps/web/test-results/'+file;suite.artifacts[key]=await record(path.join(isolatedRoot,key),directory+'/'+name+'/'+index+'.artifact','test-only artifact '+key);}
  envelope.suites[name]=suite;
}
envelope.finishedAt=new Date().toISOString();
const saveEnvelope=copy=>put(path.join(isolatedCache,'hosted/run-envelope.json'),JSON.stringify(copy));
const verify=()=>verifyHostedInvocation(isolatedCache,deployment,{root:isolatedRoot,expectedRunId:runId});
assert.deepEqual(Object.keys(envelope.suites),['input','http','routes','dashboard','portfolio','vault','comparison','portability','commonMonth','currencyWidth']);
assert.equal(envelope.suites.currencyWidth.environment.CURRENCY_WIDTH_ORIGIN,deployment.preview);
await saveEnvelope(envelope);await verify();pass('isolated fresh ten-suite envelope including common-month screenshot and currency verification');
for(const [name,change]of [
  ['old eight suites',d=>delete d.suites.commonMonth],['old nine suites',d=>delete d.suites.currencyWidth],['stale receipt',d=>d.localReceiptSha256='0'.repeat(64)],['old guard bytes',d=>d.guardsSha256='0'.repeat(64)],
  ['head',d=>d.headSha='0'.repeat(40)],['origin',d=>d.origin='http://127.0.0.1'],['deployment',d=>d.deploymentId='old'],['runner bytes',d=>d.runnerSha256='0'.repeat(64)],
  ['stale suite id',d=>d.suites.comparison.runId='old'],['wrong script',d=>d.suites.comparison.script='apps/web/scripts/smoke-production.cjs'],
  ['wrong environment',d=>d.suites.commonMonth.environment.COMMON_MONTH_SMOKE_ORIGIN='http://localhost'],['currency wrong origin',d=>d.suites.currencyWidth.environment.CURRENCY_WIDTH_ORIGIN='http://localhost'],['missing currency output',d=>delete d.suites.currencyWidth.artifacts['apps/web/test-results/currency-width/verification.json']],['currency stale invocation',d=>d.suites.currencyWidth.runId='old'],['missing screenshot',d=>delete d.suites.commonMonth.artifacts['apps/web/test-results/portfolio-common-month/web-cash-versus-wealth-375.png']],
  ['failed run',d=>d.status='failed'],['incomplete run',d=>delete d.finishedAt],['path escape',d=>d.suites.commonMonth.log.captured='../escaped'],
  ['tampered output',d=>Object.values(d.suites.comparison.artifacts)[0].sha256='0'.repeat(64)]
]){const copy=structuredClone(envelope);change(copy);await saveEnvelope(copy);await assert.rejects(verify());pass('reject envelope '+name);}
for(const name of ['http','routes']){
  const copy=structuredClone(envelope),r=copy.suites[name].log,original=await fs.readFile(r.live),wrong=original.toString().replaceAll(deployment.preview,'http://localhost');
  await put(r.live,wrong);await put(path.join(isolatedCache,r.captured),wrong);r.bytes=Buffer.byteLength(wrong);r.sha256=digest(wrong);await saveEnvelope(copy);await assert.rejects(verify());
  await put(r.live,original);await put(path.join(isolatedCache,r.captured),original);pass('reject wrong-origin '+name+' log with recomputed hashes');
}
await saveEnvelope(envelope);await verify();await assert.rejects(verifyHostedInvocation(isolatedCache,deployment,{root:isolatedRoot,expectedRunId:'old'}));pass('caller must select the fresh invocation');
console.log(JSON.stringify({checks,scope:'Bounded helper tests; all synthetic public paths are inside release/',fixture}));

assert.equal(typeof guards.validateSourceChanges,'function');
const sourceChanges=[...guards.modifiedSources.filter(file=>file!=='apps/web/scripts/smoke-heroes.cjs').map(file=>'M\t'+file),'M\tapps/web/scripts/smoke-heroes.cjs',...guards.newSources.map(file=>'A\t'+file)];
guards.validateSourceChanges(sourceChanges);pass('six modified plus eight new executable files allowed');
assert.throws(()=>guards.validateSourceChanges(sourceChanges.filter(change=>change!=='M\tapps/web/scripts/smoke-heroes.cjs')));pass('reject missing sixth modified hero capture harness');
for(const file of ['apps/mobile/app/index.tsx','apps/web/public/heroes/car.glb','apps/media/package.json','.github/workflows/ci.yml','supabase/config.toml','packages/financial-engine/src/portfolio.ts']){
  assert.throws(()=>guards.validateSourceChanges([...sourceChanges,'M\t'+file]));pass('reject protected source '+file);
}
await assert.rejects(verifyHostedInvocation(isolatedCache,deployment,{root:isolatedRoot,expectedRunId:runId+'stale'}));pass('nonmatching invocation cannot borrow fixture storage proof');
const baselineRoot=path.join(fixture,'baseline-cache'),baselineCollection=path.join(baselineRoot,'public-collection'),baselineDesktop=path.join(baselineRoot,'public-report.html');
const baselineJournal=path.join(baselineRoot,'desktop-publication-'+guards.baselineHead,'journal.json');
const baselinePrior={headSha:guards.baselineHead,receipt:prior.receipt,desktopReport:{bytes:6,sha256:digest('report'),publicationJournal:baselineJournal}};
await put(baselineDesktop,'report');const baselineFiles={};
for(let index=0;index<321;index++){const file='file-'+index,bytes='baseline '+index;await put(path.join(baselineCollection,file),bytes);baselineFiles[file]={bytes:Buffer.byteLength(bytes),sha256:digest(bytes)};}
const verificationName='Mobile-Vitals-1aec5bf-Verification.json',verificationBytes=JSON.stringify(baselinePrior);await put(path.join(baselineCollection,verificationName),verificationBytes);baselineFiles[verificationName]={bytes:Buffer.byteLength(verificationBytes),sha256:digest(verificationBytes)};
const baselineManifest=path.join(baselineCollection,'Mobile-Vitals-1aec5bf-File-Manifest.json');await put(baselineManifest,JSON.stringify({headSha:guards.baselineHead,receipt:prior.receipt,files:baselineFiles}));
const baselineEntries=[];
for(const [index,[file,after]]of Object.entries(baselineFiles).entries()){
  const staged=path.join(baselineRoot,'stage',file),target=path.join(baselineCollection,file),backup=path.join(path.dirname(baselineJournal),'backups',String(index));await put(staged,await fs.readFile(target));
  const before=index<48?{bytes:5,sha256:digest('prior')}:null;if(before)await put(backup,'prior');baselineEntries.push({target,staged,after,expected:after,before,backup});
}
for(const [target,staged,expected]of [[baselineManifest,path.join(baselineRoot,'stage/manifest.json'),null],[baselineDesktop,path.join(baselineRoot,'stage/report.html'),{bytes:6,sha256:digest('report')}]]){const bytes=await fs.readFile(target);await put(staged,bytes);baselineEntries.push({target,staged,after:{bytes:bytes.length,sha256:digest(bytes)},...(expected?{expected}:{}),before:null});}
await put(baselineJournal,JSON.stringify({id:'desktop-publication-'+guards.baselineHead,state:'committed',files:baselineEntries}));
const baselineProof=await guards.verifyBaseline(baselineCollection,baselineDesktop,baselinePrior);assert.equal(baselineProof.files,322);assert.equal(baselineProof.journalEntries,324);assert.equal(baselineProof.recoverableBackups,48);pass('322-file baseline /324-entry journal /48 backups; generated manifest may omit expected');
await put(baselineEntries[0].backup,'wrong');await assert.rejects(guards.verifyBaseline(baselineCollection,baselineDesktop,baselinePrior));await put(baselineEntries[0].backup,'prior');pass('baseline backup drift rejected without publication');
await put(baselineEntries[0].staged,'wrong');await assert.rejects(guards.verifyBaseline(baselineCollection,baselineDesktop,baselinePrior));pass('baseline staged-payload drift rejected');
assert.equal(typeof guards.validateBaselineSeal,'function');
const priorBytes=await fs.readFile(path.join(cache,'../../2026-10-21-mobile-vitals/postflight.json'));
const seal=JSON.parse(await fs.readFile(path.join(cache,'../baseline-v2-results.json'),'utf8'));
guards.validateBaselineSeal(seal,priorBytes);pass('recorded 4134-check baseline binds actual predecessor postflight bytes');
for(const [name,change]of [['failed check',d=>d.checks[0].passed=false],['wrong baseline',d=>d.expectedHead='0'.repeat(40)],['postflight digest',d=>d.postflight.sha256='0'.repeat(64)]]){const copy=structuredClone(seal);change(copy);assert.throws(()=>guards.validateBaselineSeal(copy,priorBytes));pass('reject baseline seal '+name);}
const postflightSource=await fs.readFile(path.join(cache,'postflight.mjs'),'utf8');
const loopStart='const suites={};',loopEnd="for(const name of ['http','routes'";
assert.equal(postflightSource.split(loopStart).length,2);assert.equal(postflightSource.split(loopEnd).length,2);
const metadataBlock=postflightSource.slice(postflightSource.indexOf(loopStart),postflightSource.indexOf(loopEnd));
const suiteData={};
for(const [dir,file,count]of [['portfolio-budget','verification.json',24],['vault-comparison','verification.json',20],['comparison','verification.json',16],['portfolio-portability','verification.json',6],['portfolio-input','portfolio-input-verification.json',4]])suiteData[`apps/web/test-results/${dir}/${file}`]={origin:deployment.preview,receipts:Array.from({length:count},()=>({width:375,errors:[],inputPixels:{brightPixels:25,colors:2}}))};
const vital={inViewport:true,label:{glyphBottom:0,visible:true,fits:true,tokens:[{oneLine:true,contained:true}]},value:{glyphTop:1,fontSize:12,visible:true,fits:true,tokens:[{oneLine:true,contained:true}]}};
suiteData['apps/web/test-results/dashboard-interest/verification.json']={origin:deployment.preview,receipts:Array.from({length:18},()=>({width:375,errors:[],savedInputsPreserved:true,heroVisibleHeight:48,layout:Array.from({length:4},()=>structuredClone(vital))}))};
suiteData['apps/web/test-results/portfolio-common-month/verification.json']=common;
suiteData['apps/web/test-results/currency-width/verification.json']=currency;
const capturedMetadata=new Map();
const metadata=JSON.parse(JSON.stringify(await new vm.Script(`(async()=>{${metadataBlock}\nreturn suites;})()`,{filename:'postflight-receipt-loop-only.mjs'}).runInNewContext({
  assert,path,JSON,out:cache,origin:deployment.preview,hash:digest,validateCommonMonth:guards.validateCommonMonth,validateCurrencyWidth:guards.validateCurrencyWidth,
  fs:{readFile:async file=>{assert.ok(suiteData[file],file);return Buffer.from(JSON.stringify(suiteData[file]));},writeFile:async(file,bytes)=>{assert.equal(path.dirname(file),path.join(cache,'hosted'));capturedMetadata.set(path.basename(file),JSON.parse(bytes));}},
})));
assert.equal(metadata.currencyWidth?.cases,11);assert.deepEqual(metadata.currencyWidth.widths,currencyWidths);assert.equal(Object.values(metadata).reduce((sum,suite)=>sum+suite.cases,0),120);pass('actual postflight loop preserves viewportWidth and 109 primary plus11 boundary metadata');
assert.deepEqual(capturedMetadata.get('currencyWidth-verification.json'),currency);pass('actual postflight loop archives raw currency verification without relabeling it');
if(!process.argv.includes('--keep-fixtures')){
  const relative=path.relative(path.resolve(cache),path.resolve(fixture));assert.ok(relative.startsWith('shipping-test-')&&!relative.includes(path.sep)&&!path.isAbsolute(relative));
  await fs.rm(fixture,{recursive:true});
}
console.log(JSON.stringify({checks,scope:'Bounded metadata/filesystem helper tests only; not hosted, CI, browser or Desktop proof',fixturesRetained:process.argv.includes('--keep-fixtures')}));
