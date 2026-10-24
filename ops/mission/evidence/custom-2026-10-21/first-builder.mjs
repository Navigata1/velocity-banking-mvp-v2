import * as T from '../../web/node_modules/three/build/three.module.js';
import {RoundedBoxGeometry} from '../../web/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTTextureWebP,KHRTextureTransform} from '@gltf-transform/extensions';
import {prune,dedup,weld,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {readFile,writeFile,rename,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {saveRefinedHero} from './refined-hero-record.mjs';

globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const hash=b=>createHash('sha256').update(b).digest('hex'),config=JSON.parse(await readFile(new URL('../sources/custom/materials.json',import.meta.url)));
const material=(name,color,roughness,metalness=0)=>Object.assign(new T.MeshPhysicalMaterial({color,roughness,metalness}),{name});
const steel=material('C-Steel-Linear','#c5cbd0',0.29,1),radial=material('C-Steel-Radial','#cbd0d2',0.27,1),dial=material('C-Dial','#283032',0.49,0.86);
steel.anisotropy=0.38;
const north=material('C-Enamel-Green','#087657',0.19),south=material('C-Enamel-Red','#b62932',0.19);
north.clearcoat=south.clearcoat=0.82;north.clearcoatRoughness=south.clearcoatRoughness=0.12;
const glass=material('C-Glass','#e2eceb',0.07);glass.transparent=true;glass.opacity=0.12;
const object=new T.Group();object.name='C-Assembly';
function add(name,g,s,at=[0,0,0],parent=object){const m=new T.Mesh(g,s);m.name=name;m.position.set(...at);parent.add(m);return m;}
function rod(name,a,b,radius,parent=object){const from=new T.Vector3(...a),to=new T.Vector3(...b),m=add(name,new T.CylinderGeometry(radius,radius,from.distanceTo(to),20,1),steel,from.clone().add(to).multiplyScalar(0.5).toArray(),parent);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize());return m;}
function positive(g){const p=g.attributes.position,ix=g.index;let volume=0;for(let i=0;i<ix.count;i+=3){const [a,b,c]=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j)));volume+=a.dot(b.cross(c));}if(volume<0){for(let i=0;i<ix.count;i+=3){const b=ix.getX(i+1);ix.setX(i+1,ix.getX(i+2));ix.setX(i+2,b);}const normal=g.attributes.normal;for(let i=0;i<normal.count;i++)normal.setXYZ(i,-normal.getX(i),-normal.getY(i),-normal.getZ(i));}return g;}
function turned(profile,segments=96,planar=false){
  const source=new T.LatheGeometry([...profile,profile[0]].map(p=>new T.Vector2(...p)),segments),position=source.attributes.position,indices=[];
  // Axis fans retain only the nondegenerate triangle of each lathe quad.
  for(let i=0;i<source.index.count;i+=3){const ids=[0,1,2].map(j=>source.index.getX(i+j)),p=ids.map(j=>new T.Vector3().fromBufferAttribute(position,j));if(new T.Triangle(...p).getArea()>1e-10)indices.push(...ids);}source.setIndex(indices);
  if(!planar)return positive(source);
  const g=source.toNonIndexed(),p=g.attributes.position,uv=g.attributes.uv,radius=Math.max(...profile.map(p=>p[0]));
  for(let i=0;i<p.count;i+=3){const a=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j));if(Math.abs(new T.Triangle(...a).getNormal(new T.Vector3()).y)>0.2)for(let j=0;j<3;j++)uv.setXY(i+j,0.5+a[j].x/(2*radius),0.5+a[j].z/(2*radius));}
  g.setIndex(Array.from({length:p.count},(_,i)=>i));return positive(g);
}
function faceted(points,bottom,edge,peak){
  if(points.reduce((s,p,i)=>s+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0)>0)points=[...points].reverse();
  const center=points.reduce((s,p)=>s.map((v,i)=>v+p[i]/points.length),[0,0]),position=[],uv=[];
  const triangle=(a,b,c)=>{for(const p of [a,b,c]){position.push(...p);uv.push(0.5+p[0]/1.5,0.5+p[2]/1.5);}};
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],lo=[a[0],bottom,a[1]],ln=[b[0],bottom,b[1]],hi=[a[0],edge,a[1]],hn=[b[0],edge,b[1]];
    triangle([center[0],peak,center[1]],hi,hn);triangle([center[0],bottom,center[1]],ln,lo);
    const start=position.length/3;triangle(lo,ln,hn);triangle(lo,hn,hi);
    for(let j=start;j<position.length/3;j++)uv.splice(j*2,2,j%3===0?0:1,position[j*3+1]===bottom?0:1);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(Array.from({length:position.length/3},(_,i)=>i));g.computeVertexNormals();return positive(g);
}

add('C-Case',turned([[0,.04],[.80,.04],[.95,.058],[.99,.09],[1,.16],[1,.33],[.995,.375],[.98,.415],[.955,.443],[.89,.443],[.875,.425],[.875,.39],[.89,.35],[.89,.14],[.86,.12],[0,.12]],128),steel);
add('C-Dial',turned([[0,.12],[.865,.12],[.872,.128],[.872,.256],[.865,.264],[0,.264]],96,true),dial);
const rose=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,r=i%2?.145:(i%4===0?.66:.48);return [Math.sin(a)*r,Math.cos(a)*r];});
add('C-Rose',faceted(rose,.263,.284,.301),radial);
const tickGeometries=[.058,.124].map(length=>new RoundedBoxGeometry(.012,.014,length,1,.002));
for(let i=0;i<60;i++){const a=i*Math.PI/30,m=add('C-Tick-'+i,tickGeometries[i%5===0?1:0],radial,[Math.sin(a)*.777,.269,Math.cos(a)*.777]);m.rotation.y=a;}
const needle=new T.Group();needle.name='C-Needle-Group';needle.rotation.y=0.54;object.add(needle);
add('C-Needle-North',faceted([[-.105,0],[0,-.71],[.105,0]],.314,.322,.353),north,[0,0,0],needle);
add('C-Needle-South',faceted([[-.105,0],[0,.66],[.105,0]],.314,.322,.353),south,[0,0,0],needle);
add('C-Axle',new T.CylinderGeometry(.036,.036,.11,48,1),steel,[0,.315,0]);
add('C-Pivot',turned([[0,.319],[.126,.319],[.132,.324],[.132,.333],[.105,.340],[.093,.347],[.093,.365],[.087,.374],[.068,.378],[0,.378]],96,true),radial);
add('C-Glass',turned([[0,.398],[.83,.398],[.862,.395],[.876,.389],[.876,.382],[.86,.391],[0,.391]],96,true),glass);

const lid=new T.Group();lid.name='C-Lid-Group';lid.position.set(0,.4,-.96);lid.rotation.x=-1.92;object.add(lid);
add('C-Lid',turned([[0,.06],[.88,.06],[.956,.052],[.988,.033],[1,.005],[.995,-.025],[.974,-.044],[.949,-.045],[.916,-.025],[.87,.005],[.80,.015],[0,.015]],128,true),radial,[0,0,.95],lid);
const barrel=turned([[.024,-.06],[.056,-.06],[.056,.06],[.024,.06]],48);
for(let i=0;i<5;i++){const m=add('C-Hinge-Knuckle-'+i,barrel,steel,[i*.15-.3,i%2?0:.4,i%2?0:-.96],i%2?lid:object);m.rotation.z=-Math.PI/2;}
const pin=add('C-Hinge-Pin',new T.CylinderGeometry(.0245,.0245,.76,48,1),radial,[0,.4,-.96]);pin.rotation.z=-Math.PI/2;
for(const sign of [-1,1]){
  rod('C-Hinge-Case-Link-'+sign,[sign*.30,.35,-.94],[sign*.30,.43,-.96],.021);
  rod('C-Hinge-Lid-Link-'+sign,[sign*.15,-.03,.015],[sign*.15,.03,.13],.018,lid);
}
const lug=add('C-Lug',turned([[0,-.12],[.073,-.12],[.083,-.105],[.083,-.075],[.067,-.058],[.067,.055],[.082,.075],[.082,.105],[.067,.12],[0,.12]],64),steel,[0,.22,1.04]);lug.rotation.x=Math.PI/2;
const bail=add('C-Bail',new T.TorusGeometry(.22,.027,12,64),steel,[0,.22,1.30]);bail.rotation.x=Math.PI/2;

object.rotation.set(.55,.85,-.10);
const bounds=new T.Box3().setFromObject(object,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());object.position.set(-center.x,-bounds.min.y,-center.z);
const stage=new T.Group();stage.name='InterestShield-custom-original-refined-v2';stage.scale.setScalar(3.2/Math.max(size.x,size.y,size.z));stage.add(object);stage.updateMatrixWorld(true);
const raw=Buffer.from(await new GLTFExporter().parseAsync(stage,{binary:true,onlyVisible:true}));await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder}),document=await io.readBinary(raw),root=document.getRoot();document.createExtension(EXTTextureWebP).setRequired(true);
const sets={Steel:await maps('Steel'),Radial:await maps('Radial'),Dial:await maps('Dial'),Enamel:await maps('Enamel')},tiling=document.createExtension(KHRTextureTransform);
for(const m of root.listMaterials()){
  const key=m.getName()==='C-Steel-Linear'?'Steel':m.getName()==='C-Steel-Radial'?'Radial':m.getName()==='C-Dial'?'Dial':m.getName().includes('Enamel')?'Enamel':null;if(!key)continue;
  const set=sets[key],setting=config.surfaces[key.toLowerCase()];m.setBaseColorTexture(set.color).setNormalTexture(set.normal).setMetallicRoughnessTexture(set.roughness).setRoughnessFactor(1).setNormalScale(setting.normalScale);
  for(const info of [m.getBaseColorTextureInfo(),m.getNormalTextureInfo(),m.getMetallicRoughnessTextureInfo()])info.setWrapS(10497).setWrapT(10497).setExtension('KHR_texture_transform',tiling.createTransform().setScale(setting.tile));
}
root.getAsset().copyright='Original InterestShield pocket-compass geometry and procedural material fields. Brushed case, hollow upright lid, connected hinge/bail, dark dial, raised rose and faceted green/red needle. Authored approximate PBR, not scans, exact poster reconstruction, certified alloy or calibrated navigation instrument.';
await document.transform(prune(),dedup(),weld(),meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeTexcoord:16}));
const output=Buffer.from(await io.writeBinary(document)),target=new URL('../../web/public/heroes/custom.glb',import.meta.url),count=m=>m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),triangles=root.listMeshes().reduce((s,m)=>s+count(m),0);let rendered=0;
function walk(n){if(n.getMesh())rendered+=count(n.getMesh())*(n.getExtension('EXT_mesh_gpu_instancing')?.listAttributes()[0]?.getCount()??1);n.listChildren().forEach(walk);}root.listScenes().forEach(s=>s.listChildren().forEach(walk));
async function sizeOf(url){let total=0;for(const e of await readdir(url,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),url);total+=e.isDirectory()?await sizeOf(p):(await stat(p)).size;}return total;}
const collection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
console.log(JSON.stringify({triangles,rendered,meshes:root.listMeshes().length,maps:root.listTextures().length,bytes:output.length,collection}));
if(output.length>524288||triangles>65000||rendered>65000||collection>10485760)throw new Error('Custom exceeds unchanged delivery limits; previous artifact untouched');
await saveRefinedHero({id:'custom',quality:'refined-textured',bytes:output.length,meshes:root.listMeshes().length,triangles,sha256:hash(output),sourceFile:'apps/media/scripts/build-refined-custom.mjs',sourceSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),materialSourceSha256:hash(JSON.stringify(config)),creator:'InterestShield project',license:'Original project geometry and procedural material fields',provenance:'Original brushed-metal pocket compass: hollow stepped case, seated dark dial/rose/ticks, faceted enamel needle, clear lens, upright hollow lid, connected five-barrel hinge and bail ring. Approximate authored PBR, not scans, exact poster reconstruction or navigation certification.',units:'normalized stage units',version:2},undefined,async()=>{
  const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
  if(liveCollection>10485760)throw new Error('Custom public budget changed before locked publication; previous artifact untouched');
  const temporary=new URL('../../web/public/heroes/custom.glb.tmp',import.meta.url);await writeFile(temporary,output);await rename(temporary,target);
});
console.log(`Refined Custom: ${triangles} unique/${rendered} rendered triangles,${root.listTextures().length} maps,${output.length} bytes; public${collection} bytes.`);

async function maps(kind){
  const n=config.resolution,setting=config.surfaces[kind.toLowerCase()],color=Buffer.alloc(n*n*3),normal=Buffer.alloc(n*n*3),orm=Buffer.alloc(n*n*3);
  const height=(x,y)=>{x=(x+n)%n;y=(y+n)%n;const r=Math.hypot(x-(n-1)/2,y-(n-1)/2);return .5+(kind==='Steel'?Math.sin(y*1.72+Math.sin(x*.047)*.05)*.027+Math.cos(x*.37+y*.19)*.004:kind==='Radial'?Math.sin(r*.92)*.032+Math.cos(x*.17-y*.11)*.003:kind==='Dial'?Math.sin(r*.67)*.022+Math.sin(x*.41+y*.32)*.006:Math.sin(x*.51+y*.34)*.025+Math.sin(x*.13-y*.37)*.01);};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*3,h=height(x,y),dx=(height(x+1,y)-height(x-1,y))*2.5,dy=(height(x,y+1)-height(x,y-1))*2.5,v=new T.Vector3(-dx,-dy,1).normalize(),c=Math.round(255*T.MathUtils.clamp(.50+h*.60,0,1));color[i]=color[i+1]=color[i+2]=c;for(let k=0;k<3;k++)normal[i+k]=Math.round((v.getComponent(k)+1)*127.5);orm[i]=255;orm[i+1]=Math.round(255*T.MathUtils.clamp(setting.roughness+(h-.5)*.7,0,1));orm[i+2]=kind==='Enamel'?0:255;}
  async function texture(suffix,bytes){const encoded=await sharp(bytes,{raw:{width:n,height:n,channels:3}}).webp({lossless:suffix==='Normal',quality:suffix==='Color'?85:92,effort:6}).toBuffer();return document.createTexture('C-'+kind+'-'+suffix).setImage(encoded).setMimeType('image/webp');}
  return {color:await texture('Color',color),normal:await texture('Normal',normal),roughness:await texture('Roughness',orm)};
}
