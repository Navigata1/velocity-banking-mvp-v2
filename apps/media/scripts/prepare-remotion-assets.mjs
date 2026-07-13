import { copyFile, mkdir } from 'node:fs/promises';

const mediaRoot = new URL('../', import.meta.url);
const fontRoot = new URL('remotion/public/fonts/', mediaRoot);
const assets = [
  ['node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2', 'literata-variable.woff2'],
  ['node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', 'geist-variable.woff2'],
  ['node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2', 'geist-mono-variable.woff2'],
];

await mkdir(fontRoot, { recursive: true });
for (const [source, destination] of assets) {
  await copyFile(new URL(source, mediaRoot), new URL(destination, fontRoot));
}

console.log(`Prepared ${assets.length} pinned Remotion fonts.`);
