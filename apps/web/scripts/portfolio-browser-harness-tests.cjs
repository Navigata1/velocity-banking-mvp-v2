/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const file=path.resolve(__dirname,'portfolio-input-smoke.cjs');
function harness(){
  const m={exports:{}},requested=[],process={env:{},exitCode:undefined},server={pid:123};
  const requireLocal=id=>{
    if(id==='node:fs')return{...fs,existsSync:()=>true};
    if(id==='./browser-harness.cjs')return{findBrowserExecutable:()=>'/synthetic/chrome',getHeadlessChromiumArgs:()=>[]};
    if(id==='playwright-core')return{chromium:{launch:async()=>({close:async()=>{}})}};
    if(id==='./built-server-harness.cjs')return{startBuiltServer:async()=>({origin:'http://synthetic.invalid',server}),stopServer:async actual=>assert.equal(actual,server),
      createGracefulShutdown:()=>async code=>{requested.push(code);}};
    return require(id);
  };
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{module:m,exports:m.exports,require:requireLocal,process,__dirname:path.dirname(file),
    setTimeout:()=>1,clearTimeout:()=>{},console:{log(){},error(){}}},{filename:file});
  return{main:m.exports.main,assertInputPixels:m.exports.assertInputPixels,requested,process};
}
async function main(){
  const failed=harness();await assert.rejects(()=>failed.main(async()=>{throw new Error('Synthetic fixture assertion');}),/fixture assertion/);
  assert.deepEqual(failed.requested,[1],'a failed fixture must request failure before cleanup can finish or strand a promise');
  assert.equal(failed.process.exitCode,1);
  const passed=harness();await passed.main(async()=>{});assert.deepEqual(passed.requested,[0]);
  const image={width:40,height:10,bytesPerPixel:3,pixels:Buffer.alloc(40*10*3,24)};
  assert.throws(()=>passed.assertInputPixels(image),/visible text/);
  image.pixels.fill(255);assert.throws(()=>passed.assertInputPixels(image),/visible text/);
  image.pixels.fill(24);image.pixels.fill(255,0,30*3);
  assert.equal(passed.assertInputPixels(image).brightPixels,30);
  console.log('Portfolio browser harness preserves failure status before cleanup; successful cleanup remains zero.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
