import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const cwd = process.cwd(), req = createRequire(path.join(cwd, 'apps/media/package.json'));
const sourcePath = path.join(cwd, 'apps/media/scripts/personal-refinement.test.mjs'), source = await readFile(sourcePath, 'utf8');
const sha = x => createHash('sha256').update(x).digest('hex');
const { parse } = await import(pathToFileURL(req.resolve('acorn'))), { simple } = await import(pathToFileURL(req.resolve('acorn-walk')));
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }), bindings = {}, edits = [];
const personal = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id?.name === 'personal');
edits.push({ start: personal.start, end: personal.end, text: 'async function personal(){return fixture;}' });
for (const n of ast.body.filter(n => n.type === 'ImportDeclaration')) {
  edits.push({ start: n.start, end: n.end, text: '' });
  if (n.source.value === 'node:test') continue;
  const spec = n.source.value, resolved = spec.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(sourcePath), spec)).href : spec.startsWith('node:') ? spec : pathToFileURL(req.resolve(spec)).href;
  const module = await import(resolved);
  for (const s of n.specifiers) bindings[s.local.name] = s.type === 'ImportDefaultSpecifier' ? module.default : module[s.imported.name];
}
simple(ast, { MemberExpression(n) { if (n.object.type === 'MetaProperty' && n.property.name === 'url' && !(n.start >= personal.start && n.end <= personal.end)) edits.push({ start: n.start, end: n.end, text: JSON.stringify(pathToFileURL(sourcePath).href) }); } });
let executable = source;
for (const e of edits.sort((a, b) => b.start - a.start)) executable = executable.slice(0, e.start) + e.text + executable.slice(e.end);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const { NodeIO, ALL_EXTENSIONS, MeshoptDecoder } = bindings;
await MeshoptDecoder.ready;
const bytes = await readFile('apps/web/public/heroes/personal.glb');
const records = JSON.parse(await readFile('apps/media/hero-imported.json')), inventory = JSON.parse(await readFile('apps/media/hero-models.json'));
async function fixture() {
  const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).readBinary(bytes), root = document.getRoot();
  return { document, root, named: name => { const n = root.listNodes().find(n => n.getName() === name); assert.ok(n); return n; }, bytes, record: records.find(r => r.id === 'personal'), inventory: inventory.find(r => r.id === 'personal') };
}
async function register(f) {
  const tests = [];
  await new AsyncFunction(...Object.keys(bindings), 'test', 'fixture', executable)(...Object.values(bindings), (name, fn) => tests.push({ name, fn }), f);
  return tests;
}
console.log('PIN', JSON.stringify({ glb: sha(bytes), tests: sha(source), transformation: 'AST removes imports, injects only the decoded personal fixture, and substitutes original import.meta.url; callbacks/helpers otherwise unchanged' }));
const original = await fixture(), tests = await register(original); let passed = 0;
// The production test factory returns a new document per case. Preserve that
// isolation: infill controls intentionally leave unrendered fixture resources.
for (const t of tests) { await (await register(await fixture())).find(x => x.name === t.name).fn(); passed++; console.log('BASELINE PASS', t.name); }
assert.equal(passed, 14);
const deeper = await fixture(), batch = deeper.named('P-Stitches').getExtension('EXT_mesh_gpu_instancing'), translation = batch.getAttribute('TRANSLATION');
const array = new Float32Array(Array.from({ length: translation.getCount() }, (_, i) => translation.getElement(i, [])).flat());
for (let i = 260; i < 310; i++) array[i * 3 + 2] -= 0.02;
translation.setArray(array).setNormalized(false);
await (await register(deeper)).find(t => t.name.includes('merged stitches')).fn();
console.log('ESCAPED MUTATION: all 50 already-buried handle stitch translations moved 0.02 farther back; original seam contract still PASS');
const rivet = await fixture(), n = rivet.named('P-Handle-Rivet-L'), a = n.getTranslation(); n.setTranslation([a[0], a[1], a[2] - 2]);
const rivetTests = await register(rivet);
await rivetTests.find(t => t.name.includes('handle has')).fn();
console.log('ESCAPED MUTATION: handle rivet translated 2 local units off support; original handle-chain contract still PASS (rivet omitted)');
const inward = await fixture(), keyPrim = inward.named('P-Key').getMesh().listPrimitives()[0], ix = keyPrim.getIndices(), vals = ix.getArray().slice();
for (let i = 0; i < vals.length; i += 3) [vals[i + 1], vals[i + 2]] = [vals[i + 2], vals[i + 1]];
ix.setArray(vals);
await assert.rejects(() => (async () => (await register(inward)).find(t => t.name.includes('key has')).fn())(), { code: 'ERR_ASSERTION' });
console.log('DETECTED CONTROL: actual key reversed-winding mutation correctly rejected');
assert.equal(sha(await readFile(sourcePath)), sha(source)); assert.equal(sha(await readFile('apps/web/public/heroes/personal.glb')), sha(bytes));
console.log('END 14 baseline contracts PASS; escaped mutations and rejecting control observed; inputs unchanged; no writes');
