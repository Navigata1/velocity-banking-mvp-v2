import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../../../apps/web/node_modules/three/build/three.module.js';
import {parts,result,auth} from './review-geometry-probe.mjs';

test('all actual curved corner faces and wraps are closed, outward and free of proper self-crossings',()=>{
 const corners=result.stats.filter(s=>/^M-Corner-(Face@|Wrap-)/.test(s.name));assert.equal(corners.length,16);
 for(const c of corners){assert.equal(c.faces,500);assert.equal(c.boundary,0,c.name);assert.equal(c.nonmanifold,0,c.name);assert.equal(c.inconsistent,0,c.name);assert.equal(c.normalMismatch,0,c.name);assert.equal(c.self.count,0,c.name);assert.ok(c.volume>0,c.name);}
 for(const p of parts.filter(p=>p.n.getName().startsWith('M-Corner-Wrap-'))){
   const parent=p.n.getParentNode(),matrix=new T.Matrix4().fromArray(parent.getWorldMatrix()).invert().multiply(new T.Matrix4().fromArray(auth.getWorldMatrix()));
   const triangles=p.ts.map(t=>t.v.map(v=>v.clone().applyMatrix4(matrix))),box=new T.Box3().setFromPoints(triangles.flat());
   const origin=new T.Vector3(0,0,(box.min.z+box.max.z)/2),ray=new T.Ray(origin,new T.Vector3(1,1,0).normalize()),point=new T.Vector3();const both=[],front=[];
   for(const t of triangles){if(ray.intersectTriangle(...t,false,point)&&!both.some(q=>q.distanceTo(point)<1e-7))both.push(point.clone());if(ray.intersectTriangle(...t,true,point)&&!front.some(q=>q.distanceTo(point)<1e-7))front.push(point.clone());}
   both.sort((a,b)=>a.distanceTo(origin)-b.distanceTo(origin));front.sort((a,b)=>a.distanceTo(origin)-b.distanceTo(origin));
   assert.equal(both.length,2,p.label+' must enclose curved wall thickness outside a clear quadrant aperture');assert.equal(front.length,1,p.label);assert.ok(front[0].distanceTo(both[0])<1e-7,p.label+' inner quadrant wall must face into aperture');
   assert.ok(both[0].distanceTo(origin)>0.07,p.label+' aperture must remain open');
 }
});

test('current published Medical has coherent source hashes and bounded real scene costs',async()=>{
 const hash=(await import('node:crypto')).createHash;
 const digest=b=>hash('sha256').update(b).digest('hex');
 const manifest=JSON.parse(await readFile(new URL('../../../apps/media/hero-imported.json',import.meta.url))).find(r=>r.id==='medical');
 const builder=await readFile(new URL('../../../apps/media/scripts/build-refined-medical.mjs',import.meta.url),'utf8');
 const materials=JSON.parse(await readFile(new URL('../../../apps/media/sources/medical/materials.json',import.meta.url)));
 assert.equal(result.sha256,manifest.sha256);assert.equal(result.bytes,manifest.bytes);assert.equal(digest(builder.replace(/\r\n/g,'\n')),manifest.sourceSha256);assert.equal(digest(JSON.stringify(materials)),manifest.materialSourceSha256);
 assert.equal(result.uniqueTriangles,manifest.triangles);assert.equal(result.uniqueMeshes,manifest.meshes);assert.ok(result.bytes<=524288);assert.ok(result.uniqueTriangles<=65000&&result.instancedTriangles<=65000);assert.ok(result.publicBytes<=10485760);
 const extra=JSON.parse(await readFile(new URL('./review-geometry-supplement.log',import.meta.url)));
 assert.equal(extra.sha256,result.sha256);assert.deepEqual(extra.UVRange,[0,1]);assert.equal(extra.UVOutsideUnit.length,0);
 assert.ok(extra.framing.every(f=>f.maxAbsNdcX<1&&f.maxAbsNdcY<1),'all sampled turntable angles remain within the analytic web frustum');
 const caseComponent=extra.components.find(c=>c.some(n=>n.startsWith('M-Body-Frame@')));
 for(const p of parts.filter(p=>/^M-(Corner-|Handle-|Latch-|Hinge-|Foot-)/.test(p.n.getName())))assert.ok(caseComponent.includes(p.label),p.label+' lacks physical path to case');
 console.log({sha256:result.sha256,bytes:result.bytes,uniqueTriangles:result.uniqueTriangles,instancedTriangles:result.instancedTriangles,meshes:result.uniqueMeshes,meshNodes:result.meshNodes,publicHeadroom:result.publicHeadroom});
});
