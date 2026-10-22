import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';
import { parse as parseHtml } from 'parse5';

const prepare = await readFile(new URL('./prepare-hyperframes-assets.mjs', import.meta.url), 'utf8');
const html = await readFile(new URL('../hero-turntables/index.html', import.meta.url), 'utf8');
const scripts = [];
function collectScripts(node) {
  if (node.tagName === 'script') scripts.push({
    type: node.attrs.find(attribute => attribute.name === 'type')?.value,
    source: node.childNodes.map(child => child.value ?? '').join(''),
  });
  for (const child of node.childNodes ?? []) collectScripts(child);
}
collectScripts(parseHtml(html));
const modules = scripts.filter(script => script.type === 'module');
assert.equal(modules.length, 1, 'one hero turntable module');
const moduleSource = modules[0].source;
const ast = source => parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const identifier = (node, name) => node?.type === 'Identifier' && node.name === name;
const member = (node, object, property) => node?.type === 'MemberExpression' &&
  !node.computed && identifier(node.object, object) && identifier(node.property, property);
const url = (node, file, base) => node?.type === 'NewExpression' && identifier(node.callee, 'URL') &&
  node.arguments[0]?.value === file && identifier(node.arguments[1], base);
const property = (node, name) => node?.properties.find(entry => entry.key.name === name)?.value;

test('Hero material preparation emits the shared web source as ESM before copying vendor assets', () => {
  const tree = ast(prepare), declarations = tree.body.filter(node => node.type === 'VariableDeclaration').flatMap(node => node.declarations);
  const source = declarations.find(node => node.init?.type === 'AwaitExpression' &&
    identifier(node.init.argument.callee, 'readFile') && url(node.init.argument.arguments[0], '../web/src/components/hero/hero-materials.ts', 'mediaRoot'));
  assert.ok(source && identifier(source.id, source.id.name), 'prepare reads the shared web material source');
  const vendor = declarations.find(node => identifier(node.id, 'vendorRoot'));
  assert.ok(url(vendor?.init, 'hyperframes/vendor/', 'mediaRoot'));
  const calls = tree.body.filter(node => node.type === 'ExpressionStatement' && node.expression.type === 'AwaitExpression').map(node => node.expression.argument);
  const write = calls.find(node => identifier(node.callee, 'writeFile') && url(node.arguments[0], 'hero-materials.js', 'vendorRoot'));
  assert.ok(write, 'prepare emits the material module into the shared vendor root');
  const output = write.arguments[1];
  assert.ok(output?.type === 'MemberExpression' && !output.computed && identifier(output.property, 'outputText'));
  const transpile = output.object;
  assert.ok(transpile.type === 'CallExpression' && member(transpile.callee, 'ts', 'transpileModule'));
  assert.ok(identifier(transpile.arguments[0], source.id.name), 'emitted module comes from the source that was read');
  const options = property(transpile.arguments[1], 'compilerOptions');
  const target = property(options, 'target'), module = property(options, 'module');
  assert.ok(target?.type === 'MemberExpression' && member(target.object, 'ts', 'ScriptTarget') && identifier(target.property, 'ES2022'));
  assert.ok(module?.type === 'MemberExpression' && member(module.object, 'ts', 'ModuleKind') && identifier(module.property, 'ES2022'));
  const copy = calls.find(node => identifier(node.callee, 'cp') && identifier(node.arguments[0], 'vendorRoot') &&
    url(node.arguments[1], 'hero-turntables/vendor/', 'mediaRoot'));
  assert.ok(copy && property(copy.arguments[2], 'recursive')?.value === true, 'prepared vendor assets reach the hero composition');
  assert.ok(source.end < write.start && write.end < copy.start, 'read, emit and copy occur in load order');
});

function assertLoadWiring(source) {
  const tree = ast(source);
  const imported = tree.body.find(node => node.type === 'ImportDeclaration' && node.source.value === './vendor/hero-materials.js');
  const binding = imported?.specifiers.find(node => node.type === 'ImportSpecifier' && identifier(node.imported, 'refineHeroMaterials'));
  assert.ok(binding, 'turntable imports the prepared shared material helper');
  const calls = [];
  simple(tree, { CallExpression(node) { if (identifier(node.callee, binding.local.name)) calls.push(node); } });
  assert.equal(calls.length, 1, 'one top-level load refinement is required');
  const call = calls[0], statement = tree.body.find(node => node.type === 'ExpressionStatement' && node.expression === call);
  assert.ok(statement, 'refinement must be top-level, not inside render or seek callbacks');
  assert.ok(member(call.arguments[0], 'gltf', 'scene'));
  const model = call.arguments[1];
  assert.equal(model?.type, 'TemplateLiteral');
  assert.deepEqual(model.quasis.map(part => part.value.cooked), ['/heroes/', '.glb']);
  assert.equal(model.expressions.length, 1); assert.ok(identifier(model.expressions[0], 'selected'));
  const load = tree.body.filter(node => node.type === 'VariableDeclaration').flatMap(node => node.declarations).find(node => identifier(node.id, 'gltf'));
  assert.equal(load?.init?.type, 'AwaitExpression');
  assert.equal(load.init.argument.type, 'CallExpression');
  assert.ok(identifier(load.init.argument.callee.property, 'loadAsync'));
  const attachments = tree.body.filter(node => node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' &&
    member(node.expression.callee, 'scene', 'add') && member(node.expression.arguments[0], 'gltf', 'scene'));
  const renders = tree.body.filter(node => node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' && identifier(node.expression.callee, 'renderAt'));
  assert.equal(attachments.length, 1); assert.ok(renders.length > 0);
  assert.ok(load.end < call.start && call.end < attachments[0].start && renders.every(node => call.end < node.start),
    'refine the loaded scene before attachment or the initial render');
  return statement;
}

test('Hero turntable imports shared materials and refines once before scene attachment or rendering', () => {
  const maps = scripts.filter(script => script.type === 'importmap');
  assert.equal(maps.length, 1);
  assert.equal(JSON.parse(maps[0].source).imports.three, './vendor/three/three.module.js');
  assertLoadWiring(moduleSource);
});

test('Hero material wiring rejects a removed load call', () => {
  const statement = assertLoadWiring(moduleSource);
  const mutant = moduleSource.slice(0, statement.start) + moduleSource.slice(statement.end);
  assert.notEqual(mutant, moduleSource, 'removed material load call: mutation must apply');
  assert.throws(() => assertLoadWiring(mutant), error => error.code === 'ERR_ASSERTION' && /one top-level load refinement/.test(error.message));
});
