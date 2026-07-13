/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const appRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(appRoot, 'public');
const sourceRoot = path.join(appRoot, 'src');
const maxTotalBytes = 2 * 1024 * 1024;
const maxSingleBytes = Math.floor(1.25 * 1024 * 1024);
const maxFileCount = 8;

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filename) : [filename];
  });
}

const publicFiles = listFiles(publicRoot);
const publicReferences = new Set();
for (const filename of listFiles(sourceRoot)) {
  const source = fs.readFileSync(filename, 'utf8');
  if (/\.(?:ts|tsx)$/.test(filename)) {
    const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (ts.isStringLiteralLike(node) && node.text.startsWith('/')) publicReferences.add(node.text);
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  } else if (filename.endsWith('.css')) {
    for (const match of source.matchAll(/url\(\s*['"]?(\/[^)'"\s]+)['"]?\s*\)/g)) {
      publicReferences.add(match[1]);
    }
  }
}
const assets = publicFiles.map((filename) => ({
  bytes: fs.statSync(filename).size,
  filename,
  publicPath: `/${path.relative(publicRoot, filename).replaceAll('\\', '/')}`,
}));
const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
const largest = assets.reduce((current, asset) => (asset.bytes > current.bytes ? asset : current));
const unreferenced = assets.filter(
  (asset) => !publicReferences.has(asset.publicPath),
);

assert.ok(
  totalBytes <= maxTotalBytes,
  `public assets use ${(totalBytes / 1024 / 1024).toFixed(2)} MiB; budget is ${(maxTotalBytes / 1024 / 1024).toFixed(2)} MiB`,
);
assert.ok(
  largest.bytes <= maxSingleBytes,
  `${largest.publicPath} uses ${(largest.bytes / 1024 / 1024).toFixed(2)} MiB; per-file budget is ${(maxSingleBytes / 1024 / 1024).toFixed(2)} MiB`,
);
assert.ok(
  assets.length <= maxFileCount,
  `public asset count is ${assets.length}; budget is ${maxFileCount}`,
);
assert.deepEqual(
  unreferenced.map((asset) => asset.publicPath),
  [],
  `unreferenced public assets: ${unreferenced.map((asset) => asset.publicPath).join(', ')}`,
);

console.log(
  `Public asset budget passed ${assets.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB total, ${(largest.bytes / 1024 / 1024).toFixed(2)} MiB largest.`,
);
