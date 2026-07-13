import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const mediaRoot = new URL('../', import.meta.url);
const remotionRoot = new URL('../remotion/', import.meta.url);
const engineSource = new URL('../../../packages/financial-engine/src/index.ts', import.meta.url);
const require = createRequire(import.meta.url);

async function text(relativePath) {
  return readFile(new URL(relativePath, remotionRoot), 'utf8');
}

test('pins one isolated Remotion toolchain and exposes standing render gates', async () => {
  const manifest = JSON.parse(await readFile(new URL('package.json', mediaRoot), 'utf8'));
  for (const name of ['remotion', '@remotion/cli', '@remotion/bundler']) {
    assert.equal(manifest.devDependencies[name], '4.0.489');
  }
  assert.equal(manifest.devDependencies.react, '19.2.7');
  assert.equal(manifest.devDependencies['react-dom'], '19.2.7');
  assert.equal(manifest.scripts['generate:scenarios'], 'tsx scripts/generate-remotion-scenarios.ts');
  assert.equal(manifest.scripts['check:remotion'], 'node scripts/check-remotion.mjs');
  assert.equal(manifest.scripts['prepare:remotion-browser'], 'node scripts/prepare-remotion-browser.mjs');
  assert.match(manifest.scripts.check, /check:remotion/);
  assert.match(manifest.scripts['render:still'], /InterestShield-Scenario-Still/);
  assert.match(manifest.scripts['render:matrix'], /render-remotion-matrix/);
  assert.match(manifest.scripts['render:video'], /MoneyLoopMonth-Landscape/);
  assert.doesNotMatch(JSON.stringify(manifest.scripts), /npx|--yes/);
});

test('commits deterministic scenario JSON generated from the shared financial engine', async () => {
  const scenarios = JSON.parse(await text('data/scenarios.v1.json'));
  const engine = await readFile(engineSource, 'utf8');
  assert.equal(scenarios.version, 1);
  assert.match(scenarios.engineContractVersion, /^source-sha256:[a-f0-9]{12}$/);
  assert.equal(scenarios.lenderTermsContractVersion, '2.0.0');
  const portableEngineSource = engine.replace(/\r\n/g, '\n');
  assert.equal(scenarios.engineSourceDigest, createHash('sha256').update(portableEngineSource).digest('hex'));
  assert.deepEqual(scenarios.scenarios.map((scenario) => scenario.id), [
    'baseline-comparison',
    'money-loop-month',
    'blocked-plan',
  ]);

  const [baseline, month, blocked] = scenarios.scenarios;
  assert.equal(baseline.status, 'modeled');
  assert.equal(baseline.output.compatible, true);
  assert.equal(baseline.output.baseline.isPayoffPossible, true);
  assert.equal(baseline.output.modeledPlan.isPayoffPossible, true);
  assert.ok(baseline.output.baseline.payoffMonths > baseline.output.modeledPlan.payoffMonths);
  assert.equal(month.status, 'modeled');
  assert.equal(month.output.cashFlow, month.inputs.monthlyIncome - month.inputs.monthlyExpenses);
  assert.equal(month.output.locInterestMethod, 'transaction-calendar');
  assert.deepEqual(month.output.dailyEvents.map((event) => event.day), [1, 3, 15, 20]);
  assert.deepEqual(month.output.dailyEvents.map((event) => event.closingBalance), [2800, 3800, 600, 5250]);
  assert.equal(month.output.storySteps.length >= 6, true);
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.output.projectionReady, false);
  assert.equal(blocked.output.payoffMonths, null);
  assert.ok(blocked.output.missingFields.length >= 1);

  const generator = await readFile(new URL('scripts/generate-remotion-scenarios.ts', mediaRoot), 'utf8');
  assert.match(generator, /simulateAmortizedPayoff/);
  assert.match(generator, /simulateMoneyLoopMonth/);
  assert.match(generator, /buildLenderTermsContract/);
  assert.match(generator, /--check/);
});

test('accepts a CRLF scenario checkout when generated financial data is unchanged', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'interestshield-remotion-'));
  const temporaryScenario = join(temporaryRoot, 'scenarios.v1.json');
  try {
    const committed = await text('data/scenarios.v1.json');
    await writeFile(temporaryScenario, committed.replace(/\r?\n/g, '\r\n'));
    const result = spawnSync(process.execPath, [
      require.resolve('tsx/cli'),
      fileURLToPath(new URL('scripts/generate-remotion-scenarios.ts', mediaRoot)),
      '--check',
    ], {
      cwd: fileURLToPath(mediaRoot),
      encoding: 'utf8',
      env: { ...process.env, REMOTION_SCENARIO_OUTPUT: temporaryScenario },
    });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('validates every scenario through a strict discriminated runtime schema', async () => {
  const root = await text('src/Root.tsx');
  const schema = await text('src/scenario-schema.ts');
  assert.match(root, /scenarioBundleSchema\.parse\(scenariosData\)/);
  assert.match(root, /scenarioCompositionPropsSchema/);
  assert.match(schema, /z\.discriminatedUnion\('id'/);
  assert.match(schema, /baseline-comparison/);
  assert.match(schema, /dailyEvents/);
  assert.match(schema, /failureReason/);
  assert.doesNotMatch(`${root}\n${schema}`, /as unknown as|z\.custom/);
});

test('registers every story in landscape portrait and square plus the representative still', async () => {
  const root = await text('src/Root.tsx');
  const ids = [...root.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const expected = [
    'Baseline-Landscape', 'Baseline-Portrait', 'Baseline-Square',
    'MoneyLoopMonth-Landscape', 'MoneyLoopMonth-Portrait', 'MoneyLoopMonth-Square',
    'BlockedPlan-Landscape', 'BlockedPlan-Portrait', 'BlockedPlan-Square',
    'InterestShield-Scenario-Still',
  ];
  assert.deepEqual(ids, expected);
  assert.match(root, /fps=\{30\}/);
  assert.match(root, /durationInFrames=\{240\}/);
  assert.match(root, /width=\{1920\}[\s\S]*height=\{1080\}/);
  assert.match(root, /width=\{1080\}[\s\S]*height=\{1920\}/);
  assert.match(root, /width=\{1080\}[\s\S]*height=\{1080\}/);
  const explainer = await text('src/ScenarioExplainer.tsx');
  assert.match(explainer, /reduced-motion-fact-sheet/);
  assert.match(explainer, /scenario\.output\.storySteps\.map\(\(step, index\)/);
  assert.match(explainer, /step\.value/);
  assert.match(explainer, /step\.detail/);
});

test('keeps scenario motion frame-driven local and truth-first', async () => {
  const source = [
    await text('src/Root.tsx'),
    await text('src/ScenarioExplainer.tsx'),
    await text('src/visuals.tsx'),
  ].join('\n');
  assert.match(source, /useCurrentFrame/);
  assert.match(source, /interpolate/);
  assert.match(source, /staticFile/);
  assert.match(source, /Educational tool\. Not financial advice\./);
  assert.match(source, /Modeled|Projection blocked/);
  assert.doesNotMatch(source, /Math\.random|Date\.now|setTimeout|Promise|https?:\/\//);
  assert.doesNotMatch(source, /animation\s*:|transition\s*:|@keyframes/);
  assert.doesNotMatch(source, /transform\s*:/);
});

test('binds visible financial values to scenario data and follows identity geometry', async () => {
  const source = await text('src/ScenarioExplainer.tsx');
  const visuals = await text('src/visuals.tsx');
  assert.doesNotMatch(visuals, /\$18,500|\$6,400|\$5,650/);
  assert.match(visuals, /scenario\.inputs/);
  assert.match(visuals, /dailyEvents/);
  assert.match(source, /landscape: \{ top: 100, right: 96, bottom: 100, left: 96 \}/);
  assert.match(source, /portrait: \{ top: 140, right: 72, bottom: 220, left: 72 \}/);
  assert.match(source, /square: \{ top: 100, right: 88, bottom: 120, left: 88 \}/);
  assert.match(source, /headline: 84, supporting: 44, label: 32/);
  assert.match(source, /\[6, 27\]/);
  assert.match(source, /\[6, 18\]/);
  assert.doesNotMatch(source, /\[0, (?:18|24|26|42|46)\]/);
});

test('runs browser-rendered overflow proofs and constrains colors to the tested palette', async () => {
  const checker = await readFile(new URL('scripts/check-remotion.mjs', mediaRoot), 'utf8');
  const matrix = await readFile(new URL('scripts/render-remotion-matrix.mjs', mediaRoot), 'utf8');
  const scenario = await text('src/ScenarioExplainer.tsx');
  const visuals = await text('src/visuals.tsx');
  assert.match(checker, /render-remotion-matrix/);
  assert.match(matrix, /inspectPng/);
  assert.match(scenario, /useLayoutEffect/);
  assert.match(scenario, /getBoundingClientRect/);
  assert.match(scenario, /scrollHeight/);

  const identityModule = await import('../src/visual-identity.mjs');
  const allowed = new Set([
    ...Object.values(identityModule.visualIdentity.palette.neutral),
    ...Object.values(identityModule.visualIdentity.palette.semantic),
  ].map((color) => color.toUpperCase()));
  const used = [...`${scenario}\n${visuals}`.matchAll(/#[0-9A-Fa-f]{6}/g)].map((match) => match[0].toUpperCase());
  for (const color of used) assert.ok(allowed.has(color), `Remotion uses uncontracted color ${color}`);
});

test('requires one exact Chrome build in local and CI renders and ignores every cache surface', async () => {
  const runner = await readFile(new URL('scripts/remotion-cli.mjs', mediaRoot), 'utf8');
  const workflow = await readFile(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const gitignore = await readFile(new URL('../../../.gitignore', import.meta.url), 'utf8');
  const chromeVersion = (await text('chrome.version')).trim();
  assert.match(chromeVersion, /^\d+\.\d+\.\d+\.\d+$/);
  assert.match(runner, /--browser-executable/);
  assert.match(runner, /reported === pinnedChromeVersion/);
  assert.match(runner, /google-chrome/);
  assert.match(runner, /Google['"], ['"]Chrome/);
  assert.doesNotMatch(runner, /downloadBrowser|headless-shell/);
  assert.match(workflow, /browser-actions\/setup-chrome@[a-f0-9]{40}/);
  assert.match(workflow, /chrome-version: \$\{\{ steps\.remotion-chrome-version\.outputs\.version \}\}/);
  assert.match(workflow, /CHROME_PATH: \$\{\{ steps\.remotion-chrome\.outputs\.chrome-path \}\}/);
  assert.ok(gitignore.includes('/apps/media/remotion/.chrome-for-testing/'));
  assert.ok(gitignore.includes('/apps/media/.remotion/'));
  assert.ok(gitignore.includes('/apps/media/node_modules/.remotion/'));
});

test('protects Remotion output and browser bundles from broad staging', async () => {
  const gitignore = await readFile(new URL('../../../.gitignore', import.meta.url), 'utf8');
  for (const directory of ['out', 'bundle']) {
    assert.ok(gitignore.includes(`/apps/media/remotion/${directory}/`));
  }
});
