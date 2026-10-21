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
test('workflow isolates graphics without changing the per-job cap or backend',()=>{
  assert.deepEqual(Object.keys(workflow.jobs),['web-mobile-quality','asset-hero-quality','backend-isolation']);
  for(const job of Object.values(workflow.jobs)) {
    assert.equal(job['timeout-minutes'],20);assert.equal(job['runs-on'],'ubuntu-latest');
    assert.equal(job['continue-on-error'],undefined);assert.equal(job.if,undefined);
    for(const step of job.steps)assert.equal(step['continue-on-error'],undefined);
  }
  const primary=workflow.jobs['web-mobile-quality'],hero=workflow.jobs['asset-hero-quality'];
  assert.ok(primary.steps.find(step=>step.name==='Upload Portfolio budget proof').with.path.split('\n').includes('apps/web/test-results/shared-portfolio-dashboard'));
  assert.equal(hero.needs,undefined);
  assert.ok(!primary.steps.some(step=>step.run==='npm run test:heroes'));
  assert.deepEqual(hero.steps.filter(step=>step.run).map(step=>[step['working-directory'],step.run]),[
    ['apps/web','npm ci'],['apps/web','npm run build'],['apps/web','npm run test:heroes']]);
  const proof=hero.steps.find(step=>step.name==='Upload asset hero browser proof');
  assert.equal(proof.if,'always()');assert.equal(proof.with.name,'asset-hero-browser-proof');assert.equal(proof.with.path,'apps/web/test-results/heroes');
  for(const name of ['Check media identity contracts','Install pinned Remotion Chrome','Smoke rendered Expo accessibility','Run mobile contract tests','Run CI verification contracts','Run report renderer contracts'])assert.ok(primary.steps.some(step=>step.name===name),name);
  const native=primary.steps.find(step=>step.name==='Smoke rendered Expo accessibility');
  assert.equal(native.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,'${{ steps.remotion-chrome.outputs.chrome-path }}');
  assert.ok(workflow.jobs['backend-isolation'].steps.some(step=>step.run?.includes('supabase test db --local supabase/tests')));
});
