import { mkdir, copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
const destination=process.argv[2], source=process.argv[3];
if(!destination || !source) throw new Error('Usage: package-hero-collection.mjs <output-directory> <original-image-directory>');
const provenance=JSON.parse(await readFile(new URL('../hero-provenance.json',import.meta.url),'utf8'));
for(const name of ['Full-Resolution-Art','Web-Posters','3D-Studies','Turntables']) await mkdir(path.join(destination,name),{recursive:true});
for(const hero of provenance) {
  await copyFile(path.join(source,hero.source),path.join(destination,'Full-Resolution-Art',`${hero.id}.png`));
  await copyFile(new URL(`../../web/public/heroes/${hero.id}.webp`,import.meta.url),path.join(destination,'Web-Posters',`${hero.id}.webp`));
  await copyFile(new URL(`../../web/public/heroes/${hero.id}.glb`,import.meta.url),path.join(destination,'3D-Studies',`${hero.id}.glb`));
  await copyFile(new URL(`../hyperframes/output/heroes/${hero.id}.mp4`,import.meta.url),path.join(destination,'Turntables',`${hero.id}.mp4`));
}
for(const name of ['hero-provenance.json','hero-models.json']) await copyFile(new URL(`../${name}`,import.meta.url),path.join(destination,name));
await copyFile(new URL('../hyperframes/output/heroes/verification.json',import.meta.url),path.join(destination,'verification.json'));
await copyFile(new URL('../hero-turntables/ASSET-COLLECTION.md',import.meta.url),path.join(destination,'README.md'));
await copyFile(new URL('../../../docs/ASSET-CREDITS.md',import.meta.url),path.join(destination,'ASSET-CREDITS.md'));
console.log(`Packaged ${provenance.length} heroes in ${destination}`);
