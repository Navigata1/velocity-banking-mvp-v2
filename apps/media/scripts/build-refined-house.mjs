import * as T from '../../web/node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../web/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from '../../web/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFExporter } from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { saveRefinedHero } from './refined-hero-record.mjs';

globalThis.FileReader=class { async readAsArrayBuffer(blob) { this.result=await blob.arrayBuffer(); this.onloadend?.(); } };
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sources=JSON.parse(await readFile(new URL('../sources/house/materials.json',import.meta.url),'utf8'));
for(const source of sources.images) if(hash(await readFile(new URL('../sources/house/'+source.file,import.meta.url)))!==source.sha256) throw new Error('House material source hash mismatch: '+source.file);
const material=(name,color,metalness,roughness)=>Object.assign(new T.MeshStandardMaterial({color,metalness,roughness}),{name});
const stone=material('House-Limestone','#ffffff',0,0.88), oak=material('House-Oak','#a58d75',0,0.63);
const roof=material('House-Standing-Seam','#343d43',0.7,0.43), trim=material('House-Blackened-Aluminum','#242b2d',0.7,0.33);
const paving=material('House-Cut-Paving','#aaa99d',0,0.95), soil=material('House-Garden-Soil','#3b4035',0,1);
const glass=material('House-Glazing','#adc1c1',0.08,0.15); glass.transparent=true; glass.opacity=0.23; glass.side=T.DoubleSide;
const interior=material('House-Warm-Plaster','#8d7759',0,0.95); interior.emissive.set('#6f4c24'); interior.emissiveIntensity=0.13;
const fabric=material('House-Linen','#d9cdb6',0,1), leaf=material('House-Leaf','#3f6131',0,0.9); leaf.side=T.DoubleSide;
const darkLeaf=material('House-Hedge','#284a2e',0,0.95); darkLeaf.side=T.DoubleSide;
const bark=material('House-Bark','#645747',0,1), light=material('House-Warm-Glass','#fff0bc',0,0.45);
light.emissive.set('#ffc271'); light.emissiveIntensity=1.1;
const object=new T.Group(); object.name='InterestShield-house-original-refined-v2';
function add(parent,name,geometry,surface,position=[0,0,0],rotation=[0,0,0]) {
  const mesh=new T.Mesh(geometry,surface); mesh.name=name; mesh.position.set(...position); mesh.rotation.set(...rotation); parent.add(mesh); return mesh;
}
function box(parent,name,size,position,surface=trim,round=0) {
  const geo=round?new RoundedBoxGeometry(...size,2,Math.min(round,...size.map(x=>x/4))):new T.BoxGeometry(...size);
  const p=geo.getAttribute('position'), n=geo.getAttribute('normal'), uv=geo.getAttribute('uv');
  if(surface===stone || surface===oak) for(let i=0;i<p.count;i++) {
    const x=p.getX(i)+position[0],y=p.getY(i)+position[1],z=p.getZ(i)+position[2];
    const divisor=surface===stone?3.1:2;
    uv.setXY(i,(Math.abs(n.getX(i))>0.5?z:x)/divisor,(Math.abs(n.getY(i))>0.5?z:y)/divisor);
  }
  return add(parent,name,geo,surface,position);
}
function wall(name,outline,holes,z,rotation=0) {
  const shape=new T.Shape(outline.map(p=>new T.Vector2(...p)));
  for(const [x,y,w,h] of holes) shape.holes.push(new T.Path([[-w/2+x,-h/2+y],[-w/2+x,h/2+y],[w/2+x,h/2+y],[w/2+x,-h/2+y]].map(p=>new T.Vector2(...p))));
  const geo=new T.ExtrudeGeometry(shape,{depth:0.22,bevelEnabled:false,steps:1});
  const uv=geo.getAttribute('uv');
  // Keep Three's depth-aware reveal charts and the original front-face scale.
  for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)/3.1,uv.getY(i)/3.1);
  return add(object,name,geo,stone,rotation?[z,0,0]:[0,0,z],[0,rotation,0]);
}
const rectangle=(left,right,bottom,top)=>[[left,bottom],[right,bottom],[right,top],[left,top]];
function window(parent,name,x,y,z,w,h) {
  // A shallow open frame and transparent pane reveal authored room depth.
  for(const s of [-1,1]) {
    box(parent,name+'-Jamb-'+s,[0.055,h+0.12,0.2],[x+s*(w/2+0.025),y,z-0.07]);
    box(parent,name+'-Rail-'+s,[w,0.055,0.2],[x,y+s*(h/2+0.025),z-0.07]);
  }
  box(parent,name+'-Glass',[w,h,0.012],[x,y,z-0.025],glass);
  for(let k=1;k<Math.max(2,Math.round(w/0.65));k++) box(parent,name+'-Mullion-'+k,[0.035,h,0.08],[x-w/2+k*w/Math.max(2,Math.round(w/0.65)),y,z+0.025]);
  if(h>3) box(parent,name+'-Transom',[w,0.065,0.1],[x,3.05,z+0.025]);
  box(parent,name+'-Sill',[w+0.22,0.09,0.36],[x,y-h/2-0.09,z-0.015],stone,0.012);
}
const roofs={
  main:{width:5.35,depth:6.75,eave:5.95,rise:1.4},
  tower:{width:3.15,depth:2.65,eave:5.98,rise:1.4},
  garage:{width:3.8,depth:5.05,eave:5.38,rise:1.15},
};
const roofHeight=(spec,offset)=>spec.eave+spec.rise-Math.abs(offset)*spec.rise/(spec.width/2);
const mainEave=roofHeight(roofs.main,2.46), towerEave=roofHeight(roofs.tower,1.35), garageEave=roofHeight(roofs.garage,1.65);
function roofGable(name,x,z,{width,depth,eave,rise},turn=0) {
  const group=new T.Group(); group.position.set(x,0,z); group.rotation.y=turn; object.add(group);
  const half=width/2, angle=Math.atan(rise/half), length=Math.hypot(half,rise);
  for(const side of [-1,1]) {
    const slab=box(group,name+'-Slope-'+side,[length+0.08,0.1,depth],[side*half/2,eave+rise/2,0],roof);
    slab.rotation.z=-side*angle;
    for(let i=0;i<=Math.floor(depth/0.3);i++) {
      const seam=box(group,name+'-Seam-'+(side<0?0:1)+'-'+i,[length+0.1,0.035,0.025],[side*half/2,eave+rise/2+0.067,-depth/2+i*depth/Math.floor(depth/0.3)],roof);
      seam.rotation.z=-side*angle;
    }
    for(const end of [-1,1]) {
      const fascia=box(group,name+'-Fascia-'+side+'-'+end,[length+0.1,0.16,0.075],[side*half/2,eave+rise/2-0.05,end*depth/2],trim);
      fascia.rotation.z=-side*angle;
    }
    box(group,name+'-Gutter-'+side,[0.13,0.13,depth+0.07],[side*(half+0.015),eave-0.03,0]);
  }
  box(group,name+'-Ridge',[0.18,0.1,depth+0.1],[0,eave+rise+0.06,0],roof,0.025);
}

box(object,'House-Garden-Foundation',[11.3,0.25,8.2],[0,0.125,0.65],soil,0.05);
box(object,'House-Ground-Floor',[9.6,0.16,4.6],[0,0.33,0],paving);
const tall=[-3.15,3.1,1.85,4.7], towerUpper=[0.25,4.7,1.8,1.8], entry=[0.25,1.87,1.85,2.9];
wall('House-Facade-Left',rectangle(-4.8,-1.1,0.4,mainEave),[tall],2.24);
wall('House-Facade-Tower',[[-1.1,0.4],[1.6,0.4],[1.6,towerEave],[0.25,roofHeight(roofs.tower,0)],[-1.1,towerEave]],[towerUpper,entry],2.99);
wall('House-Tower-Rear-Gable',[[-1.1,towerEave],[1.6,towerEave],[0.25,roofHeight(roofs.tower,0)]],[],0.68);
wall('House-Facade-Tower-West',rectangle(-3,-1.8,0.4,towerEave),[],-1.1,Math.PI/2);
wall('House-Facade-Tower-East',rectangle(-3,-1.8,0.4,towerEave),[],1.38,Math.PI/2);
const rear=[[-3.3,1.6,1.5,1.8],[-3.3,4.55,1.5,1.8],[-0.4,1.7,1.9,2],[-0.4,4.55,1.9,1.8],[3.15,4.35,1.8,1.45],[3.15,1.6,1.3,1.8]];
wall('House-Facade-Rear',[[-4.8,0.4],[4.9,0.4],[4.9,garageEave],[1.5,garageEave],[1.5,mainEave],[-4.8,mainEave]],rear,-2.46);
const west=[[-0.95,1.6,0.9,1.8],[-0.95,4.5,0.9,1.8],[0.85,1.6,0.9,1.8],[0.85,4.5,0.9,1.8]];
wall('House-Facade-West',[[-2.46,0.4],[2.46,0.4],[2.46,mainEave],[0,roofHeight(roofs.main,0)],[-2.46,mainEave]],west,-4.58,-Math.PI/2);
wall('House-Main-East-Gable',[[-2.46,5.3],[2.46,5.3],[2.46,mainEave],[0,roofHeight(roofs.main,0)],[-2.46,mainEave]],[],1.28,Math.PI/2);
wall('House-Facade-East',[[-2.9,0.4],[2.46,0.4],[2.46,garageEave],[-2.25,garageEave],[-2.25,3.1],[-2.9,3.1]],[[0.8,4.35,1.3,1.5],[0.8,1.6,1.3,1.8]],4.68,Math.PI/2);
wall('House-Garage-Lower-Facade',rectangle(1.6,4.9,0.4,3.12),[[3.25,1.68,2.8,2.5]],2.69);
wall('House-Garage-Upper-Facade',[[1.6,3.1],[4.9,3.1],[4.9,garageEave],[3.25,roofHeight(roofs.garage,0)],[1.6,garageEave]],[[3.25,4.35,2.25,1.5]],2.24);
wall('House-Garage-Rear-Gable',[[1.6,garageEave],[4.9,garageEave],[3.25,roofHeight(roofs.garage,0)]],[],-2.46);
window(object,'House-Tall-Window',...tall.slice(0,2),2.49,...tall.slice(2));
window(object,'House-Tower-Window',0.25,4.7,3.24,1.8,1.8);
window(object,'House-Garage-Upper-Window',3.25,4.35,2.49,2.25,1.5);
const back=new T.Group(); back.rotation.y=Math.PI; back.position.z=-2.46; object.add(back);
rear.forEach(([x,y,w,h],i)=>window(back,'House-Rear-Window-'+i,-x,y,0.025,w,h));
const side=new T.Group(); side.rotation.y=-Math.PI/2; side.position.x=-4.8; object.add(side);
west.forEach(([x,y,w,h],i)=>window(side,'House-West-Window-'+i,x,y,0.025,w,h));
const east=new T.Group(); east.rotation.y=Math.PI/2; east.position.x=4.92; object.add(east);
window(east,'House-East-Window-0',0.8,4.35,0.025,1.3,1.5); window(east,'House-East-Window-1',0.8,1.6,0.025,1.3,1.8);
box(object,'House-Entry-Door',[1.05,2.72,0.13],[0.25,1.84,3.12],oak,0.015);
for(const x of [-0.48,0.98]) window(object,'House-Entry-Sidelight-'+x,x,1.87,3.24,0.25,2.72);
box(object,'House-Entry-Handle',[0.035,0.65,0.065],[0.63,1.8,3.23],trim,0.01);
box(object,'House-Entry-Lintel',[2.7,0.22,0.52],[0.25,3.48,3.18],stone,0.015);
for(const x of [-0.99,1.49]) box(object,'House-Entry-Pier-'+x,[0.24,2.9,0.36],[x,1.94,3.18],stone,0.01);
for(let i=0;i<4;i++) box(object,'House-Garage-Panel-'+i,[2.74,0.51,0.1],[3.25,0.72+i*0.52,2.83],oak,0.008);
for(const x of [2.34,3.25,4.16]) box(object,'House-Garage-Join-'+x,[0.01,2.06,0.006],[x,1.5,2.885],trim);
for(let i=0;i<5;i++) window(object,'House-Garage-Transom-'+i,2.1+i*0.57,2.65,2.94,0.49,0.35);
roofGable('House-Roof-Main',-1.65,0,roofs.main,Math.PI/2);
roofGable('House-Roof-Tower',0.25,2,roofs.tower);
roofGable('House-Roof-Garage',3.25,-0.03,roofs.garage);
const awning=box(object,'House-Garage-Awning',[3.8,0.1,1.1],[3.25,3.16,2.65],roof); awning.rotation.x=0.18;
for(let i=0;i<13;i++) { const seam=box(object,'House-Awning-Seam-'+i,[0.025,0.04,1.12],[1.48+i*0.29,3.23,2.65],roof); seam.rotation.x=0.18; }
box(object,'House-Chimney',[0.66,2.4,0.75],[-3.8,6.65,-0.9],stone,0.015);
box(object,'House-Chimney-Cap',[0.86,0.13,0.94],[-3.8,7.92,-0.9],trim);
for(const x of [-4.76,-1.13,1.64,4.9]) box(object,'House-Downpipe-'+x,[0.07,5.3,0.07],[x,3,2.6],trim,0.02);
for(let i=0;i<3;i++) box(object,'House-Entry-Step-'+i,[2.7+i*0.2,0.11,0.4],[0.25,0.44-i*0.1,3.36+i*0.3],paving,0.02);
for(let x=0;x<7;x++) for(let z=0;z<4;z++) box(object,'House-Drive-Paver-'+x+'-'+z,[0.51,0.045,0.44],[1.75+x*0.53,0.277,3.12+z*0.46],paving,0.008);
box(object,'House-Interior-Floor',[8.9,0.08,4.1],[0,3.07,-0.02],oak);
box(object,'House-Interior-Backdrop',[8.9,5.3,0.12],[0,3.08,-0.35],interior);
box(object,'House-Interior-Sofa',[1.36,0.45,0.65],[-3.15,0.86,1.42],fabric,0.09);
box(object,'House-Interior-Sofa-Back',[1.4,0.68,0.21],[-3.15,1.12,1.11],fabric,0.06);
box(object,'House-Interior-Bed',[1.8,0.45,1.5],[3.25,3.45,1],fabric,0.08);
box(object,'House-Interior-Dining-Table',[0.8,0.09,0.65],[-2.4,1.25,1.85],oak,0.02);
for(const x of [-2.7,-2.1]) for(const z of [1.62,2.08]) box(object,'House-Interior-Table-Leg-'+x+'-'+z,[0.035,0.75,0.035],[x,0.84,z],trim);
for(const [x,y,z] of [[-3.5,1.2,1.45],[-3.1,4.2,1.5],[0.25,5.05,2.2],[3.85,4,1.35]]) {
  box(object,'House-Lamp-Stem-'+x+'-'+y,[0.025,0.5,0.025],[x,y,z],trim);
  add(object,'House-Lamp-Shade-'+x+'-'+y,new T.CylinderGeometry(0.13,0.22,0.25,16),light,[x,y+0.3,z]);
}
for(const x of [-0.92,1.42,1.65,4.86]) {
  box(object,'House-Lantern-Frame-'+x,[0.15,0.56,0.17],[x,2.12,x<1.5?3.3:3.02]);
  box(object,'House-Lantern-Glass-'+x,[0.09,0.44,0.2],[x,2.12,x<1.5?3.32:3.04],light);
}

let seed=10192026;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function foliage(name,center,size,count,surface=leaf) {
  const shapes=[];
  for(let i=0;i<count;i++) {
    const geo=new T.PlaneGeometry(0.08+random()*0.1,0.035+random()*0.04,1,1);
    geo.rotateX(random()*Math.PI); geo.rotateY(random()*Math.PI*2); geo.rotateZ(random()*Math.PI);
    geo.translate((random()-0.5)*size[0],(random()-0.5)*size[1],(random()-0.5)*size[2]); shapes.push(geo);
  }
  const geometry=mergeGeometries(shapes); shapes.forEach(g=>g.dispose());
  return add(object,name,geometry,surface,center);
}
foliage('House-Garden-Hedge-0',[-3.1,0.53,4.55],[4.9,0.5,0.43],1800,darkLeaf);
foliage('House-Garden-Hedge-1',[-5.28,0.5,0.55],[0.4,0.4,7.4],1700,darkLeaf);
box(object,'House-Hedge-Core-0',[4.9,0.32,0.34],[-3.1,0.46,4.55],darkLeaf,0.05);
box(object,'House-Hedge-Core-1',[0.32,0.32,7.4],[-5.28,0.46,0.55],darkLeaf,0.05);
box(object,'House-Garden-Turf',[4.3,0.04,1],[-2.95,0.28,3.9],material('House-Turf','#4d6940',0,1));
foliage('House-Garden-Lawn',[-2.95,0.29,3.9],[4.3,0.035,1],1000,leaf);
for(let i=0;i<10;i++) {
  const x=i<5?-4.5+i*0.7:5.2, z=i<5?2.95:-1.5+(i-5)*1.3;
  add(object,'House-Shrub-Core-'+i,new T.IcosahedronGeometry(0.24,2),darkLeaf,[x,0.58,z]);
  foliage('House-Garden-Shrub-'+i,[x,0.65,z],[i<5?0.62:0.48,0.7,0.65],160,i%2?darkLeaf:leaf);
}
for(let i=0;i<2;i++) {
  const x=-4.9+i*1.8, z=i?2.9:1.8;
  add(object,'House-Garden-Tree-'+i,new T.CylinderGeometry(0.035,0.07,1.5,10),bark,[x,1.01,z]);
  for(let j=0;j<7;j++) {
    const end=new T.Vector3(x+Math.cos(j*2.4)*0.36,1.7+(j%3)*0.22,z+Math.sin(j*2.4)*0.35), start=new T.Vector3(x,1.35,z), delta=end.clone().sub(start);
    const branch=add(object,'House-Tree-Branch-'+i+'-'+j,new T.CylinderGeometry(0.013,0.03,delta.length(),6),bark,start.clone().add(end).multiplyScalar(0.5).toArray());
    branch.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
    foliage('House-Tree-Foliage-'+i+'-'+j,end.toArray(),[0.7,0.7,0.65],120,leaf);
  }
}

// Preserve shared camera/timing while resting on the recognizable front facade.
object.rotation.y=1.45;
const bounds=new T.Box3().setFromObject(object,true), center=bounds.getCenter(new T.Vector3()), size=bounds.getSize(new T.Vector3());
const stage=new T.Group(); stage.name='InterestShield-house-stage'; stage.scale.setScalar(3.2/Math.max(size.x,size.y,size.z));
object.position.set(-center.x,-bounds.min.y,-center.z); stage.add(object); stage.updateMatrixWorld(true);
const raw=Buffer.from(await new GLTFExporter().parseAsync(stage,{binary:true,onlyVisible:true}));
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const document=await io.readBinary(raw), root=document.getRoot();
document.createExtension(EXTTextureWebP).setRequired(true);
async function maps(kind) {
  const n=256, normal=Buffer.alloc(n*n*3), orm=Buffer.alloc(n*n*3);
  const noise=(x,y)=>((Math.imul(x+31,374761393)^Math.imul(y+17,668265263))>>>0)/4294967295;
  for(let y=0;y<n;y++) for(let x=0;x<n;x++) {
    const i=(y*n+x)*3, grain=kind==='oak'?Math.sin(y*2.3+Math.sin(x*0.06)*1.2):noise(x,y)-0.5;
    normal[i]=128+Math.round((noise(x,y)-0.5)*12); normal[i+1]=128+Math.round(grain*(kind==='oak'?13:8)); normal[i+2]=254;
    orm[i]=255; orm[i+1]=Math.round((kind==='oak'?155:219)+grain*14); orm[i+2]=0;
  }
  const texture=async(name,bytes,raw=false)=>document.createTexture(name).setImage(await (raw?sharp(bytes,{raw:{width:n,height:n,channels:3}}):sharp(bytes).resize(1024,1024)).webp({lossless:name.includes('Normal'),quality:88,effort:6}).toBuffer()).setMimeType('image/webp');
  const color=await texture('House-'+kind+'-Albedo',await readFile(new URL('../sources/house/'+(kind==='oak'?'oak':'limestone')+'-albedo-v1.png',import.meta.url)));
  return {color,normal:await texture('House-'+kind+'-Normal',normal,true),orm:await texture('House-'+kind+'-ORM',orm,true)};
}
for(const [name,kind] of [['House-Limestone','limestone'],['House-Oak','oak']]) {
  const map=await maps(kind), surface=root.listMaterials().find(m=>m.getName()===name);
  surface.setBaseColorTexture(map.color).setNormalTexture(map.normal).setNormalScale(0.24).setMetallicRoughnessTexture(map.orm).setRoughnessFactor(1);
  for(const info of [surface.getBaseColorTextureInfo(),surface.getNormalTextureInfo(),surface.getMetallicRoughnessTextureInfo()]) info.setWrapS(10497).setWrapT(10497);
}
root.getAsset().copyright='Original InterestShield House geometry with original AI-generated albedos and authored approximate micro-normal/roughness maps. Not a scanned building or exact poster reconstruction.';
await document.transform(prune(),dedup(),weld(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const output=Buffer.from(await io.writeBinary(document));
const triangles=root.listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
if(output.length>1.25*1024*1024 || triangles>120000) throw new Error('House exceeds its measured shipping budget; existing asset unchanged');
await saveRefinedHero({id:'house',quality:'refined-textured',bytes:output.length,meshes:root.listMeshes().length,triangles,sha256:hash(output),
  sourceSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),sourceFile:'apps/media/scripts/build-refined-house.mjs',materialSourceSha256:hash(JSON.stringify(sources)),
  creator:'InterestShield project',license:'Original project geometry and generated material sources',
  provenance:'Original authored limestone House with actual openings, depth-aware reveal UV charts, standing-seam roof, oak joinery, interiors and planted forecourt; AI-generated albedos with authored approximate PBR maps. Not a scan or exact poster reconstruction.',
  units:'normalized stage units',version:3},undefined,async()=>{
  const target=new URL('../../web/public/heroes/house.glb',import.meta.url), temporary=new URL('../../web/public/heroes/house.glb.tmp',import.meta.url);
  await writeFile(temporary,output); await rename(temporary,target);
});
console.log(`Refined House: ${triangles} triangles, ${root.listTextures().length} embedded textures, ${(output.length/1024).toFixed(0)} KiB.`);
