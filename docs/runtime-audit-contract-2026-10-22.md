# Mandatory Web Runtime Audit

## Verdict

The Car/Card material checkpoint `d496f3d` was pushed but is **not fully verified**.
Its pull-request CI failed the mandatory npm audit; its push CI was cancelled.
This focused correction changes audit orchestration and tests only, not application
behavior, financial calculations, assets, dependencies, locks or registry settings.
Production readiness remains false. Both new complete exact-head CI events and the
automatic preview/browser evidence are required before a verified checkpoint.

## Observed Failure, Not An Assumed Lock Defect

- Pull-request run `39711132713`, attempt 1, failed after approximately 301 seconds
  in `Audit web runtime dependencies`, before regression/lint/build/media/native.
  Node was 22.23.3 and npm was 10.9.9. The official Quick endpoint returned HTTP
  400, a retirement notice and `Invalid package tree`. The original Bulk failure
  was not captured. A broken lockfile is **not established** by this diagnostic.
- Push run `39711131110`, attempt 1, was cancelled; its primary job reached media
  dependency installation and lasted 1,217 seconds. Its log says only that the
  operation was cancelled. A timeout is plausible but remains an inference.
  This agent requested neither cancellation nor rerun. Both hero and SQL jobs
  passed in both events. Those successes do not override either failed full event.
- A first local wrapper invocation failed closed on a code-less Quick network
  timeout. Its raw error is retained. That is not a clean security report.
- npm documents Bulk-to-Quick fallback and a default 300,000 ms HTTP timeout.
  These facts explain a possible failure path, not this outage's original cause.

Primary references: [npm audit endpoints](https://docs.npmjs.com/cli/v11/commands/npm-audit/#audit-endpoints),
[npm fetch timeout](https://docs.npmjs.com/cli/v11/using-npm/config/#fetch-timeout).

## Fail-Closed Boundary

`scripts/audit-web-runtime.cjs` invokes the **existing** installed npm CLI through
the current Node executable, with no shell, inside `apps/web`. It does not install
a scanner, select another registry or rebuild the lock. All severities including
informational findings are blocking. Its fixed arguments force online mode and
disable offline preferences; inherited environment or npmrc `offline=true` must
not allow Arborist's skipped-network report to masquerade as an audit.

Only a normally completed exit-0, version-2 report with the complete expected
metadata, nonempty production tree, internally consistent zero severity counts
and empty vulnerabilities can pass. Both vulnerability counts and dependency
categories have exact expected key sets and nonnegative safe-integer values.
Dependency categories overlap and are deliberately **not summed**. Unknown,
partial, contradictory, mixed-error, killed or malformed output fails closed.

Each npm process has a 90-second configured timeout, each HTTP fetch 30 seconds,
and npm's internal fetch retries are zero. At most three fresh processes run with
one-second pauses, a configured 272-second envelope, not proof of OS termination
latency. Only narrowly recognized transport errors or measured official Quick
error shapes can retry; findings and unknown failures stop immediately. The real
HTTP serializer's structured method/URI/status/body/notice is required. Stderr
containing a URL or notice alone is insufficient. Each fresh npm audit starts
with npm's normal endpoint flow; no endpoint is called directly by this wrapper.

No failed audit can be converted to success using a cached prior report, another
scanner, a higher severity threshold, `continue-on-error`, skipped CI steps or
increased job caps. All three existing CI jobs retain their 20-minute caps.

## Verification And Review

Meaningful RED/GREEN tests cover the observed error protocol, mandatory workflow,
every severity, offline/config precedence, complete metadata and process failures.
Independent review initially found an offline bypass, an inaccurate Quick error
fixture and incomplete metadata validation. Original failed probes are retained;
the exact full recorded retirement notice also received a regression test.
Final-source verification passes 58 parent contracts and 65 independent CPU tests,
including existing-npm precedence against hostile environment plus test npmrc.
Seven fresh local stages include web tests, lint and build. An earlier online
invocation received a complete zero report; the final-source live invocation
encountered three consecutive Quick timeouts and **failed closed**, accepting no
report. It was not rerun to seek green. Current security clearance is unknown
until both new exact-head CI audits return complete reports. This failed live
gate is recorded, not waived or overridden by the earlier success.
A locally successful audit is invocation-specific and does not replace CI or prove
that all package classes, native/media toolchains or future dependency versions
are secure. The existing broader security findings remain open.

Evidence is indexed in `ops/mission/evidence/runtime-audit-2026-10-22/`.
The preceding material study remains separately attributable to its own source
and local gate invocation; it is not relabelled as new audit-slice export evidence.
No merge, production promotion, backend/access/data change or report republishing
is authorized by a passing audit or checkpoint.
