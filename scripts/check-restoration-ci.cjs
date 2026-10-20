/* eslint-disable @typescript-eslint/no-require-imports */
const {execFileSync}=require('node:child_process');
const env={...process.env};
if(!env.GH_TOKEN) env.GH_TOKEN=execFileSync('gh',['auth','token','--hostname','github.com','--user','Navigata1'],{encoding:'utf8',windowsHide:true}).trim();
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
const result=JSON.parse(execFileSync('gh',['api',`repos/Navigata1/velocity-banking-mvp-v2/actions/runs?head_sha=${sha}&per_page=100`],{env,encoding:'utf8',windowsHide:true}));
const runs=result.workflow_runs.filter(run=>run.head_sha===sha && run.name==='CI');
if(!runs.length) {console.error(`No CI run exists for exact commit ${sha}. Preview success is not CI approval.`);process.exit(1);}
const latest=runs[0];
console.log(`${latest.html_url}: ${latest.status}, ${latest.conclusion??'pending'}`);
if(latest.status!=='completed' || latest.conclusion!=='success') process.exit(1);
