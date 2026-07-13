export const MEDIA_IDENTITY_VERSION = 1;

const MEDIA_FPS = 30;
const FORBIDDEN_RUNTIME_PACKAGES = ['hyperframes', 'gsap', 'remotion', '@remotion/media'];
const FORBIDDEN_RUNTIME_PACKAGE_PREFIXES = ['@hyperframes/', '@remotion/', '@gsap/'];
const PROTECTED_MANIFESTS = ['apps/web/package.json', 'apps/mobile/package.json'];
const PROTECTED_LOCKFILES = ['apps/web/package-lock.json', 'apps/mobile/package-lock.json'];
const wholeUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}

const formats = {
  landscape: {
    label: '16:9 landscape',
    frame: { width: 1920, height: 1080 },
    safeArea: { top: 100, right: 96, bottom: 100, left: 96 },
    captions: { left: 120, right: 120, bottom: 110, minimumFontPx: 46, maxLines: 2 },
  },
  portrait: {
    label: '9:16 portrait',
    frame: { width: 1080, height: 1920 },
    safeArea: { top: 140, right: 72, bottom: 220, left: 72 },
    captions: { left: 84, right: 84, bottom: 260, minimumFontPx: 52, maxLines: 2 },
  },
  square: {
    label: '1:1 square',
    frame: { width: 1080, height: 1080 },
    safeArea: { top: 100, right: 88, bottom: 120, left: 88 },
    captions: { left: 104, right: 104, bottom: 144, minimumFontPx: 46, maxLines: 2 },
  },
};

export const visualIdentity = deepFreeze({
  version: MEDIA_IDENTITY_VERSION,
  brand: {
    name: 'InterestShield',
    promise: 'See the interest. Model the tradeoffs. Keep your agency.',
    posture: 'truth-first, hope-forward, and never shaming',
  },
  palette: {
    neutral: {
      canvas: '#07111F',
      surface: '#102235',
      surfaceRaised: '#183247',
      ink: '#F5F7F2',
      mutedInk: '#C6D0D8',
    },
    semantic: {
      progress: '#34D399',
      information: '#38BDF8',
      caution: '#FBBF24',
      blocked: '#FB7185',
      editorial: '#C4B5FD',
    },
    rules: {
      progress: 'Recoverable movement, positive cash flow, and modeled principal reduction.',
      information: 'Neutral explanation, available room, and assumptions.',
      caution: 'Setup needed, high utilization, or a guardrail that needs attention.',
      blocked: 'A projection or action that the current inputs do not support.',
      editorial: 'Story emphasis only; never a financial status or recommendation.',
    },
  },
  typography: {
    display: {
      family: 'Literata Variable',
      fallback: 'Georgia, serif',
      role: 'expressive-editorial',
      weights: [700, 900],
    },
    body: {
      family: 'Geist Variable',
      fallback: 'system-ui, sans-serif',
      role: 'plain-language-coach',
      weights: [350, 500, 700],
    },
    data: {
      family: 'Geist Mono Variable',
      fallback: 'ui-monospace, monospace',
      role: 'model-output-and-assumptions',
      weights: [500, 700],
      numericVariant: 'tabular-nums',
    },
    minimumPx: { headline: 84, supporting: 44, label: 32 },
    assetPolicy: 'local-versioned-font-files-only',
    darkCanvasCompensation: {
      bodyWeight: 350,
      minimumBodyLineHeight: 1.45,
      letterSpacingEm: 0,
    },
  },
  formats,
  motion: {
    fps: MEDIA_FPS,
    firstActionFrame: 6,
    timelineSource: 'frames-only',
    randomness: 'forbidden-without-a-versioned-seed',
    timebase: {
      authoringUnit: 'integer-frame',
      hyperframesSecondsFormula: 'frame / fps',
      remotionFrameFormula: 'frame',
      fractionalFrames: 'rejected',
    },
    seededRandom: {
      algorithm: 'xorshift32',
      seedHash: 'fnv1a-32-utf8',
      outputRange: '[0,1)',
      zeroStateFallback: 2654435769,
    },
    durationsFrames: { micro: 6, standard: 12, deliberate: 21, cinematic: 36 },
    easing: {
      enter: [0.16, 1, 0.3, 1],
      exit: [0.7, 0, 0.84, 0],
      reposition: [0.65, 0, 0.35, 1],
    },
    sceneRhythm: {
      build: [0, 0.3],
      breathe: [0.3, 0.7],
      resolve: [0.7, 1],
      maximumStaggerFrames: 15,
      maximumConcurrentAmbientMotions: 1,
    },
    artifactSelection: {
      stable: 'one-turn-then-settle',
      caution: 'half-turn-then-settle',
      blocked: 'settle-without-turning',
      maximumFrames: 21,
    },
    reducedMotion: {
      ambientMotion: 'none',
      transition: 'cut-or-opacity-only',
      artifactSelection: 'static-state-change',
      minimumHoldFrames: 60,
    },
  },
  accessibility: {
    normalTextContrast: 4.5,
    largeTextContrast: 3,
    colorNeverActsAlone: true,
    contrastPairs: [
      { id: 'ink-on-canvas', foreground: '#F5F7F2', background: '#07111F', minimum: 4.5 },
      { id: 'muted-on-canvas', foreground: '#C6D0D8', background: '#07111F', minimum: 4.5 },
      { id: 'ink-on-surface', foreground: '#F5F7F2', background: '#102235', minimum: 4.5 },
      { id: 'progress-on-canvas', foreground: '#34D399', background: '#07111F', minimum: 4.5 },
      { id: 'information-on-canvas', foreground: '#38BDF8', background: '#07111F', minimum: 4.5 },
      { id: 'caution-on-canvas', foreground: '#FBBF24', background: '#07111F', minimum: 4.5 },
      { id: 'blocked-on-canvas', foreground: '#FB7185', background: '#07111F', minimum: 4.5 },
      { id: 'editorial-on-canvas', foreground: '#C4B5FD', background: '#07111F', minimum: 4.5 },
    ],
    captions: {
      required: true,
      maxLines: 2,
      maximumCharactersPerLine: 38,
      minimumVisibleMs: 1000,
      speakerChangesRequireCue: true,
      neverCoverPrimaryMetric: true,
    },
    textRules: {
      wrapBeforeShrink: true,
      truncateFinancialMeaning: false,
      statusNeedsTextOrShape: true,
    },
  },
  dataSemantics: {
    artifacts: {
      income: { geometry: 'deposit-reservoir', meaning: 'Deposits gather before entering the Money Loop.' },
      loc: { geometry: 'credit-aperture', meaning: 'The aperture represents usable credit capacity, never income.' },
      expenses: { geometry: 'outflow-gate', meaning: 'The gate represents planned outflow pressure.' },
      'cash-flow': { geometry: 'flow-core', meaning: 'The core represents income minus expenses available to recover the LOC.' },
      principal: { geometry: 'principal-shield', meaning: 'The shield represents principal targeted by a bounded modeled chunk.' },
    },
    loc: {
      utilization: {
        formula: 'locBalance / locLimit',
        inputUnit: 'ratio',
        displayConversion: 'ratio * 100',
        displayRounding: 'nearest-whole-percent',
        labelSuffix: '% used',
        visualDirection: 'higher-is-more-pressure',
      },
      availableCapacity: {
        formula: 'max(0, locLimit - locBalance)',
        displayUnit: 'USD',
        displayRounding: 'nearest-whole-currency-unit',
        labelSuffix: 'open',
        visualDirection: 'higher-is-more-room',
      },
      neverShareOneUnlabeledScale: true,
    },
    algorithmicArt: {
      locUtilization: 'credit-aperture-and-pressure-ring',
      cashFlow: 'pulse-cadence-and-flow-direction',
      interestBurn: 'thermal-intensity-with-labeled-value',
      projectionConfidence: 'focus-and-edge-definition',
    },
    outputRules: {
      modeledValuesCarryAssumptionCue: true,
      blockedProjectionShowsReasonInsteadOfZero: true,
      comparisonsRequireCompatibleValidScenarios: true,
      visualParametersNeedTraceableInput: true,
    },
  },
  copy: {
    disclaimer: 'Educational tool. Not financial advice.',
    voice: ['plain-language', 'specific', 'calm', 'conditional', 'agency-preserving'],
    prohibitedClaims: [
      'guaranteed results',
      'universal savings percentages',
      'debt elimination promises',
      'lender approval implications',
      'fear or shame as motivation',
    ],
    labels: {
      modeled: 'Modeled',
      assumption: 'Assumption',
      projectionBlocked: 'Projection blocked',
    },
  },
  stories: [
    {
      id: 'baseline-comparison',
      purpose: 'Compare compatible valid payoff paths without presenting a recommendation.',
      requiredData: ['baseline', 'modeledPlan', 'assumptions', 'engineContractVersion'],
    },
    {
      id: 'first-money-loop-month',
      purpose: 'Explain deposit, expense, LOC recovery, interest, and principal movement in order.',
      requiredData: ['openingBalances', 'dailyEvents', 'closingBalances', 'assumptions', 'engineContractVersion'],
    },
    {
      id: 'blocked-plan',
      purpose: 'Show why a projection is withheld and which input or guardrail needs attention.',
      requiredData: ['failureReason', 'guardrails', 'assumptions', 'engineContractVersion'],
    },
  ],
  runtimeBoundary: {
    renderers: ['hyperframes', 'remotion'],
    forbiddenRuntimePackages: FORBIDDEN_RUNTIME_PACKAGES,
    forbiddenRuntimePackagePrefixes: FORBIDDEN_RUNTIME_PACKAGE_PREFIXES,
    protectedManifests: PROTECTED_MANIFESTS,
    protectedLockfiles: PROTECTED_LOCKFILES,
    allowedCalculatorIntegration: 'rendered-static-assets-and-versioned-json-only',
    outputDirectory: 'apps/web/public/media/generated',
  },
  antiPatterns: [
    'fear-or-shame-language',
    'guaranteed-or-universal-outcomes',
    'unlabeled-modeled-numbers',
    'utilization-capacity-scale-swaps',
    'decorative-data-without-model-meaning',
    'continuous-ambient-spinning',
    'web-dashboard-shrunk-into-video',
    'tiny-or-overflowing-captions',
    'color-only-status',
    'renderer-code-inside-calculator-runtime',
    'unseeded-randomness-or-wall-clock-animation',
  ],
});

export function getMediaFormat(name) {
  const format = visualIdentity.formats[name];
  if (!format) throw new Error(`Unknown media format: ${name}`);
  return format;
}

export function mediaFrameToSeconds(frame) {
  if (!Number.isInteger(frame)) throw new TypeError('Media timing requires an integer frame.');
  if (frame < 0) throw new RangeError('Media timing requires a non-negative frame.');
  return frame / MEDIA_FPS;
}

export function normalizeMediaSeed(seed) {
  if (typeof seed !== 'string') throw new TypeError('Media seed must be a string.');
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(seed)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export function sampleMediaRandom(seed, count) {
  if (!Number.isInteger(count)) throw new TypeError('Media randomness requires an integer sample count.');
  if (count < 0) throw new RangeError('Media randomness requires a non-negative sample count.');

  let state = normalizeMediaSeed(seed) || visualIdentity.motion.seededRandom.zeroStateFallback;
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    samples.push(state / 0x100000000);
  }
  return samples;
}

export function buildLocMediaChannels({ balance, limit }) {
  if (!Number.isFinite(limit) || limit <= 0) {
    return {
      isUsable: false,
      utilization: { ratio: null, percent: null, label: 'Setup needed' },
      availableCapacity: { amount: null, ratio: null, label: 'Enter LOC limit' },
    };
  }
  if (!Number.isFinite(balance) || balance < 0) {
    return {
      isUsable: false,
      utilization: { ratio: null, percent: null, label: 'Balance needed' },
      availableCapacity: { amount: null, ratio: null, label: 'Balance needed' },
    };
  }

  const utilizationRatio = balance / limit;
  const availableAmount = Math.max(0, limit - balance);
  const availableRatio = availableAmount / limit;
  const utilizationPercent = Math.round(utilizationRatio * 100);

  return {
    isUsable: true,
    utilization: {
      ratio: utilizationRatio,
      percent: utilizationPercent,
      label: `${utilizationPercent}% used`,
    },
    availableCapacity: {
      amount: availableAmount,
      ratio: availableRatio,
      label: `${wholeUsd.format(availableAmount)} open`,
    },
  };
}

function isForbiddenRuntimePackage(packageName) {
  if (typeof packageName !== 'string') return false;
  const normalized = packageName.toLowerCase();
  return FORBIDDEN_RUNTIME_PACKAGES.includes(normalized)
    || FORBIDDEN_RUNTIME_PACKAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function packageNameFromAlias(specification) {
  if (typeof specification !== 'string' || !specification.startsWith('npm:')) return null;
  const target = specification.slice(4);
  if (target.startsWith('@')) {
    const slash = target.indexOf('/');
    if (slash < 0) return target;
    const versionMarker = target.indexOf('@', slash);
    return versionMarker < 0 ? target : target.slice(0, versionMarker);
  }
  const versionMarker = target.indexOf('@');
  return versionMarker < 0 ? target : target.slice(0, versionMarker);
}

function packageNameFromLockPath(path) {
  if (typeof path !== 'string' || !path.includes('node_modules/')) return null;
  return path.split('node_modules/').at(-1) || null;
}

function packageNameFromRegistryResolution(resolution) {
  if (typeof resolution !== 'string') return null;
  let decoded;
  try {
    decoded = decodeURIComponent(resolution);
  } catch {
    decoded = resolution;
  }
  const match = decoded.match(/registry\.npmjs\.org\/(\@[^/]+\/[^/]+|[^/]+)\/-\//);
  return match?.[1] ?? null;
}

export function findMediaRuntimeLeaks({ manifest = {}, lockfile = {} }) {
  const leaks = [];
  const seen = new Set();
  const record = (location, packageName) => {
    if (!isForbiddenRuntimePackage(packageName)) return;
    const key = `${location}\0${packageName}`;
    if (seen.has(key)) return;
    seen.add(key);
    leaks.push({ location, packageName });
  };

  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [packageName, specification] of Object.entries(manifest[section] ?? {})) {
      record(`manifest.${section}.${packageName}`, packageName);
      const aliasName = packageNameFromAlias(specification);
      if (aliasName) record(`manifest.${section}.${packageName}:alias`, aliasName);
    }
  }

  for (const [path, packageRecord] of Object.entries(lockfile.packages ?? {})) {
    const pathPackage = packageNameFromLockPath(path);
    if (pathPackage) record(`lockfile.packages.${path}`, pathPackage);
    if (packageRecord && typeof packageRecord === 'object') {
      record(`lockfile.packages.${path}.name`, packageRecord.name);
      const aliasName = packageNameFromAlias(packageRecord.version);
      if (aliasName) record(`lockfile.packages.${path}.version:alias`, aliasName);
      const resolvedName = packageNameFromRegistryResolution(packageRecord.resolved);
      if (resolvedName) record(`lockfile.packages.${path}.resolved`, resolvedName);
    }
  }

  const visitLegacyDependencies = (dependencies, parent = 'lockfile.dependencies') => {
    for (const [packageName, packageRecord] of Object.entries(dependencies ?? {})) {
      record(`${parent}.${packageName}`, packageName);
      if (packageRecord && typeof packageRecord === 'object') {
        record(`${parent}.${packageName}.name`, packageRecord.name);
        const aliasName = packageNameFromAlias(packageRecord.version);
        if (aliasName) record(`${parent}.${packageName}.version:alias`, aliasName);
        const resolvedName = packageNameFromRegistryResolution(packageRecord.resolved);
        if (resolvedName) record(`${parent}.${packageName}.resolved`, resolvedName);
        visitLegacyDependencies(packageRecord.dependencies, `${parent}.${packageName}.dependencies`);
      }
    }
  };
  visitLegacyDependencies(lockfile.dependencies);

  return leaks.sort((left, right) =>
    left.packageName.localeCompare(right.packageName)
    || left.location.localeCompare(right.location));
}
