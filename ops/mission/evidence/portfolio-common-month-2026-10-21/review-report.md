# Fresh Whole-Slice Adversarial Review

Repository: `C:/Users/IslandDevCrew/Documents/Interest Shield`

BASE = HEAD = `1aec5bf7be3d0f3c26079141245e4c7291fd8778`.
Target is the tracked working diff plus untracked executable files, not a commit range.
Single reviewer; no subagents. Review-only files are the only writes made.

## Findings

### F1 [P2] An epsilon bound does not establish that unpaid debt is an artifact

Location: `packages/financial-engine/src/portfolio-common-month.ts:41-43`.

Canonical input: income257, expenses0, extra cap1, chunk0, LOC0/limit0/APR0,
Snowball/single/splitRatio0.7. Two zero-APR fixed-payment checking debts:
`a.balance = 256 + 2**-40`, `a.minimum = 256`; `b.balance = 100`, `b.minimum = 1`.
Use the normal canonical debt name/category/kind fields (complete fixture in the probe).

Month1 leaves `a=9.094947017729282e-13`, `b=99`, cash0. This is exactly represented
entered inventory: with zero APR, subtracting the exact payment256 leaves exactly
`2**-40`. Month2 removes a with payment0 and interest0, while b becomes97 and
cash255. The adapter admits that row for all policies because a is below the
previous-operation resolution bound. It returns net158 rather than
`157.9999999999991`, and H52 is even labeled `post-payoff-cash`.

Expected under the stated no-unpaid-forgiveness/exact-zero contract: keep H0/H1
available, but cut comparison coverage at month2 with `cent-tolerance`. A size-only
bound can describe numerical uncertainty; it cannot prove that a known unpaid
entered residual is fictitious. Use operation/provenance-aware reasoning or fail
closed on unresolved clearance. Preserve the valid tiny-LOC and actually-repaid
tiny-debt cases; do not introduce a blanket initial dust rejection.

This is a sub-cent semantic precision defect, not a claimed cents-level loss or
request for arbitrary-precision lender posting. A second reproduction with
`a=10000000000.000006`, minimum10000000000, income10000000001, and the same b/cap
silently drops `0.0000057220458984375` at H2. Both are representable residuals.

Evidence: `review-probes.cjs dust-ordinary` exit0 exposes the values and H52;
`review-probes.cjs red-dust` exit1 is a genuine failing expected-behavior assertion.
Refutation pass reread adapter and legacy payoff/removal code, verified zero
payment/interest, and separated real binary input dust from calculation error.

### F2 [P2] A malformed required row throws instead of failing closed

Location: `packages/financial-engine/src/common-month.ts:104-105`.

Use initial a100/LOC0/cash0, budget10, rows
`[{month:1,balances:{a:90},locBalance:0,cashBalance:0,interest:0}, null]`,
payoffPossible false, payoffMonth2. H1 correctly returns net-90. H2 throws
`TypeError: Cannot read properties of null (reading 'month')`.
An undefined/sparse required row also throws.

Validate the row object before reading month and return `invalid-trace` with
coverage1, retaining the valid earlier prefix. The array guard does not validate
its elements. This is the generic reducer's promised malformed-trace boundary;
the current canonical engine was not observed to emit null rows, so this is not
claimed as a current Portfolio UI crash.

Evidence: `review-probes.cjs red-null` exit1. Refutation confirmed that a valid
requested prefix succeeds and only consuming the null required row fails.

### F3 [P2] Rounded cumulative interest contaminates signed conservation

Location: `packages/financial-engine/src/common-month.ts:107-113`.

Generic reducer input: H2, budget1e16, initial a1e16/LOC0/cash0. Row1 has a1e16,
LOC0, cash0, interest1e16. Row2 has a1e16, LOC1, cash1e16, interest1.
Set payoffPossible false and payoffMonth2. Every input is an exactly represented
finite integer; row2 net is exactly -1 and raw conservation residual exactly0.

The reducer first rounds cumulative `1e16 + 1` to1e16, then feeds the rounded
diagnostic into the residual-preserving signed validator. That produces residual-1
and `unavailable/inconsistent-trace`, coverage1. Feeding all raw interest terms to
the existing partial-sum helper gives residual0. Retain interest partials until
conservation completes; a rounded output diagnostic must not act as the oracle.

This is a generic finite high-magnitude availability defect. No claim is made that
the current canonical allocation policies generate this particular trace. It does
not require an exactly representable scalar `interestThroughMonth=1e16+1`, just
that its rounding not erase an otherwise representable net-1 snapshot.

Evidence: `review-probes.cjs red-interest` exit1. Refutation independently checked
integer conservation with BigInt as a test oracle and with the existing signed
helper, without changing product source or widening tolerances.

## Declined To Judge

- Latest actual-browser/native layout, focus, text scaling, screen-reader behavior,
  and comparison owner-switch draft reset: no browser/server changes were authorized.
  Source review and hook tests do not replace these checks.
- Full-build/export/reference/media/standing-suite and fresh exact-head CI/READY
  closure: parent is running the full gates; this review did not run or borrow them.
- Prior browser counts or screenshots as latest-source certification: two existing
  375px cash-versus-wealth screenshots were inspected only as prior static artifacts.
  Their framing/occlusion is not classified as an app defect. They do not establish
  source/build identity, interaction success, or visibility of every result.
- Cents-level financial harm from F1: reproduced effects are sub-cent; the finding
  concerns the explicit retained-inventory/exact-clearance contract.
- Canonical/UI reach for F2/F3: only the generic reducer boundary was reproduced.
- Lender cent posting, arbitrary precision, calendars, whole R2, final art, physical
  device, production, cloud/security, publishing, and deployment: outside this slice.

## Verdict

Changes requested for three P2 contract defects; no P1 confirmed. F1 is reachable
through the canonical Portfolio adapter. F2/F3 are narrower generic reducer issues.
The review does not certify a release or replace the parent's post-fix actual-browser gates.

## Coverage And Preserved Strengths

- Read the requested design and implementation plan. Inspected both reducers,
  package subpath, both views and integrations, focused/reference tests, browser
  helper, native invocation, and web script wiring. Followed unchanged engine,
  codec, numeric-range, store/session/hook code only to establish behavior.
- One decoded book is captured, three policies change only strategy, explicit
  decimal APR is retained, and the atMonth closure owns its private projections.
  Fresh maps/payoff data prevent caller aliases. No cross-owner/global cache found.
- H0, accepted prefixes, unavailable-reference nulls, signed delta, same-budget
  continuation, all listed liabilities plus LOC, strict month drafts, no new save
  path, existing native storageScope keys, and absent-book conditional are present.
- The four browser negative controls restore original text-node identity/styles.
  They are useful controls, not proof against every visual obstruction.
- Browser helper source never changes strategy after mount, and its native cases
  are seeded guest books. It does not exercise absence or assert the comparison
  after an owner switch. Existing hook tests cover session transitions, not this UI.
- The seeded reference test contains a separate direct ledger and independent
  accounting checks, but much of Velocity's expected inventory still comes from
  production rows. Its count is not exhaustive independent allocation coverage.

## Commands And Evidence

All test/probe commands were bounded by the review runner's 90-second timeout.
The unchanged native hook test also has its own 15-second watchdog. No heavy suite,
export, media render, browser, network request, or server was launched.

Run commands from the repository root. Runner prefix:
`node .superpowers/sdd/2026-10-21-common-month/review-runner.cjs run`.

| Command After Prefix | Exit | Meaning |
| --- | --- | --- |
| `node apps/web/scripts/portfolio-common-month-tests.cjs` | 0 | 27 focused contracts, including adapter strict type check |
| `node apps/mobile/scripts/portfolio-hook-contract.cjs` | 0 | 7 actual-React/null-host, memory-storage session contracts; not browser proof |
| `node .superpowers/sdd/2026-10-21-common-month/review-probes.cjs sum` | 0 | 12000 exact-integer cancellation probes against BigInt test oracle |
| same probe `boundaries` | 0 | Exploratory null/dust/capture logs; exit0 is not a claim those cases are correct |
| same probe `precision` | 0 | Exploratory cumulative-interest and live-sibling residual evidence |
| same probe `dust-ordinary` | 0 | Exact binary unpaid dust and false H52 continuation |
| same probe `red-dust` | 1 | F1 expected-behavior assertion fails |
| same probe `red-null` | 1 | F2 fail-closed assertion fails on TypeError |
| same probe `red-interest` | 1 | F3 available-conserving-inventory assertion fails |
| `node --version` | 0 | v22.22.2 |

`review-commands.jsonl` records exact arguments, timestamps, exits, durations and
full stdout/stderr for launched tests/probes and commands since pinning; the read
entries record source/ranges and exits. No tests wrote canonical test-results.

Before the runner, successful read-only exploration used `git status --short
--untracked-files=all`, `git rev-parse HEAD`, `rg --files` filtered to scope, and
PowerShell `Get-Content` for the spec, plan and initial reducer reads. The memory
registry keyword search returned exit1/no relevant hits and supplied no facts.
Skill/process documentation was read with Get-Content (exit0). Two initial review
runner invocations failed with exit1 due an incorrect review-helper root path
(git-not-repository and ENOENT); only the review helper was corrected. These were
setup failures, not product RED evidence. Both subsequent pin/read commands passed.

## Source Pins And Race Check

`review-pins.json` records SHA-256 for 239 web/native/financial-engine executable,
manifest/config/style files and lockfiles, plus HEAD. It includes all twelve
changed/new executable files in the requested slice and unchanged supporting code.
Docs, ops, generated test outputs, dependencies and review artifacts are not part
of that race check. Parent documentation/ops updates therefore do not invalidate it.

The successful initial pin and later verification both saw HEAD
`1aec5bf7be3d0f3c26079141245e4c7291fd8778`; verification exit0 reported no changed pins.
A final verification is recorded in the command journal. Review probe/runner hashes
are recorded separately in `review-artifact-pins.json` after their last edits.

Writes are restricted to this directory's `review-*` artifacts. No product source,
docs, index, git state, remote, PR, schemas, credentials, dependencies, assets,
persistence data, browser session, server, or the user's ports53143/53144 was changed.
