const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process');
const baseline='8e2f25ef6b81ffc65b9f96644170834c511078d3',old=name=>JSON.parse(execFileSync('git',['show',baseline+':apps/media/'+name],{encoding:'utf8'}));
const input=JSON.stringify({models:old('hero-models.json'),imports:old('hero-imported.json'),posters:old('hero-provenance.json'),files:execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n')});
const raw=execFileSync(process.execPath,['--experimental-vm-modules',path.join(__dirname,'review-pipeline-harness-scratch.mjs')],{input,encoding:'utf8',maxBuffer:10*1024*1024,windowsHide:true});
const at=raw.lastIndexOf('{\n  "harnessSha256"');assert.ok(at>=0);const result=JSON.parse(raw.slice(at));
assert.equal(result.cases.find(r=>r.scenario==='control').harnessPassed,true);
const falseAccepts=[];for(const scenario of ['retained-source-mutation','personal-video-and-manifest-mutation'])if(result.cases.find(r=>r.scenario===scenario).harnessPassed)falseAccepts.push(scenario+' incorrectly accepted');
console.log(JSON.stringify(result,null,2));assert.deepEqual(falseAccepts,[],'rebuild proof must reject both real-source and unrelated-video mutations');
console.log('PASS controlled source/video preservation adversaries');
