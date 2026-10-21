import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse} from '../../../apps/media/node_modules/acorn/dist/acorn.mjs';
import * as T from '../../../apps/web/node_modules/three/build/three.module.js';
import {pins,named,frame,mesh,triangles,pair,topology,rings,closest,intersections} from './review-geometry-probe.mjs';
const source=await readFile(new URL('../../../apps/media/scripts/recreation-refinement.test.mjs',import.meta.url),'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),wanted=['faces','bounds','hits','solid','distance','threadSections','seatedThreads'];
const fragments=ast.body.filter(n=>n.type==='FunctionDeclaration'&&wanted.includes(n.id.name)).map(n=>source.slice(n.start,n.end)),keyDeclaration=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='key'));fragments.push(source.slice(keyDeclaration.start,keyDeclaration.end));
const env={assert,Matrix3:T.Matrix3,Matrix4:T.Matrix4,Quaternion:T.Quaternion,Vector3:T.Vector3,Ray:T.Ray,Triangle:T.Triangle};
const h=new Function(...Object.keys(env),fragments.join('\n')+'\nreturn {'+wanted.join(',')+'};')(...Object.values(env));
const out=(tag,value)=>console.log(tag,JSON.stringify(value)),results=[];
function trial(name,fn,expected=true){let accepted=true,error=null;try{fn();}catch(e){accepted=false;error=e.message;}results.push({name,expected,accepted,error});return accepted;}
function winding(p,ts){let omega=0;for(const t of ts){const a=t[0].clone().sub(p),b=t[1].clone().sub(p),c=t[2].clone().sub(p),la=a.length(),lb=b.length(),lc=c.length();omega+=2*Math.atan2(a.dot(b.clone().cross(c)),la*lb*lc+a.dot(b)*lc+b.dot(c)*la+c.dot(a)*lb);}return omega/(4*Math.PI);}
const classify=(p,ts)=>Math.abs(winding(p,ts))>.5;
function rayInside(p,surface){const b=h.bounds(surface);return [new T.Vector3(1,.371,.137),new T.Vector3(.213,1,.417),new T.Vector3(.147,.319,1)].filter(d=>h.hits(surface,p,d,b.span.length()*4).length%2===1).length>=2;}
function transformed(ts,matrix){return ts.map(t=>{const q=t.map(p=>p.clone().applyMatrix4(matrix));q.uv=t.uv;q.box=new T.Box3().setFromPoints(q);return q;});}
out('PINS',pins);
for(const sign of [-1,1])for(const x of [-.48,.33]){
  const name='R-Grab-Support-'+sign+'-'+x,ts=mesh(name),top=topology(ts);assert.equal(top.boundary,0);assert.equal(top.wrongDirected,0);assert.ok(top.volume>0);
  for(const target of ['R-Cabin-Roof','R-Grab-Rail-'+sign]){const contact=pair(name,target);assert.ok(contact.crossings.length);out('P3_SUPPORT_ACTUAL',{name,target,...contact});}
  const node=named(name),old=node.getTranslation();try{node.setTranslation([old[0],old[1]+.05,old[2]]);assert.equal(intersections(mesh(name),mesh('R-Cabin-Roof'),1).length,0);out('P3_SUPPORT_FLOAT_CONTROL',{name,detached:true});}finally{node.setTranslation(old);}
}
for(const sign of [-1,1])for(const target of ['R-Deck','R-Winch-Drum-'+sign]){const name='R-Winch-Base-'+sign,contact=pair(name,target);assert.ok(contact.crossings.length);out('P3_WINCH_ACTUAL',{name,target,...contact});}
for(const [sailName,seamName]of [['R-Mainsail','R-Main-Seams'],['R-Jib','R-Jib-Seams']]){
  const surface=mesh(sailName),paths=mesh(seamName),components=topology(paths).components;let pointCount=0,mismatches=0,buriedCenters=0,outsideRadius=0,sectionFailures=0;
  const groups=h.threadSections(paths);assert.equal(groups.length,125);assert.ok(groups.every(ps=>ps.length===5));assert.equal(components.length,5);assert.ok(components.every(c=>rings(c).length===25));
  for(const points of groups){const center=points.reduce((s,p)=>s.add(p),new T.Vector3()).divideScalar(points.length),cs=[center,...points],inside=cs.map(p=>{pointCount++;const w=classify(p,surface),r=rayInside(p,surface);if(w!==r)mismatches++;return w;});if(inside[0])buriedCenters++;if(closest(center,surface).d>=Math.min(...points.map(p=>p.distanceTo(center))))outsideRadius++;if(!inside.slice(1).some(Boolean)||inside.slice(1).every(Boolean))sectionFailures++;}
  assert.equal(mismatches,0);assert.equal(buriedCenters,0);assert.equal(outsideRadius,0);assert.equal(sectionFailures,0);out('SOLID_ANGLE_VS_HELPER',{sailName,components:components.length,sections:groups.length,points:pointCount,mismatches,buriedCenters,outsideRadius,sectionFailures});
  trial(sailName+' current',()=>h.seatedThreads(paths,surface));
  for(const deltaZ of [.006,-.0035]){const moved=transformed(paths,new T.Matrix4().makeTranslation(0,0,deltaZ));trial(sailName+' Z '+deltaZ,()=>h.seatedThreads(moved,surface),false);const centers=h.threadSections(moved).map(ps=>ps.reduce((s,p)=>s.add(p),new T.Vector3()).divideScalar(ps.length));out('MUTATION_WINDING',{sailName,deltaZ,centersInside:centers.filter(p=>classify(p,surface)).length,centers:centers.length,actualTriangleCrossings:intersections(moved,surface,1).length});}
  trial(sailName+' open shell rejects before parity',()=>h.seatedThreads(paths,surface.slice(1)),false);
  for(const scale of [.1,.7195303017174605,1,4]){const m=new T.Matrix4().compose(new T.Vector3(.41,-.27,.13),new T.Quaternion().setFromEuler(new T.Euler(.31,-.47,.23)),new T.Vector3(scale,scale,scale));trial(sailName+' flattened rigid/uniform '+scale,()=>h.seatedThreads(transformed(paths,m),transformed(surface,m)));}
  // Production uses sail-local frames, so a common ancestor's affine scale must cancel.
  const oldScale=frame.getScale(),oldRotation=frame.getRotation();try{frame.setScale([1.25,.75,1.5]);frame.setRotation(new T.Quaternion().setFromEuler(new T.Euler(.21,.37,-.19)).toArray());trial(sailName+' actual common ancestor anisotropic TRS',()=>h.seatedThreads(h.faces(named(seamName),named(sailName)),h.faces(named(sailName))));}finally{frame.setScale(oldScale);frame.setRotation(oldRotation);}
  const anisotropic=new T.Matrix4().makeScale(1.25,.75,1.5);const accepted=trial(sailName+' flattened anisotropic exploratory',()=>h.seatedThreads(transformed(paths,anisotropic),transformed(surface,anisotropic)),null);out('NONPRODUCTION_SCALE_LIMIT',{sailName,flattenedAnisotropicAccepted:accepted,productionCommonAncestorFrameTested:true});
}
out('HELPER_TRIALS',results);const failures=results.filter(r=>r.expected!==null&&r.accepted!==r.expected);out('UNEXPECTED_HELPER_RESULTS',failures);assert.equal(failures.length,0);
