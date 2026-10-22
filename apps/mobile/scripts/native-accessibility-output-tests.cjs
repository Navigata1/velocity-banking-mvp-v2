/* eslint-disable @typescript-eslint/no-require-imports */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..'),filename=path.join(root,'apps/mobile/scripts/smoke-accessibility-rendered.cjs'),request=createRequire(filename),ts=request('typescript');
function fixture(t,uuids){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'interestshield-native-output-'));t.after(()=>{assert.equal(path.dirname(temp),path.resolve(os.tmpdir()));assert.ok(path.basename(temp).startsWith('interestshield-native-output-'));fs.rmSync(temp,{recursive:true,force:true});});
 const output=path.join(temp,'custom-output'),legacy=path.join(output,'dated-plan','verification.json'),witness=Buffer.from('CPU boundary fixture; not rendered evidence\n');fs.mkdirSync(path.dirname(legacy),{recursive:true});fs.writeFileSync(legacy,witness,{flag:'wx'});
 const calls=[],stop=new Error('stop after actual dated output guard; no browser'),events={browserClosed:0,serverKilled:0},browser={newContext(){throw Error('CPU tests must not render');},contexts(){return[];},close:async()=>{events.browserClosed++;}};
 const datedFile=path.join(path.dirname(filename),'portfolio-dated-smoke.cjs'),datedSource=fs.readFileSync(datedFile,'utf8'),tree=ts.createSourceFile(datedFile,datedSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const declaration=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='runNativeDatedFixtures');assert.ok(declaration);
 const end=declaration.body.statements.findIndex(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(tree)==='receipts'));assert.ok(end>0);
 const prefix=declaration.body.statements.slice(0,end).map(node=>node.getText(tree)).join('\n');
 const actualGuard=new Function('assert','fs','path','URL','stop','witness',`return async function({browser,origin,output}){${prefix}\nfs.writeFileSync(verificationFile,witness,{flag:'wx'});throw stop;};`)(assert,fs,path,URL,stop,witness);
 const noop=async()=>{},fakeFs={...fs,existsSync:file=>file===path.join(root,'apps/mobile/dist-web/index.html')||fs.existsSync(file)};
 const requireSource=id=>{
  if(id==='node:fs')return fakeFs;
  if(id==='node:crypto')return{randomUUID:()=>{assert.ok(uuids.length);return uuids.shift();}};
  if(id==='node:child_process')return{spawn:()=>({kill(){events.serverKilled++;}})};
  if(id==='node:http')return{get:(url,cb)=>{cb({statusCode:200,resume(){}});return{on(){return this;},setTimeout(){return this;}};}};
  if(id==='./financial-input-smoke.cjs')return noop;
  if(id==='./portfolio-book-smoke.cjs')return{runPortfolioBookFixtures:noop};
  if(id==='./legacy-apr-smoke.cjs')return{runLegacyAprFixtures:noop};
  if(id==='./coaching-safety-smoke.cjs')return{runCoachingSafetyFixtures:noop};
  if(id==='../../web/scripts/smoke-portfolio-common-month.cjs')return{runCommonMonthFixtures:noop};
  if(id==='./portfolio-dated-smoke.cjs')return{runNativeDatedFixtures:async args=>{calls.push(args.output);return actualGuard(args);}};
  if(id.endsWith('playwright-core'))return{chromium:{launch:async()=>browser}};
  if(id.endsWith('browser-harness.cjs'))return{findBrowserExecutable:()=>'/CPU-only/no-browser',getHeadlessChromiumArgs:()=>[]};
  return request(id);
 };
 const source=fs.readFileSync(filename,'utf8'),boundary=source.lastIndexOf('\nmain().catch');assert.ok(boundary>0);const loaded={exports:{}};
 new Function('exports','require','module','__filename','__dirname','process','console',source.slice(0,boundary)+'\nmodule.exports={main};')(loaded.exports,requireSource,loaded,filename,path.dirname(filename),{env:{MOBILE_ACCESSIBILITY_OUTPUT:output}},{log(){}});
 return{run:()=>loaded.exports.main(),calls,events,stop,output,legacy,witness};
}
test('actual native main uses fresh dated receipts on repeated runs and preserves the custom root and old receipt',async t=>{
 const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'],expected=[...ids],f=fixture(t,ids);
 for(let index=0;index<2;index++)await assert.rejects(f.run(),error=>error===f.stop);
 assert.deepEqual(f.calls,expected.map(id=>path.join(f.output,'dated-plan',id)));assert.equal(new Set(f.calls).size,2);
 assert.deepEqual(fs.readFileSync(f.legacy),f.witness);for(const dir of f.calls)assert.deepEqual(fs.readFileSync(path.join(dir,'verification.json')),f.witness);
 assert.deepEqual(f.events,{browserClosed:2,serverKilled:2});
});
test('actual dated guard rejects a nonce collision without overwriting protected receipts and main cleans up',async t=>{
 const id='33333333-3333-4333-8333-333333333333',f=fixture(t,[id]),file=path.join(f.output,'dated-plan',id,'verification.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,f.witness,{flag:'wx'});
 await assert.rejects(f.run(),/previous receipts are never overwritten/);assert.deepEqual(fs.readFileSync(file),f.witness);assert.deepEqual(fs.readFileSync(f.legacy),f.witness);assert.deepEqual(f.events,{browserClosed:1,serverKilled:1});
});
test('standing native dated contract executes the output regression file without dropping its fee oracle',()=>{
 const entry=path.join(path.dirname(filename),'dated-native-smoke-contract.cjs'),source=fs.readFileSync(entry,'utf8'),calls=[],loaded={exports:{}};
 const requireEntry=id=>id==='node:child_process'?{execFileSync:(...args)=>calls.push(args)}:request(id);
 new Function('exports','require','module','__filename','__dirname',source)(loaded.exports,requireEntry,loaded,entry,path.dirname(entry));
 assert.equal(calls.length,1);assert.equal(calls[0][0],process.execPath);assert.deepEqual(calls[0][1],['--test',path.join(path.dirname(entry),'native-accessibility-output-tests.cjs')]);assert.equal(calls[0][2].stdio,'inherit');assert.equal(calls[0][2].windowsHide,true);
});
