import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MEDIA_IDENTITY_VERSION,
  buildLocMediaChannels,
  findMediaRuntimeLeaks,
  getMediaFormat,
  mediaFrameToSeconds,
  normalizeMediaSeed,
  sampleMediaRandom,
  visualIdentity,
} from '../src/visual-identity.mjs';

const root = new URL('../../../', import.meta.url);

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const normalized = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => channel(Number.parseInt(normalized.slice(offset, offset + 2), 16)));
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrast(foreground, background) {
  const high = Math.max(luminance(foreground), luminance(background));
  const low = Math.min(luminance(foreground), luminance(background));
  return (high + 0.05) / (low + 0.05);
}

function assertDeepFrozen(value) {
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') assertDeepFrozen(child);
  }
}

test('exports one immutable, versioned renderer-neutral identity', () => {
  assert.equal(MEDIA_IDENTITY_VERSION, 1);
  assert.equal(visualIdentity.version, MEDIA_IDENTITY_VERSION);
  assert.equal(visualIdentity.brand.name, 'InterestShield');
  assert.deepEqual(visualIdentity.runtimeBoundary.renderers, ['hyperframes', 'remotion']);
  assertDeepFrozen(visualIdentity);
});

test('uses a semantic palette with AA-safe readable pairs', () => {
  const { palette, accessibility } = visualIdentity;
  assert.deepEqual(Object.keys(palette.semantic), [
    'progress',
    'information',
    'caution',
    'blocked',
    'editorial',
  ]);

  for (const pair of accessibility.contrastPairs) {
    const ratio = contrast(pair.foreground, pair.background);
    assert.ok(
      ratio >= pair.minimum,
      `${pair.id} contrast ${ratio.toFixed(2)} is below ${pair.minimum}`,
    );
  }

  assert.equal(accessibility.normalTextContrast, 4.5);
  assert.equal(accessibility.largeTextContrast, 3);
  assert.equal(accessibility.colorNeverActsAlone, true);
});

test('defines deterministic landscape, portrait, and square frames with bounded safe areas', () => {
  assert.deepEqual(Object.keys(visualIdentity.formats), ['landscape', 'portrait', 'square']);
  assert.deepEqual(getMediaFormat('landscape').frame, { width: 1920, height: 1080 });
  assert.deepEqual(getMediaFormat('portrait').frame, { width: 1080, height: 1920 });
  assert.deepEqual(getMediaFormat('square').frame, { width: 1080, height: 1080 });

  for (const format of Object.values(visualIdentity.formats)) {
    const { frame, safeArea, captions } = format;
    assert.ok(safeArea.left >= 72 && safeArea.right >= 72);
    assert.ok(safeArea.top >= 100 && safeArea.bottom >= 100);
    assert.ok(safeArea.left + safeArea.right < frame.width);
    assert.ok(safeArea.top + safeArea.bottom < frame.height);
    assert.ok(captions.left >= safeArea.left && captions.right >= safeArea.right);
    assert.ok(captions.bottom >= safeArea.bottom);
    assert.ok(captions.minimumFontPx >= 42);
    assert.equal(captions.maxLines, 2);
  }

  assert.throws(() => getMediaFormat('cinema'), /Unknown media format/);
});

test('uses deterministic frame motion and a complete reduced-motion substitute', () => {
  const { motion } = visualIdentity;
  assert.equal(motion.fps, 30);
  assert.ok(Number.isInteger(motion.firstActionFrame) && motion.firstActionFrame > 0);
  assert.deepEqual(Object.keys(motion.durationsFrames), ['micro', 'standard', 'deliberate', 'cinematic']);
  assert.ok(motion.durationsFrames.micro < motion.durationsFrames.standard);
  assert.ok(motion.durationsFrames.standard < motion.durationsFrames.deliberate);
  assert.ok(motion.durationsFrames.deliberate < motion.durationsFrames.cinematic);
  assert.equal(motion.timelineSource, 'frames-only');
  assert.equal(motion.randomness, 'forbidden-without-a-versioned-seed');
  assert.equal(motion.reducedMotion.ambientMotion, 'none');
  assert.equal(motion.reducedMotion.transition, 'cut-or-opacity-only');
  assert.ok(motion.reducedMotion.minimumHoldFrames >= motion.fps * 2);
});

test('quantizes HyperFrames time and seeded geometry from portable test vectors', () => {
  assert.equal(visualIdentity.motion.timebase.authoringUnit, 'integer-frame');
  assert.equal(visualIdentity.motion.timebase.hyperframesSecondsFormula, 'frame / fps');
  assert.equal(mediaFrameToSeconds(6), 0.2);
  assert.equal(mediaFrameToSeconds(21), 0.7);
  assert.throws(() => mediaFrameToSeconds(6.5), /integer frame/);
  assert.throws(() => mediaFrameToSeconds(-1), /non-negative/);

  const seed = 'interestshield:v1:baseline-comparison';
  assert.equal(visualIdentity.motion.seededRandom.algorithm, 'xorshift32');
  assert.equal(visualIdentity.motion.seededRandom.seedHash, 'fnv1a-32-utf8');
  assert.equal(normalizeMediaSeed(seed), 2509553728);
  assert.deepEqual(sampleMediaRandom(seed, 4), [
    0.74224992422387,
    0.6302021872252226,
    0.6833189914468676,
    0.21040430711582303,
  ]);
  assert.throws(() => sampleMediaRandom(seed, 1.5), /integer sample count/);
});

test('keeps financial visual channels literal and distinguishes LOC utilization from capacity', () => {
  const semantics = visualIdentity.dataSemantics;
  assert.deepEqual(Object.keys(semantics.artifacts), [
    'income',
    'loc',
    'expenses',
    'cash-flow',
    'principal',
  ]);
  assert.equal(semantics.loc.utilization.labelSuffix, '% used');
  assert.equal(semantics.loc.utilization.visualDirection, 'higher-is-more-pressure');
  assert.equal(semantics.loc.availableCapacity.labelSuffix, 'open');
  assert.equal(semantics.loc.availableCapacity.visualDirection, 'higher-is-more-room');
  assert.equal(semantics.loc.neverShareOneUnlabeledScale, true);
  assert.deepEqual(Object.keys(semantics.algorithmicArt), [
    'locUtilization',
    'cashFlow',
    'interestBurn',
    'projectionConfidence',
  ]);
});

test('renders LOC utilization and capacity with opposite explicit units', () => {
  assert.equal(visualIdentity.dataSemantics.loc.utilization.inputUnit, 'ratio');
  assert.equal(visualIdentity.dataSemantics.loc.utilization.displayConversion, 'ratio * 100');
  assert.equal(visualIdentity.dataSemantics.loc.availableCapacity.displayUnit, 'USD');

  assert.deepEqual(buildLocMediaChannels({ balance: 8000, limit: 10000 }), {
    isUsable: true,
    utilization: { ratio: 0.8, percent: 80, label: '80% used' },
    availableCapacity: { amount: 2000, ratio: 0.2, label: '$2,000 open' },
  });
  assert.deepEqual(buildLocMediaChannels({ balance: 12000, limit: 10000 }), {
    isUsable: true,
    utilization: { ratio: 1.2, percent: 120, label: '120% used' },
    availableCapacity: { amount: 0, ratio: 0, label: '$0 open' },
  });
  assert.deepEqual(buildLocMediaChannels({ balance: 8000, limit: 0 }), {
    isUsable: false,
    utilization: { ratio: null, percent: null, label: 'Setup needed' },
    availableCapacity: { amount: null, ratio: null, label: 'Enter LOC limit' },
  });
  for (const balance of [undefined, Number.NaN, -1]) {
    assert.deepEqual(buildLocMediaChannels({ balance, limit: 10000 }), {
      isUsable: false,
      utilization: { ratio: null, percent: null, label: 'Balance needed' },
      availableCapacity: { amount: null, ratio: null, label: 'Balance needed' },
    });
  }
});

test('freezes readable typography, caption behavior, coach tone, and educational stories', () => {
  const { typography, accessibility, copy, stories } = visualIdentity;
  assert.equal(typography.display.role, 'expressive-editorial');
  assert.equal(typography.body.role, 'plain-language-coach');
  assert.equal(typography.data.numericVariant, 'tabular-nums');
  assert.equal(typography.assetPolicy, 'local-versioned-font-files-only');
  assert.ok(typography.minimumPx.headline >= 84);
  assert.ok(typography.minimumPx.supporting >= 44);
  assert.ok(typography.minimumPx.label >= 32);
  assert.equal(accessibility.captions.required, true);
  assert.equal(accessibility.captions.maxLines, 2);
  assert.ok(accessibility.captions.minimumVisibleMs >= 1000);
  assert.equal(copy.disclaimer, 'Educational tool. Not financial advice.');
  assert.ok(copy.prohibitedClaims.includes('guaranteed results'));
  assert.ok(copy.prohibitedClaims.includes('universal savings percentages'));
  assert.deepEqual(stories.map(({ id }) => id), [
    'baseline-comparison',
    'first-money-loop-month',
    'blocked-plan',
  ]);
});

test('forbids renderer dependencies in calculator and mobile manifests', async () => {
  const boundary = visualIdentity.runtimeBoundary;
  assert.deepEqual(boundary.forbiddenRuntimePackages, [
    'hyperframes',
    'gsap',
    'remotion',
    '@remotion/media',
  ]);
  assert.deepEqual(boundary.forbiddenRuntimePackagePrefixes, [
    '@hyperframes/',
    '@remotion/',
    '@gsap/',
  ]);
  assert.deepEqual(boundary.protectedManifests, ['apps/web/package.json', 'apps/mobile/package.json']);
  assert.deepEqual(boundary.protectedLockfiles, ['apps/web/package-lock.json', 'apps/mobile/package-lock.json']);
  assert.equal(boundary.allowedCalculatorIntegration, 'rendered-static-assets-and-versioned-json-only');

  for (let index = 0; index < boundary.protectedManifests.length; index += 1) {
    const manifestPath = boundary.protectedManifests[index];
    const lockfilePath = boundary.protectedLockfiles[index];
    const manifest = JSON.parse(await readFile(new URL(manifestPath, root), 'utf8'));
    const lockfile = JSON.parse(await readFile(new URL(lockfilePath, root), 'utf8'));
    assert.deepEqual(
      findMediaRuntimeLeaks({ manifest, lockfile }),
      [],
      `renderer package leaked into ${manifestPath} or ${lockfilePath}`,
    );
  }
});

test('detects renderer package families, aliases, and transitive lockfile entries', () => {
  const leaks = findMediaRuntimeLeaks({
    manifest: {
      dependencies: {
        '@remotion/three': '4.0.0',
        'campaign-renderer': 'npm:@hyperframes/shader-transitions@1.2.3',
      },
      devDependencies: {
        timeline: 'npm:gsap@3.13.0',
      },
    },
    lockfile: {
      packages: {
        'node_modules/@remotion/captions': { version: '4.0.0' },
        'node_modules/renamed-renderer': {
          name: '@hyperframes/shader-transitions',
          version: '1.2.3',
        },
        'node_modules/opaque-current-resolution': {
          version: '4.0.0',
          resolved: 'https://registry.npmjs.org/%40remotion%2flambda/-/lambda-4.0.0.tgz',
        },
      },
      dependencies: {
        'legacy-video-adapter': {
          version: 'npm:@remotion/lambda@4.0.0',
        },
        'opaque-legacy-resolution': {
          version: '1.2.3',
          resolved: 'https://registry.npmjs.org/%40hyperframes%2fshader-transitions/-/shader-transitions-1.2.3.tgz',
        },
      },
    },
  });

  assert.deepEqual(leaks.map(({ packageName }) => packageName), [
    '@hyperframes/shader-transitions',
    '@hyperframes/shader-transitions',
    '@hyperframes/shader-transitions',
    '@remotion/captions',
    '@remotion/lambda',
    '@remotion/lambda',
    '@remotion/three',
    'gsap',
  ]);
});

test('names explicit visual and messaging anti-patterns', () => {
  const antiPatterns = new Set(visualIdentity.antiPatterns);
  for (const required of [
    'fear-or-shame-language',
    'guaranteed-or-universal-outcomes',
    'unlabeled-modeled-numbers',
    'utilization-capacity-scale-swaps',
    'decorative-data-without-model-meaning',
    'continuous-ambient-spinning',
    'web-dashboard-shrunk-into-video',
    'tiny-or-overflowing-captions',
    'color-only-status',
  ]) {
    assert.equal(antiPatterns.has(required), true, `missing anti-pattern: ${required}`);
  }
});
