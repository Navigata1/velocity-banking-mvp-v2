import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const repo = new URL('../../../', import.meta.url), req = createRequire(new URL('apps/media/package.json', repo)), { parse } = req('acorn'), { simple } = req('acorn-walk');
const read = p => readFileSync(new URL(p, repo), 'utf8'), hash = b => createHash('sha256').update(b).digest('hex');
const source = read('apps/media/scripts/build-refined-personal.mjs'), sourceUrl = new URL('apps/media/scripts/build-refined-personal.mjs', repo), ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }), AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let publish, deliveryGuard, imageGuard;
simple(ast, { CallExpression(n) { if (n.callee.name === 'saveRefinedHero') { assert.equal(n.arguments[1].name, 'undefined'); publish = n.arguments[2]; } }, IfStatement(n) { if (source.slice(n.test.start, n.test.end).includes('output.length>')) deliveryGuard = n; }, ForOfStatement(n) { if (source.slice(n.right.start, n.right.end) === 'config.images') imageGuard = n; } });
assert.ok(publish && deliveryGuard && imageGuard);
const config = JSON.parse(read('apps/media/sources/personal/materials.json')), leather = readFileSync(new URL('apps/media/sources/student-loan/leather.png', repo));
const validateSource = new AsyncFunction('config', 'hash', 'readFile', 'URL', 'sources', source.slice(imageGuard.start, imageGuard.end));
const imageEvents = [], load = async p => { assert.equal(p.href, new URL('apps/media/sources/student-loan/leather.png', repo).href); imageEvents.push('read-retained'); return leather; };
await validateSource(config, hash, load, URL, new URL('apps/media/sources/personal/', repo));
const corrupt = Buffer.from(leather); corrupt[corrupt.length - 1] ^= 1;
await assert.rejects(() => validateSource(config, hash, async () => corrupt, URL, new URL('apps/media/sources/personal/', repo)), /hash mismatch/);
assert.equal(hash(source.replace(/\r\n/g, '\n')), hash(source.replace(/\r?\n/g, '\r\n').replace(/\r\n/g, '\n')));
const preflight = new Function('output', 'triangles', 'instantiated', 'collection', source.slice(deliveryGuard.start, deliveryGuard.end));
preflight({ length: 524288 }, 65000, 65000, 10485760);
for (const values of [[524289, 65000, 65000, 10485760], [524288, 65001, 65000, 10485760], [524288, 65000, 65001, 10485760], [524288, 65000, 65000, 10485761]]) assert.throws(() => preflight({ length: values[0] }, ...values.slice(1)), /delivery limits/);
const replacements = [];
simple(publish, { MemberExpression(n) { if (n.object.type === 'MetaProperty' && n.property.name === 'url') replacements.push({ ...n, text: JSON.stringify(sourceUrl.href) }); } });
function fragment(edits = []) { let text = source.slice(publish.start, publish.end); const nodes = [...replacements.filter(n => !edits.some(e => e.start <= n.start && e.end >= n.end)), ...edits]; for (const n of nodes.sort((a, b) => b.start - a.start)) text = text.slice(0, n.start - publish.start) + n.text + text.slice(n.end - publish.start); return text; }
const target = new URL('apps/web/public/heroes/personal.glb', repo), oldModelBytes = 512876, candidateBytes = Number(process.argv.find(a => a.startsWith('--candidate-bytes='))?.split('=')[1] ?? oldModelBytes);
assert.ok(Number.isSafeInteger(candidateBytes) && candidateBytes > 0); const output = Buffer.alloc(candidateBytes), growth = candidateBytes - oldModelBytes;
async function run(text, total, stale, fail = null) {
  const events = [], fn = new Function('sizeOf', 'stat', 'writeFile', 'rename', 'URL', 'target', 'output', 'collection', 'return (' + text + ');')(
    async p => { assert.equal(p.href, new URL('apps/web/public/', repo).href); events.push('live-total'); if (fail === 'size') throw Error('measurement failure'); return total; },
    async p => { assert.equal(p.href, target.href); events.push('old-model-size'); if (fail === 'stat') throw Error('stat failure'); return { size: 512876 }; },
    async (p, b) => { assert.equal(p.href, target.href + '.tmp'); assert.equal(b, output); events.push('would-write-temp'); },
    async (a, b) => { assert.equal(a.href, target.href + '.tmp'); assert.equal(b.href, target.href); events.push('would-rename'); }, URL, target, output, stale);
  try { await fn(); return { events }; } catch (e) { return { events, error: e.message }; }
}
async function check(text) { const over = await run(text, 10485761 - growth, 0); assert.match(over.error ?? '', /budget changed/); assert.deepEqual(over.events, ['live-total', 'old-model-size']); const exact = await run(text, 10485760 - growth, 99999999); assert.equal(exact.error, undefined); assert.deepEqual(exact.events, ['live-total', 'old-model-size', 'would-write-temp', 'would-rename']); return { over, exact }; }
const liveCases = await check(fragment());
for (const fail of ['size', 'stat']) { const result = await run(fragment(), 0, 0, fail); assert.ok(result.error); assert.ok(!result.events.includes('would-write-temp')); }
let guard, live; simple(publish, { IfStatement(n) { if (n.test.left?.name === 'liveCollection') guard = n; }, VariableDeclarator(n) { if (n.id.name === 'liveCollection') live = n; } });
assert.ok(guard && live);
await assert.rejects(() => check(fragment([{ ...guard, text: '' }])), { code: 'ERR_ASSERTION' });
await assert.rejects(() => check(fragment([{ ...live.init, text: 'collection' }])), { code: 'ERR_ASSERTION' });
// Only inspect the writer's lock nesting; never import or execute that module.
const helper = read('apps/media/scripts/refined-hero-record.mjs'), helperAst = parse(helper, { ecmaVersion: 'latest', sourceType: 'module' });
const save = helperAst.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration.id?.name === 'saveRefinedHero').declaration;
const lockCall = save.body.body[0].argument; assert.equal(lockCall.callee.name, 'withHeroManifestLock');
const actions = lockCall.arguments[0].body.body.filter(n => n.type === 'IfStatement' || n.type === 'ExpressionStatement');
assert.equal(actions[0].test.name, 'publishAsset'); assert.equal(actions[0].consequent.expression.type, 'AwaitExpression'); assert.equal(actions[0].consequent.expression.argument.callee.name, 'publishAsset');
assert.deepEqual(actions.slice(1).map(n => n.expression.argument.callee.name), ['writeHeroManifest', 'writeHeroManifest']);
assert.match(helper, /open\(lockPath,'wx'\)/); assert.match(helper, /await action\(\{importedPath,inventoryPath\}\)/);
const legacy = read('apps/media/scripts/build-hero-models.mjs'), legacyAst = parse(legacy, { ecmaVersion: 'latest', sourceType: 'module' }); let loop;
simple(legacyAst, { ForOfStatement(n) { if (legacy.slice(n.right.start, n.right.end) === 'Object.entries(constructors)') loop = n; } });
assert.ok(loop); const skip = loop.body.body[0]; assert.equal(skip.type, 'IfStatement'); assert.match(legacy.slice(skip.start, skip.end), /imported\.some\(asset=>asset\.id===id\)/);
const skipProbe = new Function('imported', 'console', 'events', 'for (const id of ["personal"]) {' + legacy.slice(skip.start, skip.end) + '; events.push("would-build-legacy-personal");}');
const imported = JSON.parse(read('apps/media/hero-imported.json')), events = [], messages = []; skipProbe(imported, { log: s => messages.push(s) }, events); assert.deepEqual(events, []); assert.equal(messages.length, 1);
skipProbe(imported.filter(r => r.id !== 'personal'), { log() {} }, events); assert.deepEqual(events, ['would-build-legacy-personal']);
console.log(JSON.stringify({ probe: 'source-and-publication-boundary', status: 'PASS', sourceLFSha256: hash(source.replace(/\r\n/g, '\n')), sourceImageMismatchRejected: true, deliveryBoundaries: { modelBytes: 524288, uniqueTriangles: 65000, instantiatedTriangles: 65000, aggregateBytes: 10485760 }, fixture: { oldModelBytes, candidateBytes, growth }, liveCases, mutatedGuardAndStaleTotalRejectedByOracle: true, sizeAndStatFailureRejectBeforePublication: true, publisherLexicallyInsideExistingLock: true, publicationAwaitedBeforeBothManifestUpdates: true, protectedPersonalSkipBoundary: { messages, legacyBuildReached: false, absentRecordPositiveControlReached: true }, helperSha256: hash(helper.replace(/\r\n/g, '\n')), legacyBuilderSha256: hash(legacy.replace(/\r\n/g, '\n')), note: 'All boundary execution uses extracted fragments and in-memory adapters. No builder, manifest writer, filesystem lock, asset write, or full rebuild executed.' }, null, 2));
