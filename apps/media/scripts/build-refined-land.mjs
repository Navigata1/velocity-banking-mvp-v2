import * as T from '../../web/node_modules/three/build/three.module.js';
import { mergeGeometries } from '../../web/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFExporter } from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, readdir, stat } from 'node:fs/promises';
import { saveRefinedHero } from './refined-hero-record.mjs';

globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=JSON.parse(await readFile(new URL('../sources/land/materials.json',import.meta.url),'utf8'));
for(const s of sources.images) if(hash(await readFile(new URL('../sources/land/'+s.file,import.meta.url)))!==s.sha256) throw new Error('Land source hash mismatch: '+s.file);
const material=(name,color,roughness=0.9,metalness=0)=>Object.assign(new T.MeshStandardMaterial({color,roughness,metalness}),{name});
const meadow=material('Land-Meadow','#b6c9a1'),soil=material('Land-Soil','#5c513b'),bark=material('Land-Bark','#6a5c49');
const gravel=material('Land-Gravel','#b9b5a3'),bedrock=material('Land-Bedrock','#93988f'),subsoil=material('Land-Subsoil','#9c8160');
const leaves=material('Land-Leaves','#bbcf9d');leaves.side=T.DoubleSide;leaves.alphaTest=0.5;leaves.vertexColors=true;
const water=material('Land-Water','#3e7776',0.17,0.28);water.transparent=true;water.opacity=0.84;
const reeds=material('Land-Reeds','#657e3e'),orange=material('Land-Survey-Orange','#e07836'),stake=material('Land-Survey-Wood','#bca279');
const object=new T.Group();object.name='InterestShield-land-original-refined-v2';
function add(name,geometry,surface,position=[0,0,0],parent=object) {const m=new T.Mesh(geometry,surface);m.name=name;m.position.set(...position);parent.add(m);return m;}
function geometry(points,indices,uvs) {const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();return g;}
function merged(name,parts,surface,parent=object) {const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return add(name,g,surface,[0,0,0],parent);}
let seed=20261021;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const noise=(x,y)=>((Math.imul(x+31,374761393)^Math.imul(y+17,668265263))>>>0)/4294967295;
const pond={x:0.7,z:0.65,rx:0.65,rz:0.43,level:0.74};
const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
function height(x,z) {
  const land=0.83+0.065*Math.sin(x*1.9+z*0.8)+0.055*Math.cos(z*2.2-x*0.4)+0.18*Math.exp(-((x+0.15)**2+(z+0.8)**2)*2);
  const r=Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz);
  return land-0.38*(1-smooth((r-0.5)/0.8));
}
function rimRadius(a) {
  let low=0,high=1.5;
  for(let i=0;i<24;i++){const r=(low+high)/2;if(height(pond.x+Math.cos(a)*pond.rx*r,pond.z+Math.sin(a)*pond.rz*r)<pond.level)low=r;else high=r;}
  return (low+high)/2;
}
// Every surface and cut edge samples the same terrain field; the waterline is its level set.
const nx=64,nz=48,points=[],uvs=[],landIndices=[],basinIndices=[];
for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=-2+4*i/nx,z=-1.6+3.2*j/nz;points.push(x,height(x,z),z);uvs.push(x/0.85,z/0.85);}
for(let j=0;j<nz;j++)for(let i=0;i<nx;i++) {
  const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
  for(const tri of [[a,c,b],[b,c,d]]) {
    const x=tri.reduce((s,k)=>s+points[k*3],0)/3,z=tri.reduce((s,k)=>s+points[k*3+2],0)/3;
    const out=Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)<1.28?basinIndices:landIndices;
    out.push(...tri);
  }
}
add('Land-Terrain-Meadow',geometry(points,landIndices,uvs),meadow);
add('Land-Pond-Basin',geometry(points,basinIndices,uvs),soil);
const wp=[pond.x,pond.level+0.003,pond.z],wu=[0.5,0.5],wi=[];
for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,r=rimRadius(a);wp.push(pond.x+Math.cos(a)*pond.rx*r,pond.level+0.003,pond.z+Math.sin(a)*pond.rz*r);wu.push(0.5+Math.cos(a)*0.5,0.5+Math.sin(a)*0.5);if(i)wi.push(0,i+1,i);}
add('Land-Pond-Water',geometry(wp,wi,wu),water);
const layers=[['Bedrock',0.05,0.19,bedrock],['Gravel',0.19,0.34,gravel],['Subsoil',0.34,0.55,subsoil],['Topsoil',0.55,null,soil]];
const layerHeight=(y,x,z)=>y<=0.05?y:y+0.015*Math.sin(x*2.7+z*0.9)+0.006*Math.sin(z*4.7-x*0.5);
for(const [name,bottom,top,surface] of layers) {
  const p=[],uv=[],ix=[],colors=[];
  for(const side of [0,1,2,3]) {
    const count=side<2?nx:nz,offset=p.length/3;
    for(let i=0;i<=count;i++) {
      const t=i/count,x=side===0?-2+4*t:side===1?2-4*t:side===2?-2:2,z=side===0?-1.6:side===1?1.6:side===2?1.6-3.2*t:-1.6+3.2*t;
      const low=layerHeight(bottom,x,z),high=top===null?height(x,z):layerHeight(top,x,z);
      for(let row=0;row<=4;row++) {
        const y=low+(high-low)*row/4,tint=0.65+noise(Math.round(x*19+z*7),Math.round(y*37))*0.35;
        p.push(x,y,z);uv.push(t*4,y*3);colors.push(tint,tint*0.97,tint*0.92);
      }
      if(i<count)for(let row=0;row<4;row++){const a=offset+i*5+row;ix.push(a,a+1,a+5,a+5,a+1,a+6);}
    }
  }
  const g=geometry(p,ix,uv);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));surface.vertexColors=true;add('Land-Cutaway-'+name,g,surface);
}
add('Land-Foundation',new T.BoxGeometry(4,0.05,3.2),bedrock,[0,0.025,0]);
const curve=new T.CatmullRomCurve3([[-1.15,0,1.6],[-0.95,0,0.8],[-0.5,0,0.18],[0.15,0,-0.25],[0.75,0,-0.8],[1.3,0,-1.6]].map(p=>new T.Vector3(...p)));
const pp=[],pu=[],pi=[];
for(let i=0;i<=128;i++) {
  const t=i/128,c=curve.getPoint(t),tangent=curve.getTangent(t),w=0.087+Math.sin(t*17)*0.008;
  for(const s of [-1,1]){const x=T.MathUtils.clamp(c.x+s*tangent.z*w,-1.999,1.999),z=T.MathUtils.clamp(c.z-s*tangent.x*w,-1.599,1.599);pp.push(x,height(x,z)+0.012,z);pu.push((s+1)/2,t*18);}
  if(i<128){const a=i*2;pi.push(a,a+2,a+1,a+1,a+2,a+3);}
}
add('Land-Gravel-Path',geometry(pp,pi,pu),gravel);
function branchGeometry(points,start,end,segments=16,radial=8) {
  const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),g=new T.TubeGeometry(c,segments,1,radial,false),pos=g.getAttribute('position'),uv=g.getAttribute('uv');
  for(let i=0;i<pos.count;i++) {
    const t=Math.floor(i/(radial+1))/segments,center=c.getPointAt(t),p=new T.Vector3().fromBufferAttribute(pos,i).sub(center).multiplyScalar(start+(end-start)*t).add(center);
    pos.setXYZ(i,p.x,p.y,p.z);uv.setXY(i,uv.getY(i)*2,t*3);
  }
  g.computeVertexNormals();return g;
}
for(const [id,x,z] of [[0,-1.25,0.2],[1,-0.25,-1.05],[2,1.4,-0.5]]) {
  const tree=new T.Group();tree.position.set(x,height(x,z),z);object.add(tree);tree.name='Land-Tree-'+id;
  const crown=0.95+id*0.05;
  add('Land-Tree-'+id+'-Trunk',branchGeometry([[0,0,0],[0.018,0.42,0.01],[-0.015,0.8,-0.015],[0.02,crown+0.2,0]],0.09,0.025),bark,[0,0,0],tree);
  const branches=[],foliage=[];
  for(let j=0;j<6;j++){const a=j*Math.PI/3,dx=Math.cos(a)*0.3,dz=Math.sin(a)*0.3;branches.push(branchGeometry([[0,0.15,0],[dx*0.4,0.03,dz*0.4],[dx,height(x+dx,z+dz)-height(x,z)+0.002,dz]],0.055,0.009));}
  for(let j=0;j<13;j++) {
    const a=j*2.399963,r=0.25+(j%3)*0.13,cy=crown+0.2+Math.sin(j*1.3)*0.22,cx=Math.cos(a)*r,cz=Math.sin(a)*r;
    branches.push(branchGeometry([[0,0.55+(j%3)*0.1,0],[cx*0.5,cy-0.1,cz*0.5],[cx,cy,cz]],0.028,0.008));
    for(let k=0;k<90;k++) {
      const h=0.115+random()*0.05,g=new T.PlaneGeometry(h*0.6,h,1,2),p=g.getAttribute('position'),tint=0.48+random()*0.5;
      g.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:p.count},()=>[tint*0.9,tint,tint*0.85]).flat(),3));
      for(let n=0;n<p.count;n++)p.setZ(n,Math.abs(p.getY(n))<h*0.1?0.015:0);
      g.computeVertexNormals();g.rotateX((random()-0.5)*Math.PI);g.rotateY(random()*Math.PI*2);g.rotateZ(random()*Math.PI*2);
      const u=random()*Math.PI*2,v=Math.acos(2*random()-1),rr=Math.cbrt(random())*0.32;
      g.translate(cx+Math.cos(u)*Math.sin(v)*rr,cy+Math.cos(v)*rr*0.8,cz+Math.sin(u)*Math.sin(v)*rr);foliage.push(g);
    }
  }
  merged('Land-Tree-'+id+'-Branches',branches,bark,tree);merged('Land-Tree-'+id+'-Leaves',foliage,leaves,tree);
}
let stakeId=0;
for(const x of [-1.9,1.9])for(const z of [-1.5,1.5]) {
  const y=height(x,z),id=stakeId++;
  add('Land-Survey-Stake-'+id,new T.CylinderGeometry(0.018,0.021,0.23,8),stake,[x,y+0.115,z]);
  add('Land-Survey-Marker-'+id,new T.BoxGeometry(0.035,0.075,0.03),orange,[x,y+0.2,z]);
}
const stones=[];
for(let i=0;i<25;i++) {
  const a=i*2.399963,r=1.05+random()*0.3,x=pond.x+Math.cos(a)*pond.rx*r,z=pond.z+Math.sin(a)*pond.rz*r;
  const radius=0.035+random()*0.045,g=new T.IcosahedronGeometry(radius,1);g.scale(1.3,0.7,0.9);g.rotateY(a);g.translate(x,height(x,z)+radius*0.28,z);stones.push(g);
}
merged('Land-Shore-Stones',stones,bedrock);
const blades=[];
for(let i=0;i<110;i++) {
  const a=random()*Math.PI*2,r=rimRadius(a)+0.03+random()*0.12,x=pond.x+Math.cos(a)*pond.rx*r,z=pond.z+Math.sin(a)*pond.rz*r,y=height(x,z),h=0.09+random()*0.15,w=0.012;
  const g=geometry([-w,0,0,w,0,0,0,h*0.6,0.02,0,h,0.06],[0,2,1,1,2,3],[0,0,1,0,0.5,0.6,0.5,1]);g.rotateY(a);g.translate(x,y,z);blades.push(g);
}
reeds.side=T.DoubleSide;merged('Land-Pond-Reeds',blades,reeds);
const inclusions=[],exposedRoots=[];
for(let side=0;side<4;side++) {
  const point=(t,y,out=0.003)=>side<2?new T.Vector3(t,y,(side===0?-1:1)*(1.6+out)):new T.Vector3((side===2?-1:1)*(2+out),y,t);
  for(let i=0;i<30;i++) {
    const span=side<2?3.8:3,radius=0.025+random()*0.035,c=point((random()-0.5)*span,0.11+random()*0.38,-0.014),g=new T.IcosahedronGeometry(radius,0);
    g.scale(1,0.7,0.48);if(side>=2)g.rotateY(Math.PI/2);g.translate(...c.toArray());inclusions.push(g);
  }
  for(let i=0;i<6;i++) {
    const t=(random()-0.5)*(side<2?3.8:3),start=point(t,0);start.y=height(start.x,start.z)-0.025;
    exposedRoots.push(branchGeometry([start.toArray(),point(t+0.025,0.67).toArray(),point(t-0.025,0.57+random()*0.04).toArray()],0.006,0.0018,8,4));
  }
}
merged('Land-Cutaway-Inclusions',inclusions,bedrock);merged('Land-Cutaway-Roots',exposedRoots,bark);
const grassBlades=[];
for(let i=0;i<280;i++) {
  const x=(random()-0.5)*3.95,z=(random()-0.5)*3.15;
  if(Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)<1.35)continue;
  let nearPath=false;for(let j=0;j<=64;j++){const c=curve.getPoint(j/64);if(Math.hypot(x-c.x,z-c.z)<0.14){nearPath=true;break;}}if(nearPath)continue;
  const h=0.035+random()*0.05,g=geometry([-0.008,0,0,0.008,0,0,0,h*0.6,0.015,0,h,0.025],[0,2,1,1,2,3],[0,0,1,0,0.5,0.6,0.5,1]);g.rotateY(random()*Math.PI*2);g.translate(x,height(x,z),z);grassBlades.push(g);
}
merged('Land-Meadow-Blades',grassBlades,reeds);
const lily=material('Land-Lily','#688c45');lily.side=T.DoubleSide;
for(let i=0;i<7;i++) {
  const a=i*2.399963,r=0.2+random()*0.4,x=pond.x+Math.cos(a)*pond.rx*r,z=pond.z+Math.sin(a)*pond.rz*r,shape=new T.Shape();
  shape.moveTo(0,0);shape.absarc(0,0,0.02+random()*0.012,0.18,Math.PI*2-0.18,false);shape.lineTo(0,0);
  const g=new T.ShapeGeometry(shape,10);g.rotateX(-Math.PI/2);add('Land-Lily-Pad-'+i,g,lily,[x,pond.level+0.006,z]);
}

const bounds=new T.Box3().setFromObject(object,true),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
const stage=new T.Group();stage.name='InterestShield-land-stage';stage.scale.setScalar(3.2/Math.max(size.x,size.y,size.z));object.position.set(-center.x,-bounds.min.y,-center.z);stage.add(object);stage.updateMatrixWorld(true);
const raw=Buffer.from(await new GLTFExporter().parseAsync(stage,{binary:true,onlyVisible:true}));
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const document=await io.readBinary(raw),root=document.getRoot();document.createExtension(EXTTextureWebP).setRequired(true);
const texture=async(name,bytes,width,height,raw=false)=>document.createTexture(name).setImage(await(raw?sharp(bytes,{raw:{width,height,channels:3}}):sharp(bytes).resize(width,height)).webp({quality:84,lossless:name.includes('Normal'),effort:6}).toBuffer()).setMimeType('image/webp');
async function surfaces(kind) {
  const n=128,color=Buffer.alloc(n*n*3),normal=Buffer.alloc(n*n*3),orm=Buffer.alloc(n*n*3);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    const i=(y*n+x)*3,a=noise(x,y),b=kind==='bark'?Math.sin(x*0.7+Math.sin(y*0.08)*1.1):Math.sin(x*0.6)*Math.sin(y*0.7),c=Math.round(160+a*25+b*15);
    color[i]=color[i+1]=color[i+2]=c;normal[i]=128+Math.round((kind==='bark'?b:a-0.5)*20);normal[i+1]=128+Math.round((a-0.5)*15);normal[i+2]=253;
    orm[i]=255;orm[i+1]=Math.round(213+a*30);orm[i+2]=0;
  }
  const base=kind==='meadow'?await texture('Land-Meadow-Albedo',await readFile(new URL('../sources/land/meadow-albedo-v1.png',import.meta.url)),448,448):await texture('Land-'+kind+'-Albedo',color,n,n,true);
  return {color:base,normal:await texture('Land-'+kind+'-Normal',normal,n,n,true),orm:await texture('Land-'+kind+'-ORM',orm,n,n,true)};
}
for(const [kind,names] of [['meadow',['Land-Meadow']],['soil',['Land-Soil','Land-Gravel','Land-Bedrock','Land-Subsoil']],['bark',['Land-Bark']]]) {
  const maps=await surfaces(kind);
  for(const name of names) {const m=root.listMaterials().find(m=>m.getName()===name);m.setBaseColorTexture(maps.color).setNormalTexture(maps.normal).setNormalScale(0.22).setMetallicRoughnessTexture(maps.orm).setRoughnessFactor(1);for(const i of [m.getBaseColorTextureInfo(),m.getNormalTextureInfo(),m.getMetallicRoughnessTextureInfo()])i.setWrapS(10497).setWrapT(10497);}
}
root.listMaterials().find(m=>m.getName()==='Land-Leaves').setBaseColorTexture(await texture('Land-Oak-Leaf-Albedo-Opacity',await readFile(new URL('../sources/land/oak-leaf-albedo-v1.png',import.meta.url)),256,384));
const rn=128,ripple=Buffer.alloc(rn*rn*3);
for(let y=0;y<rn;y++)for(let x=0;x<rn;x++){const i=(y*rn+x)*3;ripple[i]=128+Math.round(Math.sin(y*0.22+x*0.05)*12);ripple[i+1]=128+Math.round(Math.cos(x*0.18-y*0.08)*10);ripple[i+2]=254;}
root.listMaterials().find(m=>m.getName()==='Land-Water').setNormalTexture(await texture('Land-Water-Normal',ripple,rn,rn,true)).setNormalScale(0.18);
root.getAsset().copyright='Original InterestShield Land terrain/tree/cutaway geometry. Original generated meadow/leaf images and deterministic approximate surface maps. Not a surveyed parcel or exact poster reconstruction.';
await document.transform(prune(),dedup(),weld(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const output=Buffer.from(await io.writeBinary(document)),target=new URL('../../web/public/heroes/land.glb',import.meta.url);
const triangles=root.listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((t,p)=>t+p.getIndices().getCount()/3,0),0);
async function sizeOf(url){let n=0;for(const e of await readdir(url,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),url);n+=e.isDirectory()?await sizeOf(p):(await stat(p)).size;}return n;}
const collection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
if(output.length>0.7*1024*1024 || collection>10*1024*1024 || triangles>100000)throw new Error(`Land exceeds standing budgets: ${output.length} model bytes,${collection} collection bytes; existing asset unchanged`);
await saveRefinedHero({id:'land',quality:'refined-textured',bytes:output.length,meshes:root.listMeshes().length,triangles,sha256:hash(output),sourceSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),sourceFile:'apps/media/scripts/build-refined-land.mjs',materialSourceSha256:hash(JSON.stringify(sources)),creator:'InterestShield project',license:'Original project geometry and generated material sources',provenance:'Original authored terrain with recessed pond, draped gravel path, exposed layers, grounded stakes and connected trees; generated meadow/leaf albedos with approximate authored surface maps. Not a scan or exact poster reconstruction.',units:'normalized stage units',version:2},undefined,async()=>{
  const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
  if(liveCollection>10*1024*1024)throw new Error('Land collection budget changed before locked publication; existing asset unchanged');
  const temporary=new URL('../../web/public/heroes/land.glb.tmp',import.meta.url);await writeFile(temporary,output);await rename(temporary,target);
});
console.log(`Refined Land: ${triangles} triangles,${root.listTextures().length} embedded textures,${(output.length/1024).toFixed(0)}KiB; collection ${(collection/1024/1024).toFixed(2)}MiB.`);
