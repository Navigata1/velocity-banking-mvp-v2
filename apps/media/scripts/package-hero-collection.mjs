import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { withHeroManifestLock } from './refined-hero-record.mjs';
const destination=process.argv[2], source=process.argv[3];
if(!destination || !source) throw new Error('Usage: package-hero-collection.mjs <output-directory> <original-image-directory>');
await withHeroManifestLock(async()=>{
  const provenanceBytes=await readFile(new URL('../hero-provenance.json',import.meta.url));
  const modelBytes=await readFile(new URL('../hero-models.json',import.meta.url));
  const videoBytes=await readFile(new URL('../hyperframes/output/heroes/verification.json',import.meta.url));
  const provenance=JSON.parse(provenanceBytes.toString('utf8')),models=JSON.parse(modelBytes.toString('utf8')),videos=JSON.parse(videoBytes.toString('utf8'));
  for(const name of ['Full-Resolution-Art','Web-Posters','3D-Studies','Turntables'])await mkdir(path.join(destination,name),{recursive:true});
  const deliver=async(from,to,expected)=>{
    const bytes=await readFile(from);
    if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('Package source hash mismatch: '+String(from));
    await writeFile(to,bytes);
  };
  for(const hero of provenance) {
    const editedRoot=new URL('../sources/',import.meta.url),projectRoot=new URL('../../../',import.meta.url);
    const sourceFile=hero.sourceFile?new URL(hero.sourceFile,projectRoot):path.join(source,hero.source);
    if(hero.sourceFile&&!sourceFile.href.startsWith(editedRoot.href))throw new Error('Edited poster source must stay within media sources');
    await deliver(sourceFile,path.join(destination,'Full-Resolution-Art',hero.id+'.png'),hero.sourceSha256);
    await deliver(new URL(`../../web/public/heroes/${hero.id}.webp`,import.meta.url),path.join(destination,'Web-Posters',hero.id+'.webp'),hero.posterSha256);
    await deliver(new URL(`../../web/public/heroes/${hero.id}.glb`,import.meta.url),path.join(destination,'3D-Studies',hero.id+'.glb'),models.find(m=>m.id===hero.id)?.sha256);
    await deliver(new URL(`../hyperframes/output/heroes/${hero.id}.mp4`,import.meta.url),path.join(destination,'Turntables',hero.id+'.mp4'),videos.find(v=>v.id===hero.id)?.sha256);
  }
  for(const [name,bytes]of [['hero-provenance.json',provenanceBytes],['hero-models.json',modelBytes],['verification.json',videoBytes]])await writeFile(path.join(destination,name),bytes);
  await writeFile(path.join(destination,'README.md'),await readFile(new URL('../hero-turntables/ASSET-COLLECTION.md',import.meta.url)));
  await writeFile(path.join(destination,'ASSET-CREDITS.md'),await readFile(new URL('../../../docs/ASSET-CREDITS.md',import.meta.url)));
  console.log(`Packaged ${provenance.length} verified heroes in ${destination}`);
});
