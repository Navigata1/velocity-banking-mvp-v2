import assert from 'node:assert/strict';

const ids = ['car', 'house', 'land', 'creditCard', 'studentLoan', 'medical', 'personal', 'recreation', 'custom', 'vault'];
const shared = ['turntable', 'studio-environment', 'hero-geometry-bounds', 'hero-materials', 'house-instances'];
const three = ['three.module.js', 'three.core.js', 'addons/loaders/GLTFLoader.js',
  'addons/environments/RoomEnvironment.js', 'addons/utils/BufferGeometryUtils.js',
  'addons/utils/SkeletonUtils.js', 'addons/libs/meshopt_decoder.module.js'];
const vendorFiles = ['gsap.min.js', 'fonts/literata-variable.woff2', 'fonts/geist-variable.woff2',
  'fonts/geist-mono-variable.woff2', ...shared.map(name => `${name === 'turntable' ? 'hero-turntable' : name}.js`),
  ...three.map(name => `three/${name}`)];
const runtime = ['beat-analyzer.global.js', 'cli.js', 'hyperframe-runtime.js', 'hyperframe.manifest.json',
  'hyperframe.runtime.iife.js', 'hyperframes-player.global.js', 'hyperframes-slideshow.global.js', 'shaderTransitionWorker.js'];

// Fixed render inputs plus the entire staged media dependency tree.
export function expectedInputs(selectedIds) {
  assert.ok(Array.isArray(selectedIds) && selectedIds.length > 0 && selectedIds.every(id => ids.includes(id)), 'unknown or empty hero set');
  assert.equal(new Set(selectedIds).size, selectedIds.length, 'duplicate hero');
  const heroes = [...selectedIds].sort().map(id => ({ id, model: `apps/web/public/heroes/${id}.glb`,
    preparedModel: `apps/media/hyperframes/vendor/heroes/${id}.glb`,
    renderModel: `apps/media/hero-turntables/vendor/heroes/${id}.glb` }));
  const files = [
    'apps/media/hero-turntables/index.html',
    ...['render-hero-turntables', 'prepare-hyperframes-assets', 'hero-generation-inputs', 'hero-generation-proof'].map(name => `apps/media/scripts/${name}.mjs`),
    ...['hero-generation-delivery', 'verify-hero-turntables', 'package-hero-collection', 'refined-hero-record'].map(name => `apps/media/scripts/${name}.mjs`),
    'apps/web/scripts/png-pixel-proof.cjs', 'apps/web/scripts/hero-presentation-proof.cjs',
    ...['media', 'web'].flatMap(app => [`apps/${app}/package.json`, `apps/${app}/package-lock.json`]),
    ...shared.map(name => `apps/web/src/components/hero/${name}.ts`),
    ...['hyperframes', 'gsap', 'typescript'].map(name => `apps/media/node_modules/${name}/package.json`),
    'apps/media/node_modules/typescript/lib/typescript.js', 'apps/media/node_modules/gsap/dist/gsap.min.js',
    'apps/web/node_modules/three/package.json',
    ...runtime.map(name => `apps/media/node_modules/hyperframes/dist/${name}`),
    ...three.map(name => `apps/web/node_modules/three/${name.startsWith('addons/') ? name.replace('addons/', 'examples/jsm/') : `build/${name}`}`),
    ...['hyperframes', 'hero-turntables'].flatMap(tree => vendorFiles.map(name => `apps/media/${tree}/vendor/${name}`)),
    ...heroes.flatMap(hero => [hero.model, hero.preparedModel, hero.renderModel]),
  ].sort();
  assert.equal(new Set(files).size, files.length);
  return { type: 'hero-turntables-inputs', version: 2, outputParent: 'apps/media/hyperframes/output/heroes/generations', heroes, files,
    runtimeTrees: ['apps/media/node_modules'] };
}
