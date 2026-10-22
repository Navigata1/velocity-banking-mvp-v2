import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let proof={};
try{proof=require('../../web/scripts/hero-presentation-proof.cjs');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
function api(name){assert.equal(typeof proof[name],'function','required shared hero presentation API');return proof[name];}
function image(width,height,left,top,right,bottom){
  const pixels=Buffer.alloc(width*height*4);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)pixels[(y*width+x)*4]=255;
  return{width,height,bytesPerPixel:4,pixels};
}
test('shared hero visibility rejects blank, undersized and edge-clipped geometry',()=>{
  const bounds=api('visibleBounds');
  for(const fixture of [image(100,100,0,0,0,0),image(100,100,40,40,50,50),image(100,100,0,20,30,80)])assert.throws(()=>bounds(fixture));
  assert.deepEqual(bounds(image(100,100,20,20,80,80)),{left:20,right:80,top:20,bottom:80});
});
test('shared hero presentation rejects small silhouettes for every domain',()=>{
  const bounds=api('presentationBounds');
  for(const id of ['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault']){
    assert.throws(()=>bounds(image(100,100,20,40,80,60),id));bounds(image(100,100,10,10,90,90),id);
  }
});
test('video presentation measures height against the art viewport, not the full frame',()=>{
  const bounds=api('presentationBounds'),fixture=image(100,200,20,80,80,125),art={left:0,right:100,top:50,bottom:150};
  assert.deepEqual(bounds(fixture,'car',art),{left:20,right:80,top:80,bottom:125});assert.throws(()=>bounds(fixture,'car'));
});
test('video visibility cannot use footer decoration as model evidence',()=>{
  const bounds=api('visibleBounds'),fixture=image(100,200,20,120,80,180);
  bounds(fixture);assert.throws(()=>bounds(fixture,{left:0,right:100,top:50,bottom:100}));
});
test('shared visibility refuses malformed and out-of-frame art rectangles',()=>{
  const bounds=api('visibleBounds'),fixture=image(100,100,20,20,80,80);
  for(const region of [{left:0,top:0,right:NaN,bottom:100},{left:-1,top:0,right:100,bottom:100},{left:0,top:0,right:101,bottom:100},{left:50,top:0,right:40,bottom:100}])assert.throws(()=>bounds(fixture,region),/region/);
});
test('shared hero presentation refuses unknown domains instead of accepting an absent minimum',()=>{
  const bounds=api('presentationBounds');for(const id of ['unknown','constructor'])assert.throws(()=>bounds(image(100,100,10,10,90,90),id));
});
