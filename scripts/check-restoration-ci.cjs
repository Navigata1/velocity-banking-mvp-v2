/* eslint-disable @typescript-eslint/no-require-imports */
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');

try {
  const root=path.resolve(__dirname,'..');
  const yaml=createRequire(path.join(root,'apps/web/package.json'))('js-yaml');
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});
  const sha=git(['rev-parse','HEAD']).trim();
  assert.match(sha,/^[a-f0-9]{40}$/);
  const workflow=yaml.load(git(['show',sha+':.github/workflows/ci.yml']));
  const requiredJobs=Object.values(workflow.jobs);
  assert.ok(requiredJobs.length>0&&requiredJobs.every(job=>job.name&&job.steps?.length),'Named CI jobs and steps required');
  const env={...process.env};
  if(!env.GH_TOKEN)env.GH_TOKEN=execFileSync('gh',['auth','token','--hostname','github.com','--user','Navigata1'],{encoding:'utf8',windowsHide:true}).trim();
  const gh=args=>JSON.parse(execFileSync('gh',args,{env,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024}));
  const runs=gh(['api',`repos/Navigata1/velocity-banking-mvp-v2/actions/runs?head_sha=${sha}&per_page=100`]).workflow_runs;
  assert.ok(Array.isArray(runs),'Workflow run listing required');
  for(const event of ['push','pull_request']) {
    const latest=runs.filter(run=>run.head_sha===sha&&run.name==='CI'&&run.event===event).sort((a,b)=>b.id-a.id)[0];
    assert.ok(latest,`Missing ${event} CI for exact commit ${sha}. Preview success is not CI approval.`);
    assert.ok(Number.isSafeInteger(latest.id)&&latest.id>0);
    assert.ok(Number.isSafeInteger(latest.run_attempt)&&latest.run_attempt>0,'Explicit valid CI attempt required');
    const run=gh(['run','view',String(latest.id),'--attempt',String(latest.run_attempt),'--repo','Navigata1/velocity-banking-mvp-v2','--json','headSha,status,conclusion,url,jobs']);
    assert.equal(run.headSha,sha,event+' head');
    assert.equal(run.status,'completed',event+' not complete');
    assert.equal(run.conclusion,'success',event+' not successful');
    assert.equal(run.jobs?.length,requiredJobs.length,event+' job count');
    assert.equal(new Set(run.jobs.map(job=>job.name)).size,requiredJobs.length,'Unique CI jobs required');
    for(const expected of requiredJobs) {
      const job=run.jobs.find(job=>job.name===expected.name);
      assert.ok(job,event+' missing '+expected.name);
      assert.equal(job.status,'completed',job.name+' not complete');
      assert.equal(job.conclusion,'success',job.name+' not successful');
      assert.ok(job.steps?.length>0&&job.steps.every(step=>step.status==='completed'&&step.conclusion==='success'),job.name+' has incomplete/failed/skipped steps');
      assert.equal(new Set(job.steps.map(step=>step.name)).size,job.steps.length,'Unique step names required');
      let previous=-1;
      for(const step of expected.steps) {
        const index=job.steps.findIndex(actual=>actual.name===step.name);
        assert.ok(index>previous,job.name+' missing or reordered step '+step.name);
        previous=index;
      }
    }
    console.log(`${event}: ${run.url}; attempt ${latest.run_attempt}; ${run.jobs.length} complete successful jobs, all steps executed`);
  }
} catch(error) {
  console.error(error.message);
  process.exitCode=1;
}
