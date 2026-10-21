# Portfolio Same-Month Contract

## Current Boundary

The new shared module and web/Expo Portfolio sections implement a same-month,
cash-inclusive comparison of all entered debts plus the separate LOC. This is
local implementation/preflight, pending independent final review and exact-head
CI/hosted publication. It is not a lender quote, entire R2 completion, final art,
physical-device, managed-backend or production-release approval.

Existing `simulatePortfolio`, main-engine calculations, canonical book/APR codec,
allocation priorities, interest conventions, caps, saved records, account/recovery
boundaries, hero assets and motion are unchanged. No new dependency or saved field.

## Shared Book And Date

The public typed subpath is
`@interestshield/financial-engine/portfolio-common-month`.
`preparePortfolioComparison(book)` strictly decodes one canonical decimal-APR
book, captures the same three existing policies, and privately retains those
traces for view-local `atMonth(H)` queries. Only strategy changes. IDs, starting
balances, LOC, household cash-flow budget, cap, chunk, focus and split are shared.
The current selected strategy is the explicit difference reference, not a winner.

`comparePortfolioAtMonth(book,H)` is the convenience capture/query form. No global
financial cache exists. Queries return fresh balance and payoff objects; neither
source mutations nor mutations of an earlier result alter later captured results.
The native component lives inside the existing storage-scope keyed workspace.
An absent book is not a cleared book, and comparison edits never save records.

H is a finite safe whole month from0 through600. Drafts such as1.9,1e2,601 or
empty remain invalid; they are not coerced into another month or saved. The
view-local initial month is60. Existing engine payoff horizon remains600.

## What The Numbers Mean

At accepted month H:

`net modeled wealth = retained cash - sum(listed loan balances) - LOC balance`

It excludes unentered debts, house/other asset values, investment returns and
lender charges not already modeled. Interest is not an extra asset. Existing
cash-at-own-payoff summaries keep their old meaning; their different dates are
not this comparison's date.

For a book with zero interest, initial debt140/LOC40 and budget100, at month3
Snowball holds cash200 and still owes80; Velocity holds120 and owes0. Both have
net120. At month6 Velocity's120 payoff cash continues by3*100 to420, tying the
other book's net420. No freed-payment bonus or second budget is added.

Differences are signed and require both snapshots to be available. A blocked
reference suppresses deltas, not valid independent columns. Wealth and deltas
use original cash/per-ID/LOC terms with residual-preserving signed summation, not
subtraction of already-rounded large totals. Independent large-cancellation REDs
preceded that fix; this is still Number arithmetic, not exact lender posting.

## Coverage And Tolerance

- Month0 is observed starting inventory, not a future payoff claim.
- Accepted contiguous required rows establish coverage; a failed attempt counter
  or cashAtPayoff0 cannot fill a missing row. Unrequested later errors do not erase
  an earlier valid prefix. Payoff metadata is separate and can still need review.
- After exact-zero clearance at P<H, cash grows only by (H-P)*the same budget,
  without new borrowing or returns. A future cash deficit is unavailable.
- Nonzero terminal balances within the old per-liability cent tolerance are not
  exact-zero clearance. They cannot support future cash continuation.
- A genuinely small LOC or a fully accounted tiny payment can remain in an
  accepted row. The generic reducer does not blanket-reject all such positions.
- The Portfolio adapter detects an observed legacy loan residual disappearing
  without payment or interest. A size-only epsilon cannot prove the inventory is
  fictitious: unresolved removal stops coverage at that month, retaining earlier
  rows. A small existing LOC or an actually accounted payment is not rejected.
- Required null/undefined/sparse rows fail closed after the valid prefix. Raw
  interest terms survive until signed conservation completes; rounding the output
  cumulative-interest diagnostic must not decide whether an inventory conserves.
- Invalid input, missing inventory/LOC/cash, unsupported coverage, nonfinite sums
  and inconsistent accounting produce null monetary outputs, never fake zero.
- Displayed amounts use cents for ordinary values and scientific notation for
  extreme/very small nonzero values. Display rounding does not alter inputs.

The source engine still uses monthly educational estimates: loan APR/12, direct
LOC starting balance*APR*30/365, and the existing single-focus Money Loop's average
balance/capitalization policy. Real fees, posting, minimums, calendars and intra-
month availability remain separate lender gates.

## Evidence In Progress

The first pushed head7bd72ac failed BOTH complete CI events39605673471 and
39605676575: the new large-value comparison at280px overflowed its section.
Both SQL jobs passed; later media/native CI steps were skipped. Hosted109 and
actual IAB edits passed, but no receipt or Desktop publication was issued.
A local requested-Verdana probe reproduced99px columns too narrow for full
currency at12px before a one-class content-track fix. It does not identify the
actual Linux font. The corrected grid uses auto-fit tracks with a9rem minimum for
12px values and a10rem minimum at the existing14px breakpoint, both capped by
available width. Values are not clipped, shrunk or numerically changed.
The standing21-case gate now includes a reversible wider-font280 positive probe;
42 additional executions across280/360/640/768/1024/1440 pass independently.
Four actual DOM counterexamples and every fit/minimum-font assertion remain.
Both NEW complete final-head CI events remain mandatory.

An additional real maximum-standard-notation boundary RED at690px showed
`-$1,000,000,000.00` at14px needs156.359px, exceeding a144px track. The10rem
breakpoint correction follows that RED. A permanent web browser gate now runs
that one canonical book at11 widths, including690/700; it checks exact full text,
one-line containment, finite positive widths, font>=12, no overflow and no errors.
Those are11 layout executions, not11 lender examples. Web totals are109 primary
workflow cases plus11 currency boundaries=120, across ten hosted suites. Native
remains70. At that currency checkpoint, source inventory293 comprised280 old
unchanged,5 old modified and8 new; the later hero-harness boundary is below.

Local shared contracts:31 passing cases, with genuine preceding API, prefix,
draft/coverage, cancellation, tolerance and four review-regression REDs preserved.
The independent
reference lane retains57,696 all-horizon zero-rate snapshots,128 convenience
parity checks, separate direct-row oracles,504 required-prefix probes, signed
adverse cases and boundary/overflow checks:23,247 passing probes, seed20261021.
Five old expectations for one seeded path were corrected only after independent
exact posted-ledger arithmetic proved a positive residual and a later removal
without settlement. The literal fixture cutoff retains its earlier prefix and
both independently usable direct columns; all original seed/draws, horizons,
direct ledger and numerical tolerances remain. These are synthetic checks, not
lender examples or an arbitrary-precision production calculation.

Browser fixtures cover7 states at1440/375/280 on each platform, month0/3/6/600,
invalid drafts, same cash/debt/LOC/net/delta figures and unchanged stored bytes.
The strengthened four-control oracle checks hidden/clipped/empty actual DOM,
original text-node/style restoration and unsplit contained glyphs. Final-source
web/native builds and21-per-platform browser runs pass locally; the native suite
also retains its49 older cases for70 total. Final375px captures are inspected.
Bounded independent fix/oracle reviews pass after the recorded REDs and explicit
pin reconciliation; this is not a blanket whole-release review. Both complete
new exact-head CI events, authenticated READY identity, hosted109/routes/all-ten
asset hashes and actual UI edit/restore still precede a verified receipt.

Future Simulator/Vault adapters must retain their single-target scopes and actual
policy traces. No scenario is automatically copied, merged or migrated here.

## Standing Hero Capture Correction

The next pushed checkpoint,789ae25, was not approved: its complete push pipeline
39612733144 failed the original hero visibility test, while complete PR pipeline
39612743542 succeeded. Both event results are required. The previous1aec5bf
Desktop publication remains the verified baseline; no789ae25 receipt or report
publication occurred.

The failing Credit Card capture contains real, nearly edge-on geometry:12.83%
foreground in A and1.39% in B. The unchanged visibility predicate correctly
rejects B under its2% occupancy rule. The old harness let screenshot/GPU latency
choose these two turn phases. The correction controls the test clock before
model opt-in, advances loading in16ms ticks, captures the initial loaded view, then delivers
1500ms through the real scheduled animation/render callbacks before capture B.
It does not set a model angle, replace pixels, replay on failure or choose a
different phase for a particular asset. Clock-driven snapshots are not a
wall-time frame-rate or full-turn smoothness measurement.

The first software-renderer trial passed all nine dashboard domains, then failed
at Vault. A focused warm-navigation probe reproduced a separate harness mistake:
the loaded canvas and faded poster were inside a PageTransition at opacity0.
Its screenshot had0 foreground pixels. Resuming the page, waiting for visible
ancestors and loading the same asset at rest produced26132 pixels (14.71%).
The uniform pause boundary now waits for actual ancestor opacity1 and visible
layout before freezing time. Runtime page transitions and model animation are
unchanged. Raw Vault images are saved before subsequent visibility assertions.

Independent review also reproduced late-success acceptance in the initial
polling loops. Genuine deadline REDs precede a bounded helper that races each
operation against its remaining wall budget and checks the deadline again after
resolution. Five focused exact-source AST/VM checks pass, including a pending
query; permanent expired/late/pending/positive controls run in the standing hero
harness. RGB unit controls reject blank, undersized and clipped geometry. They
are not described as DOM/browser counterexamples. Descriptor/self comparison
rejects identical frames; that alone is not a disabled-scheduler browser test.

Original2% occupancy, edge margins, color/spatial movement checks, overflow,
errors, reduced-motion stillness,120-second operations, independent Three700ms/
300ms timing and the20-minute workflow cap remain. All ten actual models,
posters, videos, runtime animation, numerical modules and saved-data code are
unchanged. The source inventory is293 files:279 old unchanged, six old modified
(including this existing test harness), eight new. Final local and both new
complete exact-head CI/READY/hosted120/IAB/publication proof are still required.
