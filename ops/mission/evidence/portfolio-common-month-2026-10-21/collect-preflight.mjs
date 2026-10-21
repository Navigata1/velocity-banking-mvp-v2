import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const scratch = path.resolve('.superpowers/sdd/2026-10-21-common-month');
const output = path.resolve('ops/mission/evidence/portfolio-common-month-2026-10-21');
const baseline = '1aec5bf7be3d0f3c26079141245e4c7291fd8778';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalized = bytes => hash(bytes.toString('utf8').replace(/\r\n?/g, '\n'));
const prior = JSON.parse(await fs.readFile('.superpowers/sdd/2026-10-21-mobile-vitals/postflight.json', 'utf8'));
assert.equal(prior.headSha, baseline);
assert.equal(execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(), 'codex/restoration/asset-heroes');
const modified = ['apps/web/package.json', 'apps/web/src/app/portfolio/PortfolioPlanSection.tsx',
  'apps/mobile/components/mobile-routes/portfolio-route.tsx', 'apps/mobile/scripts/smoke-accessibility-rendered.cjs',
  'packages/financial-engine/package.json'];
const added = ['packages/financial-engine/src/common-month.ts', 'packages/financial-engine/src/portfolio-common-month.ts',
  'apps/web/src/app/portfolio/PortfolioCommonMonth.tsx', 'apps/mobile/components/portfolio/portfolio-common-month.tsx',
  'apps/web/scripts/portfolio-common-month-tests.cjs', 'apps/web/scripts/portfolio-common-month-reference-tests.cjs',
  'apps/web/scripts/smoke-portfolio-common-month.cjs'];
const sources = {};
for (const file of [...Object.keys(prior.local.sources), ...added]) {
  sources[file] = normalized(await fs.readFile(file));
  if (!modified.includes(file) && !added.includes(file)) assert.equal(sources[file], prior.local.sources[file], file);
}
assert.equal(Object.keys(sources).length, 292);
for (const model of prior.local.models) assert.equal(hash(await fs.readFile(`apps/web/public/heroes/${model.id}.glb`)), model.sha256);
for (const poster of prior.local.posters) assert.equal(hash(await fs.readFile(`apps/web/public/heroes/${poster.id}.webp`)), poster.posterSha256);
const videos = JSON.parse(await fs.readFile('apps/media/hyperframes/output/heroes/verification.json', 'utf8'));
assert.equal(videos.length, 10);
for (const video of videos) assert.equal(video.sha256, prior.local.videos.find(v => v.id === video.id)?.sha256);
await fs.mkdir(output, { recursive: true });
const copy = async (file, name) => {
  const target = path.join(output, name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(file, target);
};
for (const name of await fs.readdir(scratch)) {
  if (/\.(log|md|json|jsonl|cjs|mjs)$/.test(name) && !(await fs.stat(path.join(scratch, name))).isDirectory()) await copy(path.join(scratch, name), name);
}
for (const name of ['run-hosted.cjs', 'postflight.mjs', 'publish-desktop.mjs', 'shipping-guards.mjs', 'shipping-guards.test.mjs', 'release-preparation.md']) {
  await copy(path.join(scratch, 'release', name), 'shipping/' + name);
}
for (const name of await fs.readdir(path.join(scratch, 'release'))) {
  if (/^projection.*\.(json|log|mjs)$/.test(name) || /^shipping-guards.*\.log$/.test(name)) await copy(path.join(scratch, 'release', name), 'shipping/' + name);
}
await copy('apps/web/test-results/portfolio-common-month/verification.json', 'web-common-month-verification.json');
await copy('apps/mobile/test-results/accessibility/native-common-month-verification.json', 'native-common-month-verification.json');
for (const width of [1440, 375, 280]) {
  await copy(`apps/web/test-results/portfolio-common-month/web-cash-versus-wealth-${width}.png`, `web-common-month-${width}.png`);
  await copy(`apps/mobile/test-results/accessibility/native-cash-versus-wealth-${width}.png`, `native-common-month-${width}.png`);
}
for (const [directory, file, name] of [
  ['dashboard-interest', 'verification.json', 'dashboard-verification.json'],
  ['dashboard-interest', 'oracle-controls.json', 'dashboard-oracle-controls.json'],
  ['dashboard-interest', 'fallback-font-280.json', 'dashboard-fallback-font.json'],
  ['portfolio-budget', 'verification.json', 'portfolio-verification.json'],
  ['portfolio-portability', 'verification.json', 'portability-verification.json'],
  ['portfolio-input', 'portfolio-input-verification.json', 'input-verification.json'],
  ['vault-comparison', 'verification.json', 'vault-verification.json'],
  ['comparison', 'verification.json', 'comparison-verification.json'],
]) await copy(`apps/web/test-results/${directory}/${file}`, name);
await copy('apps/media/hyperframes/output/heroes/verification.json', 'turntable-verification.json');
const requiredLogs = ['web-tests-final.log', 'web-lint-final.log', 'web-build-final.log', 'native-export-final.log',
  'native-contracts-final.log', 'native-ui-capture-final.log', 'web-ui-capture-final.log', 'videos-final.log',
  'runtime-audit.log', 'media-check.log', 'three-final.log', 'heroes-final.log', 'fallbacks-final.log',
  'routes-final.log', 'rendered-final.log', 'dashboard-final.log', 'portfolio-final.log', 'vault-final.log',
  'comparison-final.log', 'portability-final.log', 'input-final.log'];
for (const file of requiredLogs) assert.ok((await fs.stat(path.join(output, file))).size > 0, file);
const gates = JSON.parse(await fs.readFile(path.join(output, 'web-gates-final.json'), 'utf8'));
assert.equal(gates.status, 'completed'); assert.equal(gates.stages.length, 11);
assert.ok(gates.stages.every(stage => stage.exitCode === 0 && !stage.error));
const web = await fs.readFile(path.join(output, 'web-tests-final.log'), 'utf8');
assert.ok(web.includes('348 regression tests passed.') && web.includes('31 common-month contracts passed.'));
const reference = web.split(/\r?\n/).filter(line => line.startsWith('{"seed":')).map(JSON.parse).at(-1);
assert.equal(reference.passed, 23247); assert.equal(reference.failed, 0); assert.equal(reference.seed, 20261021);
const baselineProof = { headSha: prior.headSha, receipt: prior.receipt, preview: prior.preview,
  deploymentId: prior.deployment.id, ci: prior.ci.map(v => ({ id: v.id, event: v.event, attempt: v.attempt })),
  desktop: { files: 322, publicationEntries: 324, backups: 48, htmlSha256: '720ebd84c8a94bb6cc49c7ee46bb0c77e63e8a32fc8464c9b4668ba5e3d864df' },
  note: 'Read-only baseline verification; not newly executed application tests.' };
await fs.writeFile(path.join(output, 'prior-verified-checkpoint.json'), JSON.stringify(baselineProof, null, 2) + '\n');
const files = {};
for (const entry of await fs.readdir(output, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || entry.name === 'artifact-receipt.json') continue;
  const absolute = path.join(entry.parentPath, entry.name), relative = path.relative(output, absolute).replaceAll('\\', '/');
  const bytes = await fs.readFile(absolute); files[relative] = { bytes: bytes.length, sha256: hash(bytes) };
}
const receipt = { verifiedAt: new Date().toISOString(), baseline, stage: 'Local preflight; final exact-head CI and hosted proof required', productionReady: false,
  priorReceipt: prior.receipt, allowedSourceChanges: [...modified, ...added], sources,
  web: { regressions: 348, dashboardCases: 18, hostedCasesRequired: 109, heroViewportCases: 20 },
  native: { browserExecutions: 70, commonMonthCases: 21 },
  commonMonth: { coreContracts: 31, webCases: 21, nativeCases: 21, oracleControls: 4, widths: [1440, 375, 280],
    reference: { passed: 23247, failed: 0, adjudicated: true, logFile: 'web-tests-final.log', reportFile: 'reference-followup-decision.md' } },
  media: { contracts: 145, freshStills: 27, unchangedModelsAndPosters: 10, unchangedVideosRechecked: 10 },
  models: prior.local.models, posters: prior.local.posters, videos, files,
  limitations: ['No old payoff allocation, saved-data, asset or cloud change.', 'Generic Number estimates are not exact lender posting.',
    'Whole R2, final collection art, lender/calendar, backend, physical-device and production release remain open.',
    'Static self-contained HTML checks do not establish file-runtime, whole-set crash atomicity or power-loss durability.'] };
await fs.writeFile(path.join(output, 'artifact-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ output, sources: Object.keys(sources).length, files: Object.keys(files).length, productionReady: false }));
