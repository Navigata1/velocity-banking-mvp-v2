# Canonical Portfolio Simulator Contract

## Scope

`/simulator?scenario=portfolio` reads the same canonical Portfolio book as
`/portfolio` and `/?scenario=portfolio`. Income, expenses, extra allocation,
chunk size, LOC and every listed debt remain in the existing store. There is
no mirrored record, source flag, automatic adoption or migration.

The default `/simulator`, unknown queries and differently cased queries remain
the original single-target demo. The explicit links name the source boundary.
Inspecting another asset changes only local inspection state, not the simulated
cohort, allocation or saved data. All three policies include every listed debt
and the existing LOC under the same household budget.

## Payoff Authority

The presentation adapter delegates to the existing prepared comparison API.
Each successful policy must have an accepted snapshot at its **own** payoff
month with exactly zero remaining listed debt and LOC. A failed projection or
accepted prefix is not a payoff result. Positive residuals and tolerance-erased
balances suppress dates, interest and cash rather than manufacture zero.

Only exactly zero initial liabilities can say `Already paid off`. A cleared
initial balance does not imply positive future cash flow. Interest and cash
in the policy summaries are measured at each policy's own payoff date. The
separate Same-Month Comparison remains a common-date cash-minus-liabilities
view, with unchanged month 0..600 validation and independent rounding.

The Portfolio payoff summary and canonical Dashboard ETA use the same
presentation adapter so these whole-book summaries cannot turn an unpaid
residual into a dated payoff claim. A residual also replaces the Portfolio payoff path with an
explicit review notice, rather than a rounded zero/100% chart. Existing engine
formulas, epsilon, allocation, rounding, APR interpretation and ledgers are not
changed. The older per-debt Payoff Order and change-since-last-run interpretations
still require the broader R2 review and are not approved by this summary fix.
This feature does not establish all-route, lender/calendar or release accuracy.

## Persistence And Input Safety

Read-only entry, no-ops, comparison-month edits and asset inspection must not
write either canonical or legacy records. Real edits use existing canonical
actions and preserve unrelated precision and metadata. Decimal APR 2 remains
200%; introductory and expired promo rates retain their actual meaning.

Invalid storage, unavailable storage and failed writes pause projections and
editing without substituting demo values. Reload explicitly discards unsaved
changes and returns to the physical saved record. No remote account, backend,
schema, credentials or production data is involved in these tests.

## Executable Gates

`node apps/web/scripts/portfolio-simulator-tests.cjs` covers 21 pure presentation
contracts, including literal zero-interest conservation, independent engine
comparisons, blocked policies, failed prefixes, exact zero, residuals, APR 2,
promo transitions, frozen metadata, malformed input and overflow.

`node apps/web/scripts/portfolio-simulator-wiring-tests.cjs` checks four source
contracts: exact query boundary, existing store subscription, all nine canonical
fields and linked Dashboard/path payoff authority.

`node apps/web/scripts/smoke-portfolio-simulator.cjs` runs six multi-assertion
workflows at 280, 375 and 1440 pixels. It exercises shared edits/navigation,
legacy isolation, adverse policies, cleared/residual states, precision and
storage faults. Financial/scenario text is checked for actual text, containment,
12px minimum and 4.5:1 contrast. Existing asset attribution is outside that text
probe. Original-node opacity, clip, empty-value and contrast mutations must be
rejected and restored. Actual Car canvases at 375/1440 are decoded and framed;
the existing all-model gates remain separate and mandatory.

Expected synthetic storage-denial preference warnings and existing software-GPU
ReadPixels warnings are retained verbatim. Any other warning or browser error
fails the smoke. Contexts and owned browser/server resources must close.

## Release Limits

Local proof is not hosted proof. Each pushed head still needs both complete CI
events with actual source guards, an exact automatic READY preview, the original
138 plus new 18 workflows, 20 served asset hashes and fresh manual browser
edit/navigation proof. PR256 remains draft. No merge or production promotion.
All-ten photoreal acceptance, dated lender behavior, backend recovery/security,
physical native-device testing and remaining release gates stay open.
