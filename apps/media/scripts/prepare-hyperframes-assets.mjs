import { copyFile, mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import ts from 'typescript';

const mediaRoot = new URL('../', import.meta.url);
const vendorRoot = new URL('hyperframes/vendor/', mediaRoot);

const assets = [
  ['node_modules/gsap/dist/gsap.min.js', 'gsap.min.js'],
  ['node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2', 'fonts/literata-variable.woff2'],
  ['node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', 'fonts/geist-variable.woff2'],
  ['node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2', 'fonts/geist-mono-variable.woff2'],
];

await mkdir(new URL('fonts/', vendorRoot), { recursive: true });

for (const [source, destination] of assets) {
  await copyFile(new URL(source, mediaRoot), new URL(destination, vendorRoot));
}

console.log(`Prepared ${assets.length} pinned HyperFrames assets.`);

await mkdir(new URL('three/addons/loaders/', vendorRoot), { recursive: true });
await mkdir(new URL('three/addons/environments/', vendorRoot), { recursive: true });
await mkdir(new URL('three/addons/utils/', vendorRoot), { recursive: true });
await mkdir(new URL('three/addons/libs/', vendorRoot), { recursive: true });
await mkdir(new URL('heroes/', vendorRoot), { recursive: true });
for (const filename of ['build/three.module.js', 'build/three.core.js',
  'examples/jsm/loaders/GLTFLoader.js', 'examples/jsm/environments/RoomEnvironment.js',
  'examples/jsm/utils/BufferGeometryUtils.js', 'examples/jsm/utils/SkeletonUtils.js', 'examples/jsm/libs/meshopt_decoder.module.js']) {
  const destination = filename.replace('build/', '').replace('examples/jsm/', 'addons/');
  await copyFile(new URL(`../web/node_modules/three/${filename}`, mediaRoot), new URL(`three/${destination}`, vendorRoot));
}
for (const id of ['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault']) {
  await copyFile(new URL(`../web/public/heroes/${id}.glb`, mediaRoot), new URL(`heroes/${id}.glb`, vendorRoot));
}
const source = await readFile(new URL('../web/src/components/hero/turntable.ts', mediaRoot), 'utf8');
await writeFile(new URL('hero-turntable.js', vendorRoot), ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText);
const studio = await readFile(new URL('../web/src/components/hero/studio-environment.ts', mediaRoot), 'utf8');
await writeFile(new URL('studio-environment.js', vendorRoot), ts.transpileModule(studio, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText);
const bounds = await readFile(new URL('../web/src/components/hero/hero-geometry-bounds.ts', mediaRoot), 'utf8');
await writeFile(new URL('hero-geometry-bounds.js', vendorRoot), ts.transpileModule(bounds, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText);
const materials = await readFile(new URL('../web/src/components/hero/hero-materials.ts', mediaRoot), 'utf8');
await writeFile(new URL('hero-materials.js', vendorRoot), ts.transpileModule(materials, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText);
const instances = await readFile(new URL('../web/src/components/hero/house-instances.ts', mediaRoot), 'utf8');
await writeFile(new URL('house-instances.js', vendorRoot), ts.transpileModule(instances, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText);
await cp(vendorRoot, new URL('hero-turntables/vendor/', mediaRoot), { recursive: true });
