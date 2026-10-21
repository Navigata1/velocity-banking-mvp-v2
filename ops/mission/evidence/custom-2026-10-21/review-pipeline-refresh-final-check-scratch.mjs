import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='.superpowers/sdd/2026-10-21-custom/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const log=await fs.readFile(root+'review-pipeline-refresh-raw-scratch.log','utf8');
const d=JSON.parse(log.split('REVIEW_PIPELINE_JSON_BEGIN\n')[1].split('\nREVIEW_PIPELINE_JSON_END')[0]);
for(const [p,pin]of Object.entries(d.after)){if(typeof pin!=='object')continue;assert.equal(sha(await fs.readFile(p)),pin.raw,p);}
for(const [p,pin]of Object.entries(d.archives))assert.equal(sha(await fs.readFile(root+p)),pin.sha256,p);
const hlog=await fs.readFile(root+'review-pipeline-harness-refresh-raw-scratch.log','utf8');
const h=JSON.parse(hlog.slice(hlog.lastIndexOf('{\n  "harnessSha256"')));
assert.equal(h.cases.find(c=>c.scenario==='control').harnessPassed,true);
for(const c of h.cases.filter(c=>c.scenario!=='control')){assert.equal(c.harnessPassed,false);assert.equal(c.errorCode,'ERR_ASSERTION');}
const v=JSON.parse(await fs.readFile(root+'review-pipeline-video-baseline-raw-scratch.log','utf8'));
assert.equal(sha(await fs.readFile('apps/media/hyperframes/output/heroes/verification.json')),v.currentVideoManifestSha256);
const report=await fs.readFile(root+'review-pipeline-final-report.md');
console.log(JSON.stringify({checkedAt:new Date().toISOString(),sevenFinalPinsEqual:true,allArchivedFilesEqual:true,videoManifestStable:true,parentCjsResultAssertionsGreenWithoutSpawn:true,finalReportBytes:report.length,finalReportSha256:sha(report)},null,2));
