# Independent Concrete Patch Review

## Final Verdict

**No remaining blocking source findings in the final five-file patch.** The
previously reproduced media placement regression is fixed and freshly verified
after the final LF/indent normalization. Source-level review only: this does not
establish CI capacity, successful full local gates, or full-head approval.
Parent's fresh 15-stage run94057 is active per parent; not polled here. The
earlier 15-stage run82602 failed at the now-fixed media contract and stays failed.

Current raw pins were captured at **2026-10-22T03:41:06.885Z**, with no input
changes during the final capture. All four non-media patch files matched the
successful 11-group probe run; only the final media test formatting hash changed.

## Resolved Finding

**R1 / P1, fixed:** the standing media contract still selected primary, expected
its media cache, and required literal unbounded `npm ci --ignore-scripts`.
The actual focused Node test failed at old line75 on the concrete workflow.
Raw failure remains in `review-media-repro.log` and
`review-media-repro-results.json`; no failure was retried unchanged or erased.

Current media test selects SQL, verifies the exact full-audited bounded install
with ignore-scripts, retains checkout/cache/install/check order and lock access,
requires unconditional/non-ignored install and check execution, and checks the
primary dependency edges/condition. All five deliberate mutations are rejected:
remove check, skip check, ignore failure, remove the install script guard, or
disconnect SQL. Fresh current source: **3/3 CPU tests passed**, no rendering.
Native's analogous owner correction and five negative controls also passed in
the independently extracted real callback, without executing application/math.

## Measured Patch Properties

- **55 original canonical step meanings retained**, allowing only approved cache
  paths, explicit checkout ref and six command-local install flag additions.
  The 55-record baseline fixture is byte-identical to its independently pinned
  pre-workflow-edit version; this is not a new Git-tree/diff verification.
- **59 declared steps = 55 + one prerequisite guard + three source guards**.
  Job step counts: primary22, hero7, SQL30. All16 independent tail steps follow
  the original SQL stop and database proof upload, preserving their order.
- Three original IDs/names, Ubuntu, Node22, three20-minute caps, workflow name,
  ordinary pull_request/push triggers, concurrency policy and contents:read
  remain. Hero/SQL are independent; primary directly needs both, with the exact
  `${{ !cancelled() }}` condition and first exact-success guard before checkout.
- All six installs require audit=true, timeout60000, retries1, min1000/max3000.
  Media retains ignore-scripts. No omit=dev install reduction or --no-audit.
  Mandatory runtime, Worker and native explicit audit commands are preserved.
- Chrome action/version producer IDs and consumers are prior steps in SQL;
  media CHROME_PATH and native PLAYWRIGHT executable references remain local.
  Report renderer's web/postcss + media/parse5 prerequisites are available in
  that lane. Existing env/cwd/shell/command/artifact meanings match the fixture.
  Eight original artifact names retain one owner each.
- All three checkouts pin the event-head/push expression; each source guard is
  immediately after checkout and before Node. The original 58-case runtime
  protocol source/tests and CLI full-event verifier hashes are unchanged.

## Independent Verification

`review-final-patch-results.json` / `review-final-patch.log`: **11/11 groups**,
2296.682ms probe-body wall time; all17 inputs unchanged during execution.
That run includes current final CI-test hash e5719255..., native hash3acf1d7...,
and the pre-format-only fixed media hash46388558.... Latest media hash is below.

Executed coverage, not merely parent reports:

- Two installed YAML parsers agree; duplicate-key/tagged-bare-if negatives reject.
- Independent canonical map, exact DAG/job policy, six installs, cache paths and
  local step-output/artifact ownership;12 deliberate YAML/object mutations reject.
- Actual prerequisite Bash:49 pairs, only success/success passes; two missing-
  check mutants expose the expected acceptance regression.
- Actual three source-guard Bash bodies:30 cases total, checking match/mismatch,
  invalid/empty/unset/truncated expected values, empty/junk actual values and
  nonzero Git status. **Git is only a Bash function stub**, never an executable.
- Two native workflow callbacks (including five negative controls), all three
  real Supabase wiring callbacks, focused real Remotion Chrome contract, fixed
  media3/3 including five mutants, and unchanged runtime wiring callback pass.
- Retained API tree-proof data is internally consistent for both current/prior
  cases. No GitHub API request was made by this sidecar.

`review-final-contracts-results.json` / `.log`: **2/2 current parent structural
and negative cases** passed after the final test-only hardening to e5719255....
Other parent20 tests/config calls were not rerun by that selection.

`review-current-pins.json` / `review-current-media.log`: latest five raw pins,
all four other files unchanged, media contains no CRLF, and freshly executed
**3/3 media tests** on final LF hash e70643d4.... No source changed during capture.

The first own combined shell harness stopped after3/10 on a printf/command-
delivery error, not a product assertion. Its `review-patch-probes-results.json`
and `.log` remain. The corrected stdin-delivered run passed10/10 in
`review-patch-probes-final-results.json`; the later 11-group run adds the actual
fixed-media process. The original install-study harness failure and17/17 results
also remain. These are separate histories, not parent20 or runtime58 receipts.

All runners/logs/results are ignored `review-*`. No tracked edits, config/npmrc
loads/changes, installs, advisory requests, real Git, servers, GPU/browser or
whole gates were performed. Full mobile/engine/renderer suites were not run.
Source scans covered all current workflow consumers under scripts/apps/ops;
historical evidence-only validators were identified, not treated as standing gates.

## Residual Boundaries

1. Cancellation can skip primary before its guard. Local Bash/fixture tests do
   not prove hosted scheduling or provider branch protection. The unchanged
   full-event verifier must reject all cancelled/skipped/incomplete jobs/steps,
   require both latest successful exact-event-head runs, and never reuse old green.
2. Source guards take expanded EXPECTED_HEAD. The OR expression assumes the
   ordinary PR payload supplies its head SHA; it does not independently reject
   an absent raw PR head before falling back to github.sha. No ordinary-payload
   bypass was demonstrated. Do not claim rejection of arbitrary malformed event
   payloads or head-only AND merge-integration execution.
3. Captured API metadata records current event04753ee versus checkouta5dca08...
   with matching tree5ca84e93..., and priordd32e8 versus checkoute437cef... with
   matching tree173e1f2.... Thus retained tracked trees match per captured proof;
   commit identities differ. This qualifies historical evidence, not a new full
   approval of the cancelled current runs or proof of deployment/artifact identity.
4. Request bounds are not an install deadline or verified npm10.9.9 behavior.
   Bulk can still fall back to Quick; implicit audit errors remain advisory.
   Default audit as the cause of old install delays is unproven. Mandatory runtime
   auditing is preserved, later in DAG time after the relocated tail.
5. Tail movement does not itself resolve push's pre-tail cancellation; capacity
   under unchanged caps requires actual new terminal runs. Workflow wall time
   can increase; a60-minute observer window does not change job caps or acceptance.

Require fresh full15 local gates **after the fifth-file fix**, then the existing
new exact-head push/PR and hosted/manual evidence process before any success
receipt. No commit, push, release, merge or additional source change is approved
by this source review alone.

## Latest Five Raw SHA256 Pins

| Path | SHA256 |
| --- | --- |
| `.github/workflows/ci.yml` | `3b91898a03b7249be44d8ec2c871c9dc84ff383f1f0a5baa9fb8c7ff88c04387` |
| `scripts/check-restoration-ci.test.cjs` | `e5719255b0c34054badc15061dae8d8c0660a2ff929b0007cb48aad5e2610aca` |
| `scripts/fixtures/restoration-ci-step-contract.json` | `569b63c0f0409f7782819a6380557ce8d2bc623e8fb30570441c57d1ca7a93ef` |
| `scripts/mobile-port-contract-tests.cjs` | `3acf1d7f6ac8e8d3f21970631eb909290ed9807c0dca4732e02e4e95852abca3` |
| `apps/media/scripts/media-workspace-contract.test.mjs` | `e70643d463638cf7490a3939193e33a38d8c7b8fb27916203032cc24d22dd4fc` |

Complete17 input pins, including all four locks, unchanged runtime scripts and
tree evidence, are in the 11-group results; the current five supersede its media
formatting pin only. To repeat bounded probes without overwriting history:
`node .superpowers/sdd/2026-10-22-install-audit-study/review-patch-probes.cjs review-parent-final-01`.
The output stem must be review-prefixed and filenames must not already exist.
