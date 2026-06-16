export const BACKEND_HANDOFF_TARGETS = [
  'supabase-postgres-auth-rls',
  'cloudflare-workers-d1-durable-objects',
] as const;

export type BackendHandoffTarget = typeof BACKEND_HANDOFF_TARGETS[number];

export interface BackendReadinessOption {
  id: BackendHandoffTarget;
  label: string;
  status: 'Candidate';
  bestFit: string;
  strengths: string[];
  openGates: string[];
  nextGate: string;
}

export const BACKEND_STATUS_SUMMARY = {
  mode: 'Local demo mode',
  headline: 'No production backend is connected.',
  detail: 'Data is stored in this browser for the demo until auth, ownership rules, and snapshot migration are chosen.',
  nextGate: 'Choose one persistence lane, then add auth/RLS or equivalent access rules before storing user-owned financial data.',
} as const;

export const BACKEND_READINESS_OPTIONS: BackendReadinessOption[] = [
  {
    id: 'supabase-postgres-auth-rls',
    label: 'Supabase Postgres + Auth + RLS',
    status: 'Candidate',
    bestFit: 'Relational financial snapshots, user accounts, row-level ownership, and SQL reporting.',
    strengths: ['Postgres schema clarity', 'Auth and RLS path', 'SQL-friendly run history'],
    openGates: ['Project keys', 'RLS policy design', 'Snapshot migration plan'],
    nextGate: 'Draft the financial snapshot schema and RLS policies before wiring the client.',
  },
  {
    id: 'cloudflare-workers-d1-durable-objects',
    label: 'Cloudflare Workers + D1/Durable Objects',
    status: 'Candidate',
    bestFit: 'Edge-hosted APIs, lightweight persistence, background jobs, and future interactive calculation sessions.',
    strengths: ['Edge API control', 'D1 for durable records', 'Durable Objects for session state'],
    openGates: ['Auth provider choice', 'D1 schema limits', 'Local-to-edge migration path'],
    nextGate: 'Prototype a server-owned snapshot API before moving any browser storage into D1.',
  },
];
