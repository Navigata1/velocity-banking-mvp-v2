import * as T from '../../web/node_modules/three/build/three.module.js';
import { GLTFExporter } from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP, KHRTextureTransform } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, readdir, stat } from 'node:fs/promises';
import { saveRefinedHero } from './refined-hero-record.mjs';

globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=JSON.parse(await readFile(new URL('../sources/credit-card/materials.json',import.meta.url)));
const metal=(name,color,roughness,anisotropy=0)=>Object.assign(new T.MeshPhysicalMaterial({color,metalness:1,roughness,anisotropy}),{name});
const silver=metal('CC-Brushed-Silver','#e0e3e5',0.25,source.surfaces.brushedAnisotropy);
const green=metal('CC-Emerald-Metal','#1a624f',0.27,0.5);green.clearcoat=0.65;green.clearcoatRoughness=0.22;
const turned=metal('CC-Turned-Silver','#d9dfe0',0.24,0.25),polish=metal('CC-Polished-Edge','#dce1e4',0.17);
silver.metalness=turned.metalness=0.84;green.metalness=0.9;
const dark=Object.assign(new T.MeshStandardMaterial({color:'#1c2425',roughness:0.7}),{name:'CC-Inset-Polymer'});
const signature=Object.assign(new T.MeshStandardMaterial({color:'#c9d1ca',roughness:0.61}),{name:'CC-Signature-Panel'});
const object=new T.Group();object.name='InterestShield-creditCard-original-refined-v2';
function add(parent,name,geometry,material,position=[0,0,0]) {
  const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);parent.add(mesh);return mesh;
}
function rounded(width,height,radius,x=0,y=0,Type=T.Shape) {
  const s=new Type(),l=x-width/2,r=x+width/2,b=y-height/2,t=y+height/2;
  s.moveTo(l+radius,b);s.lineTo(r-radius,b);s.quadraticCurveTo(r,b,r,b+radius);
  s.lineTo(r,t-radius);s.quadraticCurveTo(r,t,r-radius,t);s.lineTo(l+radius,t);
  s.quadraticCurveTo(l,t,l,t-radius);s.lineTo(l,b+radius);s.quadraticCurveTo(l,b,l+radius,b);s.closePath();return s;
}
function extrude(shape,depth,bevel=0.001,segments=8,faceScale=[1.82,2.87]) {
  const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:segments});
  const p=g.attributes.position,uv=g.attributes.uv;
  // Preserve face/bevel mapping; depth walls need a separate two-dimensional chart.
  for(let i=0;i<p.count;i+=3) {
    const projected=(p.getX(i+1)-p.getX(i))*(p.getY(i+2)-p.getY(i))-(p.getY(i+1)-p.getY(i))*(p.getX(i+2)-p.getX(i));
    const side=Math.abs(projected)<1e-12;
    for(let j=i;j<i+3;j++)uv.setXY(j,
      side?uv.getX(j)/Math.max(...faceScale)+0.5:p.getX(j)/faceScale[0]+0.5,
      side?p.getZ(j)/Math.max(...faceScale)+0.5:p.getY(j)/faceScale[1]+0.5);
  }
  return g;
}
function ribbon(points,width,steps=32) {
  const curve=new T.CatmullRomCurve3(points.map(([x,y])=>new T.Vector3(x,y,0))),left=[],right=[];
  for(let i=0;i<=steps;i++) {
    const t=i/steps,p=curve.getPoint(t),d=curve.getTangent(t),w=width*(0.45+0.55*Math.sin(Math.PI*t))/2;
    left.push([p.x-d.y*w,p.y+d.x*w]);right.push([p.x+d.y*w,p.y-d.x*w]);
  }
  const contour=[...left,...right.reverse()],s=new T.Path();s.moveTo(...contour[0]);for(const p of contour.slice(1))s.lineTo(...p);s.closePath();return s;
}
function card(name,surface,grooves,position,angle,chip=false) {
  const group=new T.Group();group.name=name;group.position.set(...position);group.rotation.set(-0.12,chip?-0.04:0.03,angle);object.add(group);
  const {width,height,cornerRadius,coreDepth,surfaceDepth,grooveWidth}=source.card;
  add(group,name+'-Body',extrude(rounded(width,height,cornerRadius),coreDepth),surface,[0,0,-coreDepth/2]);
  const face=rounded(width-0.014,height-0.014,cornerRadius-0.007);
  for(const points of grooves)face.holes.push(ribbon(points,grooveWidth));
  if(chip)face.holes.push(rounded(0.47,0.37,0.035,-0.46,0.7,T.Path));
  add(group,name+'-Engraved-Face',extrude(face,surfaceDepth,0.002),surface,[0,0,0.012]);
  const rear=new T.Group();rear.name=name+'-Rear-Details';rear.rotation.y=Math.PI;group.add(rear);
  add(rear,name+'-Magstripe',extrude(rounded(1.65,0.26,0.018),0.001,0.0003),dark,[0,0.82,0.012]);
  add(rear,name+'-Signature-Panel',extrude(rounded(1.25,0.19,0.012),0.001,0.0003),signature,[-0.16,0.37,0.012]);
  if(chip) {
    add(group,'CC-Chip-Substrate',extrude(rounded(0.468,0.368,0.034),0.0021,0.0002),dark,[-0.46,0.7,0.0115]);
    for(let row=0;row<4;row++)for(let col=0;col<2;col++) {
      add(group,'CC-Chip-Contact-'+(row*2+col),extrude(rounded(0.206,0.076,0.012),0.0035,0.0005,5),silver,
        [-0.46+(col-0.5)*0.226,0.7+(row-1.5)*0.088,0.014]);
    }
  }
  group.updateMatrixWorld(true);const b=new T.Box3().setFromObject(group,true);group.position.y-=b.min.y;
  return group;
}
card('CC-Emerald-Card',green,source.rearGrooves,[0.3,0,-0.13],0.025);
card('CC-Silver-Card',silver,source.frontGrooves,[-0.2,0,0.16],-0.19,true);

const coin=new T.Group();coin.name='CC-Coin';coin.position.set(0.82,0,0.48);coin.rotation.set(-0.26,-0.08,0.06);object.add(coin);
const profile=[[0,-0.027],[0.461,-0.027],[0.475,-0.02],[0.48,-0.012],[0.48,0.012],[0.475,0.02],[0.461,0.027],[0,0.027]];
const body=new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),384),positions=body.attributes.position;
for(let i=0;i<positions.count;i++) {
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),r=Math.hypot(x,z);
  if(r>0.479) {const delta=0.002*Math.cos(Math.atan2(x,z)*source.surfaces.coinReeds);positions.setXYZ(i,x*(r+delta)/r,y,z*(r+delta)/r);}
}
body.computeVertexNormals();body.rotateX(Math.PI/2);add(coin,'CC-Coin-Body',body,turned);
const wave=[[[ -0.26,-0.29],[-0.19,-0.06],[0.13,0.07],[0.23,0.3]],
  [[-0.06,-0.36],[0.02,-0.16],[0.25,-0.04],[0.34,0.14]]];
for(const [label,side]of [['Front',1],['Rear',-1]]) {
  const frame=new T.Group();frame.rotation.y=side===1?0:Math.PI;coin.add(frame);
  const face=new T.Shape();face.absarc(0,0,0.443,0,Math.PI*2,false);
  for(const path of wave)face.holes.push(ribbon(path,0.014,24));
  const geometry=extrude(face,0.002,0.001,96,[0.91,0.91]);
  add(frame,'CC-Coin-'+label+'-Engraving',geometry,turned,[0,0,0.027]);
  add(frame,'CC-Coin-'+label+'-Rim',new T.TorusGeometry(0.451,0.005,8,128),polish,[0,0,0.03]);
}
coin.updateMatrixWorld(true);coin.position.y-=new T.Box3().setFromObject(coin,true).min.y;
object.rotation.y=0.64;
const bounds=new T.Box3().setFromObject(object,true),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
const stage=new T.Group();stage.name='InterestShield-creditCard-stage';stage.scale.setScalar(3.2/Math.max(size.x,size.y,size.z));object.position.set(-center.x,-bounds.min.y,-center.z);stage.add(object);stage.updateMatrixWorld(true);

const raw=Buffer.from(await new GLTFExporter().parseAsync(stage,{binary:true,onlyVisible:true}));
await MeshoptEncoder.ready;await MeshoptDecoder.ready;await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const document=await io.readBinary(raw),root=document.getRoot();document.createExtension(EXTTextureWebP).setRequired(true);
const noise=(x,y)=>((Math.imul(x+source.surfaces.grainSeed,374761393)^Math.imul(y+17,668265263))>>>0)/4294967295;
async function maps(radial) {
  const n=source.surfaces.resolution,color=Buffer.alloc(n*n*3),normal=Buffer.alloc(n*n*3),orm=Buffer.alloc(n*n*3);
  const height=(x,y)=>{x=(x+n)%n;y=(y+n)%n;const r=Math.hypot(x/n-0.5,y/n-0.5);return radial?Math.sin(r*800)*0.18+noise(x>>2,y>>2)*0.015:(noise(0,y)-0.5)*0.18+Math.sin(y*2.11)*0.05+(noise(x>>6,y)-0.5)*0.005;};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    const i=(y*n+x)*3,h=height(x,y),c=Math.round(249+h*4),dx=(height(x+1,y)-height(x-1,y))*0.08,dy=(height(x,y+1)-height(x,y-1))*0.08,l=Math.hypot(dx,dy,1);
    color[i]=color[i+1]=color[i+2]=c;normal[i]=Math.round(127.5-dx/l*127.5);normal[i+1]=Math.round(127.5-dy/l*127.5);normal[i+2]=Math.round(127.5+127.5/l);
    orm[i]=255;orm[i+1]=Math.round((radial?58:65)+h*16);orm[i+2]=255;
  }
  const texture=async(name,bytes)=>document.createTexture(name).setImage(await sharp(bytes,{raw:{width:n,height:n,channels:3}}).webp({lossless:!name.includes('Roughness'),quality:92,effort:6}).toBuffer()).setMimeType('image/webp');
  const prefix=radial?'CC-Turned':'CC-Brushed';return {color:await texture(prefix+'-Color',color),normal:await texture(prefix+'-Normal',normal),orm:await texture(prefix+'-Roughness-Metal',orm)};
}
const brushed=await maps(false),radial=await maps(true);
const tiling=document.createExtension(KHRTextureTransform);
for(const m of root.listMaterials())if(['CC-Brushed-Silver','CC-Emerald-Metal','CC-Turned-Silver'].includes(m.getName())) {
  const s=m.getName()==='CC-Turned-Silver'?radial:brushed;
  m.setBaseColorTexture(s.color).setNormalTexture(s.normal).setNormalScale(source.surfaces.normalScale).setMetallicRoughnessTexture(s.orm).setRoughnessFactor(1);
  if(m.getName()!=='CC-Turned-Silver')for(const info of [m.getBaseColorTextureInfo(),m.getNormalTextureInfo(),m.getMetallicRoughnessTextureInfo()])info.setWrapS(10497).setWrapT(10497).setExtension('KHR_texture_transform',tiling.createTransform().setScale(source.surfaces.brushedTileScale));
}
root.getAsset().copyright='Original InterestShield silver/emerald card-and-coin geometry and procedural approximate PBR maps. No issuer branding, financial credential or third-party model/texture source. Not a scan or exact poster reconstruction.';
await document.transform(prune(),dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:0.7,error:0.00003,lockBorder:false}),meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeTexcoord:16}));
const output=Buffer.from(await io.writeBinary(document)),target=new URL('../../web/public/heroes/creditCard.glb',import.meta.url);
const triangles=root.listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0),0);
async function sizeOf(url){let n=0;for(const e of await readdir(url,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),url);n+=e.isDirectory()?await sizeOf(p):(await stat(p)).size;}return n;}
const collection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
console.log(JSON.stringify({triangles,textures:root.listTextures().map(t=>({name:t.getName(),bytes:t.getImage().length})),meshes:root.listMeshes().length}));
if(output.length>0.5*1024*1024||collection>10*1024*1024||triangles>75000)throw new Error(`Credit Card exceeds unchanged budgets: ${output.length} model bytes,${collection} public bytes; existing asset unchanged`);
await saveRefinedHero({id:'creditCard',quality:'refined-textured',bytes:output.length,meshes:root.listMeshes().length,triangles,sha256:hash(output),sourceSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),sourceFile:'apps/media/scripts/build-refined-credit-card.mjs',materialSourceSha256:hash(JSON.stringify(source)),creator:'InterestShield project',license:'Original project geometry and procedural material sources',provenance:'Original authored silver/emerald cards with real engraved recesses, depth-aware edge UV charts, eight inset contacts, detailed backs and reeded two-face silver coin; procedural approximate PBR maps. Not a scan or exact poster reconstruction.',units:'normalized stage units',version:3},undefined,async()=>{
  const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
  if(liveCollection>10*1024*1024)throw new Error('Credit Card public budget changed before locked publication; existing asset unchanged');
  const temporary=new URL('../../web/public/heroes/creditCard.glb.tmp',import.meta.url);await writeFile(temporary,output);await rename(temporary,target);
});
console.log(`Refined Credit Card: ${triangles} triangles,${root.listTextures().length} embedded maps,${output.length} bytes; public collection${collection} bytes.`);
