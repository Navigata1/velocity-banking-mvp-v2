import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const baseline='cc09e2e3f560c380445333907469ba813035a7a2';
const yaml=createRequire(path.resolve('apps/web/package.json'))('js-yaml');
const before=yaml.load(execFileSync('git',['show',baseline+':.github/workflows/ci.yml'],{encoding:'utf8'}));
const after=yaml.load(await fs.readFile('.github/workflows/ci.yml','utf8'));
const moved=['Verify asset hero loading, rotation and reduced motion','Upload asset hero browser proof'];
const primary=structuredClone(before.jobs['web-mobile-quality']);
primary.steps=primary.steps.filter(step=>!moved.includes(step.name));
primary.steps.splice(primary.steps.findIndex(step=>step.name==='Install web dependencies')+1,0,{name:'Run CI verification contracts',run:'node scripts/check-restoration-ci.test.cjs'});
primary.steps.splice(primary.steps.findIndex(step=>step.name==='Check media identity contracts')+1,0,{name:'Run report renderer contracts',run:'node ops/mission/test-renderer.mjs\nnode --test ops/mission/report-renderer-tests.mjs\n'});
assert.deepEqual(after.jobs['web-mobile-quality'],primary,'all original primary settings/remaining steps preserved');
assert.deepEqual(after.jobs['backend-isolation'],before.jobs['backend-isolation'],'entire backend job unchanged');
for(const key of ['name','on','concurrency','permissions'])assert.deepEqual(after[key],before[key],key);
const oldSteps=before.jobs['web-mobile-quality'].steps;
const node=structuredClone(oldSteps.find(step=>step.name==='Set up Node'));
node.with['cache-dependency-path']='apps/web/package-lock.json';
assert.deepEqual(after.jobs['asset-hero-quality'],{name:'Asset hero quality gates','runs-on':'ubuntu-latest','timeout-minutes':20,
  steps:[oldSteps.find(step=>step.name==='Check out repository'),node,...['Install web dependencies','Build web app',...moved].map(name=>oldSteps.find(step=>step.name===name))]},'new independent job only duplicates prerequisites and moves original hero steps');
const prior=JSON.parse(await fs.readFile('.superpowers/sdd/2026-10-21-common-month/release/postflight.json'));
assert.equal(prior.headSha,baseline);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const matched=[],changed=[];
for(const [file,pin]of Object.entries(prior.local.sources)) {
  const actual=hash((await fs.readFile(file,'utf8')).replace(/\r\n?/g,'\n'));
  if(actual===pin)matched.push(file);else changed.push(file);
}
assert.deepEqual(changed,['.github/workflows/ci.yml']);
for(const model of prior.local.models)assert.equal(hash(await fs.readFile('apps/web/public/heroes/'+model.id+'.glb')),model.sha256);
for(const poster of prior.local.posters)assert.equal(hash(await fs.readFile('apps/web/public/heroes/'+poster.id+'.webp')),poster.posterSha256);
for(const video of prior.local.videos)assert.equal(hash(await fs.readFile('apps/media/hyperframes/output/heroes/'+video.id+'.mp4')),video.sha256);
const result={baseline,verifiedAt:new Date().toISOString(),workflow:'Move only original hero test/upload; duplicate checkout/node/install/build prerequisites, add CI and static report contracts; all caps20.',
  unchangedProtectedSources:matched.length,changedProtectedSources:changed,matchedSources:matched,models:10,posters:10,videos:10,
  backendJobStructurallyIdentical:true,primaryRemainingStepsStructurallyIdentical:true,noApplicationOrFinancialSourceChanges:true};
await fs.writeFile('.superpowers/sdd/2026-10-21-ci-isolation/source-preservation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,matchedSources:undefined}));
