import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshGPUInstancing} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix3,Matrix4,Quaternion,Vector3,Ray,Triangle,BoxGeometry,CylinderGeometry} from '../../web/node_modules/three/build/three.module.js';
import sharp from 'sharp';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';

const url=p=>new URL(p,import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
function sceneNodes(root){const found=new Set();function walk(n){found.add(n);n.listChildren().forEach(walk);}root.listScenes().forEach(s=>s.listChildren().forEach(walk));return [...found];}
async function recreation(){
  const records=JSON.parse(await readFile(url('../hero-imported.json'),'utf8')),inventory=JSON.parse(await readFile(url('../hero-models.json'),'utf8'));
  const bytes=await readFile(url('../../web/public/heroes/recreation.glb'));await MeshoptDecoder.ready;
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes),root=document.getRoot(),nodes=sceneNodes(root);
  const named=name=>{const matches=nodes.filter(n=>n.getName()===name);assert.equal(matches.length,1,name+' must exist exactly once in rendered scenes');return matches[0];};
  return {record:records.find(r=>r.id==='recreation'),inventory:inventory.find(r=>r.id==='recreation'),bytes,document,root,nodes,named};
}
function materials(node){const result=new Set();function walk(n){for(const p of n.getMesh()?.listPrimitives()??[]){assert.ok(p.getMaterial(),'rendered material required');result.add(p.getMaterial());}n.listChildren().forEach(walk);}walk(node);return [...result];}
function faces(node,frame=node){
  const result=[],inverse=frame?new Matrix4().fromArray(frame.getWorldMatrix()).invert():new Matrix4();
  function walk(n){
    const base=inverse.clone().multiply(new Matrix4().fromArray(n.getWorldMatrix())),batch=n.getExtension('EXT_mesh_gpu_instancing');
    const attributes=batch?.listAttributes()??[],count=attributes[0]?.getCount()??1;assert.ok(attributes.every(a=>a.getCount()===count),'consistent instance attribute counts');
    for(let instance=0;instance<count;instance++){
      const matrix=base.clone();if(batch)matrix.multiply(new Matrix4().compose(new Vector3().fromArray(batch.getAttribute('TRANSLATION')?.getElement(instance,[])??[0,0,0]),new Quaternion().fromArray(batch.getAttribute('ROTATION')?.getElement(instance,[])??[0,0,0,1]),new Vector3().fromArray(batch.getAttribute('SCALE')?.getElement(instance,[])??[1,1,1])));
      const normalMatrix=new Matrix3().getNormalMatrix(matrix);
      for(const primitive of n.getMesh()?.listPrimitives()??[]){
        assert.equal(primitive.getMode(),4,'actual triangles required');const pos=primitive.getAttribute('POSITION'),normal=primitive.getAttribute('NORMAL'),ix=primitive.getIndices(),count=ix?.getCount()??pos.getCount();assert.equal(count%3,0);
        for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j),t=ids.map(j=>new Vector3().fromArray(pos.getElement(j,[])).applyMatrix4(matrix));
          t.normals=normal?ids.map(j=>new Vector3().fromArray(normal.getElement(j,[])).applyMatrix3(normalMatrix).normalize()):null;t.uv=primitive.getAttribute('TEXCOORD_0')?ids.map(j=>primitive.getAttribute('TEXCOORD_0').getElement(j,[])):null;t.material=primitive.getMaterial();t.node=n;t.instance=instance;result.push(t);}
      }
    }
    n.listChildren().forEach(walk);
  }
  walk(node);assert.ok(result.length,node.getName()+' needs actual rendered triangles');return result;
}
function bounds(ts){const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);for(const t of ts)for(const p of t){min.min(p);max.max(p);}return {min,max,center:min.clone().add(max).multiplyScalar(0.5),span:max.clone().sub(min)};}
function hits(ts,origin,direction,length){const ray=new Ray(origin,direction.clone().normalize()),p=new Vector3(),out=[];for(const t of ts)if(ray.intersectTriangle(...t,false,p)&&p.distanceTo(origin)<=length&&!out.some(q=>q.distanceTo(p)<1e-6))out.push(p.clone());return out.sort((a,b)=>a.distanceTo(origin)-b.distanceTo(origin));}
const key=p=>p.toArray().map(v=>Math.round(v*1e6)).join(',');
function solid(ts){
  const edges=new Map();let volume=0;
  for(const [a,b,c]of ts){const ids=[a,b,c].map(key);if(new Set(ids).size<3)continue;volume+=a.dot(b.clone().cross(c))/6;
    for(let i=0;i<3;i++){const x=ids[i],y=ids[(i+1)%3],id=[x,y].sort().join('|'),e=edges.get(id)??[0,0];e[0]++;e[1]+=x<y?1:-1;edges.set(id,e);}}
  assert.ok(edges.size>6&&[...edges.values()].every(([count,winding])=>count===2&&winding===0),'solid must have closed directed two-manifold edges');
  assert.ok(volume>1e-9,'solid must enclose positive outward volume, independently of normals');
}
function distance(point,ts){let min=Infinity;const closest=new Vector3();for(const t of ts)min=Math.min(min,new Triangle(...t).closestPointToPoint(point,closest).distanceTo(point));return min;}
function threadSections(ts){
  const vertices=new Map(),adjacent=new Map();for(const t of ts){assert.ok(t.uv,'thread sections require actual exported UV coordinates');const ids=t.map(key);for(let i=0;i<3;i++){vertices.set(ids[i],{point:t[i],u:Math.round(t.uv[i][0]*1e6)});const neighbours=adjacent.get(ids[i])??new Set();ids.forEach(id=>neighbours.add(id));adjacent.set(ids[i],neighbours);}}
  const remaining=new Set(vertices.keys()),sections=[];while(remaining.size){const pending=[remaining.values().next().value],rings=new Map();while(pending.length){const id=pending.pop();if(!remaining.delete(id))continue;const vertex=vertices.get(id),points=rings.get(vertex.u)??[];points.push(vertex.point);rings.set(vertex.u,points);pending.push(...adjacent.get(id));}assert.ok(rings.size>=20,'each physical seam needs actual sampled tube sections');sections.push(...rings.values());}return sections;
}
function seatedThreads(paths,surface){
  solid(surface);const b=bounds(surface),directions=[new Vector3(1,0.371,0.137),new Vector3(0.213,1,0.417),new Vector3(0.147,0.319,1)],inside=p=>directions.filter(d=>hits(surface,p,d,b.span.length()*4).length%2===1).length>=2;
  for(const points of threadSections(paths)){assert.ok(points.length>=4,'thread section must retain a real polygon');const center=points.reduce((s,p)=>s.add(p),new Vector3()).divideScalar(points.length),radius=Math.min(...points.map(p=>p.distanceTo(center)));
    assert.ok(radius>1e-5&&distance(center,surface)<radius,'every thread center must seat within its own radius');assert.ok(!inside(center),'thread centers must remain outside the validated closed cloth');const sides=points.map(inside);assert.ok(sides.some(Boolean)&&sides.some(v=>!v),'each real thread section must cross its cloth surface, not float or be wholly buried');}
}
function properCrossing(left,right){
  for(const a of left)for(const b of right){if(['x','y','z'].some(k=>Math.max(...a.map(p=>p[k]))<Math.min(...b.map(p=>p[k]))||Math.max(...b.map(p=>p[k]))<Math.min(...a.map(p=>p[k]))))continue;
    for(const [from,to]of [[a,b],[b,a]])for(let i=0;i<3;i++){const d=from[(i+1)%3].clone().sub(from[i]),length=d.length(),p=new Vector3();if(length<1e-8)continue;
      if(new Ray(from[i],d.divideScalar(length)).intersectTriangle(...to,false,p)){const along=p.distanceTo(from[i]),bary=new Triangle(...to).getBarycoord(p,new Vector3());if(along>1e-6&&along<length-1e-6&&Math.min(...bary.toArray())>1e-5)return true;}}}
  return false;
}
function contactFaces(left,right,label='surfaces'){
  const lb=bounds(left),rb=bounds(right),tolerance=Math.min(lb.span.length(),rb.span.length())*0.006,p=new Vector3(),onRay=new Vector3(),onSegment=new Vector3();
  for(const [source,target,b]of [[left,right,rb],[right,left,lb]])for(const point of source.flat()){
    if(['x','y','z'].some(k=>point[k]<b.min[k]-tolerance||point[k]>b.max[k]+tolerance))continue;if(distance(point,target)<=tolerance)return;
  }
  // Only bounded triangle edges can establish crossings; open skins never use parity.
  for(const a of left)for(const b of right){
    if(['x','y','z'].some(k=>Math.max(...a.map(p=>p[k]))<Math.min(...b.map(p=>p[k]))-tolerance||Math.max(...b.map(p=>p[k]))<Math.min(...a.map(p=>p[k]))-tolerance))continue;
    for(const [from,to]of [[a,b],[b,a]])for(let i=0;i<3;i++){
      const origin=from[i],edge=from[(i+1)%3].clone().sub(origin),length=edge.length();if(length<1e-10)continue;const ray=new Ray(origin,edge.divideScalar(length));
      if(ray.intersectTriangle(...to,false,p)&&p.distanceTo(origin)<=length+tolerance)return;
      for(let j=0;j<3;j++)if(ray.distanceSqToSegment(to[j],to[(j+1)%3],onRay,onSegment)<=tolerance*tolerance&&onRay.distanceTo(origin)<=length)return;
    }
  }
  assert.fail(label+' must physically meet in XYZ');
}
const contact=(a,b,frame)=>contactFaces(faces(a,frame),faces(b,frame),a.getName()+' / '+b.getName());
function aperture(ts,depth){
  const b=bounds(ts),[u,v]=['x','y','z'].filter(k=>k!==depth),d=new Vector3();d[depth]=1;const grid=21;
  const points=Array.from({length:grid},(_,i)=>Array.from({length:grid},(_,j)=>{const p=b.center.clone();p[depth]=b.min[depth]-b.span.length();p[u]=b.min[u]+(i+0.5)*b.span[u]/grid;p[v]=b.min[v]+(j+0.5)*b.span[v]/grid;return p;}));
  const occupied=points.map(row=>row.map(p=>hits(ts,p,d,b.span.length()*3).length>0)),clear=[];
  for(let i=1;i<grid-1;i++)for(let j=1;j<grid-1;j++)if(!occupied[i][j]&&occupied.slice(0,i).some(r=>r[j])&&occupied.slice(i+1).some(r=>r[j])&&occupied[i].slice(0,j).some(Boolean)&&occupied[i].slice(j+1).some(Boolean))clear.push(points[i][j]);
  assert.ok(clear.length>=3,'actual surface must leave a measurable enclosed aperture');return {b,clear,depth};
}
function fixtureNode(document,geometry,name='Deliberate fixture'){
  const buffer=document.getRoot().listBuffers()[0]??document.createBuffer(),accessor=(type,array)=>document.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const p=document.createPrimitive().setAttribute('POSITION',accessor('VEC3',geometry.attributes.position.array)).setIndices(accessor('SCALAR',geometry.index.array));
  if(geometry.attributes.normal)p.setAttribute('NORMAL',accessor('VEC3',geometry.attributes.normal.array));return document.createNode(name).setMesh(document.createMesh().addPrimitive(p));
}
function rejectInfill(document,node,verify){const b=bounds(faces(node)),fill=fixtureNode(document,new BoxGeometry(...b.span.clone().multiplyScalar(0.98).toArray())).setTranslation(b.center.toArray());node.addChild(fill);try{assert.throws(verify,{code:'ERR_ASSERTION'},'solid infill must invalidate the true void');}finally{node.removeChild(fill);}}
function cloth(ts){
  solid(ts);const b=bounds(ts),depth=['x','y','z'].sort((a,c)=>b.span[a]-b.span[c])[0],[u,v]=['x','y','z'].filter(k=>k!==depth),d=new Vector3();d[depth]=1;const midpoints=[];
  for(let i=1;i<9;i++)for(let j=1;j<9;j++){
    const p=b.center.clone();p[u]=b.min[u]+i*b.span[u]/9;p[v]=b.min[v]+j*b.span[v]/9;p[depth]=b.min[depth]-b.span.length();const h=hits(ts,p,d,b.span.length()*3);if(!h.length)continue;
    assert.equal(h.length,2,'cloth section must have two real skins');const thickness=h[1][depth]-h[0][depth];assert.ok(thickness>1e-5&&thickness<Math.max(b.span[u],b.span[v])*0.06,'thin volumetric cloth, not a sheet or block');midpoints.push(h[0].clone().lerp(h[1],0.5));
  }
  assert.ok(midpoints.length>=12,'billow must cover a substantial sail area');let xx=0,xy=0,x=0,yy=0,y=0,xz=0,yz=0,z=0;
  for(const p of midpoints){const a=(p[u]-b.center[u])/b.span[u],c=(p[v]-b.center[v])/b.span[v];xx+=a*a;xy+=a*c;x+=a;yy+=c*c;y+=c;xz+=a*p[depth];yz+=c*p[depth];z+=p[depth];}
  const system=new Matrix3().set(xx,xy,x,xy,yy,y,x,y,midpoints.length);assert.ok(Math.abs(system.determinant())>1e-8,'sail samples must span a genuine two-dimensional skin');const fit=new Vector3(xz,yz,z).applyMatrix3(system.invert());
  assert.ok(midpoints.some(p=>Math.abs(p[depth]-fit.x*(p[u]-b.center[u])/b.span[u]-fit.y*(p[v]-b.center[v])/b.span[v]-fit.z)>Math.max(b.span[u],b.span[v])*0.008),'surface midpoints must depart from their best-fit plane: thickness alone is not billow');
}
function boundedUvs(uv){assert.ok(uv,'actual UVs required');for(let i=0;i<uv.getCount();i++)assert.ok(uv.getElement(i,[]).every(v=>Number.isFinite(v)&&v>=-1e-7&&v<=1+1e-7),'decoded normalized UVs must be within [0,1]');}
function texturedTriangles(p){
  const pos=p.getAttribute('POSITION'),uv=p.getAttribute('TEXCOORD_0'),ix=p.getIndices(),count=ix?.getCount()??pos.getCount();boundedUvs(uv);assert.equal(uv.getCount(),pos.getCount());
  for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j),v=ids.map(j=>new Vector3().fromArray(pos.getElement(j,[])));if(new Triangle(...v).getArea()<1e-10)continue;const u=ids.map(j=>uv.getElement(j,[])),area=Math.abs((u[1][0]-u[0][0])*(u[2][1]-u[0][1])-(u[1][1]-u[0][1])*(u[2][0]-u[0][0]));assert.ok(area>1e-12,'real textured triangles must not collapse into UV lines');}
}
async function lockedPublication(source){
  let callback;simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='saveRefinedHero')callback=n.arguments[2];}});
  assert.ok(callback?.body?.type==='BlockStatement','publication requires the locked saveRefinedHero callback');const replacements=[];let guard,live;
  simple(callback,{MemberExpression(n){if(n.object.type==='MetaProperty'&&n.property.name==='url')replacements.push({...n,text:JSON.stringify(url('./build-refined-recreation.mjs').href)});},IfStatement(n){if(n.test.left?.name==='liveCollection')guard=n;},VariableDeclarator(n){if(n.id.name==='liveCollection')live=n;}});
  assert.ok(guard&&live,'guard fresh liveCollection inside lock');
  const fragment=(edits=[])=>{let body=source.slice(callback.start,callback.end);for(const n of [...replacements,...edits].filter(n=>!edits.some(e=>e!==n&&e.start<=n.start&&e.end>=n.end)).sort((a,b)=>b.start-a.start))body=body.slice(0,n.start-callback.start)+n.text+body.slice(n.end-callback.start);return body;};
  const run=async(total,text)=>{
    const events=[],output=Buffer.alloc(96),target=url('../../web/public/heroes/recreation.glb');
    const publish=new Function('sizeOf','stat','writeFile','rename','URL','target','output','collection','return ('+text+');')(
      async p=>{assert.equal(p.href,url('../../web/public/').href);events.push('size');return total;},async p=>{assert.equal(p.href,target.href);return {size:64};},async()=>events.push('write'),async()=>events.push('rename'),URL,target,output,0);
    try{await publish();return {events};}catch(error){return {events,error};}
  };
  const verify=async text=>{
    const over=await run(10485760-31,text);assert.ok(over.error instanceof Error,'fresh over-budget total must reject');assert.deepEqual(over.events,['size'],'reject before writing');
    const exact=await run(10485760-32,text);assert.ifError(exact.error);assert.deepEqual(exact.events,['size','write','rename'],'exact cap must publish using the fresh total');
  };
  await verify(fragment());await assert.rejects(()=>verify(fragment([{...guard,text:''}])),{code:'ERR_ASSERTION'},'removed cap guard must fail');
  const at=callback.body.start+1,text='await sizeOf(new URL("../../web/public/",'+JSON.stringify(url('./build-refined-recreation.mjs').href)+'));';
  await assert.rejects(()=>verify(fragment([{...live.init,text:'collection'},{start:at,end:at,text}])),{code:'ERR_ASSERTION'},'unused fresh measurement must not conceal a stale guarded total');
}

test('Recreation protects the refined artifact in both manifests and hashes its builder, recipe and retained original sources',async()=>{
  const {record,inventory,bytes}=await recreation();assert.equal(record?.quality,'refined-textured','replace the old untextured Recreation study');
  assert.deepEqual(record,inventory,'both manifests must protect identical bytes and provenance');assert.equal(record.sourceFile,'apps/media/scripts/build-refined-recreation.mjs');
  assert.equal(record.sha256,hash(bytes));assert.equal(record.bytes,bytes.length);
  assert.equal(record.sourceSha256,hash((await readFile(url('./build-refined-recreation.mjs'),'utf8')).replace(/\r\n/g,'\n')));
  const config=JSON.parse(await readFile(url('../sources/recreation/materials.json'),'utf8'));assert.equal(record.materialSourceSha256,hash(JSON.stringify(config)));
  for(const [file,sha]of [['../house/oak-albedo-v1.png','78f9cbed87ec67f0522f1aa5047e0959dac32e0074e6ba60f262820a4d397b7a'],['../student-loan/cloth.png','bc2451f333299567d32abe18c229cdb5c768c1762318932e2f1e42fbba6364d2']]){
    const image=config.images.find(i=>i.file===file);assert.ok(image,'retain original source '+file);assert.equal(image.sha256,sha);assert.equal(hash(await readFile(new URL(file,url('../sources/recreation/')))),sha);
    assert.ok(image.origin&&image.originalOutput,'explicit original generation provenance required');
  }
  for(const image of config.images)assert.equal(image.sha256,hash(await readFile(new URL(image.file,url('../sources/recreation/')))));
});

test('Recreation embeds genuinely used varied Canvas, Timber, Paint and Steel WebP PBR maps without emission',async()=>{
  const {root,bytes,named}=await recreation(),textures=root.listTextures(),used=new Set(sceneNodes(root).flatMap(materials));
  assert.ok(textures.length>=9,'at least nine meaningful embedded maps, not untextured study materials');
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.ok(json.extensionsUsed?.includes('EXT_meshopt_compression'));
  assert.ok(json.images.length>=9&&json.images.every(i=>i.bufferView!==undefined&&!i.uri));assert.ok(json.buffers.every(b=>!b.uri));
  for(const texture of textures){
    assert.equal(texture.getMimeType(),'image/webp');const uses=[...used].flatMap(m=>[[m.getBaseColorTexture(),'color'],[m.getNormalTexture(),'normal'],[m.getMetallicRoughnessTexture(),'roughness']]).filter(([t])=>t===texture);
    assert.ok(uses.length,texture.getName()+' must be used on rendered geometry');const {data,info}=await sharp(texture.getImage()).raw().toBuffer({resolveWithObject:true});
    const detailedColor=uses.some(([,s])=>s==='color')&&/Canvas|Timber/i.test(texture.getName()),resolution=detailedColor?512:256;
    assert.equal(info.width,resolution);assert.equal(info.height,resolution);
    assert.ok([0,1].some(c=>{const values=new Set();for(let i=c;i<data.length;i+=info.channels)values.add(data[i]);return values.size>2;}),texture.getName()+' requires spatial detail');
    if(uses.some(([,s])=>s==='normal')){
      const image=Buffer.from(texture.getImage()),chunks=[];for(let offset=12;offset+8<=image.length;){chunks.push(image.toString('ascii',offset,offset+4));const size=image.readUInt32LE(offset+4);offset+=8+size+(size%2);}assert.ok(chunks.includes('VP8L'),'normal map must use lossless VP8L WebP');let valid=0;
      for(let i=0;i<data.length;i+=info.channels){const length=Math.hypot(...[0,1,2].map(c=>data[i+c]/127.5-1));if(length>0.85&&length<1.15&&data[i+2]>180)valid++;}
      assert.ok(valid>info.width*info.height*0.95,'plausible tangent-space normals required');
    }
  }
  for(const [name,set]of [['R-Mainsail','Canvas'],['R-Jib','Canvas'],['R-Deck','Timber'],['R-Hull','Paint'],['R-Mast','Steel']])for(const m of materials(named(name))){
    for(const t of [m.getBaseColorTexture(),m.getNormalTexture(),m.getMetallicRoughnessTexture()])assert.ok(t&&t.getName().includes(set),name+' needs its actual '+set+' PBR set');
    assert.ok(set==='Steel'?m.getMetallicFactor()>0.7:m.getMetallicFactor()===0,name+' surface response');
  }
  for(const m of root.listMaterials()){
    assert.ok([...m.getBaseColorFactor(),m.getMetallicFactor(),m.getRoughnessFactor()].every(v=>Number.isFinite(v)&&v>=0&&v<=1),'finite bounded PBR');
    assert.ok(m.getEmissiveFactor().every(v=>v===0)&&!m.getEmissiveTexture(),'no emissive highlights');
  }
});

test('Recreation hull is a closed outward double-wall open-top volume with a white upper body and teal lower body',async()=>{
  const {document,named}=await recreation(),node=named('R-Hull'),ts=faces(node),b=bounds(ts),length=b.span.x>b.span.z?'x':'z',beam=length==='x'?'z':'x';solid(ts);
  const verify=()=>{
    const triangles=faces(node),up=new Vector3(0,-1,0),across=new Vector3();across[beam]=1;
    for(const f of [0.4,0.5,0.6]){
      const p=b.center.clone();p[length]=b.min[length]+f*b.span[length];p.y=b.max.y+b.span.length();
      assert.equal(hits(triangles,p,up,b.span.length()*3).length,2,'open top must expose inner and outer bottom skins, not a solid deck');
      p.y=b.min.y+b.span.y*0.82;p[beam]=b.min[beam]-b.span.length();const h=hits(triangles,p,across,b.span.length()*3);
      assert.equal(h.length,4,'both sides need inner and outer hull walls');assert.ok(h[2][beam]-h[1][beam]>b.span[beam]*0.3,'actual navigable hull cavity, not a solid loft');
    }
  };
  verify();rejectInfill(document,node,verify);
  const white=ts.filter(t=>t.material.getBaseColorFactor().slice(0,3).every(v=>v>0.6)),teal=ts.filter(t=>{const [r,g,b]=t.material.getBaseColorFactor();return g>r*1.3&&b>r*1.1;});
  assert.ok(white.length>10&&teal.length>10,'both pigments must occupy real material groups');
  const averageY=triangles=>triangles.flat().reduce((s,p)=>s+p.y,0)/(triangles.length*3);assert.ok(averageY(white)>averageY(teal),'white upper / teal lower identity');
});

test('Recreation timber deck leaves a true recessed cockpit void with a contacting floor and walls, rejecting infill',async()=>{
  const {document,named,nodes}=await recreation(),deck=named('R-Deck'),floor=named('R-Cockpit-Floor'),verify=()=>aperture(faces(deck),'y'),{clear,b}=verify();
  rejectInfill(document,deck,verify);const floorFaces=faces(floor,deck),fb=bounds(floorFaces);
  assert.ok(fb.max.y<b.max.y-b.span.length()*0.015,'cockpit floor must be visibly recessed');
  assert.ok(clear.filter(p=>hits(floorFaces,p,new Vector3(0,1,0),b.span.length()*3).length).length>=3,'actual floor must lie below the actual deck aperture');
  const walls=nodes.filter(n=>/^R-Cockpit-Wall/.test(n.getName()));assert.ok(walls.length,'real cockpit wall geometry required');
  const wallFaces=walls.flatMap(n=>faces(n,deck));contactFaces(wallFaces,floorFaces,'cockpit walls / floor');contactFaces(wallFaces,faces(deck),'cockpit walls / deck');contact(deck,named('R-Hull'),deck);
});

test('Recreation cabin side windows are actual wall apertures with fitted transparent panes, not painted or opaque infill',async()=>{
  const {document,named}=await recreation();
  for(const side of ['Port','Starboard']){
    const cabin=named('R-Cabin-'+side),glass=named('R-Glass-'+side),cb=bounds(faces(cabin)),depth=cb.span.x<cb.span.z?'x':'z';
    const verify=()=>aperture(faces(cabin),depth),{clear,b}=verify();rejectInfill(document,cabin,verify);
    const panes=faces(glass,cabin),d=new Vector3();d[depth]=1;assert.ok(clear.filter(p=>hits(panes,p,d,b.span.length()*3).length).length>=3,'glazing must cover the real window holes');contact(glass,cabin,cabin);
    for(const m of materials(glass))assert.ok((m.getAlphaMode()==='BLEND'&&m.getBaseColorFactor()[3]<1)||m.getExtension('KHR_materials_transmission')?.getTransmissionFactor()>0,'window material must actually transmit light, not ignore its alpha');
  }
});

test('Recreation two ivory sails have closed thin skins and true billow beyond any best-fit plane',async()=>{
  const {named}=await recreation();for(const name of ['R-Mainsail','R-Jib']){
    const node=named(name);cloth(faces(node));for(const m of materials(node)){const [r,g,b]=m.getBaseColorFactor();assert.ok(r>0.6&&g>0.6&&b>0.45,'original ivory canvas identity');}
  }
});

test('Recreation boom, both sail feet and sheets clear the actual cabin roof',async()=>{
  const triangle=p=>p.map(v=>new Vector3(...v)),a=[triangle([[0,-1,0],[0,1,0],[0,0,1]])],b=[triangle([[-1,-0.5,0.25],[1,-0.5,0.25],[0,0.8,0.25]])];
  assert.equal(properCrossing(a,b),true);assert.equal(properCrossing(a,b.map(t=>t.map(p=>p.clone().add(new Vector3(3,0,0))))),false);
  const {named}=await recreation(),hull=named('R-Hull'),roof=faces(named('R-Cabin-Roof'),hull);
  for(const name of ['R-Boom','R-Mainsail','R-Jib','R-Main-Sheet','R-Jib-Sheet'])assert.equal(properCrossing(faces(named(name),hull),roof),false,name+' must not cut the cabin roof');
  const boom=named('R-Boom'),old=boom.getTranslation(),matrix=new Matrix4().fromArray(boom.getParentNode()?.getWorldMatrix()??new Matrix4().toArray()).invert().multiply(new Matrix4().fromArray(hull.getWorldMatrix())),bb=bounds(faces(boom,hull)),rb=bounds(roof),delta=rb.center.clone().sub(bb.center).applyMatrix4(matrix).sub(new Vector3().applyMatrix4(matrix));
  try{boom.setTranslation(old.map((v,i)=>v+delta.getComponent(i)));assert.equal(properCrossing(faces(boom,hull),roof),true,'moving the real boom through the roof must fail');}finally{boom.setTranslation(old);}
});

test('Recreation physical seam paths follow both actual billowed sail surfaces and reject displaced or planar chords',async()=>{
  const {named}=await recreation();for(const [sailName,seamName]of [['R-Mainsail','R-Main-Seams'],['R-Jib','R-Jib-Seams']]){
    const sail=named(sailName),seam=named(seamName),surface=faces(sail),b=bounds(surface),tolerance=b.span.length()*0.008;
    const verify=()=>{const paths=faces(seam,sail),pb=bounds(paths);assert.ok(paths.length>30&&pb.span.y>b.span.y*0.4,'physical paths must cover the sail, not a painted stripe');for(const p of paths.flat())assert.ok(distance(p,surface)<=tolerance,'every seam sample must follow actual billow');seatedThreads(paths,surface);};
    verify();const old=seam.getTranslation();seam.setTranslation([old[0],old[1]+b.span.length()*3,old[2]]);try{assert.throws(verify,{code:'ERR_ASSERTION'},'displaced seam must fail');}finally{seam.setTranslation(old);}
    seam.setTranslation([old[0],old[1],old[2]-0.0035]);try{assert.throws(verify,{code:'ERR_ASSERTION'},'a thread buried in the closed sail skin must fail');}finally{seam.setTranslation(old);}
    seam.setTranslation([old[0],old[1],old[2]+0.006]);try{assert.throws(verify,{code:'ERR_ASSERTION'},'a thread detached by six millimeters must fail at thread scale, not just object scale');}finally{seam.setTranslation(old);}
    const depth=['x','y','z'].sort((a,c)=>b.span[a]-b.span[c])[0],planar=faces(seam,sail).map(t=>t.map(p=>{const q=p.clone();q[depth]=b.center[depth];return q;}));assert.ok(planar.flat().some(p=>distance(p,surface)>tolerance),'billowed surface must distinguish planar seam chords');
  }
});

test('Recreation closed teal keel and rudder physically join the hull and extend below it',async()=>{
  const {named}=await recreation(),hull=named('R-Hull'),hb=bounds(faces(hull));
  for(const name of ['R-Keel','R-Rudder']){const node=named(name),ts=faces(node,hull),b=bounds(ts);solid(ts);contact(node,hull,hull);assert.ok(b.min.y<hb.min.y-hb.span.y*0.1&&b.max.y>=hb.min.y,'visible submerged fins must reach the hull');for(const m of materials(node)){const [r,g,b]=m.getBaseColorFactor();assert.ok(g>r*1.3&&b>r*1.1,'teal fins required');}
    const old=node.getTranslation();node.setTranslation([old[0],old[1]-hb.span.length()*10,old[2]]);try{assert.throws(()=>contact(node,hull,hull),{code:'ERR_ASSERTION'},'detached actual fin must fail contact');}finally{node.setTranslation(old);}
  }
});

test('Recreation mast, boom and real standing rigging meet their actual supports at bounded endpoints',async()=>{
  const {named}=await recreation(),mast=named('R-Mast'),boom=named('R-Boom'),deck=named('R-Deck'),hull=named('R-Hull'),rigging=named('R-Rigging');
  contact(mast,deck,mast);contact(boom,mast,mast);const groups=new Map();for(const t of faces(rigging,null)){if(!groups.has(t.node))groups.set(t.node,new Map());const group=groups.get(t.node);if(!group.has(t.instance))group.set(t.instance,[]);group.get(t.instance).push(t);}const rods=[...groups.values()].flatMap(g=>[...g.values()]);assert.ok(rods.length>=3,'at least three real standing stays, including actual instances');
  const supports=[faces(mast,null),[...faces(deck,null),...faces(hull,null)]];
  for(const ts of rods){
    const points=ts.flat(),first=points[0],far=points.reduce((a,p)=>p.distanceToSquared(first)>a.distanceToSquared(first)?p:a),end=points.reduce((a,p)=>p.distanceToSquared(far)>a.distanceToSquared(far)?p:a),axis=end.clone().sub(far).normalize(),projections=points.map(p=>p.dot(axis)),lo=Math.min(...projections),hi=Math.max(...projections);
    contactFaces(ts,supports[0],'stay / mast');contactFaces(ts,supports[1],'stay / deck or hull');
    assert.ok(hi-lo>bounds(faces(hull,null)).span.length()*0.15,'standing stays need real length');
    const endpoint=f=>{const selected=points.filter((p,i)=>f?projections[i]>hi-(hi-lo)*0.015:projections[i]<lo+(hi-lo)*0.015);return selected.reduce((s,p)=>s.add(p),new Vector3()).divideScalar(selected.length);},a=endpoint(false),b=endpoint(true),tolerance=(hi-lo)*0.025;
    assert.ok((distance(a,supports[0])<tolerance&&distance(b,supports[1])<tolerance)||(distance(b,supports[0])<tolerance&&distance(a,supports[1])<tolerance),'opposite actual stay endpoints must terminate at mast and deck/hull');
  }
});

test('Recreation wheel and pedestal form a connected volumetric helm supported by the cockpit floor',async()=>{
  const {named}=await recreation(),wheel=named('R-Wheel'),pedestal=named('R-Wheel-Pedestal'),ts=faces(wheel),b=bounds(ts);assert.ok(ts.length>=50&&Math.min(...b.span.toArray())>1e-4,'wheel requires real volumetric geometry');
  contact(wheel,pedestal,pedestal);contact(pedestal,named('R-Cockpit-Floor'),pedestal);
});

test('Recreation grab rails have two real standoffs seated on the cabin roof',async()=>{
  const {named,nodes}=await recreation(),roof=named('R-Cabin-Roof');for(const sign of [-1,1]){const rail=named('R-Grab-Rail-'+sign),supports=nodes.filter(n=>n.getName().startsWith('R-Grab-Support-'+sign+'-'));assert.equal(supports.length,2,'each elevated grab rail needs two actual supports');for(const support of supports){contact(support,roof,roof);contact(support,rail,roof);}}
});

test('Recreation winch bases sit on the actual timber deck',async()=>{
  const {named}=await recreation(),deck=named('R-Deck');for(const sign of [-1,1])contact(named('R-Winch-Base-'+sign),deck,deck);
});

test('Recreation preserves both 65k triangle budgets, 0.5MiB artifact, grounded 3.2 stage, real 16bit UVs and locked live 10MiB cap',async()=>{
  const {root,record,bytes}=await recreation();assert.ok(bytes.length<=524288,'Recreation must recover headroom within 0.5MiB');
  const rendered=root.listScenes().flatMap(s=>s.listChildren().flatMap(n=>faces(n,null))),b=bounds(rendered);assert.ok([...b.min.toArray(),...b.max.toArray()].every(Number.isFinite));
  assert.ok(Math.abs(Math.max(...b.span.toArray())-3.2)<0.003&&Math.abs(b.min.y)<0.003,'stage max dimension 3.2, grounded at Y=0');let unique=0;
  for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
    const pos=p.getAttribute('POSITION'),ix=p.getIndices(),count=ix?.getCount()??pos.getCount();unique+=count/3;
    for(const semantic of p.listSemantics())assert.ok(Array.from(p.getAttribute(semantic).getArray()).every(Number.isFinite),semantic+' must be finite');
    if(p.getMaterial()?.getBaseColorTexture())texturedTriangles(p);
  }
  for(const t of rendered){assert.ok(t.normals&&t.normals.every(n=>n.toArray().every(Number.isFinite)&&Math.abs(n.length()-1)<1e-5),'finite world normals required');const cross=t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0]));if(cross.lengthSq()<1e-18)continue;const average=t.normals.reduce((s,n)=>s.add(n),new Vector3());assert.ok(cross.dot(average)>=-cross.length()*0.001,'world winding must agree with inverse-transpose normals');}
  assert.equal(unique,record.triangles);assert.ok(unique>1000&&unique<=65000&&rendered.length<=65000,'UNIQUE and actual rendered triangle caps are independently enforced');
  async function sizeOf(path){let size=0;for(const e of await readdir(path,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),path);size+=e.isDirectory()?await sizeOf(p):(await stat(p)).size;}return size;}
  assert.ok(await sizeOf(url('../../web/public/'))<=10485760,'actual unchanged public cap is 10MiB');const source=await readFile(url('./build-refined-recreation.mjs'),'utf8');await lockedPublication(source);
  const options=[];simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='meshopt')options.push(n.arguments[0]);}});assert.ok(options.length,'actual meshopt compression required');
  for(const option of options)for(const name of ['quantizePosition','quantizeTexcoord'])assert.equal(option?.properties.find(p=>p.key.name===name)?.value.value,16,'retain 16-bit '+name);
});

test('Recreation verifiers expand GPU TRS, use normalized accessors and inverse-transpose normals, and reject false contact/void/volume fixtures',async()=>{
  const document=new Document(),buffer=document.createBuffer(),accessor=(type,array)=>document.createAccessor().setType(type).setArray(array).setBuffer(buffer),node=fixtureNode(document,new BoxGeometry(0.02,0.10,0.04));
  const batch=document.createExtension(EXTMeshGPUInstancing).createInstancedMesh();batch.setAttribute('TRANSLATION',accessor('VEC3',new Float32Array([0,0,0,1,0,0,2,0,0])));batch.setAttribute('SCALE',accessor('VEC3',new Float32Array([1,1,1,1,2,1,3,1,1])));batch.setAttribute('ROTATION',accessor('VEC4',new Float32Array([0,0,0,1,0,0,0,1,0,0,Math.SQRT1_2,Math.SQRT1_2])));node.setExtension('EXT_mesh_gpu_instancing',batch);
  const ts=faces(node),b=bounds(ts);assert.equal(ts.length,36);assert.ok(Math.abs(b.min.x+0.01)<1e-6&&Math.abs(b.max.x-2.05)<1e-6&&Math.abs(b.max.y-0.10)<1e-6,'actual instance bounds include T/R/S');
  const slant=fixtureNode(document,new BoxGeometry(1,1,1).rotateZ(Math.PI/4)).setScale([2,1,1]),slantFaces=faces(slant,null),n=slantFaces[0].normals[0];assert.ok(n.distanceTo(new Vector3(1/Math.sqrt(5),2/Math.sqrt(5),0))<1e-6,'world normals require inverse-transpose, not the position matrix');
  const uv=accessor('VEC2',new Uint16Array([0,0,65535,65535])).setNormalized(true);boundedUvs(uv);assert.deepEqual(uv.getElement(1,[]),[1,1]);assert.throws(()=>boundedUvs(accessor('VEC2',new Float32Array([0,0,1.01,1]))),{code:'ERR_ASSERTION'});
  const normalizedPos=accessor('VEC3',new Uint16Array([0,0,0,65535,0,0,0,65535,0])).setNormalized(true),primitive=document.createPrimitive().setAttribute('POSITION',normalizedPos).setAttribute('TEXCOORD_0',accessor('VEC2',new Uint16Array([0,0,65535,0,0,65535])).setNormalized(true));
  const normalizedNode=document.createNode().setMesh(document.createMesh().addPrimitive(primitive));assert.equal(faces(normalizedNode)[0][1].x,1,'positions also require normalized getElement');texturedTriangles(primitive);
  primitive.setAttribute('TEXCOORD_0',accessor('VEC2',new Float32Array([0,0,0.5,0.5,1,1])));assert.throws(()=>texturedTriangles(primitive),{code:'ERR_ASSERTION'},'bounded but collapsed UVs must fail');
  const box=(size,at=[0,0,0])=>faces(fixtureNode(document,new BoxGeometry(...size)).setTranslation(at),null),horizontal=box([4,0.2,0.4]),vertical=box([0.4,4,0.2]);contactFaces(horizontal,vertical);solid(horizontal);
  const tri=ps=>[ps.map(p=>new Vector3(...p))],a=tri([[0,0,0],[2,0,0],[0,2,0]]),c=tri([[2,2,0],[2,0.6,0],[0.6,2,0]]),inner=faces(fixtureNode(document,new CylinderGeometry(0.6,0.6,2,24,1,true))),outer=faces(fixtureNode(document,new CylinderGeometry(1,1,2,24,1,true)));
  for(const [left,right]of [[a,c],[c,a],[inner,outer],[outer,inner],[horizontal,box([0.4,4,0.2],[0,0,5])],[box([0.2,0.2,0.2]),box([2,2,2])]])assert.throws(()=>contactFaces(left,right),{code:'ERR_ASSERTION'},'overlapping bounds, nested skins/solids and unbounded rays are not surface contact');
  assert.throws(()=>solid(horizontal.slice(1)),{code:'ERR_ASSERTION'});assert.throws(()=>solid(horizontal.map(t=>[t[2],t[1],t[0]])),{code:'ERR_ASSERTION'});
  const frame=document.createNode('Window frame');for(const [size,at]of [[[0.2,2,0.2],[-0.9,0,0]],[[0.2,2,0.2],[0.9,0,0]],[[1.6,0.2,0.2],[0,0.9,0]],[[1.6,0.2,0.2],[0,-0.9,0]]])frame.addChild(fixtureNode(document,new BoxGeometry(...size)).setTranslation(at));
  const verify=()=>aperture(faces(frame),'z');verify();rejectInfill(document,frame,verify);
  const curved=new BoxGeometry(1,2,0.01,10,18,1),positions=curved.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i);positions.setZ(i,positions.getZ(i)+0.15*(1-4*x*x)*(1-y*y));}curved.computeVertexNormals();cloth(faces(fixtureNode(document,curved)));
  const flat=faces(fixtureNode(document,new BoxGeometry(1,2,0.01)));assert.throws(()=>cloth(flat),{code:'ERR_ASSERTION'},'a thick but planar slab is not a billowed sail');
  document.createScene().addChild(frame);assert.ok(sceneNodes(document.getRoot()).includes(frame)&&!sceneNodes(document.getRoot()).includes(node),'orphan nodes must not satisfy rendered contracts');
  await lockedPublication(`await saveRefinedHero({},undefined,async()=>{const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;if(liveCollection>10*1024*1024)throw new Error('cap');await writeFile(target,output);await rename(target,target);});`);
});
