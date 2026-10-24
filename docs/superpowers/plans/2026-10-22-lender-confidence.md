# Lender Confidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for independent disjoint tasks, with parent implementation of the shared critical path. Steps use checkbox syntax for tracking.

**Goal:** Make normal forecast confidence truthful and preserve supplied lender terms through an explicit versioned scenario path.

**Architecture:** Separate lossless input decoding, provenance assessment and actual model support. Extend the canonical Portfolio by an explicit version3 document and copy-on-write active storage; wire results through the normal model/presenter boundaries without changing no-profile monthly arithmetic.

**Tech Stack:** Existing TypeScript, React/Zustand, shared financial/persistence packages, Node assertion scripts and Playwright. No new dependencies.

**Spec:** docs/superpowers/specs/2026-10-22-lender-confidence-design.md

## Global Constraints

- Preserve all old saved input bytes during adoption; no automatic destructive migration.
- No profile can self-declare modeled coverage or lender approval.
- Preserve original financial reference cases, motion/assets,700ms/300ms canvas limits and20-minute CI caps.
- No production/backend/schema/data/access/DNS/settings mutation, paid GPU, merge or promotion.
- Full R3 numerical/calendar and all other release requirements remain open.

## Review Focus

- Unknown nested keys or invalid supplied terms cannot disappear into valid defaults.
- Explicit zero costs differ from missing costs; no-op documents remain unchanged.
- A present invalid active source cannot fall back and overwrite archived sources.
- Terms-only changes must participate in recovery fingerprints and frozen queues.
- Educational math and actual lender enforcement must not share a misleading ready flag.

## Task1: Shared Lossless Terms And Readiness

Files: packages/financial-engine/src/index.ts;
apps/web/scripts/lender-terms-tests.cjs; existing regression/reference loaders.

- [x] Write actual-source RED cases for false readiness, strict partial/zero/full
  decoding, unknown keys, invalid numbers/enums and independent nested clones.
- [x] Run RED and retain assertion failures distinct from loader/setup errors.
- [x] Implement decodeLenderTerms and assessment3.0 with inputComplete and actual
  unmodeledFields; keep projectionReady false for unmodeled populated profiles.
- [x] Run focused contracts and full existing financial/reference tests. Preserve
  all prior cases, updating obsolete contract-version/readiness assertions only.
- [x] Obtain independent review of the changed contract and record evidence.
  Hubble closed four shared/web findings and17 final edge probes; the separate
  native physical closure passed45 integration checks. Private review logs retain
  actual source hashes and the originally failing reproductions.

## Task2: Explicit Portfolio Document3

Files: packages/financial-engine/src/portfolio-book.ts; focused codec tests.

- [x] RED: old documents reject extensions; document3 round-trips terms, no aliases,
  absent/zero/partial sources, malformed values and unknown nested keys.
- [x] Extend MoneyLoopLOC and strict book codec. Add explicit document3 encoding
  while keeping old no-profile encodings version2 and old APR conversion exact.
- [x] Run the codec, Portfolio and portability gates; freeze approved interfaces.
  Final frozen-source web test and built Portfolio/portability commands pass;
  explicit document3 adoption, failed writes and retained archives are covered.

## Task3: Active Copy-On-Write Storage

Files: apps/web/src/stores/portfolio-persistence.ts and portfolio-store.ts;
apps/mobile/lib/mobile-portfolio-storage.ts and mobile-portfolio-session.ts.

- [x] RED old-source byte equality, active3 priority, corrupt-active write lock,
  failed saves, owner/revision races and nested capture immutability.
- [x] Implement active3 adoption without bulk rewriting v1/v2. No profile editing
  can be enabled until its complete surface read/write contract is supported.
- [x] Run storage/native contracts and review failed-save/recovery behavior.
  Parent full native contracts and independent physical integration are green.

## Task4: Snapshot And Recovery Parity

Files: web account-sync-source/local-demo-snapshot; native snapshot recovery,
Portfolio transfer/fingerprint and queue capture boundaries.

- [x] RED terms round-trip through existing logical keys, terms-only stale-review
  detection, immutable queued bodies and rejection without destination writes.
- [x] Implement lossless current-document handling; do not rebuild pending queues.
- [x] Run owner/CAS/outbox/recovery tests with all old fixtures retained.

## Task5: Normal Projections And User Surface

Files: shared index/portfolio entry points, web engine/model/presenter boundaries,
Portfolio editor/Simulator/Dashboard, corresponding native Portfolio surfaces.

- [x] RED supplied terms are not silently dropped or promoted to accepted lender
  forecasts; no-profile educational numerical traces match the baseline.
- [x] Wire explicit forecast basis and review reasons through normal results and
  coaching. Record actual model coverage; never fabricate support flags.
- [x] Add compact optional term editing and provenance/status controls only after
  Tasks2-4 pass. Explicitly distinguish separate legacy demo scenario ownership.
- [x] Browser RED/GREEN edit/reload/import/review/remove at280/375/1440; native
  equivalent tests and exports. R3-T1 remains in progress until all normal paths
  required by the spec are integrated. R3-G1 stays pending numerical/calendar work.

## Task6: Review, Standing Gates And Verified Push

- [x] Independent skeptical review, focused tests and unchanged no-profile math.
  Three complete no-profile ledger hashes and original reference cases retained;
  independent review closed its reported shared/web/native issues, not full R3.
- [x] Full serialized standing web/media/native/Worker/report gates and source
  boundaries. Retain all failures; never rerun sealed prior collectors.
  Full attempt1 stopped at stale generated Remotion provenance. The existing
  generator, strict contract3 schema, obsolete-version rejection test and exact
  educational-story hash corrected it. Full attempt2 reran all29 stages;445
  pinned sources held.223 media contracts/27 fresh stills,183 web layouts and97
  native workflows plus one navigation assertion pass. Numerical R3 remains open.
- [x] Update structured mission state and append journal; regenerate/test HTML.
  State37 and the generated report are explicitly pre-push. Renderer contracts,
  static report tests and diff checks pass. Later sealed shipping proof supersedes
  their pending remote status without a metadata-only push cycle.
- [ ] Push scoped commits to the existing branch/draftPR256 once locally verified.
- [ ] Both complete exact-head CI events, known automatic READY/hosted/IAB proof,
  immutable receipt and seal. No metadata-only push loop or production promotion.
