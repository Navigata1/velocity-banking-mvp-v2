import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const full=process.argv.includes('--full'),label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)??(full?'full-red':'red');
const args=['--test',...(full?['scripts/*.test.mjs']:['scripts/recreation-refinement.test.mjs'])];
const result=spawnSync(process.execPath,args,{cwd:new URL('../../../apps/media/',import.meta.url),encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
await writeFile(new URL('worker-'+label+'.stdout.log',import.meta.url),result.stdout??'');
await writeFile(new URL('worker-'+label+'.stderr.log',import.meta.url),result.stderr??'');
await writeFile(new URL('worker-'+label+'.status.json',import.meta.url),JSON.stringify({command:[process.execPath,...args],cwd:new URL('../../../apps/media/',import.meta.url).href,status:result.status,signal:result.signal,error:result.error?.message??null},null,2)+'\n');
process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');if(result.error)console.error(result.error);process.exitCode=result.status??1;
