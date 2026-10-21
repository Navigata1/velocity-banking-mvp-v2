import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix4,Quaternion,Vector3,Ray} from '../../web/node_modules/three/build/three.module.js';
export async function personal(){
  const records=JSON.parse(await readFile(new URL('../hero-imported.json',import.meta.url),'utf8')),inventory=JSON.parse(await readFile(new URL('../hero-models.json',import.meta.url),'utf8'));
  const bytes=await readFile(new URL('../../web/public/heroes/personal.glb',import.meta.url));await MeshoptDecoder.ready;
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes),root=document.getRoot(),rendered=new Set();
  function walk(n){rendered.add(n);n.listChildren().forEach(walk);}root.listScenes().forEach(s=>s.listChildren().forEach(walk));
  const named=name=>{const n=[...rendered].find(n=>n.getName()===name);assert.ok(n,name+' missing from rendered scenes');return n;};
  return {record:records.find(r=>r.id==='personal'),inventory:inventory.find(r=>r.id==='personal'),bytes,document,root,named};
}
export function faces(node,frame=node,omit=null){
  const result=[],inverse=frame?new Matrix4().fromArray(frame.getWorldMatrix()).invert():new Matrix4();
  function walk(n){
    if(n===omit)return;
    const base=inverse.clone().multiply(new Matrix4().fromArray(n.getWorldMatrix())),batch=n.getExtension('EXT_mesh_gpu_instancing'),count=batch?.listAttributes()[0]?.getCount()??1;
    for(let instance=0;instance<count;instance++){
      const matrix=base.clone();if(batch)matrix.multiply(new Matrix4().compose(new Vector3().fromArray(batch.getAttribute('TRANSLATION')?.getElement(instance,[])??[0,0,0]),new Quaternion().fromArray(batch.getAttribute('ROTATION')?.getElement(instance,[])??[0,0,0,1]),new Vector3().fromArray(batch.getAttribute('SCALE')?.getElement(instance,[])??[1,1,1])));
      for(const p of n.getMesh()?.listPrimitives()??[]){
        const pos=p.getAttribute('POSITION'),ix=p.getIndices(),vertices=ix?.getCount()??pos.getCount();assert.equal(p.getMode(),4,'actual triangle surfaces required');
        for(let i=0;i<vertices;i+=3)result.push([0,1,2].map(j=>new Vector3().fromArray(pos.getElement(ix?ix.getScalar(i+j):i+j,[])).applyMatrix4(matrix)));
      }
    }
    n.listChildren().forEach(walk);
  }
  walk(node);assert.ok(result.length,node.getName()+' has no triangles');return result;
}
export function bounds(ts){const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);for(const t of ts)for(const p of t){min.min(p);max.max(p);}return {min,max,center:min.clone().add(max).multiplyScalar(0.5),span:max.clone().sub(min)};}
export function hits(ts,origin,direction,front=false){const ray=new Ray(origin,direction.clone().normalize()),p=new Vector3(),result=[];for(const t of ts)if(ray.intersectTriangle(...t,front,p)&&!result.some(q=>q.distanceTo(p)<1e-5))result.push(p.clone());return result.sort((a,b)=>a.distanceTo(origin)-b.distanceTo(origin));}
