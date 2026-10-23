/* eslint-disable @typescript-eslint/no-require-imports */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const filename=path.resolve(__dirname,'../../../apps/web/scripts/test-three-stage.cjs'),request=createRequire(filename);
function fixture({rect={left:12.25,top:23.5,width:400.5,height:200.25},width=1440,height=900,scrollY=987.75,matches=1,detached=false,screenshotError=null}={}){
  const calls=[],window={innerWidth:width,innerHeight:height,scrollY,scrollX:31.5,devicePixelRatio:2};let isolated=false;
  const node={width:1602,height:801,getBoundingClientRect:()=>({...rect,right:rect.left+rect.width,bottom:rect.top+rect.height})};
  const strict=()=>{if(matches!==1||detached)throw Error('strict canvas locator missing,detached or ambiguous');};
  const wire=value=>structuredClone(value);
  const locator={
    boundingBox:async()=>{calls.push('boundingBox');strict();return{ x:rect.left,y:rect.top,width:rect.width,height:rect.height };},
    evaluate:async (fn,includeClip,options)=>{
      strict();
      if(String(fn).includes('window.__moneyLoopPixelCaptureOverlays =')){
        assert.equal(options?.timeout,700,'isolation locator wait must use the original remaining budget');
        calls.push('isolate');isolated=true;
        return{hiddenOverlayCount:2,isolatedSvgOverlayCount:1,...(includeClip?{snapshot:{box:{x:rect.left,y:rect.top,width:rect.width,height:rect.height},viewport:{width,height},scrollY}}:{})};
      }
      calls.push('locator.evaluate');return wire(fn(node));
    },
  };
  const page={
    getByTestId:id=>{assert.equal(id,'money-loop-three-stage');return{locator:selector=>{assert.equal(selector,'canvas');return locator;}};},
    evaluate:async fn=>{
      if(String(fn).includes('delete window.__moneyLoopPixelCaptureOverlays')){calls.push('restore');isolated=false;return;}
      if(String(fn).includes('window.__moneyLoopPixelCaptureOverlays =')){calls.push('isolate');isolated=true;return{hiddenOverlayCount:2,isolatedSvgOverlayCount:1};}
      calls.push('page.evaluate');return wire(fn());
    },
    screenshot:async()=>{calls.push('screenshot');assert.equal(isolated,true);if(screenshotError)throw screenshotError;return Buffer.from('CPU fixture only,not rendered pixel evidence');},
  };
  const source=fs.readFileSync(filename,'utf8'),boundary=source.indexOf('\nmodule.exports =');assert.ok(boundary>0);
  const loaded={exports:{}},context={require:id=>id==='playwright-core'?{}:request(id),__dirname:path.dirname(filename),module:loaded,process:{once(){}},console,Date:{now:()=>1000},window};
  vm.runInNewContext(source.slice(0,boundary)+'\nmodule.exports={resolveCanvasClip,captureIsolatedCanvasPng};',context,{filename});
  return{...loaded.exports,page,calls,window,node,get isolated(){return isolated;}};
}
test('canvas clip uses one strict locator snapshot with no separate boundingBox or viewport call',async()=>{
  const x=fixture();await x.resolveCanvasClip(x.page,'desktop');assert.deepEqual(x.calls,['locator.evaluate']);
});
test('canvas clip preserves fractional CSS border coordinates and separate scroll without DPR arithmetic',async()=>{
  const x=fixture(),clip=await x.resolveCanvasClip(x.page,'desktop');
  assert.deepEqual(structuredClone(clip),{box:{x:12.25,y:23.5,width:400.5,height:200.25},scrollY:987.75});
  assert.notEqual(clip.box.width,x.node.width);
});
test('canvas clip accepts exact viewport edges without rounding',async()=>{
  for(const rect of [{left:0,top:0,width:1440,height:900},{left:12.25,top:23.5,width:1427.75,height:876.5}]){
    const x=fixture({rect});assert.equal((await x.resolveCanvasClip(x.page,'edge')).box.x,rect.left);
  }
});
test('canvas clip rejects every partial edge,zero and negative dimensions before screenshot',async()=>{
  for(const rect of [{left:-.001,top:0,width:1,height:1},{left:0,top:-.001,width:1,height:1},{left:1440,top:0,width:.001,height:1},
    {left:0,top:900,width:1,height:.001},{left:0,top:0,width:0,height:1},{left:0,top:0,width:1,height:0},
    {left:0,top:0,width:-1,height:1},{left:0,top:0,width:1,height:-1}]){
    const x=fixture({rect});await assert.rejects(x.resolveCanvasClip(x.page,'edge'),/not fully visible/);assert.equal(x.calls.includes('screenshot'),false);
  }
});
test('canvas clip rejects nonfinite geometry,viewport and scroll metadata',async()=>{
  for(const value of [NaN,Infinity,-Infinity]){
    for(const key of ['left','top','width','height']){const x=fixture({rect:{left:0,top:0,width:1,height:1,[key]:value}});await assert.rejects(x.resolveCanvasClip(x.page,'invalid'),/not fully visible/);}
    for(const key of ['width','height','scrollY']){const x=fixture({[key]:value});await assert.rejects(x.resolveCanvasClip(x.page,'invalid'),/not fully visible/);}
  }
});
test('canvas clip keeps strict missing,ambiguous and detached locator rejection',async()=>{
  for(const options of [{matches:0},{matches:2},{detached:true}]){const x=fixture(options);await assert.rejects(x.resolveCanvasClip(x.page,'strict'),/strict canvas locator/);}
});
test('invalid post-isolation geometry retains the existing exactly-once restoration path',async()=>{
  const x=fixture({rect:{left:-1,top:0,width:1,height:1}});await assert.rejects(x.captureIsolatedCanvasPng(x.page,'invalid',1700),/not fully visible/);
  assert.equal(x.calls.filter(c=>c==='restore').length,1);assert.equal(x.calls.includes('screenshot'),false);assert.equal(x.isolated,false);
});

test('isolated capture rejects missing,ambiguous and detached canvases without screenshot',async()=>{
  for(const options of [{matches:0},{matches:2},{detached:true}]){
    const x=fixture(options);await assert.rejects(x.captureIsolatedCanvasPng(x.page,'strict',1700),/strict canvas locator/);
    assert.deepEqual(x.calls,['restore']);assert.equal(x.isolated,false);
  }
});
test('supplied clips keep exact object precedence and screenshot errors retain restoration and cause',async()=>{
  const original=new Error('compositor failed'),x=fixture({screenshotError:original}),clip={box:{x:1,y:2,width:3,height:4},scrollY:7};
  let supplied;x.page.screenshot=async options=>{x.calls.push('screenshot');supplied=options.clip;throw original;};
  await assert.rejects(x.captureIsolatedCanvasPng(x.page,'explicit',1700,clip),error=>error.cause===original);
  assert.strictEqual(supplied,clip.box);assert.deepEqual(x.calls,['isolate','screenshot','restore']);assert.equal(x.isolated,false);
});
test('standing helper entry runs all three contract files with the existing tests intact',async()=>{
  const parentFile=path.resolve(__dirname,'../../../apps/web/scripts/three-stage-helpers-tests.cjs'),source=fs.readFileSync(parentFile,'utf8');
  const boundary=source.lastIndexOf('\nrun().catch');assert.ok(boundary>0);const requestParent=createRequire(parentFile),calls=[];
  const parent={exports:{}};
  const requireParent=id=>id==='node:child_process'?{execFileSync:(...args)=>{calls.push(args);return Buffer.alloc(0);}}:requestParent(id);
  new Function('exports','require','module','__filename','__dirname',source.slice(0,boundary)+'\nmodule.exports={run};')
    (parent.exports,requireParent,parent,parentFile,path.dirname(parentFile));
  await parent.exports.run();assert.equal(calls.length,3);
  for(const[index,file]of ['canvas-clip-tests.cjs','selection-phase-tests.cjs','canvas-overlay-tests.cjs'].entries()){
    assert.equal(calls[index][0],process.execPath);assert.deepEqual(calls[index][1],['--test',path.join(path.dirname(parentFile),file)]);
    assert.equal(calls[index][2].stdio,'inherit');assert.equal(calls[index][2].windowsHide,true);
  }
});
