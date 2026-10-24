# Tier 2 Fresh Adversarial Verification

## Verdict and Findings

No actionable P1/P2 findings found in the bounded five-file CI/report patch. No lower-severity defect established. This is independent local verification of the frozen sources, not approval of the whole release, production, financial math, artwork, browser layout, or successful execution on GitHub.

Reviewed on 2026-10-21 against baseline `cc09e2e3f560c380445333907469ba813035a7a2`. Local HEAD equals that baseline; branch is `codex/restoration/asset-heroes`. Applied the Mission Control implement/verify separation: this reviewer did not implement or modify any frozen source. Concurrent state/journal/docs/generated-report/evidence changes are not frozen review targets.

## Exact Reviewed Sources

SHA-256 over actual on-disk bytes, checked twice during review with identical results:

| Source | SHA-256 |
| --- | --- |
| `.github/workflows/ci.yml` | `458D96CA256115E07E818A7E1E4B7CEEDEB3F1D684CD85BFA2B0ADC507946145` |
| `scripts/check-restoration-ci.cjs` | `C32DE304989D6EACCCD2FB6D9CA9D103CC054D3BC0BB6B956A8704001781FC80` |
| `scripts/check-restoration-ci.test.cjs` | `C062428D0836EF2D71C5C1B6A3C6DB8575B07347F2AD41F49CD92ED87399ABC7` |
| `ops/mission/render-sotu.mjs` | `0EEACC358DF6457C8F2F029C722B039D4AE8FBA82F10431D2AE5FE1CB07743DF` |
| `ops/mission/report-renderer-tests.mjs` | `021D58505BBBC7D845936296EC3C46A8B2A94B729376903D8B8E3F2A2D24DE6A` |

The two new test files are untracked at review time and were read in full, not omitted because they do not appear in the tracked baseline diff.

## Refutation Attempts

### CI Isolation and Preservation

- `.github/workflows/ci.yml:222`: the new `asset-hero-quality` job has independent checkout, Node 22, web `npm ci`, and build, followed by the exact original hero command and upload objects. It has no dependency on the primary job. Its cap remains 20 minutes, as do the original two job caps.
- `.github/workflows/ci.yml:146` and `:191`: media identity checks, pinned Remotion Chrome installation, and the native smoke browser-path wiring remain in the primary job, unchanged. The only primary-job changes are removal of the original two hero steps and addition of the CLI/static-renderer contract steps at `:41` and `:152`.
- `.github/workflows/ci.yml:258`: the complete backend job is structurally identical to baseline, including SQL replay/tests/repeat, lint, security advisors, cleanup and upload. Workflow triggers, concurrency and permissions also match baseline.
- Independently re-executed `validate-scope.mjs` in memory after replacing its sole evidence-file write with a console message. No preservation artifact was overwritten. Every original comparison passed: 292 protected sources unchanged out of 293; only `ci.yml` changed in that inventory; ten GLBs, ten posters and ten videos match their baseline postflight hashes; primary remaining steps and full backend compare structurally equal. The recorded inventory is explicitly bounded, not every file in the repository.
- Inspected the unchanged hero/browser harness source: browser lookup already uses installed Chrome/Chromium paths; the moved hero command does not depend on the later pinned Remotion Chrome step. Actual runner availability and duration still need fresh CI.

### Exact-Head CLI

- `scripts/check-restoration-ci.cjs:21`: selection is independently scoped to both `push` and `pull_request`, exact SHA and CI name; sorting by run ID rejects an older green substitute for the newest failed/pending event. `:25` requires a positive safe-integer attempt and `:26` passes it explicitly to `gh run view`.
- `scripts/check-restoration-ci.cjs:27`: fetched detail must still match HEAD and have completed successfully. `:30` through `:38` require the exact declared job count, unique expected job names, successful completion of every job, nonempty steps, successful completion of every returned step, and unique step names.
- `scripts/check-restoration-ci.cjs:39`: each declared step must occur in increasing order. Missing, duplicated, skipped, failed or reordered steps cannot be hidden by the overall run conclusion. Successful runner-generated setup/cleanup steps are intentionally permitted, but unsuccessful ones fail the verifier.
- Fresh offline VM reproduction used the genuine CLI source from `git show cc09e2e3f560c380445333907469ba813035a7a2:scripts/check-restoration-ci.cjs`: a green latest PR hiding a failed push returns 0 on baseline and 1 on the frozen replacement. VM git/gh responses were stubbed; no GitHub call or credential lookup occurred.
- Added independent in-memory adversarial probes, without editing tests: 164 negative fixtures all rejected. These remove each individual required step from each event, vary job/step completion and conclusions, inject invalid attempts, and add a newer pending run. Positive controls accept attempt 3, reversed listing order, an older failed run behind newer green, and successful automatic runner steps.

### Renderer

- `ops/mission/render-sotu.mjs:289`: body gains only inherited `overflow-wrap:anywhere`; no clipping, font shrinking, or content deletion was added. `:353` changes the count label from merged to tracked, accurately allowing draft PR entries.
- `ops/mission/report-renderer-tests.mjs:50`: the new suite explicitly describes declaration checks, not layout simulation. The four tests cover a long unbroken receipt, negative CSS controls, mixed merged/draft PR wording, and semantic/metadata/receipt preservation.
- Read raw `renderer-red.log`: baseline fails the inherited-wrap and tracked-PR assertions while the other two tests pass. Read `renderer-preservation.log`: it records exactly the two allowed source changes and normalized HTML/DOM preservation. That historical output comparison was inspected, not rerun against concurrently changing parent mission data.

## Fresh Executed Checks

Node `v22.22.2`; all commands completed successfully:

| Check | Result |
| --- | --- |
| `node scripts/check-restoration-ci.test.cjs` | 13/13 pass, zero skipped |
| `node ops/mission/test-renderer.mjs` | Existing renderer contract passes |
| `node --test ops/mission/report-renderer-tests.mjs` | 4/4 pass, zero skipped |
| Read-only in-memory source/workflow/media preservation recheck | Pass |
| Independent offline CLI VM probes | 164 negative fixtures rejected; positive controls pass |
| Genuine baseline-versus-frozen CLI VM reproduction | Old false-green reproduced; new CLI rejects |
| `git diff --check` | Pass |

Inspected raw `ci-contract-red.log` and `ci-contract-green.log`, including the actual `0 !== 1` old false-green failure and 13/13 green summary. The fresh baseline reproduction above independently confirms that the primary RED is behavioral, not merely a fixture/setup exception.

## Residual Scope and Restrictions

- No npm build, dependency installation, GPU/browser test, network/GitHub/production action, commit, or branch operation was performed. Did not invoke the real networked CLI. No report file/browser probe, rehosting, or alternate-browser bypass was attempted.
- Renderer tests generated only isolated temporary fixtures and cleaned them up; they did not render or edit the parent's mission report. The only retained reviewer write is this `review.md`.
- Static CSS/HTML assertions are not viewport, overflow-geometry, keyboard, clipboard, accessibility, or browser proof. The prior IAB file policy rejection remains a limitation, not a passing browser gate.
- Fresh successful complete push AND PR runs for the eventual committed exact SHA are still required. Local structural checks cannot prove the independent job finishes within its unchanged 20-minute cap or that hosted infrastructure succeeds. Duplicating install/build intentionally adds runner work; this review establishes preserved gates, not measured CI speed.
- CLI verification is a point-in-time check of GitHub responses, not continuous monitoring or a lock against later reruns. It uses installed web dependencies and the local named, non-matrix workflow. Dirty-worktree or arbitrary future-workflow attestation is not newly claimed.
- No whole-release/art/math/backend reassessment was performed. The unchanged numerical/model/pixel/timing sources and limits were checked for preservation, not rerun or newly certified.

## Follow-Up: Committed-HEAD Workflow Binding

Fresh bounded re-review on 2026-10-21, at the parent's request. Only the following two source pins supersede the initial review. The initial hashes, 13-test result and 164-probe result above remain historical evidence, not the current checker/test pins or counts.

| Source | New SHA-256 |
| --- | --- |
| `scripts/check-restoration-ci.cjs` | `AB80ED56B114F45F64D11D63445B48414CD33DAE6A85ACC7156B07BB50523402` |
| `scripts/check-restoration-ci.test.cjs` | `094460FF7F6D81FC52A6C51BFD800B35D572EBA2DAB0105030CBCBD41B172DA5` |

Recomputed all five source hashes. The workflow, renderer and renderer-test files match their original full pins above exactly. HEAD is still `cc09e2e3f560c380445333907469ba813035a7a2`; parent state/docs/journal/generated-report changes remain outside this follow-up. No new broad audit was performed.

### Findings and Reconciliation

No remaining actionable P1/P2 finding established for the revised two-file slice. The parent correctly identified a false-green condition in the previously reviewed checker: its working-copy workflow could omit a committed gate and thereby accept CI metadata missing that gate. The new binding fixes that condition; the earlier residual reference to a local workflow is superseded by this section.

- `scripts/check-restoration-ci.cjs:10`: both Git operations explicitly use the repository root as `cwd`, independently of the shell's current directory.
- `scripts/check-restoration-ci.cjs:11` through `:13`: capture and validate actual HEAD, then read `git show <captured-SHA>:.github/workflows/ci.yml`. Expected jobs/steps derive from those committed bytes, not an edited working file. The same captured SHA continues to bind the API listing and run-detail checks. Missing committed workflow fails closed before any GitHub lookup.
- `scripts/check-restoration-ci.test.cjs:23` through `:26`: the fixture asserts the exact SHA-qualified blob request. `:90` adds the paired dirty-workflow/missing-SQL-repeat regression. The fixture's local YAML is deliberately distinct from its committed-workflow response, so a return to filesystem requirements is observable.
- Independently reconstructed the previous checker in memory by reversing only this binding change. Its SHA-256 matches the exact initial `C32DE304...1781FC80` pin above, proving the checker delta is limited to the reviewed change. That exact old source returns 0 for edited local requirements plus a missing SQL-repeat step; the new source returns 1 for the identical fixture. No on-disk source was reverted.

### Fresh Evidence

| Check | Follow-up result |
| --- | --- |
| `node scripts/check-restoration-ci.test.cjs` | 14/14 pass; zero failed/skipped |
| `node ops/mission/test-renderer.mjs` | Existing renderer contract passes |
| `node --test ops/mission/report-renderer-tests.mjs` | 4/4 pass; zero failed/skipped |
| Independent offline VM probes | 166 negative fixtures rejected; positive controls pass |
| `git diff --check -- scripts/check-restoration-ci.cjs scripts/check-restoration-ci.test.cjs` | Pass |

The 166 negative fixtures include 110 individual committed-step omissions across both events paired with matching deletions from local YAML, the exact former false-green SQL case, incomplete jobs/steps, non-success conclusions, invalid attempts, a newer pending run, and a missing committed blob. Every final-source probe also checked both Git commands' repository-root `cwd` and the exact captured-SHA blob argument. Positive controls accept intact committed CI despite malformed or stricter local YAML, explicit attempt 3, unsorted runs, an older failed run, and successful automatic runner steps.

Read `ci-committed-workflow-red.log`: 13 pass/1 fail, specifically the new test's behavioral `0 !== 1` false-green assertion. Read `ci-contract-final-green.log`: 14 pass/0 fail. The fresh independent reproduction and 14-test run agree with those raw logs.

Only this review was appended. All probes were offline VM fixtures; no real verifier/GitHub call, credential read, build, GPU/browser test, report browser probe, commit, branch operation, state edit, or generated-report edit occurred. Renderer runs again used isolated, cleaned temporary fixtures. Actual exact-head push/PR execution, unchanged 20-minute cap viability and viewport proof remain unverified; none is implied by these local results.
