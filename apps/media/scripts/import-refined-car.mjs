import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
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
  simplify({simplifier:MeshoptSimplifier,ratio:0.55,error:0.0003,lockBorder:true}),
  textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:90,effort:80}),
  meshopt({encoder:MeshoptEncoder,level:'high'}));
// A tiled tangent-space normal is data: lossy color compression changes its directions.
paintNormal.setImage(sourcePaintNormal).setMimeType('image/png');
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
const meshes=root.listMeshes().length;
const triangles=root.listMeshes().reduce((sum,mesh)=>sum+mesh.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
const imported={id:'car',quality:'refined-textured',bytes:output.length,meshes,triangles,sha256:hash(output),sourceSha256:expectedSha,
  sourceUrl,sourceRevision:revision,creator:'Eric Chadwick / Darmstadt Graphics Group GmbH',license:'CC-BY-4.0',
  licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourcePage:'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept',
  excludedTrademarkTextureSha256,
  modifications:'Removed logo-bearing license plate, steering emblem and shared Khronos logo texture with all references; removed unused variants; simplified within 0.03% mesh error; WebP textures <=1024 except byte-preserved source paint normal PNG; Meshopt; normalized stage units.',
  sourcePaintNormalSha256,
  provenance:'Adapted licensed Car Concept; not an AI reconstruction of the studio poster.',version:2};
await saveRefinedHero(imported,undefined,async()=>{await writeFile(temporary,output);await rename(temporary,target);});
console.log(`Refined car: ${triangles} triangles, ${root.listTextures().length} textures, ${(output.length/1024).toFixed(0)} KiB.`);
