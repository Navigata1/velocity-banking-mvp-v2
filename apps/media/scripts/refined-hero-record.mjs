import { readFile, writeFile, open, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const defaults={
  imported:new URL('../hero-imported.json',import.meta.url),
  inventory:new URL('../hero-models.json',import.meta.url),
};
const filename=value=>value instanceof URL?fileURLToPath(value):resolve(value);

export async function writeHeroManifest(destination, records) {
  const target=filename(destination);
  const temporary=`${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary,JSON.stringify(records,null,2)+'\n');
    await rename(temporary,target);
  } finally {
    await unlink(temporary).catch(error=>{if(error.code!=='ENOENT') throw error;});
  }
}

export async function withHeroManifestLock(action, paths=defaults) {
  const importedPath=filename(paths.imported), inventoryPath=filename(paths.inventory), lockPath=importedPath+'.lock';
  const deadline=Date.now()+10000;
  let lock;
  while(!lock) {
    try { lock=await open(lockPath,'wx'); }
    catch(error) {
      const sharingViolation=process.platform==='win32' && ['EPERM','EACCES'].includes(error.code);
      if(error.code!=='EEXIST' && !sharingViolation) throw error;
      if(Date.now()>=deadline) throw new Error(`Asset manifest lock acquisition timed out (${error.code}): ${lockPath}. If a stale lock exists, verify its recorded owner has stopped before removing it.`);
      await setTimeout(25);
    }
  }
  try {
    await lock.writeFile(JSON.stringify({pid:process.pid}));
    return await action({importedPath,inventoryPath});
  } finally {
    try { await lock.close(); } finally { await unlink(lockPath); }
  }
}

export async function saveRefinedHero(record, paths=defaults, publishAsset) {
  return withHeroManifestLock(async({importedPath,inventoryPath})=>{
    const imported=JSON.parse(await readFile(importedPath,'utf8').catch(error=>{
      if(error.code==='ENOENT') return '[]';
      throw error;
    }));
    const inventory=JSON.parse(await readFile(inventoryPath,'utf8'));
    const update=list=>list.some(item=>item.id===record.id)
      ?list.map(item=>item.id===record.id?record:item):[...list,record];
    if(publishAsset) await publishAsset();
    await writeHeroManifest(importedPath,update(imported));
    await writeHeroManifest(inventoryPath,update(inventory));
  },paths);
}
