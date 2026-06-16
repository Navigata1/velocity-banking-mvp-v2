import { BACKEND_HANDOFF_TARGETS, type BackendHandoffTarget } from './backend-readiness';
import { LOCAL_DEMO_STORAGE_KEYS } from './local-data-reset';

export const BACKEND_MIGRATION_CONTRACT_VERSION = 1;

type LocalDemoStorageKey = typeof LOCAL_DEMO_STORAGE_KEYS[number];

export interface BackendMigrationCollection {
  id: string;
  label: string;
  sourceKeys: LocalDemoStorageKey[];
  requiredFields: string[];
  ownerRule: string;
  providerShape: Record<BackendHandoffTarget, string>;
}

export interface BackendMigrationContract {
  version: typeof BACKEND_MIGRATION_CONTRACT_VERSION;
  mode: 'contract-only';
  targets: readonly BackendHandoffTarget[];
  localStorageKeys: readonly LocalDemoStorageKey[];
  collections: readonly BackendMigrationCollection[];
  gates: readonly string[];
}

export const BACKEND_MIGRATION_GATES = [
  'Authenticated user identity exists before saving financial data.',
  'Every persisted financial record has an owner id and owner-only read/write policy.',
  'Local demo snapshot import validates known InterestShield keys before migration.',
  'Simulation run history stores assumptions, result summary, and contract version together.',
  'Account deletion can remove user-owned snapshots, runs, preferences, and learning progress.',
] as const;

export const BACKEND_MIGRATION_COLLECTIONS: readonly BackendMigrationCollection[] = [
  {
    id: 'user_profiles',
    label: 'User profiles',
    sourceKeys: ['interestshield-app-v1', 'interestshield-preferences-v1', 'interestshield-theme'],
    requiredFields: ['id', 'owner_id', 'display_name', 'created_at', 'updated_at'],
    ownerRule: 'One profile row per authenticated owner; demo login data never becomes a shared account.',
    providerShape: {
      'supabase-postgres-auth-rls': 'profiles table keyed by auth.users.id with RLS owner policies.',
      'cloudflare-workers-d1-durable-objects': 'D1 profiles table or KV-like account metadata behind an authenticated Worker.',
    },
  },
  {
    id: 'financial_snapshots',
    label: 'Financial snapshots',
    sourceKeys: ['velocity-bank-storage', 'interestshield-portfolio-v1'],
    requiredFields: ['id', 'owner_id', 'snapshot_version', 'assumptions_json', 'created_at', 'updated_at'],
    ownerRule: 'Snapshots are private to the owner and store assumptions separately from calculated outputs.',
    providerShape: {
      'supabase-postgres-auth-rls': 'financial_snapshots table with JSONB assumptions and owner_id RLS.',
      'cloudflare-workers-d1-durable-objects': 'D1 snapshots table with JSON assumptions written through a Worker API.',
    },
  },
  {
    id: 'simulation_runs',
    label: 'Simulation runs',
    sourceKeys: ['velocity-bank-storage', 'interestshield-portfolio-v1'],
    requiredFields: ['id', 'owner_id', 'snapshot_id', 'engine_version', 'result_summary_json', 'created_at'],
    ownerRule: 'Runs belong to the same owner as the source snapshot and are append-only unless the owner deletes data.',
    providerShape: {
      'supabase-postgres-auth-rls': 'simulation_runs table joined to financial_snapshots through owner-scoped foreign keys.',
      'cloudflare-workers-d1-durable-objects': 'D1 simulation_runs table; Durable Objects may coordinate long-running sessions later.',
    },
  },
  {
    id: 'learning_progress',
    label: 'Learning progress',
    sourceKeys: ['interestshield-learn-progress'],
    requiredFields: ['id', 'owner_id', 'completed_lessons_json', 'updated_at'],
    ownerRule: 'Learning progress is private owner state and can be deleted independently of demo content.',
    providerShape: {
      'supabase-postgres-auth-rls': 'learning_progress table keyed by owner_id with owner-only RLS.',
      'cloudflare-workers-d1-durable-objects': 'D1 learning_progress table updated through an authenticated Worker.',
    },
  },
];

export function buildBackendMigrationContract(): BackendMigrationContract {
  return {
    version: BACKEND_MIGRATION_CONTRACT_VERSION,
    mode: 'contract-only',
    targets: BACKEND_HANDOFF_TARGETS,
    localStorageKeys: LOCAL_DEMO_STORAGE_KEYS,
    collections: BACKEND_MIGRATION_COLLECTIONS,
    gates: BACKEND_MIGRATION_GATES,
  };
}

export function validateBackendMigrationContract(contract: Partial<BackendMigrationContract> | null | undefined):
  | { ok: true }
  | { ok: false; error: string } {
  if (!contract || typeof contract !== 'object') {
    return { ok: false, error: 'Backend migration contract is missing.' };
  }

  if (contract.version !== BACKEND_MIGRATION_CONTRACT_VERSION) {
    return { ok: false, error: 'Unsupported backend migration contract version.' };
  }

  if (contract.mode !== 'contract-only') {
    return { ok: false, error: 'Backend migration contract must be contract-only before live backend wiring.' };
  }

  if (!Array.isArray(contract.targets) || contract.targets.join('|') !== BACKEND_HANDOFF_TARGETS.join('|')) {
    return { ok: false, error: 'Backend migration contract targets do not match configured handoff targets.' };
  }

  if (!Array.isArray(contract.localStorageKeys) || contract.localStorageKeys.join('|') !== LOCAL_DEMO_STORAGE_KEYS.join('|')) {
    return { ok: false, error: 'Backend migration contract local storage keys do not match the demo handoff keys.' };
  }

  if (!Array.isArray(contract.collections) || contract.collections.length < 4) {
    return { ok: false, error: 'Backend migration contract collections are incomplete.' };
  }

  for (const collection of contract.collections) {
    if (!collection || typeof collection !== 'object' || Array.isArray(collection) || typeof collection.id !== 'string') {
      return { ok: false, error: 'Backend migration contract collection is invalid.' };
    }

    if (!Array.isArray(collection.requiredFields) || !collection.requiredFields.includes('owner_id')) {
      return { ok: false, error: `Backend collection ${collection.id} is missing owner_id.` };
    }

    if (!collection.ownerRule?.toLowerCase().includes('owner')) {
      return { ok: false, error: `Backend collection ${collection.id} is missing an owner rule.` };
    }

    for (const target of BACKEND_HANDOFF_TARGETS) {
      if (!collection.providerShape?.[target]) {
        return { ok: false, error: `Backend collection ${collection.id} is missing ${target} shape.` };
      }
    }
  }

  if (!Array.isArray(contract.gates) || !contract.gates.some((gate) => gate.includes('owner-only'))) {
    return { ok: false, error: 'Backend migration contract must include an owner-only access gate.' };
  }

  return { ok: true };
}
