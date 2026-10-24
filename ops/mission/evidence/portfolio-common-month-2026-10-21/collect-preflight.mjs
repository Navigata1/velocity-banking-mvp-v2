import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pixelProof from '../../../apps/web/scripts/png-pixel-proof.cjs';

const scratch = path.resolve('.superpowers/sdd/2026-10-21-common-month');
const output = path.resolve('ops/mission/evidence/portfolio-common-month-2026-10-21');
const baseline = '1aec5bf7be3d0f3c26079141245e4c7291fd8778';
const predecessor = 'd6f6f5010237ff1843bb73a33360445b7d094687';
const predecessorBytes = execFileSync('git', ['show', predecessor + ':ops/mission/evidence/portfolio-common-month-2026-10-21/artifact-receipt.json'], {maxBuffer:16*1024*1024});
const predecessorReceipt = JSON.parse(predecessorBytes);
const olderReceiptBytes = execFileSync('git', ['show', '789ae25cc3feaefba942d26e1c1fbde02b747aaf:ops/mission/evidence/portfolio-common-month-2026-10-21/artifact-receipt.json'], {maxBuffer:16*1024*1024});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalized = bytes => hash(bytes.toString('utf8').replace(/\r\n?/g, '\n'));
const prior = JSON.parse(await fs.readFile('.superpowers/sdd/2026-10-21-mobile-vitals/postflight.json', 'utf8'));
assert.equal(prior.headSha, baseline);
assert.equal(execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(), 'codex/restoration/asset-heroes');
const modified = ['apps/web/package.json', 'apps/web/src/app/portfolio/PortfolioPlanSection.tsx',
  'apps/mobile/components/mobile-routes/portfolio-route.tsx', 'apps/mobile/scripts/smoke-accessibility-rendered.cjs',
  'packages/financial-engine/package.json', 'apps/web/scripts/smoke-heroes.cjs'];
const added = ['packages/financial-engine/src/common-month.ts', 'packages/financial-engine/src/portfolio-common-month.ts',
  'apps/web/src/app/portfolio/PortfolioCommonMonth.tsx', 'apps/mobile/components/portfolio/portfolio-common-month.tsx',
  'apps/web/scripts/portfolio-common-month-tests.cjs', 'apps/web/scripts/portfolio-common-month-reference-tests.cjs',
  'apps/web/scripts/smoke-portfolio-common-month.cjs', 'apps/web/scripts/smoke-portfolio-currency-width.cjs'];
const sources = {};
for (const file of [...Object.keys(prior.local.sources), ...added]) {
  sources[file] = normalized(await fs.readFile(file));
  if (!modified.includes(file) && !added.includes(file)) assert.equal(sources[file], prior.local.sources[file], file);
  if (file !== 'apps/web/scripts/smoke-heroes.cjs') assert.equal(sources[file], predecessorReceipt.sources[file], file + ' unchanged since unverified predecessor');
}
assert.equal(Object.keys(sources).length, 293);
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
  if (/^projection.*\.(json|log|mjs)$/.test(name) || /^shipping-guards.*\.log$/.test(name) || /^currency-width.*\.(json|log)$/.test(name)) await copy(path.join(scratch, 'release', name), 'shipping/' + name);
  if (/^hero-helper-.*\.(json|log)$/.test(name)) await copy(path.join(scratch, 'release', name), 'shipping/' + name);
  if (/^sampler-helper-.*\.(json|log)$/.test(name)) await copy(path.join(scratch, 'release', name), 'shipping/' + name);
}
for (const [source, target] of Object.entries({
  'web-tests-sampler.log': 'web-tests-final.log', 'web-lint-sampler.log': 'web-lint-final.log',
  'web-build-currency-fix.log': 'web-build-final.log', 'native-export-font-fix.log': 'native-export-final.log',
  'native-contracts-font-fix.log': 'native-contracts-final.log', 'media-font-fix.log': 'media-check.log',
  'native-ui-font-fix.log': 'native-ui-capture-final.log', 'web-ui-sampler-portfolio.log': 'web-ui-capture-final.log',
  'videos-font-fix.log': 'videos-final.log', 'release/shipping-guards-sampler-parent.log': 'release-tests-final.log',
})) await copy(path.join(scratch, source), target);
await copy(path.join(scratch, 'web-ui-sampler-portfolio.log'), 'portfolio-currency-final.log');
for (const name of ['failed-push-ci.log', 'failed-pr-ci.log', 'failed-7bd72ac-browser-proof.json']) await copy(path.join(scratch, 'release', name), name);
await fs.cp(path.join(scratch, 'release/failed-789ae25'), path.join(output, 'failed-789ae25'), {recursive:true});
await fs.writeFile(path.join(output, 'failed-789ae25/local-preflight-receipt.json'), olderReceiptBytes);
await fs.cp(path.join(scratch, 'release/failed-d6f6f50'), path.join(output, 'failed-d6f6f50'), {recursive:true});
await fs.writeFile(path.join(output, 'failed-d6f6f50/local-preflight-receipt.json'), predecessorBytes);
await fs.cp(path.join(scratch, 'release/failed-789ae25-push-heroes'), path.join(output, 'failed-789ae25-push-heroes'), {recursive:true});
for (const directory of ['hero-clock-probe','hero-clock-probe-vault','hero-clock-probe-frozen','hero-clock-probe-frozen-sampled','hero-vault-opacity-probe','hero-vault-opacity-probe-warm','hero-software-final-snapshots','hero-sampler-software-final-snapshots','hero-sampler-pixel-probe']) {
  await fs.cp(path.join(scratch, directory), path.join(output, directory), {recursive:true});
}
await copy('apps/web/test-results/portfolio-common-month/verification.json', 'web-common-month-verification.json');
await copy('apps/web/test-results/currency-width/verification.json', 'currency-width-verification.json');
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
  'comparison-final.log', 'portability-final.log', 'input-final.log', 'portfolio-currency-final.log'];
for (const file of requiredLogs) assert.ok((await fs.stat(path.join(output, file))).size > 0, file);
const inheritedCanonicalFiles = ['web-build-final.log','native-export-final.log','native-contracts-final.log','native-ui-capture-final.log','media-check.log','videos-final.log'];
for (const file of inheritedCanonicalFiles) assert.equal(hash(await fs.readFile(path.join(output, file))), predecessorReceipt.files[file].sha256, file + ' inherited unchanged proof');
const gates = JSON.parse(await fs.readFile(path.join(output, 'web-gates-final.json'), 'utf8'));
assert.equal(gates.status, 'completed'); assert.equal(gates.stages.length, 11);
assert.ok(gates.stages.every(stage => stage.exitCode === 0 && !stage.error));
const frozen = JSON.parse(await fs.readFile(path.join(output, 'hero-clock-probe-frozen-sampled/verification.json'), 'utf8'));
assert.equal(frozen.normalGeometryGuardPassed, true); assert.equal(frozen.motionRejected, true);
assert.equal(frozen.sampled,true);assert.equal(frozen.samplingSourceHash,hash(await fs.readFile('apps/web/scripts/smoke-heroes.cjs')));
const software = JSON.parse(await fs.readFile(path.join(output, 'hero-sampler-software-final-snapshots/snapshot-receipt.json'), 'utf8'));
assert.equal(software.viewportCases,20); assert.equal(Object.keys(software.files).length,40); assert.equal(software.processExitCode,0);
assert.equal(software.sourceHash,hash(await fs.readFile('apps/web/scripts/smoke-heroes.cjs')));
const comparison = JSON.parse(await fs.readFile(path.join(output, 'hero-sampler-pixel-probe/verification.json'), 'utf8'));
assert.equal(comparison.sourceHash,software.sourceHash);assert.equal(comparison.originalVisibilityAndMotionGuardsPassed,true);
for (const distance of Object.values(comparison.comparisons)) {
  assert.ok(distance.maxCellDistance<=pixelProof.MAX_SETTLED_SPATIAL_CELL_DISTANCE);
  assert.ok(distance.meanCellDistance<=pixelProof.MAX_SETTLED_SPATIAL_MEAN_DISTANCE);
}
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
  web: { regressions: 348, dashboardCases: 18, hostedCasesRequired: 120, heroViewportCases: 20 },
  native: { browserExecutions: 70, commonMonthCases: 21 },
  commonMonth: { coreContracts: 31, webCases: 21, nativeCases: 21, currencyWidthCases: 11, oracleControls: 4, widerFontProbes: 1, widerFontBoundaryExecutions: 42, widths: [1440, 375, 280],
    reference: { passed: 23247, failed: 0, adjudicated: true, logFile: 'web-tests-final.log', reportFile: 'reference-followup-decision.md' } },
  media: { contracts: 145, freshStills: 27, unchangedModelsAndPosters: 10, unchangedVideosRechecked: 10 },
  failedPredecessor: { headSha: '7bd72ac67f2e0aa32cd0275361c6bf983eb4ea47', ciRuns: [39605673471, 39605676575],
    reason: 'Both web jobs fail common-month large-values280 section overflow; both SQL jobs pass. Hosted/local success did not override CI; no verified receipt or Desktop publication.' },
  failedHeroCapturePredecessor: {headSha:'789ae25cc3feaefba942d26e1c1fbde02b747aaf', push:{id:39612733144,conclusion:'failure'}, pullRequest:{id:39612743542,conclusion:'success'},
    reason:'Push failed the original uncontrolled-phase Credit Card visibility guard; complete PR pipeline succeeded. Neither retry fishing nor a receipt/Desktop publication occurred. Both new full exact-head events are required.'},
  failedBudgetPredecessor: {headSha:predecessor,push:{id:39621111192,conclusion:'success'},pullRequest:{id:39621121164,conclusion:'cancelled'},
    annotation:'The job has exceeded the maximum execution time of 20m0s',heroStepSeconds:813,passedViewportCases:15,
    reason:'No visibility/movement assertion failed before the fixed job cap cancelled the PR after10 desktop+5 mobile cases. Later media/native steps were skipped, both SQL jobs succeeded. No receipt/Desktop publication; no same-head retry.'},
  heroCapture: {scope:'Only the existing browser test harness changes; all actual assets, animation/runtime and financial sources are preserved.',
    controlledMilliseconds:1500, loadingTickMilliseconds:16, primerMilliseconds:16, sampleCount:15, sampleStepMilliseconds:100,samplingHz:10,
    originalForegroundMinimum:0.02, originalScreenshotTimeoutMilliseconds:120000, groupWallBudgetMilliseconds:120000,
    deadlineContracts:5, samplerContracts:5,evidence:'hero-deadline-sampler-green.log',samplerEvidence:'hero-sampler-green.log',
    frozenSchedulerBrowserControl:'hero-clock-probe-frozen-sampled/verification.json',pixelComparison:'hero-sampler-pixel-probe/verification.json',
    limitation:'Clock-driven two-snapshot phase and visibility proof is not wall-time smoothness or device performance certification.'},
  inheritedUnchangedGates: {fromHead:predecessor, headWasReleaseVerified:false, localPreflightReceiptSha256:hash(predecessorBytes),
    unchangedExecutableSources:292, changedExecutableSource:'apps/web/scripts/smoke-heroes.cjs', canonicalFiles:inheritedCanonicalFiles,
    note:'These local build/native/media/video logs are retained byte-identically for unchanged inputs, not described as rerun after this harness correction. Both new complete CI events must freshly execute all build/media/native/SQL steps before release evidence or Desktop publication.'},
  models: prior.local.models, posters: prior.local.posters, videos, files,
  limitations: ['No old payoff allocation, saved-data, asset or cloud change.', 'Generic Number estimates are not exact lender posting.',
    'Whole R2, final collection art, lender/calendar, backend, physical-device and production release remain open.',
    'Static self-contained HTML checks do not establish file-runtime, whole-set crash atomicity or power-loss durability.'] };
await fs.writeFile(path.join(output, 'artifact-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ output, sources: Object.keys(sources).length, files: Object.keys(files).length, productionReady: false }));
