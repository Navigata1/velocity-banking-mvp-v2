import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const captured = [], log = console.log;
try { console.log = value => captured.push(value); await import('./review-pipeline-materials.mjs'); } finally { console.log = log; }
assert.equal(captured.length, 1); const result = JSON.parse(captured[0]);
assert.equal(result.hashes.model, 'e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79');
assert.equal(result.hashes.sourceLF, '588e52c8a9547e98df1a643bb465ec4a884ff85df84b9cefd5fef35efc73864c');
assert.equal(result.hashes.configRaw, 'c2bb19587d1b4628d819d674657d8689a38d10b052fbda637dcf4c025c08b247');
assert.equal(result.hashes.configCanonical, '3377df695d1a66ace34911e0e5bc2e5bf5fd0b6a6b2479ed1f5c05208df47523');
const before = JSON.parse(readFileSync(new URL('./review-pipeline-revised-materials.log', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const sameMaps = result.maps.map(map => { const old = before.maps.find(m => m.name === map.name); assert.ok(old); for (const key of ['bytes', 'sha256', 'width', 'height']) assert.equal(map[key], old[key], map.name + ':' + key); return { name: map.name, sha256: map.sha256 }; });
for (const material of result.factors) assert.deepEqual(material, before.factors.find(m => m.name === material.name));
assert.equal(result.maps.length, 9); result.probe = 'final-materials-source-and-provenance'; result.identicalToA496 = { allNineEncodedMaps: sameMaps, materialFactors: true, configRawAndCanonical: true };
console.log(JSON.stringify(result, null, 2));
