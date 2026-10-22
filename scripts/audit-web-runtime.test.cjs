const {test}=require('node:test');
const assert=require('node:assert/strict');
const {runRuntimeAudit,AUDIT_ARGS}=require('./audit-web-runtime.cjs');
const clean=()=>({auditReportVersion:2,vulnerabilities:{},metadata:{vulnerabilities:{info:0,low:0,moderate:0,high:0,critical:0,total:0},dependencies:{prod:50,dev:385,optional:90,peer:0,peerOptional:0,total:472}}});
const response=(data,status=0,stderr='')=>({status,stdout:JSON.stringify(data),stderr});
const error=(code,summary='network failure',stderr='')=>response({error:{code,summary,detail:''}},1,stderr);
const retired='npm notice This endpoint is being retired. Use the bulk advisory endpoint instead.';
const quick='400 Bad Request - POST https://registry.npmjs.org/-/npm/v1/security/audits/quick - Bad Request';
const quickError=()=>({message:quick,method:'POST',uri:'https://registry.npmjs.org/-/npm/v1/security/audits/quick',headers:{'npm-notice':[retired.replace('npm notice ','')]},statusCode:400,body:{statusCode:400,error:'Bad Request',message:'Invalid package tree, run  npm install  to rebuild your package-lock.json'},error:{summary:'audit endpoint returned an error',detail:''}});
async function exercise(responses){
  const calls=[],pauses=[],logs=[];
  const result=await runRuntimeAudit({execute:async args=>{calls.push([...args]);assert.ok(responses.length,'unexpected extra audit');return responses.shift();},pause:async ms=>pauses.push(ms),log:line=>logs.push(line)});
  return {...result,calls,pauses,logs};
}
test('accepts only a complete zero report and preserves the exact runtime command',async()=>{
  const report=clean(),r=await exercise([response(report)]);
  assert.equal(r.passed,true);assert.equal(r.attempts,1);assert.equal(r.calls.length,1);assert.deepEqual(r.pauses,[]);
  assert.deepEqual(r.calls[0],['audit','--omit=dev','--json','--audit-level=info','--offline=false','--prefer-online=true','--prefer-offline=false','--fetch-timeout=30000','--fetch-retries=0']);
  assert.ok(r.logs.join('\n').includes(JSON.stringify(report)));assert.ok(Object.isFrozen(AUDIT_ARGS));
});
test('retries known transport errors, never more than three fresh npm processes',async()=>{
  for(const code of ['ECONNRESET','ETIMEDOUT','EAI_AGAIN','E500','E502','E503','E504']){
    const r=await exercise([error(code),response(clean())]);assert.equal(r.passed,true,code);assert.equal(r.attempts,2);assert.equal(r.calls.length,2);assert.deepEqual(r.pauses,[1000]);
  }
});
test('recognizes the installed npm structured retiring Quick error, not stderr alone',async()=>{
  for(const summary of ['audit endpoint returned an error','']){
    const envelope=quickError();envelope.error.summary=summary;
    const r=await exercise([response(envelope,1),response(clean())]);assert.equal(r.passed,true);assert.equal(r.calls.length,2);assert.deepEqual(r.pauses,[1000]);
  }
  for(const code of ['E400','E410']){
    const r=await exercise([error(code,quick,retired),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);
  }
});

test('accepts the exact full notice recorded in CI but not arbitrary notice suffixes',async()=>{
  const notice='This endpoint is being retired. Use the bulk advisory endpoint instead. See the following docs for more info: https://api-docs.npmjs.com/#tag/Audit';
  for(const [value,expected]of [[notice,true],[notice+'-evil',false]]){
    const data=quickError();data.headers['npm-notice']=[value];
    const r=await exercise([response(data,1),response(clean())]);assert.equal(r.passed,expected);assert.equal(r.calls.length,expected?2:1);
  }
});

test('structured Quick retry rejects altered endpoint, method, status, notice, body and mixed data',async()=>{
  const variants=[x=>{x.uri+='-evil';},x=>{x.method='GET';},x=>{x.statusCode=401;},x=>{x.headers={};},x=>{x.headers['npm-notice']=['other notice'];},x=>{x.body.statusCode=500;},x=>{x.body.message='other failure';},x=>{x.error.detail='unknown';},x=>{x.error.extra=true;},x=>{x.extra=true;},x=>{x.vulnerabilities={};},x=>{x.metadata={};}];
  for(const change of variants){const x=quickError();change(x);const r=await exercise([response(x,1,retired),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);}
  const r=await exercise([response(quickError(),0),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);
});

test('installed npm CLI flags override inherited offline and cache preferences without network',()=>{
  const {spawnSync}=require('node:child_process'),{resolveNpmCli}=require('./audit-web-runtime.cjs');
  const env={...process.env,NPM_CONFIG_OFFLINE:'true',NPM_CONFIG_PREFER_OFFLINE:'true',NPM_CONFIG_PREFER_ONLINE:'false'};
  for(const [key,expected]of [['offline',false],['prefer-offline',false],['prefer-online',true]]){
    const result=spawnSync(process.execPath,[resolveNpmCli(),'config','get',key,'--json',...AUDIT_ARGS.slice(1)],{env,encoding:'utf8',windowsHide:true,shell:false,timeout:10000});
    assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout),expected,key);
  }
});
test('the observed code-less Quick network timeout is retryable but never a pass',async()=>{
  const timeout={message:'network timeout at: https://registry.npmjs.org/-/npm/v1/security/audits/quick',error:{summary:'',detail:''}};
  const r=await exercise([response(timeout,1),response(clean())]);assert.equal(r.passed,true);assert.equal(r.calls.length,2);assert.deepEqual(r.pauses,[1000]);
});
test('similar timeout text, extra error fields or partial reports do not get this exception',async()=>{
  const timeout=()=>({message:'network timeout at: https://registry.npmjs.org/-/npm/v1/security/audits/quick',error:{summary:'',detail:''}});
  const variants=[()=>{const x=timeout();x.message=x.message.replace('https:','http:');return x;},()=>{const x=timeout();x.message+='-evil';return x;},()=>{const x=timeout();x.error.extra='unknown';return x;},()=>{const x=timeout();x.metadata={};return x;},()=>{const x=timeout();x.error.detail='unexpected';return x;}];
  for(const create of variants){const r=await exercise([response(create(),1),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);}
  const r=await exercise([response(timeout(),0),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);
});
test('unavailable audit fails closed after exactly three attempts',async()=>{
  const r=await exercise([error('ETIMEDOUT'),error('ETIMEDOUT'),error('ETIMEDOUT')]);
  assert.equal(r.passed,false);assert.equal(r.attempts,3);assert.equal(r.calls.length,3);assert.deepEqual(r.pauses,[1000,1000]);
});
for(const severity of ['info','low','moderate','high','critical'])test(`${severity} findings fail immediately even if the process incorrectly exits zero`,async()=>{
  const report=clean();report.metadata.vulnerabilities[severity]=1;report.metadata.vulnerabilities.total=1;report.vulnerabilities.example={severity};
  const r=await exercise([response(report),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);assert.deepEqual(r.pauses,[]);
});
test('nonzero process status cannot turn a clean-looking report into a pass',async()=>{
  const r=await exercise([response(clean(),1),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);
});
test('mixed partial report and transient error cannot be retried into green',async()=>{
  const report=clean();report.error={code:'ETIMEDOUT',summary:'network failure',detail:''};
  const r=await exercise([response(report,1),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);
});
const malformed=[
  ['missing output',()=>({status:0,stdout:'',stderr:''})],
  ['invalid JSON',()=>({status:0,stdout:'{not json',stderr:''})],
  ['null report',()=>response(null)],
  ['array report',()=>response([])],
  ['missing metadata',()=>response({auditReportVersion:2,vulnerabilities:{}})],
  ['unknown report version',()=>{const r=clean();r.auditReportVersion=3;return response(r);}],
  ['missing severity',()=>{const r=clean();delete r.metadata.vulnerabilities.low;return response(r);}],
  ['unknown severity',()=>{const r=clean();r.metadata.vulnerabilities.unknown=1;return response(r);}],
  ['string count',()=>{const r=clean();r.metadata.vulnerabilities.low='0';return response(r);}],
  ['negative count',()=>{const r=clean();r.metadata.vulnerabilities.low=-1;return response(r);}],
  ['nonfinite count',()=>{const r=clean();r.metadata.vulnerabilities.low=Infinity;return response(r);}],
  ['inconsistent count',()=>{const r=clean();r.metadata.vulnerabilities.total=1;return response(r);}],
  ['unexpected vulnerability entries',()=>{const r=clean();r.vulnerabilities.example={};return response(r);}],
  ['vulnerability array',()=>{const r=clean();r.vulnerabilities=[];return response(r);}],
  ['empty production tree',()=>{const r=clean();r.metadata.dependencies.prod=0;return response(r);}],
  ['invalid dependency total',()=>{const r=clean();r.metadata.dependencies.total=1;return response(r);}],
  ['unknown dependency category',()=>{const r=clean();r.metadata.dependencies.unknown=0;return response(r);}],
  ...['prod','dev','optional','peer','peerOptional','total'].map(key=>['missing dependency '+key,()=>{const r=clean();delete r.metadata.dependencies[key];return response(r);}]),
  ...['prod','dev','optional','peer','peerOptional','total'].flatMap(key=>[
    ['invalid dependency '+key,()=>{const r=clean();r.metadata.dependencies[key]=-1;return response(r);}],
    ['non-integer dependency '+key,()=>{const r=clean();r.metadata.dependencies[key]=0.5;return response(r);}],
  ]),
];
for(const [name,create]of malformed)test(`${name} fails without retry or accepting later clean data`,async()=>{
  const r=await exercise([create(),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);assert.deepEqual(r.pauses,[]);
});
test('other registry400, auth, TLS, configuration and rate-limit failures are not retried',async()=>{
  for(const code of ['E400','E401','E403','E404','E429','CERT_HAS_EXPIRED','ENOTFOUND','EAUDITNOPJSON','EUSAGE']){
    const r=await exercise([error(code),response(clean())]);assert.equal(r.passed,false,code);assert.equal(r.calls.length,1,code);
  }
});
test('a Quick URL without the notice, or a notice for another URL, is not enough',async()=>{
  for(const item of [error('E400',quick),error('E400',quick.replace('/quick','/quick-evil'),retired),error('E400',quick.replace('https://registry.npmjs.org','https://example.com'),retired),error('E400',quick.replace('https:','http:'),retired)]){
    const r=await exercise([item,response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);
  }
});
test('spawn failures, killed children and process timeouts never count as transport success',async()=>{
  for(const extra of [{error:{code:'ENOENT'}},{error:{code:'ETIMEDOUT'}},{signal:'SIGTERM'}]){
    const r=await exercise([{...response(clean()),...extra},response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);
  }
});
test('a finding after one transport failure is not retried again',async()=>{
  const report=clean();report.metadata.vulnerabilities.high=1;report.metadata.vulnerabilities.total=1;report.vulnerabilities.example={severity:'high'};
  const r=await exercise([error('ECONNRESET'),response(report,1),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,2);assert.deepEqual(r.pauses,[1000]);
});
test('malformed data after one transport failure stops rather than trying for green',async()=>{
  const r=await exercise([error('ECONNRESET'),response({}),response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,2);
});
test('zero-exit error objects and error envelopes with unexpected fields are rejected',async()=>{
  for(const item of [response({error:{code:'ETIMEDOUT',summary:'failed',detail:''}},0),response({error:{code:'ETIMEDOUT'},extra:'partial'},1)]){
    const r=await exercise([item,response(clean())]);assert.equal(r.passed,false);assert.equal(r.calls.length,1);
  }
});
test('CI keeps the runtime audit mandatory and executes its protocol contracts',()=>{
  const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
  const yaml=createRequire(path.resolve(__dirname,'../apps/web/package.json'))('js-yaml');
  const workflow=yaml.load(fs.readFileSync(path.resolve(__dirname,'../.github/workflows/ci.yml'),'utf8'));
  const steps=workflow.jobs['web-mobile-quality'].steps,audit=steps.find(step=>step.name==='Audit web runtime dependencies');
  assert.equal(audit.run,'node ../../scripts/audit-web-runtime.cjs');assert.equal(audit['working-directory'],'apps/web');
  assert.equal(audit.if,undefined);assert.equal(audit['continue-on-error']??false,false);
  assert.ok(steps.find(step=>step.name==='Run CI verification contracts').run.includes('node --test scripts/audit-web-runtime.test.cjs'));
  for(const job of Object.values(workflow.jobs))assert.equal(job['timeout-minutes'],20);
});
