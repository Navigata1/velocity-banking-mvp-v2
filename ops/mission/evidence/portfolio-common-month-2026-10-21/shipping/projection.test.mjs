import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const cache=path.dirname(fileURLToPath(import.meta.url));
const publisherFile=path.join(cache,'publish-desktop.mjs');
const publisherBytes=await fs.readFile(publisherFile),source=publisherBytes.toString('utf8');
const sourceState=await fs.readFile('ops/mission/state.json');
const before=JSON.parse(sourceState);
const r2=before.phases.find(phase=>phase.id==='R2');
assert.equal(r2.status,'in_progress');
for(const id of ['R2-G6','R2-G7','R2-G8']){
  const gate=r2.gates.find(gate=>gate.id===id);assert.ok(gate,id);
  gate.status='pending'; // Synthetic preflight states exercise the receipt-based transitions.
}
const receipt={verifiedAt:'2026-10-21T13:00:00.000Z',receipt:'https://example.invalid/synthetic-common-month-receipt',
  local:{commonMonth:{coreContracts:31,reference:{passed:23247}}},next:'Synthetic proof only; keep entire R2 open.'};
const start='const originalState=await fs.readFile(',end="const projection=path.join(stage,'projection');";
assert.equal(source.split(start).length,2,'one existing projection block required');
assert.equal(source.split(end).length,2,'one staging boundary required');
const startIndex=source.indexOf(start),endIndex=source.indexOf(end);assert.ok(endIndex>startIndex);
const block=source.slice(startIndex,endIndex);
// Execute only the existing state projection, never the publisher entry point or its writes.
const projected=JSON.parse(JSON.stringify(await new vm.Script(`(async()=>{${block}\nreturn state;})()`,{filename:'publisher-state-projection-only.mjs'}).runInNewContext({
  assert,sha:'f'.repeat(40),receipt,
  fs:{readFile:async file=>{assert.equal(file,'ops/mission/state.json');return Buffer.from(JSON.stringify(before));}},
})));
const label=process.env.PROJECTION_PROOF_LABEL??'check';assert.match(label,/^[a-z0-9-]+$/);
const artifact=path.join(cache,'projection-'+label+'-proof.json');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
await fs.writeFile(artifact,JSON.stringify({scope:'Synthetic receipt / actual publisher state projection only; no publication, browser, CI or hosted proof',publisherSha256:digest(publisherBytes),sourceStateSha256:digest(sourceState),receipt,before,projected},null,2)+'\n');

test('Dashboard G6 retains daily18/ten-controls/fallback proof; comparison maps to G7/G8',()=>{
  const gates=projected.phases.find(phase=>phase.id==='R2').gates;
  const daily=gates.find(gate=>gate.id==='R2-G6');
  assert.match(daily.notes,/18.*Dashboard|Dashboard.*18/);
  assert.match(daily.notes,/ten.*controls|10.*controls/i);
  assert.match(daily.notes,/wider.font/);
  assert.doesNotMatch(daily.notes,/common.month|23247|31 focused/);
  const numerical=gates.find(gate=>gate.id==='R2-G7');
  assert.match(numerical.notes,/31 focused/);assert.match(numerical.notes,/23247.*reference/);
  const rendered=gates.find(gate=>gate.id==='R2-G8');
  assert.match(rendered.notes,/21 web \+21 native/);assert.match(rendered.notes,/70.*native|native.*70/);
  for(const id of ['R2-G6','R2-G7','R2-G8']){
    const gate=gates.find(gate=>gate.id===id);assert.equal(gate.lastRun,receipt.verifiedAt,id+' receipt timestamp');
    assert.equal(gate.evidence,receipt.receipt,id+' receipt URL');assert.equal(gate.status,'passed',id+' bounded gate status');
  }
});

test('projection preserves every phase/task status and leaves entire R2 open',()=>{
  const allowedGateTransitions=new Set(['R0-G3','R2-G6','R2-G7','R2-G8']);
  for(const phase of projected.phases){
    const original=before.phases.find(candidate=>candidate.id===phase.id);assert.equal(phase.status,original.status,phase.id);
    assert.deepEqual(phase.tasks,original.tasks,phase.id+' tasks must not be marked done');
    for(const gate of phase.gates)assert.equal(gate.status,allowedGateTransitions.has(gate.id)?'passed':original.gates.find(candidate=>candidate.id===gate.id).status,gate.id);
  }
  assert.equal(projected.phases.find(phase=>phase.id==='R2').status,'in_progress');
});

test('projection probe leaves actual mission state and publisher bytes untouched',async()=>{
  assert.deepEqual(await fs.readFile('ops/mission/state.json'),sourceState);
  assert.deepEqual(await fs.readFile(publisherFile),publisherBytes);
  console.log(JSON.stringify({artifact,publisherSha256:digest(publisherBytes),scope:'Only synthetic proof written inside release/'}));
});
