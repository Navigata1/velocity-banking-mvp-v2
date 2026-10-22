const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const AUDIT_ARGS=Object.freeze(['audit','--omit=dev','--json','--audit-level=info','--offline=false','--prefer-online=true','--prefer-offline=false','--fetch-timeout=30000','--fetch-retries=0']);
const MAX_ATTEMPTS=3,PROCESS_TIMEOUT=90000;
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const keys=(value,expected)=>record(value)&&Object.keys(value).length===expected.length&&expected.every(key=>Object.hasOwn(value,key));
function classify(result){
  if(!result||result.error||result.signal||!Number.isInteger(result.status))return {kind:'invalid',reason:'npm process did not complete normally'};
  let data;try{data=JSON.parse(result.stdout);}catch{return {kind:'invalid',reason:'missing or malformed npm JSON'};}
  if(!record(data))return {kind:'invalid',reason:'invalid npm envelope'};
  if(['auditReportVersion','vulnerabilities','metadata'].some(key=>Object.hasOwn(data,key))){
    const counts=data.metadata?.vulnerabilities,dependencies=data.metadata?.dependencies;
    const severities=['info','low','moderate','high','critical'];
    const categories=['prod','dev','optional','peer','peerOptional','total'];
    if(!keys(data,['auditReportVersion','vulnerabilities','metadata'])||data.auditReportVersion!==2||!record(data.vulnerabilities)||!keys(data.metadata,['vulnerabilities','dependencies'])||!keys(counts,[...severities,'total'])||
      ![...severities,'total'].every(key=>Number.isSafeInteger(counts[key])&&counts[key]>=0)||
      counts.total!==severities.reduce((sum,key)=>sum+counts[key],0)||!keys(dependencies,categories)||
      !categories.every(key=>Number.isSafeInteger(dependencies[key])&&dependencies[key]>=0&&dependencies[key]<=dependencies.total)||dependencies.prod<1){
      return {kind:'invalid',reason:'incomplete or inconsistent npm report'};
    }
    if(counts.total>0||Object.keys(data.vulnerabilities).length)return {kind:'findings',reason:'runtime vulnerability findings'};
    return result.status===0?{kind:'pass',reason:'complete zero-vulnerability npm report'}:{kind:'invalid',reason:'nonzero npm exit despite clean-looking report'};
  }
  const error=data.error;
  if(result.status!==0&&Object.keys(data).length===2&&Object.hasOwn(data,'message')&&record(error)&&
    Object.keys(error).length===2&&error.summary===''&&error.detail===''&&
    data.message==='network timeout at: https://registry.npmjs.org/-/npm/v1/security/audits/quick')return {kind:'transport',reason:'observed official Quick network timeout; no report produced'};
  // npm's actual HTTP error serializer has no error.code. Require its structured endpoint and notice.
  if(result.status!==0&&keys(data,['message','method','uri','headers','statusCode','body','error'])&&
    data.method==='POST'&&data.uri==='https://registry.npmjs.org/-/npm/v1/security/audits/quick'&&data.statusCode===400&&
    data.message==='400 Bad Request - POST https://registry.npmjs.org/-/npm/v1/security/audits/quick - Bad Request'&&
    record(data.headers)&&Array.isArray(data.headers['npm-notice'])&&data.headers['npm-notice'].some(notice=>[
      'This endpoint is being retired. Use the bulk advisory endpoint instead.',
      'This endpoint is being retired. Use the bulk advisory endpoint instead. See the following docs for more info: https://api-docs.npmjs.com/#tag/Audit',
    ].includes(notice))&&
    keys(data.body,['statusCode','error','message'])&&data.body.statusCode===400&&data.body.error==='Bad Request'&&
    data.body.message==='Invalid package tree, run  npm install  to rebuild your package-lock.json'&&
    keys(error,['summary','detail'])&&['','audit endpoint returned an error'].includes(error.summary)&&error.detail==='')return {kind:'transport',reason:'observed official retiring Quick fallback; no report produced'};
  if(result.status===0||!keys(data,['error'])||!keys(error,['code','summary','detail'])||typeof error.code!=='string'||typeof error.summary!=='string'||typeof error.detail!=='string')return {kind:'invalid',reason:'no complete audit report'};
  if(['ECONNRESET','ETIMEDOUT','EAI_AGAIN','E500','E502','E503','E504'].includes(error.code))return {kind:'transport',reason:'npm transport '+error.code};
  return {kind:'invalid',reason:'non-retryable npm error '+error.code};
}
function resolveNpmCli(){
  const directory=path.dirname(process.execPath);
  const candidates=[process.env.npm_execpath,path.join(directory,'node_modules/npm/bin/npm-cli.js'),path.resolve(directory,'../lib/node_modules/npm/bin/npm-cli.js')].filter(Boolean);
  for(const candidate of candidates){
    try{
      if(path.basename(candidate)!=='npm-cli.js'||!fs.statSync(candidate).isFile())continue;
      const pkg=JSON.parse(fs.readFileSync(path.resolve(path.dirname(candidate),'../package.json'),'utf8'));
      if(pkg.name==='npm')return fs.realpathSync(candidate);
    }catch{/* Try only another existing installed npm, never install a replacement. */}
  }
  throw new Error('Cannot locate the existing npm CLI; no audit performed.');
}
function executeNpm(args){
  return spawnSync(process.execPath,[resolveNpmCli(),...args],{cwd:path.resolve(__dirname,'../apps/web'),encoding:'utf8',windowsHide:true,shell:false,timeout:PROCESS_TIMEOUT,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
}
async function runRuntimeAudit({execute=executeNpm,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),log=line=>process.stdout.write(line.endsWith('\n')?line:line+'\n')}={}){
  for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++){
    log(`Runtime audit attempt ${attempt}/${MAX_ATTEMPTS}: npm ${AUDIT_ARGS.join(' ')}`);
    let result;try{result=await execute(AUDIT_ARGS);}catch(error){result={error};}
    if(result?.stdout)log(result.stdout);if(result?.stderr)log(result.stderr);
    const verdict=classify(result);
    if(verdict.kind==='pass'){log(`PASS web runtime audit: ${verdict.reason}; attempt ${attempt}/${MAX_ATTEMPTS}`);return {passed:true,attempts:attempt,reason:verdict.reason};}
    if(verdict.kind!=='transport'||attempt===MAX_ATTEMPTS){log(`FAIL web runtime audit: ${verdict.reason}; no clean report accepted`);return {passed:false,attempts:attempt,reason:verdict.reason};}
    // A new npm process retries Bulk first. Findings and unknown reports never retry.
    log(`RETRY web runtime audit: ${verdict.reason}; no report accepted`);await pause(1000);
  }
}
module.exports={runRuntimeAudit,AUDIT_ARGS,classify,resolveNpmCli,executeNpm};
if(require.main===module){
  if(process.argv.length!==2){console.error('Runtime audit accepts no CLI overrides.');process.exitCode=1;}
  else runRuntimeAudit().then(result=>{process.exitCode=result.passed?0:1;}).catch(error=>{console.error(error.message);process.exitCode=1;});
}
