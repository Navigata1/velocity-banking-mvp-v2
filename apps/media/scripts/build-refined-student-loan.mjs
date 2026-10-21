import * as T from '../../web/node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../web/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from '../../web/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFExporter } from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP, KHRTextureTransform } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, readdir, stat } from 'node:fs/promises';
import { saveRefinedHero } from './refined-hero-record.mjs';

globalThis.FileReader=class { async readAsArrayBuffer(blob) { this.result=await blob.arrayBuffer();this.onloadend?.(); } };
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=JSON.parse(await readFile(new URL('../sources/student-loan/materials.json',import.meta.url)));
for(const image of source.images)if(hash(await readFile(new URL('../sources/student-loan/'+image.file,import.meta.url)))!==image.sha256)throw new Error('Student Loan source image hash mismatch');
const material=(name,color,roughness,metalness=0)=>Object.assign(new T.MeshPhysicalMaterial({color,roughness,metalness}),{name});
const cloth=material('SL-Cloth-Navy','#101831',0.86);cloth.sheen=0.16;cloth.sheenRoughness=0.7;cloth.sheenColor.set('#41495b');
const green=material('SL-Leather-Green','#143322',0.64),oxblood=material('SL-Leather-Oxblood','#40271e',0.64);
green.clearcoat=oxblood.clearcoat=0.12;green.clearcoatRoughness=oxblood.clearcoatRoughness=0.5;
const paper=material('SL-Paper','#eee6ce',0.9),satin=material('SL-Satin-Green','#155541',0.38);
satin.sheen=0.8;satin.sheenColor.set('#87b8a4');satin.sheenRoughness=0.38;
const gold=material('SL-Gold','#c7a36a',0.43,0.5);
const object=new T.Group();object.name='InterestShield-studentLoan-original-refined-v2';
function add(parent,name,geometry,surface,position=[0,0,0]) {
  const mesh=new T.Mesh(geometry,surface);mesh.name=name;mesh.position.set(...position);parent.add(mesh);return mesh;
}
function box(parent,name,size,position,surface,radius=0) {
  return add(parent,name,radius?new RoundedBoxGeometry(...size,2,Math.min(radius,...size.map(v=>v/3))):new T.BoxGeometry(...size),surface,position);
}
function tube(parent,name,points,radius,surface,segments=32,sides=6) {
  return add(parent,name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,radius,sides,false),surface);
}
function book(name,base,surface,angle) {
  const group=new T.Group();group.name=name;group.position.y=base;group.rotation.y=angle;object.add(group);
  box(group,name+'-Bottom-Cover',[2.16,0.035,1.54],[0,0.0175,0],surface,0.018);
  box(group,name+'-Top-Cover',[2.16,0.035,1.54],[0,0.3825,0],surface,0.018);
  const leaves=[];
  for(let i=0;i<64;i++) {
    const geometry=new T.BoxGeometry(2.07+(i%7)*0.0006,0.0046,1.40+(i%5)*0.0005);
    geometry.translate(0,0.0365+i*0.0052,-0.015);leaves.push(geometry);
  }
  add(group,name+'-Pages',mergeGeometries(leaves),paper);leaves.forEach(g=>g.dispose());
  const spine=new T.CylinderGeometry(0.2,0.2,2.16,48,1,false);spine.rotateZ(Math.PI/2);spine.scale(1,1,0.35);
  add(group,name+'-Spine',spine,surface,[0,0.2,0.735]);
  for(let i=0;i<5;i++) {
    const band=new T.TorusGeometry(0.199,0.008,6,32,Math.PI);band.rotateZ(-Math.PI/2);band.rotateY(-Math.PI/2);band.scale(2.4,1,0.35);
    add(group,name+'-Binding-Band-'+i,band,gold,[(i-2)*0.42,0.2,0.735]);
  }
  return group;
}
book('SL-Book-Lower',0,oxblood,-0.11);book('SL-Book-Upper',0.4,green,0.1);

const cap=new T.Group();cap.name='SL-Cap';cap.rotation.y=0.15;object.add(cap);
const crownProfile=[[0.58,0],[0.58,0.015],[0.615,0.51],[0.605,0.535],[0,0.535],[0,0.49],[0.56,0.49],[0.545,0.025],[0.545,0],[0.58,0]];
add(cap,'SL-Cap-Crown',new T.LatheGeometry(crownProfile.map(p=>new T.Vector2(...p)),96),cloth,[0,0.78,0]);
box(cap,'SL-Cap-Board',[2.15,0.08,2.15],[0,1.35,0],cloth,0.035);
const hem=new T.TorusGeometry(0.582,0.0045,6,96);hem.rotateX(Math.PI/2);add(cap,'SL-Cap-Hem',hem,cloth,[0,0.797,0]);
const button=new T.SphereGeometry(0.06,32,12);button.scale(1,0.45,1);add(cap,'SL-Cap-Button',button,cloth,[0,1.41,0]);
const cordPath=new T.CatmullRomCurve3([[0,1.425,0],[0.35,1.403,0.1],[0.85,1.403,0.34],[1.06,1.378,0.44],[1.15,1.16,0.59],[1.22,0.9,0.72]].map(p=>new T.Vector3(...p)));
const frames=cordPath.computeFrenetFrames(144,false);
for(let strand=0;strand<3;strand++) {
  const points=[];
  for(let i=0;i<=144;i++) {
    const angle=i/144*Math.PI*2*22+strand*Math.PI*2/3;
    points.push(cordPath.getPoint(i/144).addScaledVector(frames.normals[i],Math.cos(angle)*0.009).addScaledVector(frames.binormals[i],Math.sin(angle)*0.009));
  }
  add(cap,'SL-Cord-Strand-'+strand,new T.TubeGeometry(new T.CatmullRomCurve3(points),288,0.0045,5,false),gold);
}
const headProfile=[[0,0],[0.025,0],[0.039,0.018],[0.045,0.045],[0.041,0.075],[0.029,0.105],[0.011,0.13],[0,0.13]];
add(cap,'SL-Tassel-Head',new T.LatheGeometry(headProfile.map(p=>new T.Vector2(...p)),48),gold,[1.22,0.775,0.72]);
for(const y of [0.797,0.818,0.84]) {
  const ring=new T.TorusGeometry(0.041,0.004,6,32);ring.rotateX(Math.PI/2);add(cap,'SL-Tassel-Wrap-'+y,ring,gold,[1.22,y,0.72]);
}
const fringe=new T.Group();fringe.name='SL-Tassel-Fringe';cap.add(fringe);
for(let i=0;i<48;i++) {
  const a=i*Math.PI*2/48,r=0.012+(i%3)*0.008,tip=0.13+(i%7)*0.004;
  tube(fringe,'SL-Tassel-Fiber-'+i,[[1.22+Math.cos(a)*r,0.795,0.72+Math.sin(a)*r],
    [1.22+Math.cos(a)*0.035,0.63,0.72+Math.sin(a)*0.035],
    [1.23+Math.cos(a)*0.063,0.34,0.735+Math.sin(a)*0.063],
    [1.25+Math.cos(a)*0.074,tip,0.755+Math.sin(a)*0.074]],0.0024,gold,18,4);
}

const diploma=new T.Group();diploma.name='SL-Diploma';diploma.position.set(0,0.176,1.16);diploma.rotation.y=0.08;object.add(diploma);
function sleeve(name,outer,inner,length,surface,x=0) {
  const geometry=new T.LatheGeometry([[outer,-length/2],[outer,length/2],[inner,length/2],[inner,-length/2],[outer,-length/2]].map(p=>new T.Vector2(...p)),128);
  geometry.rotateZ(Math.PI/2);return add(diploma,name,geometry,surface,[x,0,0]);
}
sleeve('SL-Diploma-Tube',0.17,0.167,2.04,paper);
const spiral=new T.Shape(),outer=[],inner=[];
for(let i=0;i<=288;i++) {
  const a=i/288*Math.PI*6,r=0.05+i/288*0.1165;
  outer.push(new T.Vector2(Math.cos(a)*(r+0.0015),Math.sin(a)*(r+0.0015)));
  inner.push(new T.Vector2(Math.cos(a)*(r-0.0015),Math.sin(a)*(r-0.0015)));
}
spiral.setFromPoints([...outer,...inner.reverse()]);spiral.closePath();
const coil=new T.ExtrudeGeometry(spiral,{depth:2.035,bevelEnabled:false,steps:1});coil.rotateY(Math.PI/2);coil.translate(-2.035/2,0,0);
add(diploma,'SL-Diploma-Coil',coil,paper);
sleeve('SL-Diploma-Band',0.176,0.169,0.16,satin,-0.24);
box(diploma,'SL-Bow-Knot',[0.14,0.08,0.1],[-0.24,0.055,0.175],satin,0.035);
function ribbon(name,points,width) {
  const curve=points instanceof T.Curve?points:new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),positions=[],uv=[],indices=[],steps=64;
  for(let i=0;i<=steps;i++) {
    const t=i/steps,p=curve.getPoint(t),tangent=curve.getTangent(t),across=new T.Vector3(-tangent.y,tangent.x,0).normalize();
    const w=width*(0.4+0.6*Math.sin(Math.PI*t));
    for(const [side,depth]of [[-1,1],[1,1],[-1,-1],[1,-1]]) {
      const v=p.clone().addScaledVector(across,side*w/2);v.z+=depth*0.002;
      positions.push(v.x,v.y,v.z);uv.push(t*2,(side+1)/2);
    }
    if(i<steps) {
      const k=i*4,n=k+4;
      indices.push(k,n,k+1,k+1,n,n+1,k+2,k+3,n+2,k+3,n+3,n+2,k,k+2,n,k+2,n+2,n,k+1,n+1,k+3,k+3,n+1,n+3);
    }
  }
  indices.push(0,1,2,1,3,2,steps*4,steps*4+2,steps*4+1,steps*4+1,steps*4+2,steps*4+3);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  return add(diploma,name,g,satin);
}
// Elliptic turns keep the ribbon half-width below the local bend radius.
class BowLoop extends T.Curve {
  constructor(start,axis,minor){super();this.start=new T.Vector3(...start);this.axis=new T.Vector3(...axis);this.side=new T.Vector3(-axis[1],axis[0],0).normalize().multiplyScalar(minor);}
  getPoint(t,target=new T.Vector3()) {
    const angle=t*Math.PI*2;
    target.copy(this.start).addScaledVector(this.axis,1-Math.cos(angle)).addScaledVector(this.side,Math.sin(angle));
    target.z+=0.04*Math.sin(angle/2)**2;return target;
  }
}
ribbon('SL-Bow-Left-Loop',new BowLoop([-0.26,0.055,0.19],[-0.24,0.09,0],0.12),0.09);
ribbon('SL-Bow-Right-Loop',new BowLoop([-0.22,0.055,0.19],[0.26,0.08,0],0.13),0.09);
ribbon('SL-Bow-Left-Tail',[[-0.27,0.055,0.195],[-0.39,-0.01,0.245],[-0.57,-0.10,0.28]],0.12);
ribbon('SL-Bow-Right-Tail',[[-0.22,0.055,0.195],[-0.1,-0.025,0.245],[0,-0.10,0.28]],0.115);

object.rotation.y=0.44;
const bounds=new T.Box3().setFromObject(object,true),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
const stage=new T.Group();stage.name='InterestShield-studentLoan-stage';stage.scale.setScalar(3.2/Math.max(size.x,size.y,size.z));
object.position.set(-center.x,-bounds.min.y,-center.z);stage.add(object);stage.updateMatrixWorld(true);
const raw=Buffer.from(await new GLTFExporter().parseAsync(stage,{binary:true,onlyVisible:true}));
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const document=await io.readBinary(raw),root=document.getRoot();document.createExtension(EXTTextureWebP).setRequired(true);
const n=source.resolution,noise=(x,y)=>((Math.imul(x+source.surfaces.grainSeed,374761393)^Math.imul(y+17,668265263))>>>0)/4294967295;
async function maps(prefix,image,roughness) {
  const grayscale=image?await sharp(await readFile(new URL('../sources/student-loan/'+image,import.meta.url))).resize(n,n).greyscale().removeAlpha().raw().toBuffer():null;
  const height=(x,y)=>{x=(x+n)%n;y=(y+n)%n;return grayscale?grayscale[y*n+x]/255:0.5+(noise(x,y)-0.5)*0.12+Math.sin(y*0.78)*0.025;};
  const color=Buffer.alloc(n*n*3),normal=Buffer.alloc(n*n*3),orm=Buffer.alloc(n*n*3);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    const i=(y*n+x)*3,h=height(x,y),c=Math.round(255*(0.72+h*0.28)),dx=(height(x+1,y)-height(x-1,y))*0.7,dy=(height(x,y+1)-height(x,y-1))*0.7,l=Math.hypot(dx,dy,1);
    color[i]=color[i+1]=color[i+2]=c;normal[i]=Math.round(127.5-dx/l*127.5);normal[i+1]=Math.round(127.5-dy/l*127.5);normal[i+2]=Math.round(127.5+127.5/l);
    orm[i]=255;orm[i+1]=Math.round(255*(roughness+(h-0.5)*0.12));orm[i+2]=0;
  }
  const texture=async(name,bytes)=>{
    const normalMap=name.endsWith('Normal');
    const resolution=normalMap?source.normalResolution:n;
    if(normalMap) {
      bytes=await sharp(bytes,{raw:{width:n,height:n,channels:3}}).resize(resolution,resolution).raw().toBuffer();
      for(let i=0;i<bytes.length;i+=3) {
        const v=[0,1,2].map(j=>bytes[i+j]/127.5-1),length=Math.hypot(...v);
        for(let j=0;j<3;j++)bytes[i+j]=Math.round((v[j]/length+1)*127.5);
      }
    }
    const encoded=await sharp(bytes,{raw:{width:resolution,height:resolution,channels:3}}).webp({lossless:normalMap,quality:92,effort:6}).toBuffer();
    if(normalMap) {
      const decoded=await sharp(encoded).raw().toBuffer();let squared=0,max=0;
      for(let i=0;i<bytes.length;i+=3) {
        const a=[0,1,2].map(j=>bytes[i+j]/127.5-1),b=[0,1,2].map(j=>decoded[i+j]/127.5-1);
        const dot=a.reduce((sum,v,j)=>sum+v*b[j],0)/(Math.hypot(...a)*Math.hypot(...b));
        const degrees=Math.acos(Math.min(1,Math.max(-1,dot)))*180/Math.PI;squared+=degrees*degrees;max=Math.max(max,degrees);
      }
      const rms=Math.sqrt(squared/(bytes.length/3));
      console.log(`${name} encoding: rms=${rms.toFixed(3)}deg max=${max.toFixed(3)}deg`);
      if(rms>2||max>8)throw new Error(`${name} encoding exceeds original-derivative angular error limits: rms=${rms},max=${max}`);
    }
    return document.createTexture(name).setImage(encoded).setMimeType('image/webp');
  };
  return {color:await texture(prefix+'-Color',color),normal:await texture(prefix+'-Normal',normal),roughness:await texture(prefix+'-Roughness',orm)};
}
const clothMaps=await maps('SL-Cloth','cloth.png',0.84),leatherMaps=await maps('SL-Leather','leather.png',0.64),paperMaps=await maps('SL-Paper',null,0.9);
const tiling=document.createExtension(KHRTextureTransform);
for(const m of root.listMaterials()) {
  const name=m.getName(),isCloth=name==='SL-Cloth-Navy'||name==='SL-Satin-Green',isLeather=name.startsWith('SL-Leather-');
  const set=isCloth?clothMaps:isLeather?leatherMaps:name==='SL-Paper'?paperMaps:null;if(!set)continue;
  m.setBaseColorTexture(set.color).setNormalTexture(set.normal).setMetallicRoughnessTexture(set.roughness).setRoughnessFactor(name==='SL-Satin-Green'?0.5:1);
  m.setNormalScale(isCloth?source.surfaces.clothNormalScale:isLeather?source.surfaces.leatherNormalScale:source.surfaces.paperNormalScale);
  const scale=isCloth?source.surfaces.clothTileScale:isLeather?source.surfaces.leatherTileScale:[1,1];
  for(const info of [m.getBaseColorTextureInfo(),m.getNormalTextureInfo(),m.getMetallicRoughnessTextureInfo()])info.setWrapS(10497).setWrapT(10497).setExtension('KHR_texture_transform',tiling.createTransform().setScale(scale));
}
root.getAsset().copyright='Original InterestShield graduation cap, two books and hollow ribbon-tied diploma geometry. Original generated albedo sources; authored approximate PBR maps, not measured scans or an exact poster reconstruction. No school branding or credential.';
await document.transform(prune(),dedup(),weld(),meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeTexcoord:16}));
const output=Buffer.from(await io.writeBinary(document)),target=new URL('../../web/public/heroes/studentLoan.glb',import.meta.url);
const triangles=root.listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
async function sizeOf(url){let size=0;for(const entry of await readdir(url,{withFileTypes:true})){const item=new URL(entry.name+(entry.isDirectory()?'/':''),url);size+=entry.isDirectory()?await sizeOf(item):(await stat(item)).size;}return size;}
const collection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
console.log(JSON.stringify({triangles,meshes:root.listMeshes().length,textures:root.listTextures().map(t=>({name:t.getName(),bytes:t.getImage().length})),bytes:output.length,collection}));
if(output.length>0.75*1024*1024||collection>10*1024*1024||triangles>75000)throw new Error('Student Loan exceeds unchanged delivery limits; existing artifact untouched');
await saveRefinedHero({id:'studentLoan',quality:'refined-textured',bytes:output.length,meshes:root.listMeshes().length,triangles,sha256:hash(output),sourceSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),sourceFile:'apps/media/scripts/build-refined-student-loan.mjs',materialSourceSha256:hash(JSON.stringify(source)),creator:'InterestShield project',license:'Original project geometry and generated albedo sources',provenance:'Original navy graduation cap, two detailed leather books, three-strand braided gold cord,48 tassel fibers and hollow spiral diploma tied with volumetric satin bow. Generated albedos and authored approximate PBR, not scans or an exact poster reconstruction.',units:'normalized stage units',version:2},undefined,async()=>{
  const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
  if(liveCollection>10*1024*1024)throw new Error('Student Loan public budget changed before locked publication; existing artifact untouched');
  const temporary=new URL('../../web/public/heroes/studentLoan.glb.tmp',import.meta.url);await writeFile(temporary,output);await rename(temporary,target);
});
console.log(`Refined Student Loan: ${triangles} triangles,${root.listTextures().length} maps,${output.length} bytes; public collection${collection} bytes.`);
