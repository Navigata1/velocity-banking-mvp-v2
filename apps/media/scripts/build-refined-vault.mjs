import * as T from '../../web/node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../web/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { saveRefinedHero } from './refined-hero-record.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result=await blob.arrayBuffer(); this.onloadend?.(); }
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const material=(name,color,metalness,roughness)=>Object.assign(new T.MeshStandardMaterial({color,metalness,roughness}),{name});
const steel=material('Vault-Brushed-Steel','#b6bec4',0.96,0.3);
const turned=material('Vault-Turned-Steel','#c3c9ce',0.96,0.25);
const brass=material('Vault-Interior-Brass','#bf963f',0.92,0.27); brass.side=T.DoubleSide;
const polish=material('Vault-Polished-Edges','#d0d7dd',1,0.16);
const dark=material('Vault-Recesses','#20262a',0.5,0.43);
const rubber=material('Vault-Foot-Pads','#14181a',0,0.85);
const object=new T.Group(); object.name='InterestShield-vault-original-refined-v2';
const add=(parent,name,geometry,surface,position=[0,0,0],rotation=[0,0,0])=>{
  const mesh=new T.Mesh(geometry,surface); mesh.name=name;
  mesh.position.set(...position); mesh.rotation.set(...rotation); parent.add(mesh); return mesh;
};
const box=(parent,name,size,position,surface=steel,r=0.025)=>add(parent,name,new RoundedBoxGeometry(...size,3,r),surface,position);
const cylinder=(parent,name,radius,depth,position,surface=polish,segments=64,open=false)=>
  add(parent,name,new T.CylinderGeometry(radius,radius,depth,segments,1,open),surface,position,[Math.PI/2,0,0]);
const ring=(parent,name,radius,tube,position,surface=polish)=>
  add(parent,name,new T.TorusGeometry(radius,tube,8,96),surface,position);
function bolt(parent,name,position,size=0.045,surface=brass) {
  cylinder(parent,name+'-washer',size*1.38,0.009,position,dark,24);
  cylinder(parent,name,size,0.028,[position[0],position[1],position[2]+0.017],surface,6);
  cylinder(parent,name+'-recess',size*0.36,0.003,[position[0],position[1],position[2]+0.033],dark,6);
}

// Separate shell panels and an annular face preserve a genuinely open chamber.
for(const side of [-1,1]) {
  box(object,`Vault-Shell-Side-${side}`,[0.15,2.4,1.65],[side*1.05,1.37,0]);
  box(object,`Vault-Shell-Cap-${side}`,[1.96,0.15,1.65],[0,1.37+side*1.125,0]);
  box(object,`Vault-Foot-${side}`,[0.42,0.18,1.3],[side*0.82,0.16,0],steel,0.035);
  box(object,`Vault-Foot-Pad-${side}`,[0.38,0.07,1.19],[side*0.82,0.035,0],rubber,0.018);
  bolt(object,`Vault-Foot-Bolt-${side}`,[side*0.82,0.16,0.66],0.035,polish);
}
box(object,'Vault-Shell-Back',[1.98,2.1,0.12],[0,1.37,-0.77]);
box(object,'Vault-Back-Inset',[1.8,1.92,0.018],[0,1.37,-0.838],dark,0.035);
box(object,'Vault-Back-Panel',[1.76,1.88,0.018],[0,1.37,-0.851],steel,0.035);
for(const x of [-0.81,0.81]) for(const y of [0.51,2.23]) {
  const rear=new T.Group(); rear.position.set(x,y,-0.87); rear.rotation.y=Math.PI; object.add(rear);
  bolt(rear,`Vault-Rear-Bolt-${x}-${y}`,[0,0,0],0.025);
}
const face=new T.Shape();
face.moveTo(-1.055,-1.2); face.lineTo(1.055,-1.2); face.quadraticCurveTo(1.125,-1.2,1.125,-1.13);
face.lineTo(1.125,1.13); face.quadraticCurveTo(1.125,1.2,1.055,1.2);
face.lineTo(-1.055,1.2); face.quadraticCurveTo(-1.125,1.2,-1.125,1.13);
face.lineTo(-1.125,-1.13); face.quadraticCurveTo(-1.125,-1.2,-1.055,-1.2); face.closePath();
const opening=new T.Path(); opening.absarc(0,0,0.865,0,Math.PI*2,true); face.holes.push(opening);
add(object,'Vault-Front-Frame',new T.ExtrudeGeometry(face,{depth:0.105,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:0.018,bevelThickness:0.018,curveSegments:96}),steel,[0,1.37,0.785]);
cylinder(object,'Vault-Interior-Liner',0.858,1.38,[0,1.37,0.01],brass,96,true);
cylinder(object,'Vault-Chamber-Back',0.855,0.025,[0,1.37,-0.685],brass,96);
ring(object,'Vault-Chamber-Lip',0.862,0.023,[0,1.37,0.885],brass);
ring(object,'Vault-Chamber-Inner-Seal',0.812,0.018,[0,1.37,0.79],dark);
for(const x of [-0.99,0.99]) for(const y of [0.31,2.43]) bolt(object,`Vault-Frame-Bolt-${x}-${y}`,[x,y,0.92],0.045,brass);
for(let i=0;i<16;i++) {
  const a=i*Math.PI/8, x=Math.sin(a), y=Math.cos(a);
  bolt(object,`Vault-Collar-Bolt-${i}`,[x*0.952,1.37+y*0.952,0.91],0.024,polish);
  if(i%2===0) cylinder(object,`Vault-Locking-Bolt-${i/2}`,0.075,0.17,[x*0.8,1.37+y*0.8,0.87],polish,32);
}
for(const y of [0.66,2.08]) {
  const hinge=new T.Group(); hinge.position.set(1.14,y,0.96); object.add(hinge);
  for(const offset of [-0.16,0,0.16]) {
    const barrel=cylinder(hinge,`Vault-Hinge-${y}-${offset}`,0.105,0.145,[0,offset,0],polish,48);
    barrel.rotation.x=0;
  }
  box(object,`Vault-Hinge-Plate-${y}`,[0.19,0.43,0.07],[1.05,y,0.91],steel,0.02);
}
const pivot=new T.Group(); pivot.name='Vault-DoorPivot'; pivot.position.set(1.14,1.37,0.96); pivot.rotation.y=0.64; object.add(pivot);
for(const y of [-0.71,0.71]) box(pivot,`Vault-Door-Hinge-Link-${y}`,[0.9,0.18,0.12],[-0.36,y,0],polish,0.02);
const door=new T.Group(); door.name='Vault-Door'; door.position.x=-1.14; pivot.add(door);
add(door,'Vault-Door-Mass',new T.LatheGeometry([[0,-0.095],[0.87,-0.095],[0.9,-0.085],[0.91,-0.06],[0.91,0.06],[0.9,0.085],[0.87,0.095],[0,0.095]].map(p=>new T.Vector2(...p)),96),steel,[0,0,0],[Math.PI/2,0,0]);
cylinder(door,'Vault-Door-Inner-Face',0.81,0.035,[0,0,-0.115],brass,96);
cylinder(door,'Vault-Door-Front',0.875,0.025,[0,0,0.105],turned,96);
ring(door,'Vault-Door-Outer-Rim',0.89,0.018,[0,0,0.12],polish);
ring(door,'Vault-Door-Seal',0.855,0.014,[0,0,-0.09],dark);
for(const radius of [0.72,0.43]) ring(door,`Vault-Engraved-Ring-${radius}`,radius,0.004,[0,0,0.12],dark);
for(let i=0;i<16;i++) {
  const a=i*Math.PI/8;
  bolt(door,`Vault-Door-Bolt-${i}`,[Math.sin(a)*0.804,Math.cos(a)*0.804,0.13],0.025);
}
cylinder(door,'Vault-Handle-Hub-Base',0.185,0.1,[0,0,0.18],dark);
cylinder(door,'Vault-Handle-Hub',0.145,0.19,[0,0,0.275],turned);
cylinder(door,'Vault-Handle-Cap',0.149,0.017,[0,0,0.38],polish);
for(let i=0;i<6;i++) {
  const a=i*Math.PI/3, arm=new T.Group(); arm.rotation.z=-a; door.add(arm);
  const shaft=cylinder(arm,`Vault-Handle-Spoke-${i}`,0.024,0.38,[0,0.26,0.29]); shaft.rotation.x=0;
  const grip=cylinder(arm,`Vault-Handle-Grip-${i}`,0.043,0.21,[0,0.49,0.29],turned); grip.rotation.x=0;
  ring(arm,`Vault-Handle-Cuff-${i}`,0.043,0.005,[0,0.385,0.29]).rotation.x=Math.PI/2;
}

const bounds=new T.Box3().setFromObject(object,true), center=bounds.getCenter(new T.Vector3()), size=bounds.getSize(new T.Vector3());
const stage=new T.Group(); stage.name='InterestShield-vault-stage'; stage.scale.setScalar(3.2/Math.max(size.x,size.y,size.z));
object.position.set(-center.x,-bounds.min.y,-center.z); stage.add(object); stage.updateMatrixWorld(true);
const raw=Buffer.from(await new GLTFExporter().parseAsync(stage,{binary:true,onlyVisible:true}));
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const document=await io.readBinary(raw), root=document.getRoot();
document.createExtension(EXTTextureWebP).setRequired(true);
const noise=(x,y)=>((Math.imul(x+31,374761393)^Math.imul(y+17,668265263))>>>0)/4294967295;
async function surfaces(radial) {
  const n=512, color=Buffer.alloc(n*n*3), normal=Buffer.alloc(n*n*3), orm=Buffer.alloc(n*n*3);
  const height=(x,y)=>{
    x=(x+n)%n; y=(y+n)%n;
    const r=Math.hypot(x/n-0.5,y/n-0.5);
    return radial ? Math.sin(r*600)*0.25+noise(x,y)*0.025 : Math.sin(y*2.37)*0.4+noise(x>>4,y)*0.23+noise(x,y)*0.08;
  };
  for(let y=0;y<n;y++) for(let x=0;x<n;x++) {
    const i=(y*n+x)*3, h=height(x,y), grain=248+Math.round(h*5);
    color[i]=color[i+1]=color[i+2]=grain;
    const dx=(height(x+1,y)-height(x-1,y))*0.14, dy=(height(x,y+1)-height(x,y-1))*0.14, length=Math.hypot(dx,dy,1);
    normal[i]=Math.round(127.5-dx/length*127.5); normal[i+1]=Math.round(127.5-dy/length*127.5); normal[i+2]=Math.round(127.5+127.5/length);
    orm[i]=255; orm[i+1]=Math.round((radial?70:94)+h*22); orm[i+2]=255;
  }
  const texture=async(name,bytes)=>document.createTexture(name).setImage(await sharp(bytes,{raw:{width:n,height:n,channels:3}}).webp({lossless:name.includes('normal'),quality:95,effort:6}).toBuffer()).setMimeType('image/webp');
  return {color:await texture(radial?'Turned-color':'Brushed-color',color),normal:await texture(radial?'Turned-normal':'Brushed-normal',normal),orm:await texture(radial?'Turned-roughness-metal':'Brushed-roughness-metal',orm)};
}
const brushed=await surfaces(false), lathe=await surfaces(true);
for(const surface of root.listMaterials()) if(['Vault-Brushed-Steel','Vault-Turned-Steel','Vault-Interior-Brass'].includes(surface.getName())) {
  const maps=surface.getName()==='Vault-Turned-Steel'?lathe:brushed;
  surface.setBaseColorTexture(maps.color).setNormalTexture(maps.normal).setNormalScale(0.16)
    .setMetallicRoughnessTexture(maps.orm).setRoughnessFactor(1);
}
root.getAsset().copyright='Original InterestShield Vault geometry and deterministic PBR maps, authored for this project. No third-party model or texture source.';
await document.transform(prune(),dedup(),weld(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const output=Buffer.from(await io.writeBinary(document));
if(output.length>0.85*1024*1024) throw new Error(`Vault exceeds its 0.85 MiB budget: ${output.length}; existing asset unchanged.`);
const target=new URL('../../web/public/heroes/vault.glb',import.meta.url), temporary=new URL('../../web/public/heroes/vault.glb.tmp',import.meta.url);
const triangles=root.listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((sum,p)=>sum+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
await saveRefinedHero({id:'vault',quality:'refined-textured',bytes:output.length,meshes:root.listMeshes().length,triangles,
  sha256:hash(output),sourceSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),sourceFile:'apps/media/scripts/build-refined-vault.mjs',
  creator:'InterestShield project',license:'Original project asset; no third-party license dependency',
  provenance:'Original authored open-chamber geometry and deterministic brushed/turned metal PBR maps; not an AI reconstruction of the studio poster.',
  units:'normalized stage units',version:2},undefined,async()=>{await writeFile(temporary,output);await rename(temporary,target);});
console.log(`Refined Vault: ${triangles} triangles, ${root.listTextures().length} embedded textures, ${(output.length/1024).toFixed(0)} KiB.`);
