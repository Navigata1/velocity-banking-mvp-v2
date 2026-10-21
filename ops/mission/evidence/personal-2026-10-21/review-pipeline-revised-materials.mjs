import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const repo = new URL('../../../', import.meta.url), req = createRequire(new URL('apps/media/package.json', repo)), { parse } = req('acorn'), { simple } = req('acorn-walk');
const read = p => readFileSync(new URL(p, repo), 'utf8'), sha = b => createHash('sha256').update(b).digest('hex');
const captured = [], originalLog = console.log;
try { console.log = message => captured.push(message); await import('./review-pipeline-materials.mjs'); } finally { console.log = originalLog; }
assert.equal(captured.length, 1); const current = JSON.parse(captured[0]);
assert.equal(current.hashes.model, 'a49605478a5466ed5f16464ed878e2f990244f5510f4088c6db60a2faf7b7b06');
assert.equal(current.hashes.sourceLF, '161159e34ef9cc5bd0b1bf67a7912147ff567c6f4593d94f98e760cfb2edf414');
assert.equal(current.hashes.configCanonical, '3377df695d1a66ace34911e0e5bc2e5bf5fd0b6a6b2479ed1f5c05208df47523');
const source = read('apps/media/scripts/build-refined-personal.mjs').replace(/\r\n/g, '\n'), ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }), edits = [];
simple(ast, {
  VariableDeclarator(n) {
    if (n.id.name === 'steel') edits.push({ ...n.init, text: "material('P-Steel-Silver','#c1c6c8',0.26,1)" });
    if (n.id.name === 'shoulder') edits.push({ ...n.init, text: 'curve([[-1.11,1.22,0.10],[-1.40,1.10,0.25],[-1.52,0.55,0.48],[-1.35,0.15,0.65],[-0.75,0.08,0.69],[0.35,0.08,0.68],[1.10,0.18,0.61],[1.40,0.65,0.42],[1.35,1.10,0.25],[1.11,1.22,0.10]])' });
  },
  ExpressionStatement(n) {
    const call = n.expression; if (call.type !== 'CallExpression') return;
    if (call.callee.object?.name === 'keyGeometry' && call.callee.property.name === 'rotateX') edits.push({ ...n, text: 'keyGeometry.rotateX(-Math.PI/2);' });
    if (call.callee.object?.name === 'keyGeometry' && call.callee.property.name === 'computeBoundingBox') edits.push({ ...n, text: '' });
    if (call.callee.name === 'add' && call.arguments[0]?.value === 'P-Key') edits.push({ ...n, text: "add('P-Key',keyGeometry,steel,[-0.15,0.005,1.02]);" });
  },
});
assert.equal(edits.length, 5); let reconstructedOld = source;
for (const n of edits.sort((a, b) => b.start - a.start)) reconstructedOld = reconstructedOld.slice(0, n.start) + n.text + reconstructedOld.slice(n.end);
assert.equal(sha(reconstructedOld), '2da81a4d80955b8b7b5b41f68ae90fc9cad8a9486c94e8f8518b3bafcd8e1345', 'only approved steel, shoulder route and key statements may differ');
const config = JSON.parse(read('apps/media/sources/personal/materials.json')); assert.equal(config.surfaces.steelRoughness, 0.42); config.surfaces.steelRoughness = 0.26;
assert.equal(sha(JSON.stringify(config)), '9d289cf590dbab6fd0eb95b0ac2056b9883d22282e693a346708c450142c0fe8', 'no other config changes');
const old = JSON.parse(read('.superpowers/sdd/2026-10-21-personal/review-pipeline-materials.log').replace(/^\uFEFF/, ''));
const changedMaps = []; for (const map of current.maps) { const before = old.maps.find(m => m.name === map.name); assert.ok(before); if (map.sha256 !== before.sha256) changedMaps.push(map.name); }
assert.deepEqual(changedMaps, ['P-Steel-Roughness']);
const silver = current.factors.find(m => m.name === 'P-Steel-Silver'), srgbToLinear = byte => { const c = byte / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
for (let i = 0; i < 3; i++) assert.ok(Math.abs(silver.baseColorLinear[i] - srgbToLinear(224 + i)) < 1e-8);
const rough = current.maps.find(m => m.name === 'P-Steel-Roughness'); assert.ok(Math.abs(rough.channels.mean[1] / 255 - 0.42) < 0.015); assert.equal(silver.roughnessFactor, 1); assert.equal(silver.metallicFactor, 1);
current.probe = 'revised-material-provenance-and-bounded-delta';
current.revision = { approvedSourceDeltaOnly: true, approvedConfigDeltaOnly: true, changedMaps, silverMeanEffectiveRoughness: rough.channels.mean[1] / 255, historicalSourceSha256ReconstructedInMemory: sha(reconstructedOld), historicalLogPreserved: true };
console.log(JSON.stringify(current, null, 2));
