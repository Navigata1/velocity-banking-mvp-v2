import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(pathToFileURL(path.resolve('apps/media/package.json'))),{parse}=require('acorn');
const file=pathToFileURL(path.resolve('apps/media/scripts/custom-refinement.test.mjs')),source=await fs.readFile(file,'utf8'),ast=parse(source,{sourceType:'module',ecmaVersion:'latest'});
const first=ast.body.find(n=>n.type==='ExpressionStatement'&&n.expression.callee?.name==='test');let header=source.slice(0,first.start);
for(const n of ast.body.filter(n=>n.type==='ImportDeclaration').reverse()){const spec=n.source.value,resolved=spec.startsWith('.')?new URL(spec,file).href:spec.startsWith('node:')?spec:pathToFileURL(require.resolve(spec)).href;header=header.slice(0,n.source.start)+JSON.stringify(resolved)+header.slice(n.source.end);}
header=header.replaceAll('import.meta.url',JSON.stringify(file.href));
const probes=`
const {named,root}=await custom(),f=named('C-Assembly'),ts=faces(named('C-Dial'),f),b=bounds(ts);
console.log('DIALBOUNDS',b.min.toArray(),b.max.toArray());
for(let i=0;i<32;i++){const a=i*Math.PI/16,h=hits(ts,V(0,b.center.y,0),V(Math.cos(a),0,Math.sin(a)),2),perturbed=hits(ts,V(0,b.center.y,0),V(Math.cos(a+1e-7),0,Math.sin(a+1e-7)),2);if(h.length!==1)console.log('RAY',i,a,h.map(p=>p.toArray()),'PERTURBED',perturbed.map(p=>p.toArray()));}
for(const m of root.listMeshes())for(const p of m.listPrimitives()){if(!p.getMaterial()?.getBaseColorTexture())continue;const pos=p.getAttribute('POSITION'),uv=p.getAttribute('TEXCOORD_0'),ix=p.getIndices();let bad=0,first;
 for(let i=0;i<ix.getCount();i+=3){const ids=[0,1,2].map(j=>ix.getScalar(i+j)),v=ids.map(j=>V().fromArray(pos.getElement(j,[]))),u=ids.map(j=>uv.getElement(j,[])),area=Math.abs((u[1][0]-u[0][0])*(u[2][1]-u[0][1])-(u[2][0]-u[0][0])*(u[1][1]-u[0][1]));if(new Triangle(...v).getArea()>1e-10&&area<=1e-12){bad++;first??={positions:v.map(p=>p.toArray()),uv:u};}}
 if(bad)console.log('UV',m.getName(),p.getMaterial().getName(),bad,first);
}
`;
await import('data:text/javascript;base64,'+Buffer.from(header+probes).toString('base64'));
