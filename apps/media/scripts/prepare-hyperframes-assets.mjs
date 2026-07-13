import { copyFile, mkdir } from 'node:fs/promises';

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
