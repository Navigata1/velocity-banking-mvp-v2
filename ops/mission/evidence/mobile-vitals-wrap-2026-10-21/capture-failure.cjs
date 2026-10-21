const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const env={...process.env,GH_TOKEN:execFileSync('gh',['auth','token','--hostname','github.com','--user','Navigata1'],{encoding:'utf8'}).trim()};
const raw=args=>execFileSync('gh',args,{env,encoding:'utf8',windowsHide:true,maxBuffer:40*1024*1024});
for(const [event,id]of [['push',39587774650],['pull_request',39587777183]]){
 const run=JSON.parse(raw(['run','view',String(id),'--repo','Navigata1/velocity-banking-mvp-v2','--json','headSha,status,conclusion,url,jobs']));
 fs.writeFileSync(path.join(__dirname,`failed-3b58bef-${event}-metadata.json`),JSON.stringify(run,null,2)+'\n');
 for(const job of run.jobs){const kind=job.name==='Web and mobile quality gates'?'web':'sql',log=raw(['run','view',String(id),'--repo','Navigata1/velocity-banking-mvp-v2','--job',String(job.databaseId),'--log']);
  fs.writeFileSync(path.join(__dirname,`failed-3b58bef-${event}-${kind}.log`),log);
  if(kind==='web')console.log(event+'\n'+log.split('\n').filter(l=>/AssertionError|must fit|must not overlap|first viewport|TimeoutError|Error:/.test(l)).join('\n'));
 }
}
