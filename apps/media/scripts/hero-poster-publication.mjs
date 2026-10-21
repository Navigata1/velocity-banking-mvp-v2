import { readFile, writeFile, rename, unlink, readdir, stat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { withHeroManifestLock, writeHeroManifest } from './refined-hero-record.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const filename=p=>p instanceof URL?fileURLToPath(p):path.resolve(p);
function revisionOf(record) {
  if(record.revision===undefined)return 1;
  if(!Number.isSafeInteger(record.revision)||record.revision<1)throw new Error('Poster revision must be a positive safe integer');
  return record.revision;
}
async function sizeOf(directory) {
  let total=0;
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name);total+=entry.isDirectory()?await sizeOf(file):(await stat(file)).size;
  }
  return total;
}

export async function publishHeroPosters(entries,options={}) {
  const staged=entries.map(({output,record})=>({output:Buffer.from(output),record:structuredClone(record)}));
  if(new Set(staged.map(e=>e.record.id)).size!==staged.length)throw new Error('Poster publication has duplicate ids');
  for(const {record,output}of staged) {
    revisionOf(record);
    if(!/^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(record.id))throw new Error('Invalid poster id');
    if(record.bytes!==output.length||record.posterSha256!==hash(output))throw new Error('Poster publication hash mismatch');
  }
  const publicRoot=filename(options.publicRoot??new URL('../../web/public/',import.meta.url));
  const provenance=filename(options.provenance??new URL('../hero-provenance.json',import.meta.url));
  await withHeroManifestLock(async()=>{
    const records=JSON.parse(await readFile(provenance,'utf8').catch(error=>{if(error.code==='ENOENT')return '[]';throw error;}));
    if(!Array.isArray(records))throw new Error('Poster provenance must be an array');
    for(const record of records)revisionOf(record);
    let liveBytes=await sizeOf(publicRoot);
    for(const {record,output}of staged) {
      const previous=records.find(r=>r.id===record.id);
      const previousRevision=previous?revisionOf(previous):1,revision=revisionOf(record);
      if(previousRevision>revision)throw new Error('Poster publication cannot downgrade an edited source');
      if(previousRevision>=2&&previousRevision===revision&&previous.posterSha256!==record.posterSha256)throw new Error('Changed edited poster needs a new source revision');
      const target=path.join(publicRoot,'heroes',record.id+'.webp');
      liveBytes-=(await stat(target).catch(error=>{if(error.code==='ENOENT')return {size:0};throw error;})).size;
      liveBytes+=output.length;
    }
    if(liveBytes>10*1024*1024)throw new Error('Poster publication exceeds unchanged 10MiB public budget');
    for(const {record,output}of staged) {
      const target=path.join(publicRoot,'heroes',record.id+'.webp'),temporary=target+'.'+process.pid+'.'+randomUUID()+'.tmp';
      try{await writeFile(temporary,output);await rename(temporary,target);}
      finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
      const index=records.findIndex(r=>r.id===record.id);if(index<0)records.push(record);else records[index]=record;
    }
    await writeHeroManifest(provenance,records);
  },options.lockPaths);
}
