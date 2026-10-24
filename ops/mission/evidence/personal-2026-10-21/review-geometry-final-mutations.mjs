import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { T, fixture, inputs, decode, bounds, crossings, topology, stitchRows, unchanged } from './review-geometry-final-probes.mjs';
const req = createRequire(path.resolve('apps/media/package.json'));
const { parse } = await import(pathToFileURL(req.resolve('acorn'))), { simple } = await import(pathToFileURL(req.resolve('acorn-walk')));
const file = path.resolve('apps/media/scripts/personal-seating.test.mjs'), source = inputs[3].toString(), ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }), bindings = {}, edits = [];
for (const n of ast.body.filter(n => n.type === 'ImportDeclaration')) {
  edits.push({ start: n.start, end: n.end, text: '' }); if (n.source.value === 'node:test') continue;
  const s = n.source.value, module = await import(s.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), s)).href : s);
  for (const spec of n.specifiers) bindings[spec.local.name] = spec.type === 'ImportDefaultSpecifier' ? module.default : module[spec.imported.name];
}
simple(ast, { MemberExpression(n) { if (n.object.type === 'MetaProperty' && n.property.name === 'url') edits.push({ start: n.start, end: n.end, text: JSON.stringify(pathToFileURL(file).href) }); } });
let text = source; for (const e of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, e.start) + e.text + text.slice(e.end);
async function tests(f) { const out = [], args = { ...bindings, personal: async () => f, test: (name, fn) => out.push({ name, fn }) }; await new (Object.getPrototypeOf(async function () {}).constructor)(...Object.keys(args), text)(...Object.values(args)); return out; }
async function reject(f, fragment, label) {
  const fn = (await tests(f)).find(t => t.name.includes(fragment)).fn; let error;
  try { await fn(); } catch (e) { error = e; }
  assert.equal(error?.code, 'ERR_ASSERTION', label + ' must fail the actual new test'); console.log('MUTATION_REJECTED', JSON.stringify({ label, message: error.message }));
}
function vectorToLocal(node, body, delta) { const m = new T.Matrix4().fromArray(node.getWorldMatrix()).invert().multiply(new T.Matrix4().fromArray(body.getWorldMatrix())); return delta.clone().applyMatrix4(m).sub(new T.Vector3().applyMatrix4(m)); }
function moveInstances(f, ids, delta) {
  const n = f.named('P-Stitches'), batch = n.getExtension('EXT_mesh_gpu_instancing'), a = batch.getAttribute('TRANSLATION'), values = new Float32Array(Array.from({ length: a.getCount() }, (_, i) => a.getElement(i, [])).flat()), d = vectorToLocal(n, f.named('P-Body'), delta);
  for (const id of ids) for (let j = 0; j < 3; j++) values[id * 3 + j] += d.getComponent(j); a.setArray(values).setNormalized(false);
}
for (const t of await tests(await fixture())) { await (await tests(await fixture())).find(x => x.name === t.name).fn(); console.log('NEW_TEST_BASELINE_PASS', t.name); }
const paper = await fixture(), body = paper.named('P-Body'), p = paper.named('P-Paper-Front'), flap = decode(paper.named('P-Flap'), body).faces;
const dz = bounds(flap).center.z - bounds(decode(p, body).faces).center.z, dp = vectorToLocal(p.listParents().find(n => n.propertyType === 'Node'), body, new T.Vector3(0, 0, dz)), old = p.getTranslation(); p.setTranslation(old.map((v, i) => v + dp.getComponent(i)));
const paperCrossings = crossings(decode(p, body).faces, flap); assert.ok(paperCrossings.count > 0); console.log('MUTATION_WITNESS', JSON.stringify({ type: 'old-style paper through flap', crossings: paperCrossings }));
await reject(paper, 'papers clear', 'actual paper moved through actual flap');
const buried = await fixture(), handleIds = stitchRows.filter(r => r.support === 'P-Handle').map(r => r.instance); assert.equal(handleIds.length, 50); moveInstances(buried, handleIds, new T.Vector3(0, 0, -0.011));
await reject(buried, 'every real stitch', 'restore buried handle thread run: 50 actual instance translations');
const floating = await fixture(), witness = stitchRows.filter(r => r.support === 'P-Strap-R').sort((a, b) => Math.hypot(a.center[0] - 0.6276821, a.center[1] - 0.28362681) - Math.hypot(b.center[0] - 0.6276821, b.center[1] - 0.28362681))[0];
moveInstances(floating, [witness.instance], new T.Vector3(0.6276821, 0.28362681, 0.44781458).sub(new T.Vector3(...witness.center)));
await reject(floating, 'every real stitch', 'restore one actual strap stitch to the old floating witness location');
const missing = await fixture(), primitive = missing.named('P-Strap-L').getMesh().listPrimitives()[0], ix = primitive.getIndices(); primitive.setIndices(ix.clone().setArray(ix.getArray().slice(3)));
const edges = topology(decode(missing.named('P-Strap-L'), missing.named('P-Body')).faces); assert.ok(edges.unmatched > 0); console.log('MUTATION_WITNESS', JSON.stringify({ type: 'delete one actual clipped strap triangle', topology: edges }));
await reject(missing, 'every real stitch', 'open clipped skin rejected before any parity burial test');
await unchanged(); console.log('END four new-test baselines pass; four actual-geometry/accessor mutations rejected; exact pinned files unchanged; no writes');
