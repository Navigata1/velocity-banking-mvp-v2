import * as T from '../../web/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '../../web/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {mergeGeometries} from '../../web/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTTextureWebP,KHRTextureTransform} from '@gltf-transform/extensions';
import {prune,dedup,weld,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {readFile,writeFile,rename,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {saveRefinedHero} from './refined-hero-record.mjs';

globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const hash=b=>createHash('sha256').update(b).digest('hex'),sources=new URL('../sources/recreation/',import.meta.url),config=JSON.parse(await readFile(new URL('materials.json',sources)));
for(const image of config.images)if(hash(await readFile(new URL(image.file,sources)))!==image.sha256)throw new Error('Recreation retained original source hash mismatch: '+image.file);
const material=(name,color,roughness,metalness=0)=>Object.assign(new T.MeshPhysicalMaterial({color,roughness,metalness}),{name});
const white=material('R-Paint-White','#ecece7',0.26),teal=material('R-Paint-Teal','#174c50',0.26),steel=material('R-Steel','#c8cdd0',0.27,1);
white.clearcoat=teal.clearcoat=0.55;white.clearcoatRoughness=teal.clearcoatRoughness=0.24;
const timber=material('R-Timber','#9b6337',0.58),canvas=material('R-Canvas','#e6e4d9',0.84),cord=material('R-Canvas-Cord','#b5b7b0',0.88),rubber=material('R-Rubber','#303a3b',0.86);
const glass=material('R-Glass','#314a50',0.14);glass.transparent=true;glass.opacity=0.62;
const object=new T.Group();object.name='InterestShield-recreation-original-refined-v2';
function add(name,geometry,surface,position=[0,0,0],parent=object){const m=new T.Mesh(geometry,surface);m.name=name;m.position.set(...position);parent.add(m);return m;}
function box(name,size,position,surface,round=0.01,parent=object){return add(name,new RoundedBoxGeometry(...size,1,Math.min(round,...size.map(v=>v/3))),surface,position,parent);}
function rod(name,a,b,radius,surface=steel,parent=object,sides=12){const from=new T.Vector3(...a),to=new T.Vector3(...b),m=add(name,new T.CylinderGeometry(radius,radius,1,sides,1),surface,from.clone().add(to).multiplyScalar(0.5).toArray(),parent);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize());m.scale.y=from.distanceTo(to);return m;}
function uvUnit(g){const uv=g.attributes.uv;let x=Infinity,y=Infinity,u=-Infinity,v=-Infinity;for(let i=0;i<uv.count;i++){x=Math.min(x,uv.getX(i));y=Math.min(y,uv.getY(i));u=Math.max(u,uv.getX(i));v=Math.max(v,uv.getY(i));}for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)-x)/(u-x||1),(uv.getY(i)-y)/(v-y||1));return g;}
function rounded(w,h,r,Constructor=T.Shape){const s=new Constructor(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);s.closePath();return s;}
function hole(shape,path,segments=8){const points=path.getPoints(segments);if(T.ShapeUtils.isClockWise(shape.getPoints(segments))===T.ShapeUtils.isClockWise(points))points.reverse();shape.holes.push(new T.Path(points));}
function offsetPath(path,x,y){return new T.Path(path.getPoints(8).map(p=>p.add(new T.Vector2(x,y))));}
function extrude(shape,depth,bevel=0.003,segments=8){return uvUnit(new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:segments}));}
function geometry(positions,uvs,indices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;}

const stations=new T.CatmullRomCurve3([[-1.8,0.014,0.32],[-1.5,0.29,0.41],[-1.0,0.47,0.54],[-0.4,0.55,0.61],[0.3,0.54,0.60],[0.9,0.46,0.51],[1.3,0.36,0.40],[1.56,0.27,0.34]].map(p=>new T.Vector3(...p))).getSpacedPoints(40);
// Separate outer/inner skins and bridged rim/end faces leave the real hull cavity open.
function hull(){const p=[],uv=[],byMaterial=[[],[]],rings=[[],[]],n=32;
  const quad=(a,b,c,d,reverse=false,mat=0)=>byMaterial[mat].push(...(reverse?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
  for(let inner=0;inner<2;inner++)for(const station of stations){const width=inner?Math.max(0.004,station.y-0.032):station.y,depth=station.z-(inner?0.035:0),cut=Math.asin(0.28/station.z),start=p.length/3;
    for(let j=0;j<=n;j++){const theta=j<=8?j/8*cut:j<=24?cut+(j-8)/16*(Math.PI-2*cut):Math.PI-cut+(j-24)/8*cut;p.push(station.x,0.84-depth*Math.sin(theta),width*Math.cos(theta));uv.push((station.x+1.8)/3.36,theta/Math.PI);}rings[inner].push(start);}
  for(let inner=0;inner<2;inner++)for(let i=0;i<stations.length-1;i++)for(let j=0;j<n;j++)quad(rings[inner][i]+j,rings[inner][i+1]+j,rings[inner][i]+j+1,rings[inner][i+1]+j+1,!inner,!inner&&j>=8&&j<24?1:0);
  const copy=(index,axis)=>{const at=p.length/3,v=p.slice(index*3,index*3+3);p.push(...v);uv.push(...(axis==='top'?[(v[0]+1.8)/3.36,(v[2]+0.6)/1.2]:[(v[2]+0.6)/1.2,v[1]/0.84]));return at;};
  for(const side of [0,n])for(let i=0;i<stations.length-1;i++){const a=copy(rings[0][i]+side,'top'),b=copy(rings[0][i+1]+side,'top'),c=copy(rings[1][i]+side,'top'),d=copy(rings[1][i+1]+side,'top');quad(a,b,c,d,side===n);}
  for(const end of [0,stations.length-1])for(let j=0;j<n;j++){const a=copy(rings[0][end]+j,'end'),b=copy(rings[1][end]+j,'end'),c=copy(rings[0][end]+j+1,'end'),d=copy(rings[1][end]+j+1,'end');quad(a,b,c,d,end!==0,j>=8&&j<24?1:0);}
  const g=geometry(p,uv,byMaterial.flat());g.addGroup(0,byMaterial[0].length,0);g.addGroup(byMaterial[0].length,byMaterial[1].length,1);return g;}
add('R-Hull',hull(),[white,teal]);

const outline=[...stations.map(s=>new T.Vector2(s.x,s.y*0.965)),...stations.toReversed().map(s=>new T.Vector2(s.x,-s.y*0.965))],deckShape=new T.Shape(outline);
const cockpit=offsetPath(rounded(0.74,0.50,0.045,T.Path),0.96,0);hole(deckShape,cockpit);
const deckGeometry=extrude(deckShape,0.04,0.001,5);for(let i=0;i<deckGeometry.attributes.position.count;i++)if(Math.abs(deckGeometry.attributes.normal.getZ(i))>0.999)deckGeometry.attributes.uv.setXY(i,(deckGeometry.attributes.position.getX(i)+1.81)/3.38,(deckGeometry.attributes.position.getY(i)+0.60)/1.20);
deckGeometry.rotateX(Math.PI/2);add('R-Deck',deckGeometry,timber,[0,0.86,0]);
box('R-Cockpit-Floor',[0.76,0.035,0.52],[0.96,0.62,0],white,0.015);
for(const [name,size,at]of [['Port',[0.76,0.22,0.024],[0.96,0.735,0.252]],['Starboard',[0.76,0.22,0.024],[0.96,0.735,-0.252]],['Forward',[0.024,0.22,0.50],[0.592,0.735,0]],['Aft',[0.024,0.22,0.50],[1.328,0.735,0]]])box('R-Cockpit-Wall-'+name,size,at,white,0.005);
for(const sign of [-1,1]){box('R-Cockpit-Seat-'+sign,[0.50,0.045,0.11],[0.91,0.75,sign*0.185],timber,0.012);box('R-Cockpit-Seat-Support-'+sign,[0.05,0.11,0.09],[0.92,0.682,sign*0.185],white,0.006);}

const cabinShape=rounded(1.30,0.25,0.055),windowPositions=[-0.36,0.25];for(const x of windowPositions)hole(cabinShape,offsetPath(rounded(0.43,0.115,0.025,T.Path),x,0.016));
for(const [side,sign]of [['Port',1],['Starboard',-1]]){
  const wall=extrude(cabinShape,0.022,0.002,6);add('R-Cabin-'+side,wall,white,[-0.08,0.985,sign*0.32-(sign<0?0.022:0)]);
  const panes=new T.Group();panes.name='R-Glass-'+side;object.add(panes);
  for(const [i,x]of windowPositions.entries())box('R-Window-'+side+'-'+i,[0.44,0.125,0.012],[x-0.08,1.001,sign*0.329],glass,0.018,panes);
}
box('R-Cabin-Roof',[1.32,0.045,0.66],[-0.08,1.122,0],white,0.045);
for(const x of [-0.72,0.56])box('R-Cabin-End-'+x,[0.025,0.235,0.65],[x,0.982,0],white,0.015);
box('R-Hatch-Frame',[0.29,0.026,0.25],[0.19,1.158,0],steel,0.025);box('R-Hatch-Glass',[0.24,0.012,0.20],[0.19,1.174,0],glass,0.02);
for(const sign of [-1,1]){rod('R-Grab-Rail-'+sign,[-0.55,1.167,sign*0.22],[0.40,1.167,sign*0.22],0.009,steel);for(const x of [-0.48,0.33])rod('R-Grab-Support-'+sign+'-'+x,[x,1.14,sign*0.22],[x,1.167,sign*0.22],0.007);}

const finShape=new T.Shape([[-0.53,0.27],[0.31,0.27],[0.14,-0.62],[-0.18,-0.68],[-0.32,-0.57]].map(p=>new T.Vector2(...p)));
add('R-Keel',extrude(finShape,0.10,0.012),teal,[0,0,-0.05]);
const bulb=new T.SphereGeometry(1,24,12);bulb.scale(0.36,0.065,0.13);add('R-Keel-Bulb',bulb,teal,[-0.09,-0.66,0]);
const rudderShape=new T.Shape([[1.22,0.55],[1.45,0.53],[1.41,-0.25],[1.27,-0.22]].map(p=>new T.Vector2(...p)));add('R-Rudder',extrude(rudderShape,0.07,0.012),teal,[0,0,-0.035]);

const mastBase=[-0.32,0.85,0],mastTop=[-0.32,3.72,0];rod('R-Mast',mastBase,mastTop,0.024);rod('R-Boom',[-0.32,1.27,0],[1.25,1.27,0],0.022);
for(const y of [1.18,1.75,2.25,2.85,3.60]){const ring=new T.TorusGeometry(0.026,0.005,6,20);ring.rotateX(Math.PI/2);add('R-Mast-Band-'+y,ring,steel,[-0.32,y,0]);}
rod('R-Spreader',[-0.32,2.2,-0.26],[-0.32,2.2,0.26],0.011);box('R-Mast-Collar',[0.09,0.025,0.09],[-0.32,1.152,0],steel,0.015);
const rigging=new T.Group();rigging.name='R-Rigging';object.add(rigging);
const stayFeet=[[-1.70,0.855,-0.035],[1.43,0.855,0],[-0.32,0.855,0.48],[-0.32,0.855,-0.48]];
for(const [i,foot]of stayFeet.entries()){
  rod('R-Standing-Stay-'+i,foot,mastTop,0.0045,steel,rigging,8);
  box('R-Chainplate-'+i,[0.08,0.018,0.055],[foot[0],0.865,foot[2]],steel,0.008);
}

function sail(name,points,billow,seamName){const [a,b,c]=points.map(p=>new T.Vector3(...p)),n=20,p=[],uv=[],indices=[],rows=[];
  const at=(u,w)=>a.clone().multiplyScalar(1-u-w).addScaledVector(b,u).addScaledVector(c,w).add(new T.Vector3(0,0,27*billow*u*w*(1-u-w)));
  for(const side of [1,-1]){const offsets=[];for(let i=0;i<=n;i++){offsets.push(p.length/3);for(let j=0;j<=n-i;j++){p.push(...at(i/n,j/n).add(new T.Vector3(0,0,side*0.0025)).toArray());uv.push(i/n,j/n);}}rows.push(offsets);}
  for(let side=0;side<2;side++)for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){const a=rows[side][i]+j,b=rows[side][i+1]+j,c=a+1;indices.push(...(side?[a,c,b]:[a,b,c]));if(j<n-i-1){const d=b+1;indices.push(...(side?[c,d,b]:[c,b,d]));}}
  const boundary=[...Array.from({length:n+1},(_,i)=>rows[0][i]),...Array.from({length:n},(_,j)=>rows[0][n-j-1]+j+1),...Array.from({length:n-1},(_,j)=>rows[0][0]+n-j-1)],count=(n+1)*(n+2)/2;
  for(let j=0;j<boundary.length;j++){const a=boundary[j],b=boundary[(j+1)%boundary.length],start=p.length/3;for(const index of [a,a+count,b,b+count])p.push(...p.slice(index*3,index*3+3));uv.push(j/boundary.length,1,j/boundary.length,0,(j+1)/boundary.length,1,(j+1)/boundary.length,0);indices.push(start,start+1,start+2,start+2,start+1,start+3);}
  add(name,geometry(p,uv,indices),canvas);
  const paths=[];for(const q of [0.22,0.40,0.58,0.76,0.94]){const points=Array.from({length:21},(_,i)=>{const w=q*(0.015+i/20*0.97);return at(q-w,w).add(new T.Vector3(0,0,0.0035));});paths.push(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,0.0028,5,false));}
  add(seamName,mergeGeometries(paths),cord);paths.forEach(g=>g.dispose());return at;
}
sail('R-Mainsail',[[-0.30,3.68,0],[-0.30,1.29,0],[1.20,1.29,0]],0.16,'R-Main-Seams');
const foreFrom=new T.Vector3(...stayFeet[0]),foreTo=new T.Vector3(...mastTop),jibHead=foreFrom.clone().lerp(foreTo,0.985),jibTack=foreFrom.clone().lerp(foreTo,0.015),jibClew=[-0.42,1.31,-0.025];
sail('R-Jib',[jibHead.toArray(),jibTack.toArray(),jibClew],0.12,'R-Jib-Seams');
function tube(name,points,radius,surface=steel,segments=32){return add(name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,radius,6,false),surface);}
tube('R-Jib-Sheet',[jibClew,[-0.62,1.26,-0.49],[0.45,0.96,-0.49],[0.74,0.96,-0.40]],0.006,cord);
tube('R-Main-Sheet',[[1.19,1.27,0],[1.20,1.16,0.39],[0.73,0.96,0.39]],0.005,cord,20);

for(const sign of [-1,1]){
  const rail=[];for(const station of stations.filter((_,i)=>i%5===0)){const z=station.y*0.96*sign,x=station.x;rod('R-Stanchion-'+sign+'-'+x,[x,0.848,z],[x,1.09,z],0.007);rail.push([x,1.09,z]);}
  tube('R-Lifeline-'+sign,rail,0.006,steel,48);tube('R-Lower-Lifeline-'+sign,rail.map(p=>[p[0],0.985,p[2]]),0.004,steel,48);
  const base=[0.72,0.85,sign*0.39];rod('R-Winch-Base-'+sign,base,[base[0],0.90,base[2]],0.045);rod('R-Winch-Drum-'+sign,[base[0],0.90,base[2]],[base[0],0.985,base[2]],0.029);
  for(const y of [0.911,0.933,0.955,0.977]){const ring=new T.TorusGeometry(0.03,0.003,5,20);ring.rotateX(Math.PI/2);add('R-Winch-Groove-'+sign+'-'+y,ring,rubber,[base[0],y,base[2]]);}
  for(const x of [-1.48,1.39]){rod('R-Cleat-Stem-'+sign+'-'+x,[x,0.86,sign*0.18],[x,0.90,sign*0.18],0.009);rod('R-Cleat-Horn-'+sign+'-'+x,[x-0.048,0.90,sign*0.18],[x+0.048,0.90,sign*0.18],0.009);}
}
rod('R-Wheel-Pedestal',[1.14,0.625,0],[1.14,0.96,0],0.038,white);
const wheel=new T.Group();wheel.name='R-Wheel';object.add(wheel);
const rim=new T.TorusGeometry(0.135,0.012,8,40);rim.rotateY(Math.PI/2);add('R-Wheel-Rim',rim,timber,[1.01,0.96,0],wheel);
rod('R-Wheel-Shaft',[1.15,0.96,0],[0.99,0.96,0],0.022,steel,wheel);
for(let i=0;i<8;i++){const a=i*Math.PI/4;rod('R-Wheel-Spoke-'+i,[1.01,0.96,0],[1.01,0.96+Math.cos(a)*0.13,Math.sin(a)*0.13],0.006,steel,wheel,8);}

object.rotation.y=1.50;
const bounds=new T.Box3().setFromObject(object,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());object.position.set(-center.x,-bounds.min.y,-center.z);
const stage=new T.Group();stage.name='InterestShield-recreation-stage';stage.scale.setScalar(3.2/Math.max(size.x,size.y,size.z));stage.add(object);stage.updateMatrixWorld(true);
const raw=Buffer.from(await new GLTFExporter().parseAsync(stage,{binary:true,onlyVisible:true}));await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder}),document=await io.readBinary(raw),root=document.getRoot();
document.createExtension(EXTTextureWebP).setRequired(true);
const sets={Canvas:await maps(document,'Canvas','../student-loan/cloth.png'),Timber:await maps(document,'Timber','../house/oak-albedo-v1.png'),Paint:await maps(document,'Paint'),Steel:await maps(document,'Steel')},tiling=document.createExtension(KHRTextureTransform);
for(const m of root.listMaterials()){
  const kind=m.getName().includes('Canvas')?'Canvas':m.getName().includes('Timber')?'Timber':m.getName().includes('Paint')?'Paint':m.getName()==='R-Steel'?'Steel':null;if(!kind)continue;
  const set=sets[kind],setting=config.surfaces[kind.toLowerCase()];m.setBaseColorTexture(set.color).setNormalTexture(set.normal).setMetallicRoughnessTexture(set.roughness).setRoughnessFactor(1).setNormalScale(setting.normalScale);
  for(const info of [m.getBaseColorTextureInfo(),m.getNormalTextureInfo(),m.getMetallicRoughnessTextureInfo()])info.setWrapS(10497).setWrapT(10497).setExtension('KHR_texture_transform',tiling.createTransform().setScale(setting.tile));
}
root.getAsset().copyright='Original InterestShield sailing yacht geometry: hollow white/teal hull, timber cockpit, glazed cabin, connected rigging, billowed sails and physical panel seams. Retained original generated oak/cloth sources with explicit provenance; authored approximate PBR, not scans, exact poster reconstruction or marine certification. No financial records or endorsement.';
await document.transform(prune(),dedup(),weld(),meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeTexcoord:16}));
const output=Buffer.from(await io.writeBinary(document)),target=new URL('../../web/public/heroes/recreation.glb',import.meta.url),count=m=>m.listPrimitives().reduce((sum,p)=>sum+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),triangles=root.listMeshes().reduce((sum,m)=>sum+count(m),0);let instantiated=0;
function walk(n){if(n.getMesh())instantiated+=count(n.getMesh())*(n.getExtension('EXT_mesh_gpu_instancing')?.listAttributes()[0]?.getCount()??1);n.listChildren().forEach(walk);}root.listScenes().forEach(s=>s.listChildren().forEach(walk));
async function sizeOf(url){let size=0;for(const entry of await readdir(url,{withFileTypes:true})){const path=new URL(entry.name+(entry.isDirectory()?'/':''),url);size+=entry.isDirectory()?await sizeOf(path):(await stat(path)).size;}return size;}
const collection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
console.log(JSON.stringify({triangles,instantiated,meshes:root.listMeshes().length,textures:root.listTextures().map(t=>({name:t.getName(),bytes:t.getImage().length})),bytes:output.length,collection}));
if(output.length>524288||triangles>65000||instantiated>65000||collection>10485760)throw new Error('Recreation exceeds unchanged delivery limits; previous artifact untouched');
await saveRefinedHero({id:'recreation',quality:'refined-textured',bytes:output.length,meshes:root.listMeshes().length,triangles,sha256:hash(output),sourceFile:'apps/media/scripts/build-refined-recreation.mjs',sourceSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),materialSourceSha256:hash(JSON.stringify(config)),creator:'InterestShield project',license:'Original project geometry and explicitly retained original generated oak/cloth sources',provenance:'Original hollow white/teal yacht, timber cockpit, glazed cabin, connected standing rigging, billowed thick sails with physical seams, helm and visible keel/rudder. Approximate authored PBR, not measured scans, exact poster reconstruction or marine certification.',units:'normalized stage units',version:2},undefined,async()=>{
  const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
  if(liveCollection>10485760)throw new Error('Recreation public budget changed before locked publication; previous artifact untouched');
  const temporary=new URL('../../web/public/heroes/recreation.glb.tmp',import.meta.url);await writeFile(temporary,output);await rename(temporary,target);
});
console.log(`Refined Recreation: ${triangles} unique/${instantiated} instantiated triangles,${root.listTextures().length} maps,${output.length} bytes; public${collection} bytes.`);

async function maps(document,key,imageFile=null){
  const n=imageFile?config.colorResolution:config.resolution,setting=config.surfaces[key.toLowerCase()],gray=imageFile?await sharp(await readFile(new URL(imageFile,sources))).resize(n,n).greyscale().removeAlpha().raw().toBuffer():null;
  const height=(x,y)=>{x=(x+n)%n;y=(y+n)%n;return gray?gray[y*n+x]/255:0.5+Math.sin(y*(key==='Steel'?1.7:0.37))*0.05+Math.cos(x*0.19+y*0.11)*0.02;};
  const color=Buffer.alloc(n*n*3),normal=Buffer.alloc(n*n*3),orm=Buffer.alloc(n*n*3);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*3,h=height(x,y),c=Math.round(255*T.MathUtils.clamp(key==='Timber'?0.38+h*0.66:0.76+h*0.24,0,1)),dx=(height(x+1,y)-height(x-1,y))*0.8,dy=(height(x,y+1)-height(x,y-1))*0.8,length=Math.hypot(dx,dy,1);color[i]=color[i+1]=color[i+2]=c;normal[i]=Math.round(127.5-dx/length*127.5);normal[i+1]=Math.round(127.5-dy/length*127.5);normal[i+2]=Math.round(127.5+127.5/length);orm[i]=255;orm[i+1]=Math.round(255*T.MathUtils.clamp(setting.roughness+(h-0.5)*0.12,0,1));orm[i+2]=key==='Steel'?255:0;}
  async function texture(suffix,bytes){const size=suffix==='Color'&&imageFile?n:config.resolution;if(size!==n)bytes=await sharp(bytes,{raw:{width:n,height:n,channels:3}}).resize(size,size).raw().toBuffer();if(suffix==='Normal')for(let i=0;i<bytes.length;i+=3){const v=[0,1,2].map(j=>bytes[i+j]/127.5-1),length=Math.hypot(...v);for(let j=0;j<3;j++)bytes[i+j]=Math.round((v[j]/length+1)*127.5);}const encoded=await sharp(bytes,{raw:{width:size,height:size,channels:3}}).webp({lossless:suffix==='Normal',quality:suffix==='Color'?85:92,effort:6}).toBuffer();return document.createTexture('R-'+key+'-'+suffix).setImage(encoded).setMimeType('image/webp');}
  return {color:await texture('Color',color),normal:await texture('Normal',normal),roughness:await texture('Roughness',orm)};
}
