import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import * as crypto from 'node:crypto';
import * as url from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';

const require=createRequire(import.meta.url);
const verifier=new URL('./verify-hero-turntables.mjs',import.meta.url);
const source=await readFile(verifier,'utf8');
// Adapt ESM bindings for a flag-free CJS VM without changing verifier branches.
const compiled=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  transformers:{before:[context=>root=>ts.visitNode(root,function visit(node){
    if(ts.isIdentifier(node)&&node.text==='require')return ts.factory.createIdentifier('verifierRequire');
    if(ts.isPropertyAccessExpression(node)&&ts.isMetaProperty(node.expression)&&node.name.text==='url'){
      return ts.factory.createStringLiteral(verifier.href);
    }
    return ts.visitEachChild(node,visit,context);
  })]},
}).outputText;
const ids=['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault'];

async function png(bright,clipped){
  const width=1920,height=1080,pixels=Buffer.alloc(width*height*4);
  for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
  for(let y=100;y<920;y++)for(let x=clipped?0:300;x<1620;x++){
    const i=(y*width+x)*4,base=bright?150:80;
    pixels[i]=base+x%80;pixels[i+1]=base+y%80;pixels[i+2]=base+(x+y)%80;
  }
  return sharp(pixels,{raw:{width,height,channels:4}}).png().toBuffer();
}
const still=await png(false,false),turn=await png(true,false);
const clippedTurn=await png(true,true),clippedRest=await png(false,true);

async function runVerifier(clippedAt){
  const outputs=new Map();
  const dependencies={
    'node:module':{createRequire:()=>require},
    'node:fs/promises':{
      readFile:async()=>Buffer.from('in-memory video fixture'),
      writeFile:async(filename,bytes)=>{outputs.set(String(filename),bytes);},
    },
    'node:child_process':{execFileSync:(command,args)=>{
      if(command==='ffprobe')return JSON.stringify({
        streams:[{codec_type:'video',width:1920,height:1080}],format:{duration:9},
      });
      assert.equal(command,'ffmpeg','only simulated frame extraction is allowed');
      const time=Number(args[args.indexOf('-ss')+1]);
      assert.ok([0,4,8.5].includes(time),'unexpected frame sample');
      if(time===clippedAt)return time===4?clippedTurn:clippedRest;
      return time===4?turn:still;
    }},
    'node:crypto':crypto,'node:url':url,'node:assert/strict':assert,
  };
  // Only external IO is adapted; shared helpers, PNG decoding and comparisons are real.
  await vm.runInNewContext(`(async()=>{${compiled}\n})()`,{
    exports:{},Buffer,URL,console:{log(){}},
    require:name=>{
      assert.ok(Object.hasOwn(dependencies,name),`unexpected verifier dependency: ${name}`);
      return dependencies[name];
    },
  });
  return JSON.parse(outputs.get(new URL('../hyperframes/output/heroes/verification.json',import.meta.url).href));
}

test('turntable verifier rejects geometry clipped only in the 4s frame',async()=>{
  await assert.rejects(()=>runVerifier(4),/model touches canvas edge/);
});

test('turntable verifier rejects geometry clipped only in the 8.5s rest frame',async()=>{
  await assert.rejects(()=>runVerifier(8.5),/model touches canvas edge/);
});

test('turntable verifier accepts a contained moving sequence for all ten heroes',async()=>{
  const results=await runVerifier();
  assert.deepEqual(results.map(result=>result.id),ids);
  for(const result of results){
    assert.equal(result.width,1920);assert.equal(result.height,1080);
    assert.equal(result.duration,9);
    assert.deepEqual(result.presentation.region,{left:0,right:1920,top:50,bottom:970});
    assert.ok(result.presentation.heightFraction>0.89);
  }
});
