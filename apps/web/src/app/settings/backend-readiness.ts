export const BACKEND_HANDOFF_TARGETS = [
  'supabase-postgres-auth-rls',
] as const;

export type BackendHandoffTarget = typeof BACKEND_HANDOFF_TARGETS[number];
export type BackendReadinessOptionId = BackendHandoffTarget | 'cloudflare-worker-r2-reports';

export interface BackendReadinessOption {
  id: BackendReadinessOptionId;
  label: string;
  status: 'Candidate';
  lane: 'Recommended first persistence lane' | 'Secondary edge/API lane';
  bestFit: string;
  chooseWhen: string;
  strengths: string[];
  openGates: string[];
  nextGate: string;
}

export interface BackendDecisionGate {
  id: string;
  label: string;
  requiredBefore: string;
  whyItMatters: string;
}

export const BACKEND_STATUS_SUMMARY = {
  mode: 'Local demo mode',
  headline: 'No production backend is connected.',
  detail: 'Data is stored in this browser for the demo until auth, ownership rules, and snapshot migration are chosen.',
  nextGate: 'Choose one persistence lane, then add auth/RLS or equivalent access rules before storing user-owned financial data.',
} as const;

export const BACKEND_DECISION_GATES: BackendDecisionGate[] = [
  {
    id: 'owned-identity',
    label: 'Owned identity',
    requiredBefore: 'Any cross-device save',
    whyItMatters: 'Every profile, assumption snapshot, simulation run, learning record, export, and audit event needs a verified owner id.',
  },
  {
    id: 'access-policy',
    label: 'Access policy',
    requiredBefore: 'Financial data writes',
    whyItMatters: 'User-owned financial records must be private by default through RLS or equivalent server-side rules.',
  },
  {
    id: 'snapshot-migration',
    label: 'Snapshot migration',
    requiredBefore: 'Moving browser data',
    whyItMatters: 'Local demo storage should migrate through the versioned handoff snapshot, not ad hoc key copying.',
  },
  {
    id: 'deletion-path',
    label: 'Deletion path',
    requiredBefore: 'Real accounts',
    whyItMatters: 'Account deletion must remove snapshots, runs, preferences, progress, and export records owned by that user.',
  },
];

export const BACKEND_READINESS_OPTIONS: BackendReadinessOption[] = [
  {
    id: 'supabase-postgres-auth-rls',
    label: 'Supabase Postgres + Auth + RLS',
    status: 'Candidate',
    lane: 'Recommended first persistence lane',
    bestFit: 'Relational financial snapshots, user accounts, export metadata, audit events, row-level ownership, and SQL reporting.',
    chooseWhen: 'Use first when InterestShield starts saving user-owned assumptions, plans, simulation runs, learning progress, exports, and audit history across devices.',
    strengths: ['Postgres schema clarity', 'Auth and RLS path', 'SQL-friendly run and audit history'],
    openGates: ['Project keys', 'RLS policy design', 'Snapshot migration and deletion plan'],
    nextGate: 'Review the six-collection schema and RLS policies before wiring the client.',
  },
  {
    id: 'cloudflare-worker-r2-reports',
    label: 'Cloudflare Worker + private R2 reports',
    status: 'Candidate',
    lane: 'Secondary edge/API lane',
    bestFit: 'User-requested HTML/JSON report objects at the edge while Supabase remains the owner-scoped system of record.',
    chooseWhen: 'Use only for explicit report export, download, and deletion after the Worker verifies the Supabase session and namespaces the private R2 key by owner.',
    strengths: ['Worker API control', 'Private R2 report objects', 'No duplicate financial database'],
    openGates: ['Dedicated R2 buckets', 'Production origins and Supabase vars', 'R2 retention lifecycle and deployed smoke'],
    nextGate: 'Create dedicated private R2 buckets, replace placeholder vars, deploy the dry-run-verified Worker, and smoke owner isolation.',
  },
];
