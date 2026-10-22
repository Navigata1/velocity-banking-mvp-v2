const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const {test}=require('node:test');
const root=path.resolve(__dirname,'..');
const yaml=createRequire(path.join(root,'apps/web/package.json'))('js-yaml');
const workflowText=fs.readFileSync(path.join(root,'.github/workflows/ci.yml'),'utf8');
const workflow=yaml.load(workflowText);
const source=fs.readFileSync(path.join(__dirname,'check-restoration-ci.cjs'),'utf8');
const head='a'.repeat(40);
const entries=[{id:11,event:'pull_request'},{id:10,event:'push'}].map(entry=>({...entry,name:'CI',head_sha:head,run_attempt:1,status:'completed',conclusion:'success'}));
const valid=()=>({headSha:head,status:'completed',conclusion:'success',url:'https://github.com/Navigata1/velocity-banking-mvp-v2/actions/runs/10',
  jobs:Object.values(workflow.jobs).map(job=>({name:job.name,status:'completed',conclusion:'success',steps:job.steps.map(step=>({name:step.name,status:'completed',conclusion:'success'}))}))});

// Execute the real CLI without network, credentials or a subprocess; only gh/git responses are fixtures.
function runCli({runs=entries,details={10:valid(),11:valid()},workingWorkflow=workflowText}={}) {
  const calls=[],logs=[],processFixture={env:{GH_TOKEN:'test-only-token'},exitCode:0,exit(code){this.exitCode=code;throw stop;}};
  const stop={};
  const execFileSync=(command,args)=>{
    calls.push([command,...args]);
    if(command==='git') {
      if(args[0]==='rev-parse')return head+'\n';
      assert.equal(args[0],'show');assert.equal(args[1],head+':.github/workflows/ci.yml');
      return workflowText;
    }
    assert.equal(command,'gh');
    if(args[0]==='api')return JSON.stringify({workflow_runs:runs});
    assert.equal(args[0],'run');assert.equal(args[1],'view');
    assert.ok(details[args[2]],'unexpected run selected');
    return JSON.stringify(details[args[2]]);
  };
  const moduleFixture={exports:{}};
  const requireFixture=name=>name==='node:child_process'?{execFileSync}:name==='node:fs'?{...fs,readFileSync:()=>workingWorkflow}:require(name);
  requireFixture.main=moduleFixture;
  try {
    vm.runInNewContext(source,{require:requireFixture,module:moduleFixture,__dirname,process:processFixture,
      console:{log:(...args)=>logs.push(args.join(' ')),error:(...args)=>logs.push(args.join(' '))}});
  } catch(error) {if(error!==stop)throw error;}
  return {code:processFixture.exitCode,calls,logs};
}
function rejected(mutator) {
  const options={runs:structuredClone(entries),details:{10:valid(),11:valid()}};
  mutator(options);
  assert.equal(runCli(options).code,1);
}

test('requires both events: successful PR must not hide failed push',()=>rejected(o=>{o.details[10].conclusion='failure';o.runs.find(r=>r.event==='push').conclusion='failure';}));
test('rejects missing push event',()=>rejected(o=>{o.runs=o.runs.filter(r=>r.event!=='push');}));
test('rejects missing PR event',()=>rejected(o=>{o.runs=o.runs.filter(r=>r.event!=='pull_request');}));
test('checks both complete events and pins their explicit attempts',()=>{
  const result=runCli();assert.equal(result.code,0);
  const views=result.calls.filter(call=>call[1]==='run');assert.equal(views.length,2);
  for(const call of views)assert.equal(call[call.indexOf('--attempt')+1],'1');
});
test('latest failed event cannot fall back to older green',()=>rejected(o=>{
  o.runs.push({...o.runs.find(r=>r.event==='push'),id:12,conclusion:'failure'});o.details[12]={...valid(),conclusion:'failure'};
}));
test('requires exact event head in both listing and job detail',()=>{
  rejected(o=>{o.runs[0].head_sha='b'.repeat(40);});
  rejected(o=>{o.details[10].headSha='b'.repeat(40);});
});
test('rejects pending events and rerun attempts without a valid attempt number',()=>{
  rejected(o=>{o.details[10].status='in_progress';});
  rejected(o=>{o.runs[0].run_attempt=0;});
});
test('requires every declared job, including graphics and SQL',()=>{
  for(const index of [0,1,2])rejected(o=>{o.details[10].jobs.splice(index,1);});
});
test('rejects extra, duplicate, failed or cancelled jobs',()=>{
  rejected(o=>{o.details[10].jobs.push({...o.details[10].jobs[0],name:'Unexpected'});});
  rejected(o=>{o.details[10].jobs[1].name=o.details[10].jobs[0].name;});
  for(const conclusion of ['failure','cancelled','skipped'])rejected(o=>{o.details[10].jobs[0].conclusion=conclusion;});
});
test('requires actual successful execution of every declared step',()=>{
  for(const name of ['Run web regression tests','Verify asset hero loading, rotation and reduced motion','Repeat SQL tests to verify fixture rollback','Smoke rendered Expo accessibility']) {
    rejected(o=>{const job=o.details[10].jobs.find(j=>j.steps.some(s=>s.name===name));job.steps=job.steps.filter(s=>s.name!==name);});
    rejected(o=>{o.details[10].jobs.flatMap(j=>j.steps).find(s=>s.name===name).conclusion='skipped';});
  }
});
test('rejects empty steps and failed automatic cleanup steps',()=>{
  rejected(o=>{o.details[10].jobs[0].steps=[];});
  rejected(o=>{o.details[10].jobs[0].steps.push({name:'Post cleanup',status:'completed',conclusion:'failure'});});
});
test('rejects duplicate step names and reordered required steps',()=>{
  rejected(o=>{o.details[10].jobs[0].steps.push(o.details[10].jobs[0].steps[0]);});
  rejected(o=>{o.details[10].jobs[0].steps.reverse();});
});
test('requirements come from the checked commit, not an edited local workflow',()=>{
  const changed=structuredClone(workflow);
  changed.jobs['backend-isolation'].steps=changed.jobs['backend-isolation'].steps.filter(step=>step.name!=='Repeat SQL tests to verify fixture rollback');
  const details={10:valid(),11:valid()};
  details[10].jobs.find(job=>job.name==='Isolated SQL and owner isolation').steps=details[10].jobs.find(job=>job.name==='Isolated SQL and owner isolation').steps.filter(step=>step.name!=='Repeat SQL tests to verify fixture rollback');
  assert.equal(runCli({workingWorkflow:yaml.dump(changed),details}).code,1,'dirty requirements must not hide a missing committed step');
});
test('workflow keeps original caps and database checks while isolating graphics',()=>{
  assert.deepEqual(Object.keys(workflow.jobs),['web-mobile-quality','asset-hero-quality','backend-isolation']);
  for(const [id,job]of Object.entries(workflow.jobs)) {
    assert.equal(job['timeout-minutes'],20);assert.equal(job['runs-on'],'ubuntu-latest');
    assert.equal(job['continue-on-error'],undefined);assert.equal(job.if,id==='web-mobile-quality'?'${{ !cancelled() }}':undefined);
    for(const step of job.steps)assert.equal(step['continue-on-error'],undefined);
  }
  const primary=workflow.jobs['web-mobile-quality'],hero=workflow.jobs['asset-hero-quality'],backend=workflow.jobs['backend-isolation'];
  assert.ok(primary.steps.find(step=>step.name==='Upload Portfolio budget proof').with.path.split('\n').includes('apps/web/test-results/shared-portfolio-dashboard'));
  const dashboardProof=primary.steps.find(step=>step.name==='Upload dashboard interest proof');
  assert.equal(dashboardProof.if,'always()');
  assert.deepEqual(dashboardProof.with.path.trim().split('\n'),[
    'apps/web/test-results/dashboard-interest','apps/web/test-results/legacy-web-truth']);
  assert.equal(hero.needs,undefined);
  assert.ok(!primary.steps.some(step=>step.run==='npm run test:heroes'));
  assert.deepEqual(hero.steps.filter(step=>step.run).map(step=>[step['working-directory'],step.run]),[
    [undefined,sourceRun],['apps/web','npm ci --audit=true --fetch-timeout=60000 --fetch-retries=1 --fetch-retry-mintimeout=1000 --fetch-retry-maxtimeout=3000'],['apps/web','npm run build'],['apps/web','npm run test:heroes']]);
  const proof=hero.steps.find(step=>step.name==='Upload asset hero browser proof');
  assert.equal(proof.if,'always()');assert.equal(proof.with.name,'asset-hero-browser-proof');assert.equal(proof.with.path,'apps/web/test-results/heroes');
  for(const name of ['Check media identity contracts','Install pinned Remotion Chrome','Smoke rendered Expo accessibility','Run mobile contract tests','Run report renderer contracts'])assert.ok(backend.steps.some(step=>step.name===name),name);
  assert.ok(primary.steps.some(step=>step.name==='Run CI verification contracts'));
  const native=backend.steps.find(step=>step.name==='Smoke rendered Expo accessibility');
  assert.equal(native.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,'${{ steps.remotion-chrome.outputs.chrome-path }}');
  assert.ok(workflow.jobs['backend-isolation'].steps.some(step=>step.run?.includes('supabase test db --local supabase/tests')));
});

const stepContract=require('./fixtures/restoration-ci-step-contract.json');
const fetchFlags=['--audit=true','--fetch-timeout=60000','--fetch-retries=1','--fetch-retry-mintimeout=1000','--fetch-retry-maxtimeout=3000'];
const guardName='Require prerequisite quality jobs';
const guardRun='set -euo pipefail\ntest "$HERO_RESULT" = success\ntest "$SQL_RESULT" = success\n';
const sourceName='Verify checked-out source',sourceRef='${{ github.event.pull_request.head.sha || github.sha }}';
const sourceRun='set -euo pipefail\n[[ "$EXPECTED_HEAD" =~ ^[0-9a-f]{40}$ ]]\nactual="$(git rev-parse HEAD)"\ntest "$actual" = "$EXPECTED_HEAD"\nprintf \'Verified source %s\\n\' "$actual"\n';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const hash=value=>require('node:crypto').createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const isInstall=step=>/^npm (?:--prefix apps\/web )?ci(?:\s|$)/.test(step.run||'');
function validateWorkload(candidate) {
  assert.deepEqual(Object.keys(candidate).sort(),['concurrency','jobs','name','on','permissions']);
  assert.equal(candidate.name,'CI');assert.equal(stepContract.steps.length,55);
  assert.deepEqual(candidate.concurrency,{group:'${{ github.workflow }}-${{ github.ref }}','cancel-in-progress':true});
  assert.deepEqual(candidate.permissions,{contents:'read'});
  assert.deepEqual(candidate.on,{pull_request:null,push:{branches:['main','codex/**']}});
  const jobs=candidate.jobs,primary=jobs['web-mobile-quality'],backend=jobs['backend-isolation'];
  assert.deepEqual(Object.keys(jobs),['web-mobile-quality','asset-hero-quality','backend-isolation']);
  assert.deepEqual(primary.needs,['asset-hero-quality','backend-isolation']);assert.equal(primary.if,'${{ !cancelled() }}');
  assert.deepEqual(primary.steps[0],{name:guardName,env:{HERO_RESULT:'${{ needs.asset-hero-quality.result }}',SQL_RESULT:'${{ needs.backend-isolation.result }}'},run:guardRun});
  const moved=new Set(stepContract.moved),expected=new Map();
  for(const step of stepContract.steps)expected.set((step.job==='web-mobile-quality'&&moved.has(step.name)?'backend-isolation':step.job)+':'+step.name,step.sha256);
  let installs=0;
  for(const [id,job]of Object.entries(jobs)) {
    assert.equal(job.name,{'web-mobile-quality':'Web and mobile quality gates','asset-hero-quality':'Asset hero quality gates','backend-isolation':'Isolated SQL and owner isolation'}[id]);
    assert.equal(job['timeout-minutes'],20);assert.equal(job['runs-on'],'ubuntu-latest');
    assert.deepEqual(Object.keys(job).sort(),(id==='web-mobile-quality'?['if','name','needs','runs-on','steps','timeout-minutes']:['name','runs-on','steps','timeout-minutes']));
    const original=stepContract.steps.filter(s=>s.job===id&&(id!=='web-mobile-quality'||!moved.has(s.name))).map(s=>s.name);
    const withSource=original.flatMap(name=>name==='Check out repository'?[name,sourceName]:[name]);
    const sequence=id==='web-mobile-quality'?[guardName,...withSource]:id==='backend-isolation'?[...withSource,...stepContract.moved]:withSource;
    assert.deepEqual(job.steps.map(s=>s.name),sequence);
    assert.deepEqual(job.steps.find(s=>s.name===sourceName),{name:sourceName,env:{EXPECTED_HEAD:sourceRef},run:sourceRun});
    for(const step of job.steps) {
      if(step.name===guardName||step.name===sourceName)continue;
      const copy=structuredClone(step);
      if(copy.uses==='actions/checkout@v5'){assert.deepEqual(copy.with,{ref:sourceRef});delete copy.with;}
      if(copy.uses==='actions/setup-node@v5')copy.with['cache-dependency-path']='<workspace-scoped cache>';
      if(isInstall(copy)){const suffix=' '+fetchFlags.join(' ');assert.ok(copy.run.endsWith(suffix),step.name+' must keep command-local fetch bounds');copy.run=copy.run.slice(0,-suffix.length);installs++;}
      const key=id+':'+step.name;assert.equal(hash(copy),expected.get(key),key+' retains original command, audit scope, conditions, IDs, artifacts and environment');expected.delete(key);
    }
  }
  assert.equal(expected.size,0);assert.equal(installs,6);
  const cache=id=>jobs[id].steps.find(s=>s.name==='Set up Node').with['cache-dependency-path'].trim().split(/\r?\n/);
  assert.deepEqual(cache('web-mobile-quality'),['apps/web/package-lock.json']);assert.deepEqual(cache('asset-hero-quality'),['apps/web/package-lock.json']);
  assert.deepEqual(cache('backend-isolation'),['apps/web/package-lock.json','apps/media/package-lock.json','apps/report-worker/package-lock.json','apps/mobile/package-lock.json']);
  assert.ok(backend.steps.findIndex(s=>s.name==='Stop disposable database')<backend.steps.findIndex(s=>s.name==='Install media workspace dependencies'));
}
function guardResults(script) {
  const {spawnSync}=require('node:child_process'),bash=process.platform==='win32'?path.join(process.env.ProgramFiles,'Git/bin/bash.exe'):'bash';
  for(const hero of ['success','failure','cancelled','skipped','unknown','',undefined])for(const sql of ['success','failure','cancelled','skipped','unknown','',undefined]){
    const env={...process.env};delete env.HERO_RESULT;delete env.SQL_RESULT;if(hero!==undefined)env.HERO_RESULT=hero;if(sql!==undefined)env.SQL_RESULT=sql;
    const result=spawnSync(bash,['-c',script],{env,encoding:'utf8',windowsHide:true,shell:false,timeout:10000});
    assert.equal(result.error,undefined);assert.equal(result.status===0,hero==='success'&&sql==='success',hero+'/'+sql+' prerequisites');
  }
}
test('three existing jobs retain every original step while primary gates both prerequisites',()=>validateWorkload(workflow));
test('actual prerequisite shell guard rejects 48 non-success pairs and missing-check mutants',()=>{
  const guard=workflow.jobs['web-mobile-quality'].steps.find(s=>s.name===guardName);assert.ok(guard);
  guardResults(guard.run);
  for(const omitted of ['test "$HERO_RESULT" = success\n','test "$SQL_RESULT" = success\n'])assert.throws(()=>guardResults(guard.run.replace(omitted,'')),/prerequisites/);
});
test('workload contract rejects skipped dependencies, weakened checks, missing steps or changed artifact wiring',()=>{
  const variants=[w=>{delete w.jobs['web-mobile-quality'].needs;},w=>{w.jobs['web-mobile-quality'].if='success()';},w=>{w.jobs['web-mobile-quality'].steps[0].run='true';},
    w=>{w.jobs['backend-isolation'].steps=w.jobs['backend-isolation'].steps.filter(s=>s.name!=='Repeat SQL tests to verify fixture rollback');},
    w=>{w.jobs['web-mobile-quality'].steps.find(s=>s.name==='Audit web runtime dependencies').run='npm audit --omit=dev --audit-level=critical';},
    w=>{w.jobs['backend-isolation'].steps.find(s=>s.name==='Smoke rendered Expo accessibility').env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='other-browser';},
    w=>{w.jobs['asset-hero-quality'].steps.find(isInstall).run+=' --no-audit';},
    w=>{w.jobs['backend-isolation'].name='Other check';},w=>{w.jobs['web-mobile-quality']['timeout-minutes']=21;},
    w=>{w.jobs['asset-hero-quality'].steps.find(s=>s.uses==='actions/checkout@v5').with.ref='main';},
    w=>{w.on.pull_request_target=null;delete w.on.pull_request;},w=>{w.permissions.contents='write';}];
  validateWorkload(workflow);for(const mutate of variants){const copy=structuredClone(workflow);mutate(copy);assert.throws(()=>validateWorkload(copy));}
});
test('existing npm CLI honors each bounded install fetch option without changing audit visibility',()=>{
  validateWorkload(workflow);
  const {spawnSync}=require('node:child_process'),{resolveNpmCli}=require('./audit-web-runtime.cjs');
  for(const [key,expected]of [['fetch-timeout',60000],['fetch-retries',1],['fetch-retry-mintimeout',1000],['fetch-retry-maxtimeout',3000],['audit',true]]){
    const result=spawnSync(process.execPath,[resolveNpmCli(),'config','get',key,'--json','--update-notifier=false',...fetchFlags],{cwd:path.join(root,'apps/web'),env:{...process.env,NPM_CONFIG_AUDIT:'false',NPM_CONFIG_FETCH_TIMEOUT:'999999'},encoding:'utf8',windowsHide:true,shell:false,timeout:10000});
    assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout),expected,key);
  }
});
test('source identity guard rejects wrong, missing, invalid and failed git results',()=>{
  validateWorkload(workflow);
  const {spawnSync}=require('node:child_process'),bash=process.platform==='win32'?path.join(process.env.ProgramFiles,'Git/bin/bash.exe'):'bash',sha='a'.repeat(40);
  const script='git(){ printf \'%s\\n\' "$ACTUAL_HEAD"; return "$GIT_STATUS"; }\n'+workflow.jobs['asset-hero-quality'].steps.find(s=>s.name===sourceName).run;
  for(const [expected,actual,status,passes]of [[sha,sha,'0',true],[sha,'b'.repeat(40),'0',false],['',sha,'0',false],['not-a-sha',sha,'0',false],[sha,sha,'1',false],[sha,'','0',false]]){
    const result=spawnSync(bash,['-c',script],{env:{...process.env,EXPECTED_HEAD:expected,ACTUAL_HEAD:actual,GIT_STATUS:status},encoding:'utf8',windowsHide:true,shell:false,timeout:10000});
    assert.equal(result.error,undefined);assert.equal(result.status===0,passes,expected+'/'+actual+'/'+status);
  }
});
test('cancelled or skipped full events cannot pass using successful job fixtures',()=>{
  for(const conclusion of ['cancelled','skipped'])rejected(o=>{o.runs[0].conclusion=conclusion;o.details[o.runs[0].id].conclusion=conclusion;});
});
