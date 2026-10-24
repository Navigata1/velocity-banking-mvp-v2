# Independent Audit Gate Review

**Final verdict: no actionable findings at the pinned final source, within this
bounded CPU review.** All initial findings and the remaining c6c2f7ee notice
matching failure are resolved at the final tested pin. Earlier failures remain
preserved below; no old green, live registry success or complete CI approval is
substituted for the final evidence.

## Final Results

Executed exactly once on final wrapper2b0bd50e via `review-final-run.cjs`:

| Independent Suite | Final Result |
| --- | --- |
| `review-wrapper-negative.test.cjs` | 16/16 pass |
| `review-process-mechanics.test.cjs` | 7/7 pass |
| `review-observed-timeout.test.cjs` | 12/12 pass |
| `review-final-boundaries.test.cjs` | 30/30 pass |
| Combined CPU tests | 65/65 pass, exit0 |
| `review-config-precedence.cjs` | 3 config-get calls, exit0 |

The parent's58 protocol tests are SEPARATE, parent-reported RED1fail57pass then
GREEN58; this sidecar did not rerun or count them as independent tests.

- Full recorded CI notice now matches an exact TWO-literal allowlist. Endpoint,
  method, status, body, report/error-shape and zero-exit guards remain intact.
  The previously failing real-notice serializer reconstruction now gets its
  intended bounded retry. Unrelated notices and mixed/partial reports still stop.
- All five finding severities stop immediately, including exit0 and after a
  transport failure. Only complete exact version2 zero reports at exit0 pass.
  Metadata has exact six dependency keys and six vulnerability-count keys;
  invalid/unknown/missing fields fail. No dependency-category sum is imposed.
- Captured actual executor flags beat BOTH NPM_CONFIG_OFFLINE=true and a unique
  test npmrc with offline=true: effective offline=false, prefer-online=true,
  prefer-offline=false. Fixture-only and hostile-env+fixture controls stay
  offline=true. All three actual installed npm10.9.7 config-get calls reported
  zero network attempts. No audit/advisory request was run.
- Network-blocking preload covered final CPU test workers as well. Zero network
  attempts; no tracked edits; no real/global/user npmrc mutation. Own temporary
  fixture content was unchanged, known file unlinked, empty directory removed,
  and directory nonexistence independently checked by the final runner.
- Direct Node/installed CLI, absolute web cwd, shellfalse, timeout90000,
  fetch-timeout30000, fetch-retries0, three-attempt/two-one-second pause bound,
  raw output and immediate abnormal-child failure checks pass. Parsed workflow
  keeps both mandatory named steps and all three20minute caps.
- Raw on-disk pins were checked before and after the final run; unchanged.
  The timeout suite's old stage-only "three-line delta" hash assertion was
  replaced with a current bounded-command assertion before this final run;
  its original f7b07603 stage result/hash evidence remains preserved below.

Limits: CPU/DI checks and config precedence do not establish live audit success,
actual90second OS kill timing, npm10.9.9 equivalence, complete exact-head CI,
preview/hosted verification, or production approval. Original Bulk failure remains
unknown; cancellation timing is not proof of its cause.

## Final Source Pin

| File | SHA256 of Raw Bytes |
| --- | --- |
| `scripts/audit-web-runtime.cjs` | `2b0bd50e6a4c90681a8c73bda2530db8ab10de32772a0f13d39687f43a89142a` |
| `scripts/audit-web-runtime.test.cjs` | `65c56332b792249dee464e1cb9b16326cb405b8ec0e7defdc10d832ae7b7f326` |
| `.github/workflows/ci.yml` | `36e31120be66c6a65e153a4f13295a0b77f11433ba6b0dc6d161380f47c32bf9` |
| `scripts/check-restoration-ci.test.cjs` | `00a23a7e0eb6bfc385fdb57a45b9619b3666085288da375ddfe5b5e186df285a` |

## Collector Artifacts

All under ignored `.superpowers/sdd/2026-10-22-audit-gate/`:

- `review-final-independent.log`: complete final65test TAP stdout/stderr and exit0.
- `review-final-config.log`: complete final config probe stdout/stderr and exit0.
- `review-final-run-results.json`: current raw pins, per-suite counts, run-once
  accounting, config cleanup, parent58 distinction, final bounded verdict.
- `review-config-precedence-results.json`: final config commands/raw output.
- `review-source-pins.json`: final pins/verdict plus all prior snapshot results.
- `review-c6c2f7ee-results.md`: retained36/37 earlier failure, not overwritten.
- `review-config-precedence-c6c2f7ee-results.json`: archived prior config result.
- `review-npm-serializer-fixtures.json`, `review-serializer-details.md`: actual
  installed serializer fixture generation and exact expected metadata keys.

## Resolved c6c2f7ee Finding (History)

Resolved by the final exact-two-literal notice allowlist and final65/65 run.

**P2: Accept the complete retirement notice recorded in real PR CI.**
Location: `scripts/audit-web-runtime.cjs:31`.

The retained PR job log line281 records:

`This endpoint is being retired. Use the bulk advisory endpoint instead. See the following docs for more info: https://api-docs.npmjs.com/#tag/Audit`

The parser calls array `.includes()` with only the shorter first two sentences,
so it requires a whole header value equal to that shorter string. Installed
`npm-registry-fetch/lib/check-response.js:14-15` logs the npm-notice header value
directly. A focused CPU reconstruction supplied the exact retained notice text
to npm's actual HttpErrorGeneral/audit-error/jsonError serializer path; every
other structured field matched the accepted fixture. Actual result: one attempt,
false, no retry. Required by the intended observed-response recovery: accept
this exact complete notice literal while keeping all URI/method/status/body/error
guards. Do not broadly accept arbitrary suffixes or unrelated notices.

Evidence: `review-final-boundaries.test.cjs` test "the exact notice recorded in
real PR CI can receive the same bounded retry", expected2calls, actual1. This
is a deterministic serializer/parser reproduction using recorded text, NOT a
fresh HTTP capture or proof of the original Bulk failure.

## c6c2f7ee Independent Results (History)

- Command: `node --test .superpowers/sdd/2026-10-22-audit-gate/review-final-boundaries.test.cjs .superpowers/sdd/2026-10-22-audit-gate/review-process-mechanics.test.cjs`.
  Exit1;37tests;36pass/1fail. Final negative suite29/30; process suite7/7. No
  failed-case rerun against this unchanged source.
- Complete exact six dependency keys and six vulnerability-count keys now
  validate; missing, invalid, unknown and mixed report shapes stop without later
  success. Every severity finding stops immediately at exit0 as well.
- The actual installed serializer's short-notice Quick envelope is now recognized;
  wrong URI/scheme/path/query, method, auth/rate statuses, missing/wrong notice,
  nonempty error detail, extra fields, mixed reports and zero exit do not retry.
- Actual executor remains direct Node plus installed CLI, absolute web cwd,
  shellfalse,90second timeout,30second fetch,0innerretries,3attempts/2one-second
  pauses. Missing CLI and child errors stop without a retry. Parsed workflow
  retains mandatory steps and all three20minute job caps.
- `review-config-precedence.cjs` PASSED on the SAME c6c2f7ee wrapper pin. It
  captures the actual executor flags, then runs ONLY existing npm10.9.7 CLI
  `config get offline prefer-online prefer-offline` with a network-blocking
  preload. Fixture-only and hostile-env+fixture controls report offline=true;
  actual captured flags report offline=false,prefer-online=true,
  prefer-offline=false despite NPM_CONFIG_OFFLINE=true plus temporary npmrc
  offline=true. Three config calls, zero audit calls, zero network attempts.
  Own fixture content unchanged; known file unlinked and empty directory removed.
  Raw results: `review-config-precedence-results.json`.
- Configuration precedence/CPU protocol correctness is not live registry success,
  actual90second OS-kill proof, or complete exact-head CI/preview approval.

## c6c2f7ee Tested Pin (History)

| File | SHA256 |
| --- | --- |
| `scripts/audit-web-runtime.cjs` | `c6c2f7ee6ea62d95c4c934429bf77de88fa229fbafae44c049f63c92a48aaa42` |
| `scripts/audit-web-runtime.test.cjs` | `6a0a38b737392aea00c1db7175b4a8926d09ef409b9cc0c3a31fc7508f6fdfcb` |
| `.github/workflows/ci.yml` | `36e31120be66c6a65e153a4f13295a0b77f11433ba6b0dc6d161380f47c32bf9` |
| `scripts/check-restoration-ci.test.cjs` | `00a23a7e0eb6bfc385fdb57a45b9619b3666085288da375ddfe5b5e186df285a` |

## Measured Timeout Delta

Reviewed snapshot: wrapper
`f7b07603ed05f48aafc033465a15e2846e535a956e6d434aa66455d68e684467`,
tests `6064cf78d21b4a1104214614612567792f695123e2526cdb91984a4bbd015864`;
workflow unchanged from the initial pin below. The wrapper differs from the
initial reviewed source by exactly the three-line measured Quick-timeout
exception, verified by removing those exact lines in memory and comparing hashes.

`review-observed-timeout.test.cjs`: 12/12 pass, exit 0. Reads the JSON directly
from the supplied `live-audit.log` (SHA256
`be4ab4a8625dc0d9625ea36e876a670d308bf1c5e74d05c33f957a3ddf45afbf`).
Tests exact two-root-key/two-empty-error-key matching, 25 near misses, zero exit,
mixed report/abnormal-process/malformed output, exact three-attempt exhaustion,
all five finding severities after a timeout, and no later-green seeking.
No new issue in that narrow addition; the three initial findings were not fixed
by it and remained open. Original failed probes were not rerun.

`review-serializer-details.md` and `review-npm-serializer-fixtures.json` now give
the exact installed serializer output and SIX dependency metadata keys. The
separate final-source negative suite and actual CLI config-precedence probe are
now executed at the current tested pin above. The earlier timeout-only stage is
historical and is not approval of later edits.

## Initial Findings (Preserved History)

### P1: Inherited offline mode can pass without a registry audit

Location: `scripts/audit-web-runtime.cjs:2`, `:19`, `:41-42`.

`executeNpm` inherits npm environment/config and does not disable or reject
effective offline mode. Installed npm 10.9.7 Arborist skips its registry request
when `offline === true` (`audit-report.js:304-307`), yet its normal report and
exit-code machinery produces exit 0, version 2, empty vulnerabilities, six zero
counts and the full prod 50 / total 472 inventory. The wrapper accepts that as
a clean audit. This was reproduced using the real read-only lockfile tree and
installed npm modules with registry fetch stubbed to throw: fetch calls were 0.
A VM probe then supplied `NPM_CONFIG_OFFLINE=true` to the actual wrapper executor
and returned that real npm report from a stubbed child: `passed` was true.

Required: deliberately prevent the offline skip at the child boundary, or reject
effective offline configuration. Checking only the environment is insufficient
if an npmrc supplies it. Add an executor/config-boundary test, not only injected
report tests. No registry/auth/config-file/lockfile mutation is needed. The
generic Arborist `audit:false` skip was also observed, but npm's explicit audit
command overrides that option to true; it is NOT claimed as a reachable CLI
bypass here.

### P2: The real npm Quick error shape never reaches the retry branch

Location: `scripts/audit-web-runtime.cjs:21-26`;
`scripts/audit-web-runtime.test.cjs:4-8`, `:29-33`.

The classifier accepts only a sole root `error` object with string code, summary
and detail. Installed npm's actual `audit-error.js:24-37` instead buffers root
`message`, `method`, `uri`, `headers`, `statusCode`, `body`, then throws the string
`audit endpoint returned an error`. npm's generic JSON error contributes only
empty summary/detail, not `E400`; the original fetch code is not
forwarded. The independent fixture was produced by npm's actual error serializer
from its `HttpErrorGeneral`, with official Quick URI, POST, status 400 and the
retirement notice in `npm-notice`. Adding npm's generic error summary still
failed at line 22: one attempt, no retry. The parent green fixture is a different
protocol. This fails closed, but does not implement the intended recovery.

Required: add npm-shaped error-only fixtures and narrowly support the structured
official URI/method/status/notice response if retained by policy. Do not loosen
the mixed report/error guard or infer transport solely from free-form stderr.
The installed serializer also drops a raw ECONNRESET code; that does not justify
broad message-based retries. CI npm 10.9.9 was not available for local source
inspection, so equivalence to that version is not asserted.

### P2: Incomplete and contradictory version-2 schemas can pass

Location: `scripts/audit-web-runtime.cjs:10-19`;
`scripts/audit-web-runtime.test.cjs:4`.

Two independent zero-exit probes were accepted as clean: removing the real
`metadata.dependencies.optional` field, and adding
`metadata.vulnerabilities.unknown = 1` beside all known zero counts and total 0.
The parent clean fixture itself omits four normal dependency metadata fields,
so the green suite does not establish the promised complete-report contract.

Required: validate the complete expected version-2 metadata shape, including
nonnegative safe-integer dependency counts, and reject unexpected vulnerability
count keys/inconsistent positive counts rather than silently ignoring them.
Do not sum dependency categories: npm categories overlap, as the real fixture
demonstrates. These are proven validator acceptance failures, not evidence that
npm or the failed CI job emitted either malformed report.

## Independent CPU Evidence

- `node .superpowers/sdd/2026-10-22-audit-gate/review-npm-cli-probes.cjs`:
  exit 0; installed npm 10.9.7; real virtual lockfile inventory; zero registry
  calls; offline/disabled-Arborist zero reports and actual error serialization.
- `node --test .superpowers/sdd/2026-10-22-audit-gate/review-wrapper-negative.test.cjs`:
  exit 1; 16 tests, 12 pass, 4 fail. Failures: actual Quick envelope, offline
  inheritance, missing dependency metadata, unknown positive vulnerability count.
  Failed probes were not retried or rerun to seek green.
- `node --test .superpowers/sdd/2026-10-22-audit-gate/review-process-mechanics.test.cjs`:
  exit 0; 7 tests, all pass. Source pin matches the negative suite.
- Every known severity fails immediately even at exit 0 with a clean response
  queued. Auth/TLS/rate-limit failures, mixed reports and child errors/signals
  stop without accepting a queued success.
- The actual executor, with only child process creation stubbed, uses
  `process.execPath`, an existing npm CLI, `shell:false`, the absolute web cwd,
  `timeout:90000`, fetch timeout 30000, fetch retries 0 and bounded output.
  Missing CLI candidates fail without spawning; invalid `npm_execpath` falls back
  to the installed npm. Retry exhaustion is exactly three calls/two 1000ms pauses,
  retaining stdout/stderr. No alternate scanner/registry/cache-success branch was
  found in the wrapper. Offline inheritance above remains a distinct bypass.
- Parsed workflow requires both named contracts/audit steps, no conditional or
  continue-on-error on audit, regression tests after audit, and all three original
  job caps at 20 minutes. Worker/native audit commands remain outside this change.
- Timeout result handling/configuration is verified; no live 90-second hang was
  induced. DI tests do not prove actual OS termination, registry response shape,
  or freshness. No claim beyond the configured 272-second process/pause budget.

## Initial Source Pin

SHA256 of raw on-disk bytes, rechecked at initial review close. Historical only;
not an approval of later parent edits:

| File | SHA256 |
| --- | --- |
| `scripts/audit-web-runtime.cjs` | `6b8087f513f1b2a117eb20bab0f8408a9cdd089ba27f3718edc79db30b7a2db4` |
| `scripts/audit-web-runtime.test.cjs` | `d4d81693245f230b1bac568a6b94d691e85392098a1241aa5888948e6defb894` |
| `.github/workflows/ci.yml` | `36e31120be66c6a65e153a4f13295a0b77f11433ba6b0dc6d161380f47c32bf9` |
| `scripts/check-restoration-ci.test.cjs` | `00a23a7e0eb6bfc385fdb57a45b9619b3666085288da375ddfe5b5e186df285a` |

## Root-Cause And Ownership Boundaries

- Failed-primary log lines 277-290 prove the mandatory audit lasted approximately
  301 seconds, reached official Quick 400 with retirement notice/invalid-tree
  body, then exited 1. Neither that message nor this review proves a broken lock
  or the original Bulk failure. Installed Arborist's Bulk-to-Quick catch path
  explains a possible fallback class only.
- The preceding `audit-runtime-live.log` proves a recorded complete version-2
  zero report for that local invocation. It does not replace the failed CI result
  or approve either complete exact-head CI event.
- Supplied local `failed-ci-final.json` confirms both original d496 attempt-1
  events terminal: push39711131110 cancelled, primary1217 seconds at Install media
  workspace dependencies; PR39711132713 failed at Audit web runtime dependencies.
  Hero and SQL jobs succeeded in both. The push raw primary log line1339 says
  only `The operation was canceled.` Timeout causation remains inference; this
  review did not request cancellation. Neither event is a fully verified pass.
- Parent live process44596 was not touched; supplied logs were read only. No
  process polling, cancellation or network was performed by this review.
- All writes are `independent-review.md` or `review-*` under the ignored
  `.superpowers/sdd/2026-10-22-audit-gate/` directory. Ignore status is established
  from the ancestor `.superpowers/sdd/.gitignore` containing `*`, not git commands.
- No tracked edits, git commands, network/browser/GPU/full-gate runs, installs,
  real dependency/config/lockfile mutations, servers, commits, agents or model
  overrides. Only the explicitly authorized unique test npmrc/cache directory
  was generated, verified, and cleaned nonrecursively by the config probe.
  Ports 53143/53144 and unrelated agent 01a15930-e564-7472-aa03-09dd80cb89fa
  were not touched. Application/assets/financial/material source was not changed.
