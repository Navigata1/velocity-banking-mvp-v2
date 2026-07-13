import type { DashboardLoopArtifact, DashboardTone } from './dashboard-model';

export const MONEY_LOOP_VISUAL_CONTRACT_VERSION = 1 as const;

export type MoneyLoopGeometry =
  | 'deposit-reservoir'
  | 'credit-aperture'
  | 'outflow-gate'
  | 'flow-core'
  | 'principal-shield';

export type MoneyLoopVisualState = 'stable' | 'caution' | 'blocked';
export type MoneyLoopSelectionMotion = 'spin-once' | 'restrained-turn' | 'settle-only';
export type MoneyLoopRenderMode = 'full' | 'efficient' | 'static';

export interface MoneyLoopVisualChannels {
  progress: number;
  energy: number;
  risk: number;
  emphasis: number;
}

export interface MoneyLoopVisualArtifact {
  id: DashboardLoopArtifact['id'];
  label: string;
  geometry: MoneyLoopGeometry;
  visualMeaning: string;
  state: MoneyLoopVisualState;
  selectionMotion: MoneyLoopSelectionMotion;
  channels: MoneyLoopVisualChannels;
  palette: {
    primary: string;
    emissive: string;
  };
  accessibleLabel: string;
}

export interface MoneyLoopVisualContract {
  version: typeof MONEY_LOOP_VISUAL_CONTRACT_VERSION;
  isComplete: boolean;
  fallbackReason: string | null;
  artifacts: MoneyLoopVisualArtifact[];
}

export interface MoneyLoopRenderCapabilities {
  supportsWebgl: boolean;
  contractComplete: boolean;
  prefersReducedMotion?: boolean;
  saveData?: boolean;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  viewportWidth?: number;
}

const artifactOrder: DashboardLoopArtifact['id'][] = [
  'income',
  'loc',
  'expenses',
  'cash-flow',
  'principal',
];

const grammar: Record<DashboardLoopArtifact['id'], {
  geometry: MoneyLoopGeometry;
  visualMeaning: string;
}> = {
  income: {
    geometry: 'deposit-reservoir',
    visualMeaning: 'Deposits gather before entering the Money Loop.',
  },
  loc: {
    geometry: 'credit-aperture',
    visualMeaning: 'The open aperture represents usable credit capacity, never income.',
  },
  expenses: {
    geometry: 'outflow-gate',
    visualMeaning: 'The gate represents planned outflow pressure on the loop.',
  },
  'cash-flow': {
    geometry: 'flow-core',
    visualMeaning: 'The core represents income minus expenses available to recover the LOC.',
  },
  principal: {
    geometry: 'principal-shield',
    visualMeaning: 'The shield represents principal targeted by the bounded starter chunk.',
  },
};

const palettes: Record<DashboardTone, MoneyLoopVisualArtifact['palette']> = {
  emerald: { primary: '#34d399', emissive: '#0d9488' },
  sky: { primary: '#38bdf8', emissive: '#0284c7' },
  amber: { primary: '#fbbf24', emissive: '#d97706' },
  rose: { primary: '#fb7185', emissive: '#e11d48' },
};

const riskByState: Record<MoneyLoopVisualState, number> = {
  stable: 0.1,
  caution: 0.65,
  blocked: 1,
};

const artifactIds = new Set<string>(artifactOrder);
const tones = new Set<string>(Object.keys(palettes));
const operationalStates = new Set<string>(['stable', 'caution', 'blocked']);

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRuntimeArtifact(value: unknown): value is DashboardLoopArtifact {
  if (!value || typeof value !== 'object') return false;
  const artifact = value as Partial<DashboardLoopArtifact>;

  return typeof artifact.id === 'string' &&
    artifactIds.has(artifact.id) &&
    isNonEmptyString(artifact.label) &&
    isNonEmptyString(artifact.value) &&
    isNonEmptyString(artifact.signal) &&
    isNonEmptyString(artifact.note) &&
    typeof artifact.tone === 'string' &&
    tones.has(artifact.tone) &&
    typeof artifact.operationalState === 'string' &&
    operationalStates.has(artifact.operationalState) &&
    typeof artifact.fillPercent === 'number' &&
    typeof artifact.pressurePercent === 'number';
}

function motionForState(state: MoneyLoopVisualState): MoneyLoopSelectionMotion {
  if (state === 'blocked') return 'settle-only';
  if (state === 'caution') return 'restrained-turn';
  return 'spin-once';
}

function buildVisualArtifact(artifact: DashboardLoopArtifact): MoneyLoopVisualArtifact {
  const progress = clampUnit(artifact.fillPercent / 100);
  const energy = clampUnit(artifact.pressurePercent / 100);
  const state = artifact.operationalState;
  const risk = riskByState[state];

  return {
    id: artifact.id,
    label: artifact.label,
    geometry: grammar[artifact.id].geometry,
    visualMeaning: grammar[artifact.id].visualMeaning,
    state,
    selectionMotion: motionForState(state),
    channels: {
      progress,
      energy,
      risk,
      emphasis: clampUnit((progress + energy + (1 - risk)) / 3),
    },
    palette: palettes[artifact.tone],
    accessibleLabel: `${artifact.label}: ${artifact.value}. ${artifact.signal}. ${artifact.note}`,
  };
}

export function buildMoneyLoopVisualContract(
  artifacts: DashboardLoopArtifact[]
): MoneyLoopVisualContract {
  const seenArtifactIds = new Set<DashboardLoopArtifact['id']>();
  let hasDuplicate = false;

  for (const artifact of artifacts) {
    if (!isRuntimeArtifact(artifact)) continue;
    if (seenArtifactIds.has(artifact.id)) hasDuplicate = true;
    else seenArtifactIds.add(artifact.id);
  }

  const orderedArtifacts = selectSafeMoneyLoopDomArtifacts(artifacts);
  const isComplete =
    !hasDuplicate &&
    orderedArtifacts.length === artifactOrder.length &&
    artifacts.length === artifactOrder.length &&
    artifacts.every(isRuntimeArtifact);

  return {
    version: MONEY_LOOP_VISUAL_CONTRACT_VERSION,
    isComplete,
    fallbackReason: isComplete ? null : 'The complete five-artifact Money Loop model is required for the 3D stage.',
    artifacts: isComplete ? orderedArtifacts.map(buildVisualArtifact) : [],
  };
}

export function selectSafeMoneyLoopDomArtifacts(
  artifacts: DashboardLoopArtifact[]
): DashboardLoopArtifact[] {
  const artifactsById = new Map<DashboardLoopArtifact['id'], DashboardLoopArtifact>();

  for (const artifact of artifacts) {
    if (isRuntimeArtifact(artifact) && !artifactsById.has(artifact.id)) {
      artifactsById.set(artifact.id, artifact);
    }
  }

  return artifactOrder
    .map((id) => artifactsById.get(id))
    .filter((artifact): artifact is DashboardLoopArtifact => Boolean(artifact));
}

export function selectMoneyLoopRenderMode(
  capabilities: MoneyLoopRenderCapabilities
): MoneyLoopRenderMode {
  if (!capabilities.supportsWebgl || !capabilities.contractComplete || capabilities.prefersReducedMotion || capabilities.saveData) {
    return 'static';
  }

  const memoryIsConstrained =
    capabilities.deviceMemoryGb === undefined ||
    !Number.isFinite(capabilities.deviceMemoryGb) ||
    capabilities.deviceMemoryGb < 4;
  const cpuIsConstrained =
    capabilities.hardwareConcurrency === undefined ||
    !Number.isFinite(capabilities.hardwareConcurrency) ||
    capabilities.hardwareConcurrency < 4;
  const viewportIsUnknownOrNarrow =
    capabilities.viewportWidth === undefined ||
    !Number.isFinite(capabilities.viewportWidth) ||
    capabilities.viewportWidth < 640;

  return memoryIsConstrained || cpuIsConstrained || viewportIsUnknownOrNarrow ? 'efficient' : 'full';
}
