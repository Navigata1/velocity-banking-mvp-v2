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
const {named}=await custom(),f=named('C-Assembly'),lens=faces(named('C-Glass'),f);let count=0;
for(const name of ['C-Needle-North','C-Needle-South','C-Pivot'])for(const p of faces(named(name),f).flat()){const h=section(lens,p.x,p.z);if(h.length!==2){const other=section(lens,p.x+1e-7,p.z+2e-7);if(count++<12)console.log('LENS_RAY',name,p.toArray(),h.map(p=>p.toArray()),'PERTURBED',other.map(p=>p.toArray()));}}
console.log('MISSING',count);
`;
await import('data:text/javascript;base64,'+Buffer.from(header+probes).toString('base64'));
