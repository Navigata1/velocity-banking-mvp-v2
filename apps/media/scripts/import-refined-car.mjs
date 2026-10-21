import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, meshopt, listTextureSlots } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, readdir, stat } from 'node:fs/promises';
import { saveRefinedHero } from './refined-hero-record.mjs';
const revision='15cd02d304e54cb42a4db4eefe719f76190f4b68';
const sourceUrl=`https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${revision}/Models/CarConcept/glTF-Binary/CarConcept.glb`;
const expectedSha='c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const response=process.argv[2] ? null : await fetch(sourceUrl);
if(response && !response.ok) throw new Error(`Asset download failed: ${response.status}`);
const source=process.argv[2] ? await readFile(process.argv[2]) : Buffer.from(await response.arrayBuffer());
if(hash(source)!==expectedSha) throw new Error('Source hash mismatch; existing model was not changed.');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder,
});
const document=await io.readBinary(source), root=document.getRoot();
const sourcePaintNormalSha256='3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e';
const paintNormal=root.listMaterials().find(material=>material.getName()==='Paint 1 Carmine')?.getNormalTexture();
if(!paintNormal || hash(paintNormal.getImage())!==sourcePaintNormalSha256) throw new Error('Pinned paint normal was not found; existing model was not changed.');
const sourcePaintNormal=Buffer.from(paintNormal.getImage());
const excludedTrademarkTextureSha256='1453559c58526ec236ea7f90a72b0e49823061e6c26b571928b9ea3b91593e4d';
const trademarkTexture=root.listTextures().find(texture=>hash(texture.getImage())===excludedTrademarkTextureSha256);
if(!trademarkTexture) throw new Error('Expected separately licensed logo texture was not found.');
for(const material of root.listMaterials()) {
  if(material.getEmissiveTexture()===trademarkTexture) material.setEmissiveFactor([0,0,0]);
}
trademarkTexture.dispose();
for(const node of root.listNodes()) if(/License Plate|InteriorSteeringEmblem/.test(node.getName())) node.dispose();
for(const extension of root.listExtensionsUsed()) if(extension.extensionName==='KHR_materials_variants') extension.dispose();
await document.transform(prune(),dedup(),weld(),
  simplify({simplifier:MeshoptSimplifier,ratio:0.55,error:0.0003,lockBorder:true}));
const restoredMaterials=new Set(['Mechanical','Interior 1','Floormat','Interior 3 Carmine','Panel Sides','Interior 2','Disc','Tiretread']);
const normalMaterials=root.listMaterials().filter(material=>restoredMaterials.has(material.getName()));
const originalNormals=new Map(normalMaterials.map(material=>[material.getNormalTexture(),Buffer.from(material.getNormalTexture().getImage())]));
if(normalMaterials.length!==8||originalNormals.size!==5)throw new Error('Car normal-source binding set changed; existing asset was not changed.');
for(const texture of originalNormals.keys())if(listTextureSlots(texture).some(slot=>slot!=='normalTexture'))throw new Error('Car normal data has an unexpected non-normal consumer.');
await document.transform(
  textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:90,effort:80}),
  meshopt({encoder:MeshoptEncoder,level:'high'}));
// A tiled tangent-space normal is data: lossy color compression changes its directions.
paintNormal.setImage(sourcePaintNormal).setMimeType('image/png');
for(const[texture,image]of originalNormals){
  const encoded=await sharp(image).webp({lossless:true,quality:100,effort:6}).toBuffer();
  const original=await sharp(image).removeAlpha().raw().toBuffer(),decoded=await sharp(encoded).removeAlpha().raw().toBuffer();
  if(!decoded.equals(original))throw new Error('Car lossless normal encoding changed source pixels; existing asset was not changed.');
  texture.setImage(encoded).setMimeType('image/webp');
}
function cleanCarReferences(root){
  const extension=root.listExtensionsUsed().find(item=>item.extensionName==='KHR_materials_iridescence');
  const properties=extension?.listProperties()??[];
  if(!extension||extension.isRequired()||properties.some(property=>property.listParents().length))throw new Error('Car iridescence cleanup requires only unattached optional properties.');
  // Earlier material pruning leaves unattached iridescence properties holding this image.
  const orphans=root.listTextures().filter(texture=>texture.listParents().every(parent=>parent===root||properties.includes(parent)));
  if(orphans.length!==1||orphans[0].getMimeType()!=='image/webp'||orphans[0].getImage().length!==40620||
    hash(orphans[0].getImage())!=='91528e0787ccc359eb09779d727bfa40545837d9c7a52a2bf0a2aba971f5847b'||Object.keys(orphans[0].getExtras()).length){
    throw new Error('Expected unused Car image changed; refusing reference cleanup.');
  }
  extension.dispose();orphans[0].dispose();
}
cleanCarReferences(root);
const scene=root.listScenes()[0], bounds=getBounds(scene);
const scale=3.2/Math.max(...bounds.max.map((value,index)=>value-bounds.min[index]));
const parent=document.createNode('InterestShield-car-refined-v1').setScale([scale,scale,scale])
  .setTranslation([-(bounds.min[0]+bounds.max[0])*0.5*scale,-bounds.min[1]*scale,-(bounds.min[2]+bounds.max[2])*0.5*scale]);
for(const child of scene.listChildren()) parent.addChild(child);
scene.addChild(parent);
root.getAsset().copyright+=' Modified for InterestShield: logo-bearing plates and shared logo texture removed, geometry/textures optimized and stage normalized. Original base model: Unity Fan, CC0.';
const output=Buffer.from(await io.writeBinary(document));
if(output.length>2.25*1024*1024) throw new Error(`Refined model exceeds budget: ${output.length} bytes; existing model was not changed.`);
const target=new URL('../../web/public/heroes/car.glb',import.meta.url), temporary=new URL('../../web/public/heroes/car.glb.tmp',import.meta.url);
async function sizeOf(url){let bytes=0;for(const entry of await readdir(url,{withFileTypes:true})){const file=new URL(entry.name+(entry.isDirectory()?'/':''),url);bytes+=entry.isDirectory()?await sizeOf(file):(await stat(file)).size;}return bytes;}
const meshes=root.listMeshes().length;
const triangles=root.listMeshes().reduce((sum,mesh)=>sum+mesh.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
const imported={id:'car',quality:'refined-textured',bytes:output.length,meshes,triangles,sha256:hash(output),sourceSha256:expectedSha,
  sourceUrl,sourceRevision:revision,recipeSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),
  creator:'Eric Chadwick / Darmstadt Graphics Group GmbH',license:'CC-BY-4.0',
  licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourcePage:'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept',
  excludedTrademarkTextureSha256,
  modifications:'Removed logo-bearing license plate, steering emblem and shared Khronos logo texture with all references; removed unused variants, final orphan image and stale optional iridescence; simplified within 0.03% mesh error; five full-resolution lossless WebP normal maps, byte-preserved source paint normal PNG, other textures including Tireside retain prior conversion; Meshopt; normalized stage units.',
  sourcePaintNormalSha256,
  provenance:'Adapted licensed Car Concept; not an AI reconstruction of the studio poster.',version:3};
await saveRefinedHero(imported,undefined,async()=>{
  const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
  if(liveCollection>10*1024*1024)throw new Error('Car public budget changed before locked publication; existing asset unchanged.');
  await writeFile(temporary,output);await rename(temporary,target);
});
console.log(`Refined car: ${triangles} triangles, ${root.listTextures().length} textures, ${(output.length/1024).toFixed(0)} KiB.`);
