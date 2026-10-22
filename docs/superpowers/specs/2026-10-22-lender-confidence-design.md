# Lender Terms And Forecast Basis

## Purpose

Restore truthful normal forecasts without changing the original dashboard identity.
The current lender contract reports projectionReady for populated fees, variable
rates, periods and minimums, although normal calculators never consume it. This
confuses input completeness with numerical support. Normal app paths must carry
an explicit forecast basis and must not silently discard supplied terms.

The user has approved autonomous recommended execution without repeated queries.
This is an architectural implementation, not a new broad visual redesign.

## Evidence And Scope

- Baseline: d03a7c1a5a9753a6e8981f6a21c7756b590031ab, receipt6339608765.
- packages/financial-engine/src/index.ts:552 marks all populated terms ready.
- Normal calculations do not invoke that contract; only tests and media do.
- Portfolio documents reject unknown LOC fields. Legacy normalizers can strip
  them. Extending a whitelist without returning the new data is not sufficient.
- Existing source/queue/owner/revision protections must remain intact.

CFPB describes fees, draw restrictions, minimum payments and repayment changes
as contract-dependent. No universal HELOC minimum or fee schedule is inferred:
https://www.consumerfinance.gov/ask-cfpb/what-is-a-home-equity-line-of-credit-heloc-en-107/

## Domain

CONTEXT.md owns the definitions of input completeness, provenance, model support,
forecast basis and readiness. Document-sourced is a provenance assertion, not app
verification of an agreement. Confidence never proves modeled enforcement.

## Contracts

1. Preserve the existing optional LenderTermsInput fields and per-field sources.
   Add decodeLenderTerms(value: unknown): LenderTermsInput as a strict, lossless
   decoder. Keep missing fields missing and explicit zeroes present. Reject
   unknown keys, invalid types, nonfinite/negative amounts and unsupported enums.
   Clone nested minimumPayment and sources. Do not use the normalizing assessment
   builder as a persistence decoder.
2. Advance the assessment contract to3.0.0. Add inputComplete and unmodeledFields.
   projectionReady requires complete inputs AND modeled coverage. Current monthly
   engines do not enforce the seven lender fields, so field presence alone never
   makes a lender-specific projection ready. Keep confidence and missing/estimated
   field diagnostics separate. No caller can declare coverage by supplying a flag.
3. Permit optional loc.lenderTerms in a PortfolioBook. Documents1/2 retain their
   existing meaning and reject lender extensions. Explicit document3 uses decimal
   APR and preserves the optional terms. Encoding old books remains version2.
   Encoding term-bearing books uses version3. Never silently downgrade terms.
4. Add forecast-basis assessment to normal projection entry points. With no
   supplied profile, retain existing monthly educational arithmetic and explicitly
   label it as such. With supplied incomplete or unmodeled terms, do not publish
   lender-aware payoff dates, savings or coaching as accepted results. Retain an
   actionable review reason. Do not invent zero fees, future rates or account age.
5. Model support is evidence, not a caller-controlled claim. Real fee, minimum,
   draw/repayment and dated-posting enforcement remains R3 work. It is NOT replaced
   by disclosure or a permanent always-blocked lender mode. R3-G1 cannot close
   until the numerical/calendar requirements are actually implemented and tested.

## Adoption And Ownership

- First expose editable profiles in the explicit canonical Portfolio scenario.
  Never copy its terms into a different legacy scenario by matching balances.
- Use copy-on-write for term-enabled adoption: a fresh physical Portfolio version3
  channel retains old v1/v2 raw strings unchanged. Reads prefer the active version3
  channel; malformed present data blocks writes, never falls through to a demo.
- Keep existing logical snapshot keys; their values are already versioned opaque
  strings. No production database/schema/access/DNS/settings mutation is needed.
- Updated web/native import/export, recovery, comparison fingerprints and queued
  captures preserve all nested terms. Pending outbox operations remain immutable.
- Legacy demo paths remain visibly educational. Unsupported supplied extensions
  must be rejected or preserved, never stripped and subsequently saved as defaults.
- Do not activate term editing until the complete read/write/recovery path for its
  target surface passes tests. Native parity is required before release approval.

## UI

Use the existing compact editor, select controls, disclosure sections and coaching
styles. Show actual data states: Model estimate, Terms incomplete, Terms not
modeled. Do not claim lender approval. Unknown fields stay blank; a document-source
selection is not verification by InterestShield. No new landing page, assets,
motion, dependency or framework. Preserve the four original dashboard vitals.

## Verification

The shared contract change also refreshes generated Remotion scenario provenance
and its strict version literal. Keep the two educational story payloads exactly
unchanged; the blocked story gains the actual unmodeled-term assumption. Do not
weaken stale-source validation or modify 3D assets to pass this integration gate.

- RED before each behavior: false readiness; round-trip absence/partial/full/zero
  profiles; unknown/invalid rejection; no aliases; v1/v2 unchanged; v3 explicit.
- Copy-on-write old-byte equality, malformed-active write lock, failed-save retry,
  source priority, no-op equality and explicit import/downgrade boundaries.
- Normal entry points, presenters and coaching do not promote unsupported terms.
  Default educational numerical rows remain identical to the baseline.
- Web/native nested queue capture, terms-only recovery conflict, owner/revision
  isolation, and immutable already queued payloads.
- Actual browser edit/reload/import/review/removal workflows at narrow and desktop
  sizes; no fake accepted dates or totals. Preserve all standing math/media/native
  and rendered gates and their original deadlines.
- Both complete exact-head CI events, known automatic READY preview, hosted checks,
  actual IAB proof and an immutable receipt precede any verified shipping claim.

## Release

Keep PR256 draft and the full mission active. Do not merge or promote production.
All-ten photoreal, physical hardware/native, lender calendar and backend/security
gates remain open. Prior256shipping/96local and older evidence are immutable.
The existing renderer warnings and screenshot-reliability failures remain open;
this work is not a fix for either. No repeat of rejected photographic experiments.
