# Common-Month Release Preparation

Preparation only. None of these helpers has been executed against hosted services,
GitHub mutations, public Desktop paths, push, or publication during this subtask.
Only bounded helper tests and syntax checks are authorized here. Reviewer approval
and a new substantive committed feature head are prerequisites for later execution.

## Files

- `run-hosted.cjs`: nine sequential suites, unchanged original eight plus commonMonth.
- `postflight.mjs`: exact-head push AND PR CI, local receipt, fresh hosted envelope,
  raw authenticated Vercel metadata, manual UI proof, prior Desktop baseline.
- `publish-desktop.mjs`: separate opt-in, fully staged publication with recovery.
- `shipping-guards.mjs`: shared validators, source boundaries, atomic journal.
- `shipping-guards.test.mjs`: bounded synthetic filesystem/metadata counterexamples.
- `release-preparation.md`: this handoff, not a verification receipt.

Run from the repository root. The new helper cache is this `release/` directory,
not its common-month parent or the predecessor mobile-vitals directory.

## Inputs Created By The Parent

Commit the substantive feature and real local evidence before any hosted run.
Required local receipt:
`ops/mission/evidence/portfolio-common-month-2026-10-21/artifact-receipt.json`.
Do not create placeholder logs, hashes, screenshots, adjudications, or receipts.

Its required shape (types/field descriptions, not substitute proof):

```typescript
{
  verifiedAt: string;
  baseline: "1aec5bf7be3d0f3c26079141245e4c7291fd8778";
  priorReceipt: string; // exact prior mobile-vitals postflight receipt URL
  productionReady: false;
  stage: string;
  allowedSourceChanges: string[]; // exactly the 5 modified +7 new below
  sources: Record<string, string>; // all 292 normalized LF SHA-256 source pins
  web: { regressions: 348; dashboardCases: 18; hostedCasesRequired: 109 };
  media: { contracts: 145; freshStills: 27 };
  native: { browserExecutions: 70; commonMonthCases: 21 };
  commonMonth: {
    coreContracts: number; // explicit current count, now 31; no code default
    webCases: 21; nativeCases: 21; oracleControls: 4;
    widths: [1440, 375, 280];
    reference: {
      passed: number; // explicit adjudicated count, now 23247; no code default
      failed: 0; adjudicated: true;
      logFile: string; // receipt-relative copied FRESH reference log
      reportFile: string; // receipt-relative independent adjudication report
    };
  };
  models: unknown[]; posters: unknown[]; videos: unknown[];
  // All three arrays must equal prior.local snapshots, retaining existing schemas.
  files: Record<string, { bytes: number; sha256: string }>;
  // Hash actual raw bytes, including logFile/reportFile, excluding this receipt.
  limitations: string[];
}
```

The reference log's final JSON must have zero failures, the receipt's passed count,
seed20261021, and testSourceHash/sourceHashes matching the actual runner and six
engine modules. Local raw-byte binding and Linux committed-byte CI binding are
separate because Windows line endings can differ. Both full CI logs must contain
the actual `${coreContracts} common-month contracts passed.` output, not a report
or a hardcoded final count. No reference lane is waived.

Parent-reported independent adjudication: 23247 passed/0 failed, draws253,
finalState3883181796, testSourceHash
`d6655109cfb91f96f832cc720f7d0a71b38e57857e7bc556b81a6c77d6e6e9ec`.
The final JSON of `../reference-followup-full.log` was read, not rerun here.
The five corrected cutoff expectations were independently BigInt adjudicated
(447/727/512 units); retain the report. The parent's fresh full run after the
31st contract/final capture changes remains necessary. None of these values is
installed as a default or used to relabel old failures as current proof.

## Source Boundary

Derive the inventory from prior.local.sources285 plus the seven existing new
executable files. The actual union was read and counted:292. This is inventory
verification, not a claim that the uncommitted feature has passed final pin checks.
Later helpers compare all292 current and committed hashes, check the exact git
name-status boundary, and require clean HEAD distinct from/descended from baseline.

Modified:

- `apps/mobile/components/mobile-routes/portfolio-route.tsx`
- `apps/mobile/scripts/smoke-accessibility-rendered.cjs`
- `apps/web/package.json` (only test and smoke:portfolio:built script changes)
- `apps/web/src/app/portfolio/PortfolioPlanSection.tsx`
- `packages/financial-engine/package.json` (only new typed subpath export)

New:

- `apps/mobile/components/portfolio/portfolio-common-month.tsx`
- `apps/web/scripts/portfolio-common-month-reference-tests.cjs`
- `apps/web/scripts/portfolio-common-month-tests.cjs`
- `apps/web/scripts/smoke-portfolio-common-month.cjs`
- `apps/web/src/app/portfolio/PortfolioCommonMonth.tsx`
- `packages/financial-engine/src/common-month.ts`
- `packages/financial-engine/src/portfolio-common-month.ts`

Old engine, media, web public, workflows, SQL and all other native code remain
protected. Documentation/evidence updates outside executable roots are not counted
as executable changes. No dependency changes or report-renderer changes allowed.

## Hosted And Deployment Inputs

Place `deployment-final.json` here using the predecessor schema, with fresh raw
authenticated Vercel deployment metadata plus get_team verification, request,
project/team IDs, READY and readyState READY, target null, matching head/URL/repo
and branch. Summary fields cannot replace raw metadata. Do not deploy/promote here.

For later execution, set `INTERESTSHIELD_EXPECTED_HEAD` to the new full SHA and
`INTERESTSHIELD_VERIFIED_PREVIEW` to its exact preview origin. `run-hosted.cjs`
adds `COMMON_MONTH_SMOKE_ORIGIN`; all original eight commands remain unchanged.
The ninth captures these actual newly generated files:

- `apps/web/test-results/portfolio-common-month/verification.json`
- `apps/web/test-results/portfolio-common-month/web-cash-versus-wealth-375.png`

Existing declared outputs are moved aside before each command; missing fresh
outputs fail. Every suite binds invocation ID, script bytes, command/environment,
timestamps, zero exit, log/captured/live hashes. The envelope also binds runner,
guard, local receipt and deployment bytes. Select its printed invocation UUID
explicitly using `INTERESTSHIELD_HOSTED_RUN_ID` for postflight/publication.
Editing helpers or source after capture invalidates the invocation.

Postflight requires both complete successful latest exact-head CI events, not a
subset workflow or a report-only push:348 regressions,145 media/27 stills, full
native contracts and70 actual browser executions (35 accessibility+12 Portfolio+
2 input+21 common-month),21 web common-month cases, andSQL63 twice per event.
PR256 must remain draft/open at that head. Old8 suites/88 workflows remain; total
is9 suites/109 workflows. HTTP/rendered routes are additional, not counted in109.

## Actual IAB Proof

Create `browser-proof.json`, `Hosted-Mobile-Vitals.jpg`, and
`Hosted-Common-Month.jpg` here only after real current-preview UI observations.
No CUA hidden localStorage/app-state reads or writes. Import the synthetic
cash-versus-wealth fixture THROUGH UI, then observe rendered text/DOM, logs and
screenshots. Read-only DOM-backed evaluation is sufficient. Manual proof is
bounded corroboration, not automated stored-byte or global accessibility proof.

```typescript
{
  headSha: string; invocationId: string; capturedAt: string;
  house: {
    url: string; domain: "house"; vitalsCount: 4;
    logs: []; interactionVerified: true;
    before: { cashFlow: "$3,500"; interest: "Est. $51.50/day" };
    after: { cashFlow: "$3,600"; interest: "Est. $51.50/day" };
    restored: unknown; // exactly before, including any additional observed fields
  };
  commonMonth: {
    url: string; // preview + /portfolio
    fixture: "cash-versus-wealth"; width: 375;
    logs: []; interactionVerified: true;
    storageProof: {
      source: "invocation-bound-browser-fixtures";
      runId: string; // same invocationId
      suite: "commonMonth"; // actual runner/envelope key
      storagePreserved: true;
    };
    observations: Array<{
      month: number; // ordered0,3,6,600, then restore3 separately
      snowball: {cash: string; debt: string; loc: string; net: string};
      velocity: {cash: string; debt: string; loc: string; net: string};
    }>;
    restored: unknown; // exactly observations[1], the restored month3 figures
  };
}
```

Use the synthetic fixture from the smoke script: income100/expenses0/extra20/
chunk10, LOC40/limit1000/APR0, debts120 and20/APR0/min10. Expected visible figures:

| Month | Snowball Cash / Debt / LOC / Net | Velocity Cash / Debt / LOC / Net |
|---|---|---|
| 0 | $0.00 / $140.00 / $40.00 / -$180.00 | same |
| 3 | $200.00 / $80.00 / $0.00 / $120.00 | $120.00 / $0.00 / $0.00 / $120.00 |
| 6 | $420.00 / $0.00 / $0.00 / $420.00 | same |
| 600 | $59,820.00 / $0.00 / $0.00 / $59,820.00 | same |

The storageProof pointer is NOT a manual IAB assertion about hidden state.
Postflight independently verifies the referenced fresh commonMonth artifact,
all21 `storagePreserved:true` receipts,7 fixtures at1440/375/280,15 visible metrics
per fixture and four actual DOM counterexamples with restoration. Three value
controls additionally require original text-node identity. Old Dashboard ten
controls and fallback-font checks remain. No bookBefore/bookAfter export required.

## Later Publication And Recovery

Postflight defaults to local output plus read-only GitHub access. Only the explicit
`INTERESTSHIELD_ALLOW_RECEIPT_POST=1` opt-in can post its comment; identical
head/invocation comments are reused. A posted receipt is required for Desktop.
No push/merge/deploy/promotion command exists in these helpers.

Desktop publication additionally requires `INTERESTSHIELD_ALLOW_DESKTOP_PUBLICATION=1`.
The source mission state is not edited. Its report is a staged projection rendered
by the unchanged renderer and statically checked by the existing verifier.
No local-file runtime/sealed report claim. Projected R2 remains bounded, not done.

Prior evidence is `.superpowers/sdd/2026-10-21-mobile-vitals/postflight.json` and
`Mobile-Vitals-1aec5bf-File-Manifest.json`:322 files, committed324-entry journal,
48 recoverable backups. The independently recorded baseline-v2 checker has
4134 passed/0 failed checks. Fresh file/journal/backup validation is required
again, not inferred from that old report. Only the generated predecessor manifest
may omit its pre-publication expected hash; its after hash is independently checked.

New names use `Common-Month-<sha7>-Evidence`, `-Verification.json/.md` and
`-File-Manifest.json`. All evidence, original assets and report payloads are staged
and hashed before any public write; source snapshots retain full paths to avoid
the two package.json files colliding. Prior reports/README are copied into evidence.
Manifest is written before the standalone public Desktop report, which is last.
Targets are backed up; journal replacement is atomic. Incomplete runs restore old
bytes and retain new artifacts recoverably. Retry rolls back before fresh gates;
committed retry verifies target hashes and reuses the published receipt. User edits
are never overwritten during recovery. Keep staging/journal/backups until reviewed.

## Verification And Remaining Risks

Verified in this subtask:102 bounded helper assertions passed; all five executable
helpers passed `node --check`. New guards were first observed RED before their
implementation, then GREEN. This does not certify the parent feature or shipping.

Bounded command: `node .superpowers/sdd/2026-10-21-common-month/release/shipping-guards.test.mjs`.
Add `--keep-fixtures` only to retain synthetic fault fixtures under this directory.
Syntax-check each executable helper with `node --check`; do not run its main flow
as a syntax test. No browser, build, full regression or reference job ran here.

These are filesystem fault probes, not an OS power-loss/concurrent-writer guarantee.
GitHub/Vercel schemas and job names remain integration dependencies. Receipt posting
deduplicates sequential retries but is not a cross-process transaction. The parent
must supply fresh final-source local logs/report, full exact-head CI, READY preview,
actual IAB evidence and review before execution. Final art, full R2/shared scenarios,
lender/calendar/provider/backend/security/device/release/production gates stay open.
No report-only push cycle: incorporate results in the next substantive checkpoint.

Eight earlier RED/diagnostic `shipping-test-*` directories remain under release/:
the native cleanup command was blocked by tool policy. They are synthetic fixtures,
not shipping evidence. Successful final test runs remove their own fixtures.
