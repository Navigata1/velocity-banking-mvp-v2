/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');

const localImportPattern = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"](\.[^'"]+)['"]|require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

function resolveLocalModule(importer, specifier) {
  const target = path.resolve(path.dirname(importer), specifier);
  const candidates = [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    `${target}.js`,
    `${target}.cjs`,
    path.join(target, 'index.ts'),
    path.join(target, 'index.tsx'),
    path.join(target, 'index.js'),
    path.join(target, 'index.cjs'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function collectReachableSources(entryFile) {
  const sources = new Map();

  function visit(filename) {
    const resolved = path.resolve(filename);
    if (sources.has(resolved)) return;

    const source = fs.readFileSync(resolved, 'utf8');
    sources.set(resolved, source);

    localImportPattern.lastIndex = 0;
    for (const match of source.matchAll(localImportPattern)) {
      const dependency = resolveLocalModule(resolved, match[1] ?? match[2]);
      if (dependency) visit(dependency);
    }
  }

  visit(entryFile);
  return sources;
}

function readReachableSource(entryFile) {
  return [...collectReachableSources(entryFile).values()].join('\n');
}

module.exports = { collectReachableSources, readReachableSource };
