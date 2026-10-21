import * as T from '../../web/node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../web/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from '../../web/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP, KHRTextureTransform } from '@gltf-transform/extensions';
import { prune, dedup, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFile, writeFile, rename, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { saveRefinedHero } from './refined-hero-record.mjs';

globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const hash=b=>createHash('sha256').update(b).digest('hex'),sources=new URL('../sources/personal/',import.meta.url);
const config=JSON.parse(await readFile(new URL('materials.json',sources)));
for(const image of config.images)if(hash(await readFile(new URL(image.file,sources)))!==image.sha256)throw new Error('Personal original leather hash mismatch');
const material=(name,color,roughness,metalness=0)=>Object.assign(new T.MeshPhysicalMaterial({color,roughness,metalness}),{name});
const leather=material('P-Leather-Cognac','#87451f',0.48);leather.clearcoat=0.24;leather.clearcoatRoughness=0.35;
const edgeLeather=material('P-Leather-Edges','#66371d',0.65),brass=material('P-Brass-Antique','#b18b49',0.35,1),steel=material('P-Steel-Silver','#e0e1e2',0.42,1);
const thread=material('P-Thread-Tan','#dec399',0.82),paper=material('P-Paper-Ivory','#eae7de',0.94),ink=material('P-Chart-Ink','#4d6472',0.92);
const object=new T.Group();object.name='InterestShield-personal-original-refined-v2';
function add(name,geometry,surface,position=[0,0,0],parent=object){const m=new T.Mesh(geometry,surface);m.name=name;m.position.set(...position);parent.add(m);return m;}
function box(name,size,position,surface,radius=0.01){return add(name,new RoundedBoxGeometry(...size,1,Math.min(radius,...size.map(v=>v/3))),surface,position);}
function rounded(w,h,r,Constructor=T.Shape){const s=new Constructor(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);s.closePath();return s;}
function hole(shape,path,segments=8){const points=path.getPoints(segments);if(T.ShapeUtils.isClockWise(shape.getPoints(segments))===T.ShapeUtils.isClockWise(points))points.reverse();shape.holes.push(new T.Path(points));}
function uvUnit(g){const uv=g.getAttribute('uv');let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;for(let i=0;i<uv.count;i++){a=Math.min(a,uv.getX(i));b=Math.min(b,uv.getY(i));c=Math.max(c,uv.getX(i));d=Math.max(d,uv.getY(i));}for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)-a)/(c-a||1),(uv.getY(i)-b)/(d-b||1));return g;}
function extrude(shape,depth,bevel=0.005,curveSegments=8){return uvUnit(new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments}));}
function surface(positions,uvs,indices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;}
function outward(g){const p=g.attributes.position,ix=g.index;let volume=0;for(let i=0;i<ix.count;i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j)));volume+=v[0].dot(v[1].cross(v[2]));}if(volume<0){for(let i=0;i<ix.count;i+=3){const b=ix.getX(i+1);ix.setX(i+1,ix.getX(i+2));ix.setX(i+2,b);}g.computeVertexNormals();}return g;}
const profile=[[0,0.94,0.24],[0.08,1.02,0.30],[0.25,1.06,0.34],[0.6,1.08,0.37],[0.95,1.07,0.36],[1.2,1.04,0.33],[1.38,1.02,0.30]];
function dimensions(y){let i=1;while(i<profile.length-1&&profile[i][0]<y)i++;const a=profile[i-1],b=profile[i],t=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
const front=y=>dimensions(y)[1];
// A double-wall loft leaves a genuine open mouth and a solid leather bottom.
function shell(){const positions=[],uvs=[],indices=[],rings=[],n=80,outer=Array.from({length:13},(_,i)=>[i*1.38/12,...dimensions(i*1.38/12)]),inside=Array.from({length:13},(_,i)=>[0.08+i*1.30/12,...dimensions(0.08+i*1.30/12)]);
  for(const [inner,levels]of [[false,outer],[true,inside]])for(const [y,w,d]of levels){const points=rounded(2*(w-(inner?0.04:0)),2*(d-(inner?0.04:0)),0.14).getSpacedPoints(n),start=positions.length/3;
    points.forEach((p,i)=>{const facing=Math.abs(p.y)>d*0.65?Math.sign(p.y):0,bulge=0.025*(1-(p.x/w)**2)*Math.sin(y/1.38*Math.PI),fold=0.008*Math.cos(y*9+p.x*2)*Math.exp(-Math.pow((Math.abs(p.x)-0.78)/0.17,2));positions.push(p.x,y,p.y+facing*(bulge+fold));uvs.push(i/n,y/1.38);});rings.push({start,inner,y,w,d});}
  const quad=(a,b,c,d,reverse=false)=>indices.push(...(reverse?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
  for(let r=0;r<rings.length-1;r++){const a=rings[r],b=rings[r+1];if(a.inner!==b.inner)continue;for(let i=0;i<n;i++)quad(a.start+i,b.start+i,a.start+i+1,b.start+i+1,a.inner);}
  const outerTop=rings[outer.length-1],innerTop=rings.at(-1),rim=positions.length/3;
  for(const ring of [outerTop,innerTop])for(let i=0;i<=n;i++){const p=positions.slice((ring.start+i)*3,(ring.start+i)*3+3);positions.push(...p);uvs.push(0.5+p[0]/2.2,0.5+p[2]/0.8);}
  for(let i=0;i<n;i++)quad(rim+i,rim+n+1+i,rim+i+1,rim+n+2+i);
  for(const [ring,reverse]of [[rings[0],false],[rings[outer.length],true]]){const start=positions.length/3;for(let i=0;i<n;i++){const p=positions.slice((ring.start+i)*3,(ring.start+i)*3+3);positions.push(...p);uvs.push(0.5+p[0]/(2*ring.w),0.5+p[2]/(2*ring.d));}const center=positions.length/3;positions.push(0,ring.y,0);uvs.push(0.5,0.5);for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(...(reverse?[center,start+j,start+i]:[center,start+i,start+j]));}}
  return outward(uvUnit(surface(positions,uvs,indices)));}
add('P-Body',shell(),leather);
function ribbon(curve,width,thickness,segments=96,fixedAxis=null,taper=()=>1,widthSegments=1,bulge=0){const positions=[],uvs=[],indices=[],frames=curve.computeFrenetFrames(segments,false),section=[];
  for(let j=0;j<=widthSegments;j++)section.push([-1+2*j/widthSegments,-1]);for(let j=widthSegments;j>=0;j--)section.push([-1+2*j/widthSegments,1]);const edgeCount=section.length;section.push(section[0]);const stride=section.length;
  for(let i=0;i<=segments;i++){const t=i/segments,center=curve.getPointAt(t),tangent=curve.getTangentAt(t),axis=typeof fixedAxis==='function'?fixedAxis(tangent):fixedAxis??frames.normals[i],normal=tangent.clone().cross(axis).normalize(),w=width/2*taper(t);
    section.forEach(([u,v],k)=>{positions.push(...center.clone().addScaledVector(axis,u*w).addScaledVector(normal,v*thickness/2+bulge*(1-u*u)*Math.sin(t*Math.PI)).toArray());uvs.push(k/edgeCount,t);});}
  for(let i=0;i<segments;i++)for(let k=0;k<edgeCount;k++){const a=i*stride+k,b=a+1,c=(i+1)*stride+k,d=c+1;indices.push(a,b,c,b,d,c);}
  for(const [offset,reverse]of [[0,false],[segments*stride,true]]){const cap=positions.length/3;section.slice(0,-1).forEach(([u,v],k)=>{positions.push(...positions.slice((offset+k)*3,(offset+k)*3+3));uvs.push((u+1)/2,(v+1)/2);});for(let j=0;j<widthSegments;j++){const a=cap+j,b=a+1,c=cap+edgeCount-1-j,d=c-1;indices.push(...(reverse?[a,b,c,b,d,c]:[a,c,b,b,c,d]));}}return outward(surface(positions,uvs,indices));}
const curve=points=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
const flapCurve=curve([[0,1.37,0.30],[0,1.43,0.33],[0,1.40,0.39],[0,1.20,0.43],[0,0.98,0.44],[0,0.68,0.44]]);
const flapTaper=t=>t<0.88?1:0.86+0.14*Math.sqrt(Math.max(0,1-((t-0.88)/0.12)**2));
add('P-Flap',ribbon(flapCurve,1.98,0.035,40,new T.Vector3(1,0,0),flapTaper,6,0.025),leather);
const seams=[],pipes=[];
function tubeGeometry(points,radius,segments=32,sides=6){return new T.TubeGeometry(points instanceof T.Curve?points:curve(points),segments,radius,sides,false);}
function stitches(points,count,radius=0.0022,support='P-Body'){const c=points instanceof T.Curve?points:curve(points);for(let i=0;i<count;i++){const a=c.getPointAt((i+0.15)/count),b=c.getPointAt((i+0.72)/count);if(support==='P-Flap'&&[a,b].some(p=>p.y<1.32&&Math.abs(Math.abs(p.x)-0.62)<0.085))continue;seams.push({a,b,radius,support});}}
const panel=[[-0.87,1.28],[-0.9,0.45],[-0.84,0.15],[0,0.12],[0.84,0.15],[0.9,0.45],[0.87,1.28]].map(([x,y])=>[x,y,front(y)+0.005]);
pipes.push(tubeGeometry(panel,0.011,64,5));stitches(panel.map(([x,y])=>[x*0.97,y+0.012,front(y+0.012)+0.005]),90);
for(const sign of [-1,1]){const points=[];for(let i=0;i<=80;i++){const t=i/80,p=flapCurve.getPointAt(t);points.push([sign*0.985*flapTaper(t),p.y,p.z+0.004]);}pipes.push(tubeGeometry(points,0.009,48,5));stitches(points.map(p=>[p[0]*0.977,p[1],p[2]+0.003]),60,0.0022,'P-Flap');}
const lower=flapCurve.getPointAt(1);pipes.push(tubeGeometry([[-0.85,lower.y,lower.z],[0,lower.y,lower.z],[0.85,lower.y,lower.z]],0.009,16,5));stitches([[-0.83,lower.y+0.016,lower.z+0.02],[0,lower.y+0.016,lower.z+0.02],[0.83,lower.y+0.016,lower.z+0.02]],50,0.0022,'P-Flap');

const handleCurve=curve([[-0.62,1.53,-0.30],[-0.61,1.77,-0.30],[-0.43,1.92,-0.30],[0.43,1.92,-0.30],[0.61,1.77,-0.30],[0.62,1.53,-0.30]]);
add('P-Handle',ribbon(handleCurve,0.09,0.065,64,new T.Vector3(0,0,1)),leather);
stitches(handleCurve.getPoints(64).map(p=>[p.x,p.y,p.z+0.046]),50,0.0022,'P-Handle');
for(const [side,x]of [['L',-0.62],['R',0.62]]){
  add('P-Handle-Ring-'+side,new T.TorusGeometry(0.064,0.016,8,32),brass,[x,1.48,-0.30]);
  box('P-Handle-Tab-'+side,[0.13,0.25,0.042],[x,1.36,-0.307],leather,0.021);
  const stud=new T.CylinderGeometry(0.024,0.024,0.015,24);stud.rotateX(Math.PI/2);add('P-Handle-Rivet-'+side,stud,brass,[x,1.30,-0.335]);
}
function strapZ(y){return T.MathUtils.lerp(front(y)+0.022,0.495,T.MathUtils.smoothstep(y,0.48,0.64));}
object.updateMatrixWorld(true);
function frontSkin(x,y){const ray=new T.Raycaster(new T.Vector3(x,y,2),new T.Vector3(0,0,-1)),hit=ray.intersectObjects([object.getObjectByName('P-Body'),object.getObjectByName('P-Flap')],false)[0];if(!hit)throw new Error('Strap lacks body/flap support');return hit.point.z;}
// Horizontal cuts preserve the punched outline without long skinny faces across the bend.
function sliced(g,step=0.05){const pos=g.attributes.position,normal=g.attributes.normal,uv=g.attributes.uv,ix=g.index,out=[],ns=[],us=[];
  const clip=(polygon,y,above)=>{const result=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],aa=above?a.p.y>=y-1e-10:a.p.y<=y+1e-10,bb=above?b.p.y>=y-1e-10:b.p.y<=y+1e-10;if(aa)result.push(a);if(aa!==bb){const t=(y-a.p.y)/(b.p.y-a.p.y);result.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),uv:a.uv.clone().lerp(b.uv,t)});}}return result;};
  for(let i=0;i<(ix?.count??pos.count);i+=3){const triangle=[0,1,2].map(j=>{const k=ix?ix.getX(i+j):i+j,p=new T.Vector3().fromBufferAttribute(pos,k);p.y=Math.round(p.y*1e6)/1e6;return {p,n:new T.Vector3().fromBufferAttribute(normal,k),uv:new T.Vector2().fromBufferAttribute(uv,k)};}),min=Math.min(...triangle.map(v=>v.p.y)),max=Math.max(...triangle.map(v=>v.p.y));
    for(let band=Math.floor(min/step);band<=Math.floor(max/step);band++){const polygon=clip(clip(triangle,band*step,true),(band+1)*step,false);for(let j=1;j<polygon.length-1;j++){const vertices=[polygon[0],polygon[j],polygon[j+1]];if(new T.Triangle(...vertices.map(v=>v.p)).getArea()<1e-12)continue;for(const v of vertices){out.push(...v.p.toArray());ns.push(...v.n.toArray());us.push(...v.uv.toArray());}}}}
  const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(out,3));result.setAttribute('normal',new T.Float32BufferAttribute(ns,3));result.setAttribute('uv',new T.Float32BufferAttribute(us,2));return mergeVertices(result,1e-7);}
for(const [side,x]of [['L',-0.62],['R',0.62]]){
  const strap=rounded(0.15,1.06,0.06);for(const y of [0.02,-0.12,-0.26]){const p=new T.Path();p.absarc(0,y,0.019,0,Math.PI*2);hole(strap,p);}
  const rawStrap=extrude(strap,0.026,0.003);for(let i=0;i<rawStrap.attributes.position.count;i++)if(Math.abs(rawStrap.attributes.normal.getZ(i))>0.999)rawStrap.attributes.uv.setXY(i,(rawStrap.attributes.position.getX(i)+0.08)/0.16,(rawStrap.attributes.position.getY(i)+0.535)/1.07);
  const g=sliced(rawStrap),drape=(px,y)=>T.MathUtils.lerp(frontSkin(px,Math.min(y,0.55)),0.495,T.MathUtils.smoothstep(y,0.48,0.64));
  for(let i=0;i<g.attributes.position.count;i++){const y=g.attributes.position.getY(i)+0.78,px=x+g.attributes.position.getX(i),n=new T.Vector3().fromBufferAttribute(g.attributes.normal,i),h=0.0001,dx=(drape(px+h,y)-drape(px-h,y))/(2*h),dy=(drape(px,y+h)-drape(px,y-h))/(2*h);n.set(n.x-dx*n.z,n.y-dy*n.z,n.z).normalize();g.attributes.normal.setXYZ(i,...n.toArray());g.attributes.position.setXYZ(i,g.attributes.position.getX(i),y,g.attributes.position.getZ(i)+drape(px,y)+0.001);}add('P-Strap-'+side,g,leather,[x,0,0]);
  const frame=rounded(0.27,0.31,0.055);hole(frame,rounded(0.18,0.21,0.027,T.Path));add('P-Buckle-'+side,extrude(frame,0.027,0.005),brass,[x,0.80,0.474]);
  const pin=tubeGeometry([[x,0.65,0.49],[x,0.70,0.493],[x,0.82,0.49],[x,0.835,0.477]],0.012,32,8);add('P-Buckle-Pin-'+side,pin,brass);
  const keeper=rounded(0.185,0.08,0.012);hole(keeper,rounded(0.152,0.045,0.006,T.Path),4);add('P-Strap-Keeper-'+side,extrude(keeper,0.046,0.002,4),edgeLeather,[x,0.51,strapZ(0.51)-0.003]);
  for(const dx of [-0.057,0.057]){const pts=[];for(let i=0;i<=24;i++){const y=0.29+i/24;pts.push([x+dx,y,strapZ(y)+0.03]);}stitches(pts,40,0.0022,'P-Strap-'+side);}
}
const shoulder=curve([[-1.11,1.22,0.10],[-1.40,1.10,0.25],[-1.52,0.55,0.48],[-1.50,0.18,0.35],[-1.35,0.08,-0.15],[-0.75,0.08,-0.55],[0.35,0.08,-0.55],[1.10,0.18,-0.50],[1.40,0.65,-0.20],[1.35,1.10,-0.05],[1.11,1.22,0.10]]);
add('P-Shoulder-Strap',ribbon(shoulder,0.14,0.022,128,t=>new T.Vector3(t.y,-t.x,0).normalize()),leather);
for(const [side,sign]of [['L',-1],['R',1]]){
  const ring=new T.TorusGeometry(0.085,0.018,8,32);ring.rotateY(Math.PI/2);add('P-Shoulder-Ring-'+side,ring,brass,[sign*1.11,1.22,0.10]);
  box('P-Shoulder-Tab-'+side,[0.08,0.30,0.12],[sign*1.07,1.08,0.10],leather,0.02);
  const rivet=new T.CylinderGeometry(0.026,0.026,0.025,24);rivet.rotateZ(Math.PI/2);add('P-Shoulder-Rivet-'+side,rivet,brass,[sign*1.11,1.02,0.10]);
}
const stitchMesh=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,5,1),thread,seams.length);stitchMesh.name='P-Stitches';
object.updateMatrixWorld(true);const supportFaces=new Map();
function seat(point,support){
  if(!supportFaces.has(support)){const mesh=object.getObjectByName(support),g=mesh.geometry,faces=[],p=g.attributes.position,ix=g.index,count=ix?.count??p.count;for(let i=0;i<count;i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld)),normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();if(normal.z>0.2)faces.push({triangle:new T.Triangle(...v),normal});}supportFaces.set(support,faces);}
  let distance=Infinity,nearest,normal;const target=new T.Vector3(),ray=new T.Ray(new T.Vector3(point.x,point.y,2),new T.Vector3(0,0,-1));if(support.startsWith('P-Strap-'))for(const face of supportFaces.get(support)){if(!ray.intersectTriangle(face.triangle.a,face.triangle.b,face.triangle.c,true,target))continue;const d=2-target.z;if(d<distance){distance=d;nearest=target.clone();normal=face.normal;}}
  if(nearest)distance=nearest.distanceTo(point);else for(const face of supportFaces.get(support)){const d=face.triangle.closestPointToPoint(point,target).distanceTo(point);if(d<distance){distance=d;nearest=target.clone();normal=face.normal;}}
  if(!nearest||distance>0.08)throw new Error('Thread has no intended leather support: '+support);return nearest.addScaledVector(normal,0.00088);
}
seams.forEach(({a,b,radius,support},i)=>{const from=seat(a,support),to=seat(b,support),center=seat(a.clone().add(b).multiplyScalar(0.5),support);stitchMesh.setMatrixAt(i,new T.Matrix4().compose(center,new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize()),new T.Vector3(radius,from.distanceTo(to),radius)));});object.add(stitchMesh);
add('P-Piping',mergeGeometries(pipes),edgeLeather);pipes.forEach(g=>g.dispose());

const key=new T.Shape(),neckX=-0.44+0.30*Math.cos(0.37),neckY=0.22*Math.sin(0.37);key.moveTo(neckX,-neckY);for(const p of [[0.77,-0.08],[0.88,-0.025],[0.77,0.035],[0.70,0.035],[0.70,0.12],[0.61,0.12],[0.61,0.04],[0.54,0.04],[0.54,0.14],[0.45,0.14],[0.45,0.04],[0.38,0.04],[0.38,0.13],[0.30,0.13],[0.30,0.04],[neckX,neckY]])key.lineTo(...p);
key.absellipse(-0.44,0,0.30,0.22,0.37,Math.PI*2-0.37,false);key.closePath();const keyHole=new T.Path();keyHole.absellipse(-0.44,0,0.15,0.11,0,Math.PI*2,false);hole(key,keyHole,16);
const keyGeometry=extrude(key,0.035,0.005);keyGeometry.rotateX(-Math.PI/2+0.12);keyGeometry.computeBoundingBox();add('P-Key',keyGeometry,steel,[-0.15,-keyGeometry.boundingBox.min.y,1.02]);
function paperZ(x,y,offset=0){return -0.18-0.035*Math.sin((y-0.08)/1.93*Math.PI)+0.012*(x-0.45)**2+offset;}
function paperSkin(name,width,cx,offset,height){const g=new T.BoxGeometry(width,height,0.008,6,12,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)+cx,y=p.getY(i)+height/2+0.08;p.setXYZ(i,x,y,p.getZ(i)+paperZ(x,y,offset));}g.computeVertexNormals();return add(name,g,paper);}
paperSkin('P-Paper-Front',1.08,0.40,0,1.88);paperSkin('P-Paper-Back',1.14,0.35,-0.025,1.94);
const chart=new T.Group();chart.name='P-Chart';chart.userData={role:'Static unlabelled illustration; no financial results or records'};object.add(chart);
function inkGeometry(g){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+paperZ(p.getX(i),p.getY(i))+0.0042);g.computeVertexNormals();return g;}
for(let i=0;i<6;i++){const h=0.07+i*0.038,g=new T.BoxGeometry(0.07,h,0.0015,1,6,1);g.translate(0.04+i*0.13,1.50+h/2,0);add('P-Chart-Bar-'+i,inkGeometry(g),ink,[0,0,0],chart);}
const graph=[];for(let i=0;i<7;i++)graph.push([0.005+i*0.13,1.64+i*0.037+(i%2)*0.01,0]);const graphGeometry=tubeGeometry(graph,0.0028,32,5);add('P-Chart-Line',inkGeometry(graphGeometry),ink,[0,0,0],chart);

object.rotation.y=0.32;
const bounds=new T.Box3().setFromObject(object,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());object.position.set(-center.x,-bounds.min.y,-center.z);
const stage=new T.Group();stage.name='InterestShield-personal-stage';stage.scale.setScalar(3.2/Math.max(size.x,size.y,size.z));stage.add(object);stage.updateMatrixWorld(true);
const raw=Buffer.from(await new GLTFExporter().parseAsync(stage,{binary:true,onlyVisible:true}));await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const document=await io.readBinary(raw),root=document.getRoot();document.createExtension(EXTTextureWebP).setRequired(true);
const noise=(x,y,seed)=>((Math.imul(x+seed,374761393)^Math.imul(y+17,668265263))>>>0)/4294967295;
async function maps(prefix){const leatherMap=prefix==='Leather',n=leatherMap?config.leatherColorResolution:config.resolution;
  const gray=leatherMap?await sharp(await readFile(new URL(config.images[0].file,sources))).resize(n,n).greyscale().removeAlpha().raw().toBuffer():null;
  const height=(x,y)=>{x=(x+n)%n;y=(y+n)%n;if(gray)return gray[y*n+x]/255;const s=config.surfaces.grainSeed+(prefix==='Steel'?37:0);return 0.5+Math.sin(y/n*Math.PI*2*47)*0.035+(noise(Math.floor(x/8),Math.floor(y/8),s)-0.5)*0.04;};
  const color=Buffer.alloc(n*n*3),normal=Buffer.alloc(n*n*3),orm=Buffer.alloc(n*n*3),roughness=config.surfaces[prefix.toLowerCase()+'Roughness'];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*3,h=height(x,y),c=Math.round(255*T.MathUtils.clamp(leatherMap?0.40+h*0.68:0.72+h*0.28,0,1)),dx=(height(x+1,y)-height(x-1,y))*0.8,dy=(height(x,y+1)-height(x,y-1))*0.8,l=Math.hypot(dx,dy,1);color[i]=color[i+1]=color[i+2]=c;normal[i]=Math.round(127.5-dx/l*127.5);normal[i+1]=Math.round(127.5-dy/l*127.5);normal[i+2]=Math.round(127.5+127.5/l);orm[i]=255;orm[i+1]=Math.round(255*(roughness+(h-0.5)*0.14));orm[i+2]=leatherMap?0:255;}
  async function texture(suffix,bytes){const r=suffix==='Color'&&leatherMap?n:config.resolution;if(r!==n)bytes=await sharp(bytes,{raw:{width:n,height:n,channels:3}}).resize(r,r).raw().toBuffer();if(suffix==='Normal')for(let i=0;i<bytes.length;i+=3){const v=[0,1,2].map(j=>bytes[i+j]/127.5-1),length=Math.hypot(...v);for(let j=0;j<3;j++)bytes[i+j]=Math.round((v[j]/length+1)*127.5);}return document.createTexture('P-'+prefix+'-'+suffix).setImage(await sharp(bytes,{raw:{width:r,height:r,channels:3}}).webp({lossless:suffix==='Normal',quality:leatherMap&&suffix==='Color'?85:92,effort:6}).toBuffer()).setMimeType('image/webp');}
  return {color:await texture('Color',color),normal:await texture('Normal',normal),roughness:await texture('Roughness',orm)};}
const sets={Leather:await maps('Leather'),Brass:await maps('Brass'),Steel:await maps('Steel')},transforms=document.createExtension(KHRTextureTransform);
for(const m of root.listMaterials()){const key=m.getName().includes('Leather')?'Leather':m.getName().includes('Brass')?'Brass':m.getName().includes('Steel')?'Steel':null;if(!key)continue;const set=sets[key];m.setBaseColorTexture(set.color).setNormalTexture(set.normal).setMetallicRoughnessTexture(set.roughness).setRoughnessFactor(1).setNormalScale(key==='Leather'?config.surfaces.leatherNormalScale:config.surfaces.metalNormalScale);for(const info of [m.getBaseColorTextureInfo(),m.getNormalTextureInfo(),m.getMetallicRoughnessTextureInfo()])info.setWrapS(10497).setWrapT(10497).setExtension('KHR_texture_transform',transforms.createTransform().setScale(key==='Leather'?[2,2]:[1,1]));}
root.getAsset().copyright='Original InterestShield satchel, connected leather/brass hardware, stitched shoulder strap, key and illustrative paper geometry. Original generated leather source reused with traceable provenance. Authored approximate PBR, not measured scans or exact poster reconstruction. No financial data or product endorsement.';
await document.transform(prune(),dedup(),weld(),meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeTexcoord:16}));
const output=Buffer.from(await io.writeBinary(document)),target=new URL('../../web/public/heroes/personal.glb',import.meta.url);
const count=m=>m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),triangles=root.listMeshes().reduce((s,m)=>s+count(m),0);let instantiated=0;
function walk(n){if(n.getMesh())instantiated+=count(n.getMesh())*(n.getExtension('EXT_mesh_gpu_instancing')?.listAttributes()[0]?.getCount()??1);n.listChildren().forEach(walk);}root.listScenes().forEach(s=>s.listChildren().forEach(walk));
async function sizeOf(url){let size=0;for(const e of await readdir(url,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),url);size+=e.isDirectory()?await sizeOf(p):(await stat(p)).size;}return size;}
const collection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
console.log(JSON.stringify({triangles,instantiated,meshes:root.listMeshes().length,largest:root.listMeshes().map(m=>({name:root.listNodes().find(n=>n.getMesh()===m)?.getName(),triangles:count(m)})).sort((a,b)=>b.triangles-a.triangles).slice(0,10),textures:root.listTextures().map(t=>({name:t.getName(),bytes:t.getImage().length})),bytes:output.length,collection}));
const jsonBytes=output.readUInt32LE(12),gltf=JSON.parse(output.subarray(20,20+jsonBytes).toString());console.log(JSON.stringify({jsonBytes,accessors:gltf.accessors.length,bufferViews:gltf.bufferViews.length,buffers:gltf.buffers,compressedGeometryBytes:gltf.bufferViews.reduce((sum,v)=>sum+(v.extensions?.EXT_meshopt_compression?.byteLength??0),0)}));
if(output.length>0.5*1024*1024||triangles>65000||instantiated>65000||collection>10*1024*1024)throw new Error('Personal exceeds delivery limits; previous artifact untouched');
await saveRefinedHero({id:'personal',quality:'refined-textured',bytes:output.length,meshes:root.listMeshes().length,triangles,sha256:hash(output),sourceFile:'apps/media/scripts/build-refined-personal.mjs',sourceSha256:hash((await readFile(new URL(import.meta.url),'utf8')).replace(/\r\n/g,'\n')),materialSourceSha256:hash(JSON.stringify(config)),creator:'InterestShield project',license:'Original project geometry and retained original generated leather albedo source',provenance:'Original hollow cognac satchel with thick curved flap, brass buckle/handle/shoulder assemblies, punched leather straps, real stitches/piping, key aperture and inserted illustrative papers. Approximate PBR, not measured scans or exact poster reconstruction.',units:'normalized stage units',version:2},undefined,async()=>{
  const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
  if(liveCollection>10*1024*1024)throw new Error('Personal public budget changed before locked publication; previous artifact untouched');
  const temporary=new URL('../../web/public/heroes/personal.glb.tmp',import.meta.url);await writeFile(temporary,output);await rename(temporary,target);
});
console.log(`Refined Personal: ${triangles} unique/${instantiated} instantiated triangles,${root.listTextures().length} maps,${output.length} bytes; public${collection} bytes.`);
