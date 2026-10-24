import * as T from '../../web/node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../web/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from '../../web/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP, KHRTextureTransform } from '@gltf-transform/extensions';
import { prune, dedup, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFile, writeFile, rename, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { saveRefinedHero } from './refined-hero-record.mjs';

globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const hash=b=>createHash('sha256').update(b).digest('hex');
const config=JSON.parse(await readFile(new URL('../sources/medical/materials.json',import.meta.url)));
const material=(name,color,roughness,metalness=0)=>Object.assign(new T.MeshPhysicalMaterial({color,roughness,metalness}),{name});
const enamel=material('M-Enamel-Pearl','#e8ece8',0.28);enamel.clearcoat=0.45;enamel.clearcoatRoughness=0.19;
const steel=material('M-Steel-Polished','#c1c9c9',0.24,1),diaphragm=material('M-Steel-Diaphragm','#929d9d',0.42,1);
const rubber=material('M-Rubber-Black','#171c1c',0.74),green=material('M-Badge-Green','#075538',0.28);
green.clearcoat=0.45;green.clearcoatRoughness=0.18;
const object=new T.Group();object.name='InterestShield-medical-original-refined-v2';
function group(parent,name,position=[0,0,0]){const g=new T.Group();g.name=name;g.position.set(...position);parent.add(g);return g;}
function add(parent,name,geometry,surface,position=[0,0,0]){const m=new T.Mesh(geometry,surface);m.name=name;m.position.set(...position);parent.add(m);return m;}
function box(parent,name,size,position,surface,radius=0.02){return add(parent,name,new RoundedBoxGeometry(...size,2,Math.min(radius,...size.map(v=>v/3))),surface,position);}
function tube(parent,name,points,radius,surface,segments=48,sides=8){
  const curve=points instanceof T.Curve?points:new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  const skin=new T.TubeGeometry(curve,segments,radius,sides,false);if(surface!==rubber)return add(parent,name,skin,surface);
  const caps=[0,1].map(end=>{
    const positions=[],normals=[],uvs=[],indices=[],center=curve.getPointAt(end),normal=curve.getTangentAt(end).multiplyScalar(end?1:-1);
    for(let i=0;i<sides;i++) {
      const offset=(end?segments:0)*(sides+1),a=new T.Vector3().fromBufferAttribute(skin.attributes.position,offset+i),b=new T.Vector3().fromBufferAttribute(skin.attributes.position,offset+i+1);
      const innerA=center.clone().lerp(a,0.45),innerB=center.clone().lerp(b,0.45),vertices=[a,b,innerA,innerB],base=positions.length/3;
      for(let j=0;j<4;j++){positions.push(...vertices[j].toArray());normals.push(...normal.toArray());const angle=(i+(j%2))/sides*Math.PI*2,r=j<2?0.5:0.225;uvs.push(0.5+Math.cos(angle)*r,0.5+Math.sin(angle)*r);}
      const forward=b.clone().sub(a).cross(innerA.clone().sub(a)).dot(normal)>0;
      indices.push(...(forward?[0,1,2,1,3,2]:[0,2,1,1,2,3]).map(j=>base+j));
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);return g;
  });
  const geometry=mergeGeometries([skin,...caps]);skin.dispose();caps.forEach(g=>g.dispose());return add(parent,name,geometry,surface);
}
function cylinder(parent,name,radius,length,position,surface,axis='y',sides=32){const g=new T.CylinderGeometry(radius,radius,length,sides);if(axis==='x')g.rotateZ(Math.PI/2);if(axis==='z')g.rotateX(Math.PI/2);return add(parent,name,g,surface,position);}
function lathe(parent,name,profile,surface,position=[0,0,0],segments=64){return add(parent,name,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),segments),surface,position);}
function rounded(w,h,r,Constructor=T.Shape){const p=new Constructor(),x=-w/2,y=-h/2;p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);p.closePath();return p;}
function extrude(shape,depth,bevel=0.008){
  const g=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:12});
  const uv=g.getAttribute('uv');let minU=Infinity,minV=Infinity,maxU=-Infinity,maxV=-Infinity;
  for(let i=0;i<uv.count;i++){minU=Math.min(minU,uv.getX(i));maxU=Math.max(maxU,uv.getX(i));minV=Math.min(minV,uv.getY(i));maxV=Math.max(maxV,uv.getY(i));}
  for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)-minU)/(maxU-minU||1),(uv.getY(i)-minV)/(maxV-minV||1));
  return g;
}
function screw(parent,name,x,y,z,shaft=0.04){
  cylinder(parent,name+'-Shaft',0.012,shaft,[x,y,z-shaft/2+0.005],steel,'z',16);
  const ring=new T.Shape();ring.absarc(0,0,0.026,0,Math.PI*2,false);
  const slot=new T.Path();slot.moveTo(-0.018,-0.003);slot.lineTo(-0.018,0.003);slot.lineTo(0.018,0.003);slot.lineTo(0.018,-0.003);slot.closePath();ring.holes.push(slot);
  add(parent,name+'-Head',extrude(ring,0.008,0.001),steel,[x,y,z]);
  box(parent,name+'-Slot-Base',[0.035,0.005,0.002],[x,y,z-0.002],rubber,0.0005);
}

const body=group(object,'M-Case-Body');
const frame=rounded(2.3,1.12,0.13);frame.holes.push(rounded(2.18,1.0,0.09,T.Path));
add(body,'M-Body-Frame',extrude(frame,0.8,0.008),enamel,[0,0.64,-0.4]);
box(body,'M-Body-Front',[2.21,1.04,0.025],[0,0.64,0.3925],enamel,0.012);
box(body,'M-Body-Back',[2.21,1.04,0.025],[0,0.64,-0.3925],enamel,0.012);
box(object,'M-Case-Lid',[2.32,0.25,0.82],[0,1.34,0],enamel,0.085);
box(object,'M-Gasket',[2.29,0.02,0.79],[0,1.2075,0],rubber,0.005);
let foot=0;for(const x of [-0.85,0.85])for(const z of [-0.28,0.28])box(object,'M-Foot-'+foot++,[0.2,0.08,0.18],[x,0.04,z],rubber,0.018);
const molding=rounded(2.03,0.89,0.12).getPoints(64).map(p=>new T.Vector3(p.x,p.y+0.64,0.406));
tube(object,'M-Front-Molded-Bead',new T.CatmullRomCurve3(molding,true),0.007,enamel,128,6);

function quarterShell(outer,inner) {
  const points=[];
  for(let i=0;i<=20;i++){const a=i/20*Math.PI/2;points.push(new T.Vector2(Math.cos(a)*outer,Math.sin(a)*outer));}
  for(let i=20;i>=0;i--){const a=i/20*Math.PI/2;points.push(new T.Vector2(Math.cos(a)*inner,Math.sin(a)*inner));}
  const shape=new T.Shape(points);shape.closePath();return shape;
}
for(const side of [-1,1])for(const upper of [false,true])for(const front of [false,true]) {
  const radius=upper?0.25/3:0.13;
  const cx=side*((upper?1.16:1.15)-radius),cy=upper?1.465-radius:0.08+radius;
  const g=group(object,`M-Corner-${side}-${upper}-${front}`,[cx,cy,0]);
  g.rotation.z=side>0?(upper?0:-Math.PI/2):(upper?Math.PI/2:Math.PI);
  add(g,'M-Corner-Face',extrude(quarterShell(radius+0.022,upper?0.04:0.075),0.032,0.004),steel,[0,0,front?0.402:-0.434]);
  add(g,`M-Corner-Wrap-${side}-${upper}-${front}`,extrude(quarterShell(radius+0.022,radius-0.004),0.20,0.003),steel,[0,0,front?0.24:-0.44]);
  if(front){const r=upper?0.073:0.116;screw(g,'M-Corner-Screw',r/Math.SQRT2,r/Math.SQRT2,0.44,0.12);}
}
for(const [side,x]of [['Left',-0.76],['Right',0.76]]) {
  const latch=group(object,'M-Latch-'+side,[x,0,0]);
  box(latch,'M-Latch-Lower-Plate',[0.19,0.29,0.035],[0,1.08,0.413],steel,0.035);
  box(latch,'M-Latch-Upper-Plate',[0.19,0.12,0.035],[0,1.355,0.418],steel,0.025);
  cylinder(latch,'M-Latch-Pivot',0.026,0.21,[0,1.20,0.458],steel,'x');
  box(latch,'M-Latch-Lever',[0.105,0.18,0.045],[0,1.105,0.465],steel,0.025);
  tube(latch,'M-Latch-Catch',[[-0.058,1.20,0.46],[-0.058,1.33,0.465],[0,1.355,0.465],[0.058,1.33,0.465],[0.058,1.20,0.46]],0.014,steel,40,6);
  for(const dx of [-0.059,0.059]){screw(latch,'M-Latch-Lower-Screw',dx,0.99,0.441);screw(latch,'M-Latch-Upper-Screw',dx,1.36,0.445);}
  const hinge=group(object,'M-Hinge-'+side,[x,0,0]);
  box(hinge,'M-Hinge-Body-Leaf',[0.3,0.16,0.035],[0,1.145,-0.41],steel,0.015);
  box(hinge,'M-Hinge-Lid-Leaf',[0.3,0.15,0.035],[0,1.285,-0.425],steel,0.015);
  for(let i=0;i<5;i++)cylinder(hinge,'M-Hinge-Knuckle-'+i,0.037,0.055,[(i-2)*0.059,1.2125,-0.44],steel,'x');
  cylinder(hinge,'M-Hinge-Pin',0.014,0.34,[0,1.2125,-0.44],steel,'x');
}

const handle=group(object,'M-Handle'),path=new T.CurvePath();
const v=(x,y)=>new T.Vector3(x,y,0);
path.add(new T.LineCurve3(v(-0.48,1.49),v(-0.48,1.79)));
path.add(new T.QuadraticBezierCurve3(v(-0.48,1.79),v(-0.48,1.9),v(-0.37,1.9)));
path.add(new T.LineCurve3(v(-0.37,1.9),v(0.37,1.9)));
path.add(new T.QuadraticBezierCurve3(v(0.37,1.9),v(0.48,1.9),v(0.48,1.79)));
path.add(new T.LineCurve3(v(0.48,1.79),v(0.48,1.49)));
tube(handle,'M-Handle-Tube',path,0.055,steel,112,8);
for(const [side,x]of [['Left',-0.48],['Right',0.48]]){
  box(handle,'M-Handle-Base-'+side,[0.29,0.055,0.21],[x,1.48,0],steel,0.025);
  cylinder(handle,'M-Handle-Collar',0.075,0.065,[x,1.52,0],steel);
  for(const z of [-0.065,0.065])cylinder(handle,'M-Handle-Base-Bolt',0.026,0.012,[x,1.513,z],steel);
}
const grip=lathe(handle,'M-Handle-Grip',[[0.055,-0.29],[0.075,-0.29],[0.083,-0.26],[0.083,0.26],[0.075,0.29],[0.055,0.29],[0.053,0.27],[0.053,-0.27],[0.055,-0.29]],enamel,[0,1.9,0]);grip.geometry.rotateZ(Math.PI/2);

function shield(scale=1,Constructor=T.Shape) {
  const p=new Constructor();p.moveTo(-0.29*scale,0.28*scale);p.quadraticCurveTo(-0.08*scale,0.29*scale,0,0.35*scale);
  p.quadraticCurveTo(0.08*scale,0.29*scale,0.29*scale,0.28*scale);p.lineTo(0.27*scale,-0.02*scale);
  p.quadraticCurveTo(0.25*scale,-0.18*scale,0,-0.35*scale);p.quadraticCurveTo(-0.25*scale,-0.18*scale,-0.27*scale,-0.02*scale);p.closePath();return p;
}
const badge=group(object,'M-Badge',[0,0.64,0.41]);
add(badge,'M-Badge-Plate',extrude(shield(),0.028,0.01),green);
const rimShape=shield(1.055);rimShape.holes.push(new T.Path(shield(0.94).getPoints(12).reverse()));add(badge,'M-Badge-Rim',extrude(rimShape,0.036,0.006),steel);

const steth=group(object,'M-Stethoscope');
const junction=[-0.6,0.35,0.70];add(steth,'M-Y-Junction',new T.SphereGeometry(0.066,24,16),rubber,junction);
tube(steth,'M-Main-Tube',[junction,[-0.88,0.16,0.98],[-0.63,0.065,1.35],[0.05,0.06,1.48],[1.0,0.06,1.43],[1.20,0.06,0.95],[0.98,0.06,0.67],[0.35,0.06,0.67],[0.18,0.065,0.90],[0.38,0.055,1.08],[0.60,0.055,1.07]],0.035,rubber,128,8);
for(const [side,branch,ear]of [
  ['Left',[junction,[-0.88,0.43,0.65],[-1.05,0.52,0.56]],[[-1.05,0.52,0.56],[-1.19,0.69,0.55],[-1.10,0.87,0.57],[-0.88,0.95,0.60],[-0.80,0.93,0.61]]],
  ['Right',[junction,[-0.33,0.43,0.65],[-0.17,0.52,0.56]],[[-0.17,0.52,0.56],[-0.03,0.69,0.55],[-0.12,0.87,0.57],[-0.34,0.95,0.60],[-0.42,0.93,0.61]]],
]) {
  tube(steth,'M-Y-'+side+'-Branch',branch,0.04,rubber,48,8);
  tube(steth,'M-Ear-'+side+'-Tube',ear,0.022,steel,64,8);
  const tip=lathe(steth,'M-Ear-'+side+'-Tip',[[0.02,0],[0.038,0],[0.049,0.025],[0.044,0.07],[0.027,0.085],[0.013,0.085],[0.013,0.035],[0.02,0]],rubber,ear.at(-1),48);
  const direction=new T.Vector3(...ear.at(-1)).sub(new T.Vector3(...ear.at(-2))).normalize();tip.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
}
const centre=[0.84,0,1.07];
lathe(steth,'M-Chestpiece-Body',[[0,0],[0.12,0],[0.175,0.012],[0.195,0.035],[0.185,0.065],[0.165,0.075],[0,0.075]],steel,centre,64);
lathe(steth,'M-Chestpiece-Rim',[[0.185,0.064],[0.204,0.088],[0.197,0.107],[0.169,0.104],[0.166,0.091],[0.164,0.069],[0.185,0.064]],steel,centre,64);
lathe(steth,'M-Chestpiece-Diaphragm',[[0,0.071],[0.168,0.071],[0.173,0.088],[0.168,0.098],[0,0.088]],diaphragm,centre,64);
cylinder(steth,'M-Chestpiece-Connector',0.033,0.18,[0.66,0.055,1.07],steel,'x');
cylinder(steth,'M-Chestpiece-Collar',0.044,0.06,[0.59,0.055,1.07],rubber,'x');

object.rotation.y=0.36;
const bounds=new T.Box3().setFromObject(object,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
object.position.set(-center.x,-bounds.min.y,-center.z);
const stage=new T.Group();stage.name='InterestShield-medical-stage';stage.scale.setScalar(3.2/Math.max(size.x,size.y,size.z));stage.add(object);stage.updateMatrixWorld(true);
const raw=Buffer.from(await new GLTFExporter().parseAsync(stage,{binary:true,onlyVisible:true}));
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const document=await io.readBinary(raw),root=document.getRoot();document.createExtension(EXTTextureWebP).setRequired(true);
const n=config.resolution,noise=(x,y,seed)=>((Math.imul(x+seed,374761393)^Math.imul(y+17,668265263))>>>0)/4294967295;
async function maps(prefix,roughness,seed) {
  const color=Buffer.alloc(n*n*3),normal=Buffer.alloc(n*n*3),orm=Buffer.alloc(n*n*3);
  const height=(x,y)=>{
    x=(x+n)%n;y=(y+n)%n;
    const cell=config.grainCellSize,grid=n/cell,gx=Math.floor(x/cell),gy=Math.floor(y/cell);
    const smooth=t=>t*t*(3-2*t),u=smooth(x/cell-gx),v=smooth(y/cell-gy);
    const sample=(dx,dy)=>noise((gx+dx)%grid,(gy+dy)%grid,seed);
    const grain=(sample(0,0)*(1-u)+sample(1,0)*u)*(1-v)+(sample(0,1)*(1-u)+sample(1,1)*u)*v;
    return 0.5+(grain-0.5)*0.04+(prefix==='Steel'?Math.sin(y*Math.PI*2*43/n)*0.035:Math.sin(x*Math.PI*2*11/n)*Math.cos(y*Math.PI*2*13/n)*0.015);
  };
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    const i=(y*n+x)*3,h=height(x,y),c=Math.round(235+(h-0.5)*95),dx=(height(x+1,y)-height(x-1,y))*0.8,dy=(height(x,y+1)-height(x,y-1))*0.8,l=Math.hypot(dx,dy,1);
    color[i]=color[i+1]=color[i+2]=c;normal[i]=Math.round(127.5-dx/l*127.5);normal[i+1]=Math.round(127.5-dy/l*127.5);normal[i+2]=Math.round(127.5+127.5/l);
    orm[i]=255;orm[i+1]=Math.round(255*(roughness+(h-0.5)*0.45));orm[i+2]=prefix==='Steel'?255:0;
  }
  const texture=async(suffix,bytes)=>document.createTexture('M-'+prefix+'-'+suffix).setImage(await sharp(bytes,{raw:{width:n,height:n,channels:3}}).webp({lossless:suffix==='Normal',quality:92,effort:6}).toBuffer()).setMimeType('image/webp');
  return {color:await texture('Color',color),normal:await texture('Normal',normal),roughness:await texture('Roughness',orm)};
}
const sets={Enamel:await maps('Enamel',config.surfaces.enamelRoughness,config.seed),Steel:await maps('Steel',config.surfaces.steelRoughness,config.seed+37),Rubber:await maps('Rubber',config.surfaces.rubberRoughness,config.seed+83)};
const transforms=document.createExtension(KHRTextureTransform);
for(const m of root.listMaterials()) {
  const name=m.getName(),key=name.includes('Steel')?'Steel':name==='M-Rubber-Black'?'Rubber':'Enamel',set=sets[key];
  m.setBaseColorTexture(set.color).setNormalTexture(set.normal).setMetallicRoughnessTexture(set.roughness).setRoughnessFactor(key==='Steel'&&name!=='M-Steel-Diaphragm'?config.surfaces.polishedSteelFactor:1);
  m.setNormalScale(config.surfaces[key.toLowerCase()+'NormalScale']);
  for(const info of [m.getBaseColorTextureInfo(),m.getNormalTextureInfo(),m.getMetallicRoughnessTextureInfo()])info.setWrapS(10497).setWrapT(10497).setExtension('KHR_texture_transform',transforms.createTransform().setScale([2,2]));
}
root.getAsset().copyright='Original InterestShield enamel medical case and connected stethoscope. Original emerald shield, no institutional emblem or endorsement. Authored approximate PBR, not measured scans or an exact poster reconstruction. Not a real certified medical device.';
await document.transform(prune(),dedup(),weld(),meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeTexcoord:16}));
const output=Buffer.from(await io.writeBinary(document)),target=new URL('../../web/public/heroes/medical.glb',import.meta.url);
const triangles=root.listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
async function sizeOf(url){let size=0;for(const e of await readdir(url,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),url);size+=e.isDirectory()?await sizeOf(p):(await stat(p)).size;}return size;}
const collection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
const jsonBytes=output.readUInt32LE(12),gltf=JSON.parse(output.subarray(20,20+jsonBytes).toString());
console.log(JSON.stringify({jsonBytes,nodes:gltf.nodes.length,accessors:gltf.accessors.length,buffers:gltf.buffers,largestMeshes:root.listMeshes().map(m=>({name:m.getName(),triangles:m.listPrimitives().reduce((sum,p)=>sum+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0)})).sort((a,b)=>b.triangles-a.triangles).slice(0,8)}));
console.log(JSON.stringify({triangles,meshes:root.listMeshes().length,textures:root.listTextures().map(t=>({name:t.getName(),bytes:t.getImage().length})),bytes:output.length,collection}));
if(output.length>0.5*1024*1024||triangles>65000||collection>10*1024*1024)throw new Error('Medical exceeds unchanged delivery limits; previous artifact untouched');
await saveRefinedHero({id:'medical',quality:'refined-textured',bytes:output.length,meshes:root.listMeshes().length,triangles,sha256:hash(output),sourceFile:'apps/media/scripts/build-refined-medical.mjs',sourceSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),materialSourceSha256:hash(JSON.stringify(config)),creator:'InterestShield project',license:'Original project geometry and authored procedural material sources',provenance:'Original hollow enamel case with separate lid/gasket, connected hardware and stethoscope, paired earbows and shaped chestpiece. Original emerald shield; no institutional emblem. Approximate PBR, not scans or exact poster reconstruction.',units:'normalized stage units',version:2},undefined,async()=>{
  const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
  if(liveCollection>10*1024*1024)throw new Error('Medical public budget changed before locked publication; previous artifact untouched');
  const temporary=new URL('../../web/public/heroes/medical.glb.tmp',import.meta.url);await writeFile(temporary,output);await rename(temporary,target);
});
console.log(`Refined Medical: ${triangles} unique triangles,${root.listTextures().length} maps,${output.length} bytes; public${collection} bytes.`);
