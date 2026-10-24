import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../../../apps/web/node_modules/three/build/three.module.js';
import {part,parts,result,separation,root,auth} from './review-geometry-probe.mjs';
const require=createRequire(new URL('../../../apps/media/package.json',import.meta.url));
const {parse}=require('acorn');
const source=await readFile(new URL('../../../apps/media/scripts/medical-refinement.test.mjs',import.meta.url),'utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const helperNames=['bounds','hits','contactFaces','firstCrossing'];
const snippets=ast.body.filter(n=>n.type==='FunctionDeclaration'&&helperNames.includes(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n');
const official=new Function('Vector3','Ray','Triangle','assert',snippets+';return {bounds,hits,contactFaces,firstCrossing};')(T.Vector3,T.Ray,T.Triangle,assert);
const badgeCase=ast.body.find(n=>n.type==='ExpressionStatement'&&n.expression.callee?.name==='test'&&n.expression.arguments[0]?.value==='Medical badge rim is closed and outward with visible aperture-facing inner walls');
const verifyNode=badgeCase.expression.arguments[1].body.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='verify')).declarations.find(d=>d.id.name==='verify').init;
const badgeVerify=new Function('bounds','hits','Vector3','assert','return ('+source.slice(verifyNode.start,verifyNode.end)+');')(official.bounds,official.hits,T.Vector3,assert);
const plain=p=>p.ts.map(t=>t.v);
const evidence={sha256:result.sha256,couplings:[],clearance:[],mutations:[]};

const specifications=[
 {name:'M-Y-Left-Branch',radius:0.04,points:[[-0.6,0.35,0.70],[-0.88,0.43,0.65],[-1.05,0.52,0.56]],other:'M-Ear-Left-Tube'},
 {name:'M-Y-Right-Branch',radius:0.04,points:[[-0.6,0.35,0.70],[-0.33,0.43,0.65],[-0.17,0.52,0.56]],other:'M-Ear-Right-Tube'},
 {name:'M-Main-Tube',radius:0.035,points:[[-0.6,0.35,0.70],[-0.88,0.16,0.98],[-0.63,0.065,1.35],[0.05,0.06,1.48],[1.0,0.06,1.43],[1.20,0.06,0.95],[0.98,0.06,0.67],[0.35,0.06,0.67],[0.18,0.065,0.90],[0.38,0.055,1.08],[0.60,0.055,1.07]],other:'M-Chestpiece-Connector'},
];

test('actual rubber coupling faces are outward annuli with retained bores, not solid infill',()=>{
 for(const spec of specifications){
  const p=part(spec.name),curve=new T.CatmullRomCurve3(spec.points.map(p=>new T.Vector3(...p)));
  for(const end of [0,1]){
   const center=curve.getPointAt(end),normal=curve.getTangentAt(end).multiplyScalar(end?1:-1);
   const cap=p.ts.filter(t=>t.cross.clone().normalize().dot(normal)>0.995&&t.v.every(v=>Math.abs(v.clone().sub(center).dot(normal))<0.00005));
   assert.equal(cap.length,16,p.label+' end'+end+' must have actual8-sector annular faces');
   const offsets=cap.flatMap(t=>t.v.map(v=>v.distanceTo(center)));
   const inner=Math.min(...offsets),outer=Math.max(...offsets);
   assert.ok(Math.abs(inner/spec.radius-0.45)<0.002,p.label+' bore ratio');
   assert.ok(Math.abs(outer/spec.radius-1)<0.002,p.label+' exact skin-ring extent');
   const ts=cap.map(t=>t.v),rayOrigin=center.clone().addScaledVector(normal,spec.radius),into=normal.clone().negate();
   assert.equal(official.hits(ts,rayOrigin,into).length,0,p.label+' bore must remain truly open');
   const radial=new T.Vector3(0,0,1).cross(normal).normalize();
   assert.equal(official.hits(ts,rayOrigin.clone().addScaledVector(radial,spec.radius*0.75),into,true).length,1,p.label+' actual coupling face must face outward');
   evidence.couplings.push({name:spec.name,end,faces:cap.length,innerRadius:inner,outerRadius:outer});
  }
 }
});

test('the standing contact helper rejects actual decoded earbow separation after only coupling-face removal',()=>{
 for(const spec of specifications.filter(s=>s.name.includes('Branch'))){
  const p=part(spec.name),ear=part(spec.other),curve=new T.CatmullRomCurve3(spec.points.map(p=>new T.Vector3(...p))),center=curve.getPointAt(1),normal=curve.getTangentAt(1);
  const isCap=t=>t.cross.clone().normalize().dot(normal)>0.995&&t.v.every(v=>Math.abs(v.clone().sub(center).dot(normal))<0.00005);
  const remaining=p.ts.filter(t=>!isCap(t));assert.equal(p.ts.length-remaining.length,16);
  assert.doesNotThrow(()=>official.contactFaces(plain(p),plain(ear)));
  assert.throws(()=>official.contactFaces(remaining.map(t=>t.v),plain(ear)),{code:'ERR_ASSERTION'});
  const distance=separation({...p,ts:remaining},ear);assert.ok(distance.gap>0.0108&&!distance.intersects);
  evidence.mutations.push({name:spec.name,removedAnnularFaces:16,standingContactRejected:true,restoredGap:distance.gap});
 }
});

test('actual main/chestpiece surfaces have positive clearance and the standing crossing helper rejects former routing',()=>{
 const main=part('M-Main-Tube');
 const oldPoints=[[-0.6,0.35,0.70],[-0.88,0.16,0.98],[-0.63,0.065,1.25],[0.05,0.06,1.35],[0.88,0.06,1.28],[1.10,0.06,0.90],[0.86,0.06,0.62],[0.35,0.06,0.67],[0.18,0.065,0.90],[0.38,0.055,1.08],[0.60,0.055,1.07]];
 const g=new T.TubeGeometry(new T.CatmullRomCurve3(oldPoints.map(p=>new T.Vector3(...p))),128,0.035,8,false);
 const old=Array.from({length:g.index.count/3},(_,i)=>[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(g.attributes.position,g.index.getX(i*3+j))));
 for(const suffix of ['Body','Rim','Diaphragm']){
  const target=part('M-Chestpiece-'+suffix),distance=separation(main,target);
  assert.ok(distance.gap>0.001&&!distance.intersects&&!distance.containedVertex,suffix+' actual clearance');
  assert.equal(official.firstCrossing(plain(main),plain(target)),null);
  const oldHit=official.firstCrossing(old,plain(target));assert.ok(oldHit,suffix+' must reject the former crossing path');
  evidence.clearance.push({name:target.label,authoredGap:distance.gap,stageGap:distance.gap*result.authoredToWorldScale,closestPair:distance.pair,formerPathRejectedAt:oldHit.toArray()});
 }
 g.dispose();
});

test('actual rim stays outward while inner-wall-only winding mutation is rejected independently of encoded normals',()=>{
 const p=part('M-Badge-Rim');badgeVerify(plain(p));
 const center=new T.Vector3(0,0.64,0);
 let reversed=0;
 const mutate=p.ts.map(t=>{
  const centroid=t.v.reduce((s,v)=>s.add(v),new T.Vector3()).multiplyScalar(1/3).sub(center);centroid.z=0;
  if(t.cross.dot(centroid)>=-1e-9)return t.v;
  reversed++;return [t.v[0],t.v[2],t.v[1]];
 });
 assert.ok(reversed>0&&reversed<p.ts.length);
 assert.throws(()=>badgeVerify(mutate),{code:'ERR_ASSERTION'});
 const open=plain(p).slice(1);assert.throws(()=>badgeVerify(open),{code:'ERR_ASSERTION'});
 evidence.mutations.push({name:'M-Badge-Rim',onlyInnerFacesReversed:reversed,standingRimRejected:true,missingFaceRejected:true});
});

test('save independent current fix-verification evidence',async()=>{
 await writeFile(new URL('./review-geometry-coupling-mutations.log',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence,null,2));
});
