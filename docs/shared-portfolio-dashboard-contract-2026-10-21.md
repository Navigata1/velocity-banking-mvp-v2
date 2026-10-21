# Shared Portfolio Dashboard Contract

## Scope

The existing PortfolioBook v2 and Portfolio store are the source for the explicit
`/?scenario=portfolio` dashboard. Portfolio's Open dashboard link enters that view.
The original `/` single-target dashboard remains intact. No new financial store,
mirrored record, persisted source selector, automatic merge or migration is added.

This is the first shared-source vertical slice, not completion of R2. Simulator,
Cockpit, Vault, Expo and legacy-source adoption still require explicit ownership
decisions and regression proof. Default sample debts are not assumed to be real
household inventory. Existing saved bytes are never silently combined.

## Financial Semantics

- Four vitals: household cash flow, all-debt-plus-LOC daily interest estimate,
  full-book payoff months, and the actual first modeled target or review state.
- Inspecting another debt changes the displayed asset, not the financial cohort,
  household budget, target allocation or payoff result.
- The strict canonical codec and existing simulator remain authoritative. Decimal
  APR2 means200%; active promotional APR and expired post-intro APR are distinct.
- Exact zero, nonzero model tolerance, failed projections and nonfinite daily
  burn remain distinct. Nonzero tolerance is not confirmed lender payoff.
- Cash flow at or below zero and LOC utilization above80% retain warnings.
- Estimates do not establish lender fee/minimum, calendar, posting or compounding
  compliance. Next Move is not an instruction to make a payment.

## Persistence And Presentation

Dashboard edits call existing Portfolio actions. Portfolio edits appear on return
and reload. Invalid and equivalent drafts retain exact stored bytes. Selection and
navigation do not save a new financial record. Corrupt primary storage, unavailable
storage and failed writes pause projections/editing instead of opening a different
household or silently substituting defaults. Recovery uses the existing reload path.

Original studio artwork is the default; the same real GLB viewer and finite turn
replay are reused. Financial identity is selected from actual debt IDs. An empty
book has no fabricated asset. Missing inspected identity does not select another
debt. Purchase plans use the existing Custom asset, not an invented recreation type.

## Evidence And Remaining Gates

The actual old built app imported a synthetic2100-liability/500-cash-flow book in
Portfolio but still displayed separate3500 demo cash flow at the proposed URI.
That is feature-absence RED, not a newly discovered arithmetic bug. Actual rebuilt
IAB interaction verifies dashboard income2500 in Portfolio and reverse expense1550
back to950 cash flow; the same original art/3D controls remain visible.

The shared overview has21 literal pure contracts. Standing browser verification
adds two multi-assertion workflows at280/375/1440 to the existing120 workflows,
including source preservation, bidirectional edits, APR200/promo/tolerance/empty/
LOC-only/range/error states, real canvas pixels and light-theme contrast. Initial
selector ambiguity is a test diagnostic, not product RED. Independent review
identified low-contrast light-theme vital colors; retain the rendered RED/GREEN
record and theme-aware correction with final source pins.

Final committed preflight records fresh local gates. A later exact-head PR receipt
must verify BOTH complete CI events, READY preview identity and hosted126 workflows.
Preflight is not a hosted or production claim. Do not run historical Desktop
publication helpers against this new baseline or bypass the report-file browser
restriction. No merge, production promotion or cloud/data/access mutation is part
of this slice. Final all-angle photoreal, lender/calendar, backend/security and
physical-device/release gates remain open.
