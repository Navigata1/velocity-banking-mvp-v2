# Vault Comparison Verification

## Scope

Base `b6cb796edd758570f7e5c019531b3d44b2b7e46f` was green in both CI runs
39494699757/39494707722, Vercel and hosted checks. Its final receipt is PR256,
issuecomment-6301381272. This new checkpoint requires new exact-head checks.

No saved scenario/default, mortgage-history implementation, model/poster/video,
dependency version, live backend, DNS, production environment or production
deployment changed. The generated media JSON changes only its financial source
digest; existing scenario outcomes are identical.

## Reproduction And Fixes

- The old current-mode mortgage1000/APR0/payment100/budget50 projected a viable
  ten-month scheduled payoff and seven-month extra plan. Nine new math/adapter
  tests failed before the shared funded two-liability comparison was added.
- Direct policies now include the existing LOC, reserve modeled obligations,
  cap extra mortgage allocation, and account for every unused dollar as cash.
  Default uncapped Simulator behavior and the existing Velocity policy remain.
- Legacy purchase-history fixtures used1500 against a roughly1618 payment.
  Their budgets are now2000 so those tests continue to isolate history. A new
  dedicated shortfall case proves unfunded plans are rejected instead of changing
  the expected outcome to hide the defect.
- Signed adverse outcomes, explicit comparison readiness, exact freed months,
  paid-off labels and the new standing browser gate each have observed red/green
  tests. Two old source/copy contracts now target the actual corrected contract.
- Independent review reproduced a425/month contribution with only123.70 available;
  the capped illustration now contributes123.70 and displays124.42 for that case.
  It explicitly is not incremental savings or a cash-inclusive wealth comparison.
- Review also reproduced a failed1200-month Velocity horizon shrinking a valid
  371-month scheduled timeline. Invalid horizons are excluded; the browser now
  asserts scheduled100%/Velocity0% for this exact scenario.
- Fractional months, numerical overflow and small-currency labels were separately
  observed red. Unsupported illustrations suppress claims and small amounts keep cents.
- Chrome reproduced a large amount247px inside a195px mobile box despite no page
  overflow. The new amount-bound assertion failed before compact/scientific labels
  and fixed30px type; it passes afterward. Before/after images are retained.

Passing cases were omitted from the clearly named red-excerpt logs. They are not
represented as complete raw test transcripts.

## Independent Review

Read-only reviewer Plato, `01a15b23-c6d3-7f50-8ced-4c0999949a2a`, found no
core-math blocker. Reviewer-reported probes:6000 uncapped cases match the base,
1800 capped allocations match an independent loop, and3508 successful paths
conserve liabilities/interest/budget/cash within1.75e-10. These are review evidence,
separate from the committed reference suite.

Reproducibility: LCG `seed=(Math.imul(seed,1664525)+1013904223)>>>0`, draw
`seed/4294967296`. Seed146712:2000 iterations, draws principal50000U, debtAPR.8U,
payment3000U, budget5000U, LOC20000U, LOCAPR.6U, expenses5000U; limit50000,
horizon240, income=expenses+budget. Seed27381:600 iterations, principal100+100000U,
APR.15U, payment=principal*APR/12+10+2000U, expenses10000U,
budget=payment+1+3000U, LOC30000U, LOCAPR.3U; limit100000, horizon1200.

Presentation review returned four actionable findings above; each was reproduced,
corrected and cleared on re-review. The reviewer reran all310 regressions and
actual funding/scale/formatting probes. No consequential remaining scoped finding.
Reviewer closed after final review; no checkout changes by the reviewer.

Excluded: actual lender fees/minimums/calendar/credit availability, hosted-project
configuration, native-device QA, and broad financial/app-security approval. Rendered
browser validation and builds were performed by the main agent, not the reviewer.

## Fresh Local Gates

- 310 regressions; two anonymized reference fixtures;78 prior closed-form cases,
  25 zero-recovery cases and100 new independently closed-form capped cases.
- Vault20 browser cases at1440px/375px, with actual observed card text, synthetic
  inputs, source URL, saved timing, error/overflow receipts and amount bounds.
- Existing16 Simulator/saved-data cases pass with the new native disclosure control.
- All seven rendered routes pass at1440px/390px. Separate Vault proof covers375px.
- Production build/TypeScript/ESLint pass. Native types/contracts and fresh Android
  and iOS Hermes exports pass; these are exports, not final-device checks.
- Full existing media check passes:41 contracts, HyperFrames runtime/motion/contrast
  and27 fresh Remotion stills. Three prior transition-layout info notices remain;
  no suppression. Financial source digest32b0baaaecd13444b2b5bc40a6609b343e007fe07fa4c593dea281026329b315.

Remaining R2 work includes Portfolio/dashboard comparison scope, safe shared
scenario ownership and common-date reserves/wealth. Lender/calendar, provider
patch/backup/account, eight hero refinements and final-device/release gates remain.
The draft is not approved for production merely because this checkpoint passes.
