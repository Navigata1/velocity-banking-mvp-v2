const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{randomUUID,createHash}=require('node:crypto');
(async()=>{
  const {validateDeployment,assertCleanHead,validateLocalReceipt,verifySourcePins,verifyLocalFiles,hostedConfigs,hostedEnvironment,localReceiptPath}=await import('./shipping-guards.mjs');
  const root=process.cwd(),origin=process.env.INTERESTSHIELD_VERIFIED_PREVIEW,out=path.join(__dirname,'hosted');
  const head=assertCleanHead(process.env.INTERESTSHIELD_EXPECTED_HEAD),deploymentBytes=fs.readFileSync(path.join(__dirname,'deployment-final.json')),deployment=JSON.parse(deploymentBytes);
  const receiptBytes=fs.readFileSync(localReceiptPath),local=JSON.parse(receiptBytes),prior=JSON.parse(fs.readFileSync('.superpowers/sdd/2026-10-21-mobile-vitals/postflight.json'));
  validateLocalReceipt(local,prior);await verifySourcePins(local,head);await verifyLocalFiles(local);validateDeployment(deployment,head,origin);
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),id=randomUUID(),directory='hosted-runs/'+id,runDir=path.join(__dirname,directory);
  fs.mkdirSync(runDir,{recursive:true});fs.mkdirSync(out,{recursive:true});
  const environment=hostedEnvironment(origin);
  const env={...process.env,...environment},run={schemaVersion:2,id,directory,headSha:head,deploymentId:deployment.id,origin,deploymentSha256:hash(deploymentBytes),runnerSha256:hash(fs.readFileSync(__filename)),guardsSha256:hash(fs.readFileSync(path.join(__dirname,'shipping-guards.mjs'))),localReceiptSha256:hash(receiptBytes),startedAt:new Date().toISOString(),status:'running',suites:{}};
  const save=()=>{const file=path.join(out,'run-envelope.json'),temp=file+'.next-'+randomUUID();fs.writeFileSync(temp,JSON.stringify(run,null,2)+'\n');fs.renameSync(temp,file);};save();
  try{
    for(const [script,name,files]of hostedConfigs){
      const suiteDir=path.join(runDir,name);fs.mkdirSync(suiteDir);const artifacts=files.map(file=>'apps/web/test-results/'+file);
      for(const [index,file]of artifacts.entries())if(fs.existsSync(file))fs.renameSync(file,path.join(suiteDir,'previous-'+index+'-'+path.basename(file)));
      const logFile=path.join(out,name+'.log'),log=fs.openSync(logFile,'w'),scriptFile='apps/web/scripts/'+script,startedAt=new Date().toISOString();
      const command={executable:process.execPath,args:[path.resolve(scriptFile)],cwd:path.join(root,'apps/web')};
      try{execFileSync(command.executable,command.args,{cwd:command.cwd,env,stdio:['ignore',log,log],timeout:240000,windowsHide:true});}finally{fs.closeSync(log);}
      const capture=(live,label)=>{const bytes=fs.readFileSync(live),captured=path.posix.join(directory,name,label);fs.writeFileSync(path.join(__dirname,captured),bytes);return{live:path.resolve(live),captured,bytes:bytes.length,sha256:hash(bytes)};};
      run.suites[name]={runId:id,origin,startedAt,finishedAt:new Date().toISOString(),exitCode:0,script:scriptFile,scriptSha256:hash(fs.readFileSync(scriptFile)),command,environment,
        log:capture(logFile,name+'.log'),artifacts:Object.fromEntries(artifacts.map((file,index)=>[file,capture(file,index+'-'+path.basename(file))]))};
      save();console.log('PASS hosted '+name+' '+origin+' invocation '+id);
    }
    assertCleanHead(head);await verifySourcePins(local,head);await verifyLocalFiles(local);assert.equal(hash(fs.readFileSync(__filename)),run.runnerSha256);
    assert.equal(hash(fs.readFileSync(path.join(__dirname,'shipping-guards.mjs'))),run.guardsSha256);assert.equal(hash(fs.readFileSync(localReceiptPath)),run.localReceiptSha256);assert.equal(hash(fs.readFileSync(path.join(__dirname,'deployment-final.json'))),run.deploymentSha256);
    run.status='completed';run.exitCode=0;run.finishedAt=new Date().toISOString();save();
  }catch(error){run.status='failed';run.exitCode=1;run.finishedAt=new Date().toISOString();run.error=String(error);save();throw error;}
})().catch(error=>{console.error(error);process.exitCode=1;});
