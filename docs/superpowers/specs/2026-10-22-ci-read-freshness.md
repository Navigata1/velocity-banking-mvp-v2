# Revalidate exact-head CI discovery

## Scope and evidence

The application checkpoint `55a0d953fbd0f24818f9afba9427019657ab3fb6` passed
both whole CI events: push `39791788358` attempt 2 and PR `39791798657` attempt 1.
All three jobs per event, declared steps, cleanup and six actual checkout stdout
guards were retained. Hosted verification passed 14 suites / 183 workflow-layout
executions / 20 exact GLB and poster hashes, plus six manual Portfolio states.

The original canonical checker failed: a default head-filtered REST response
contained zero runs despite the completed events. A first no-cache-only change
passed fixtures but still failed live. Requests with `no-cache, no-store,
max-age=0` and `Pragma: no-cache` returned both events, and the corrected real
checker then passed. These observations do not prove the cache layer responsible
or guarantee universal API freshness. Missing or incomplete results still fail.

## Implementation and acceptance

- Add only request revalidation headers to run discovery, with no fallback to an
  older SHA, successful attempt, or preview approval.
- Exercise the actual CLI in the existing fixture harness: cached-empty versus
  complete listing; cached-green attempt 1 versus fresh failed attempt 2.
- Preserve all strict workflow/job/step/cleanup and source-identity contracts.
- No workflow, timeout, dependency, app, calculation, asset or backend changes.
- Prove runtime source parity with 55a, retain its 495-file evidence cut unchanged,
  and explicitly label its 29 local gates and browser evidence as inherited.
- Run focused local CLI, runtime-audit and mission-renderer tests afresh. The new
  pushed head needs both complete CI events and the known automatic READY preview.
  It is not a production release, merge, backend certification or art approval.

## Retained failures and next work

The first 55a push hit a host port 54322 conflict before SQL. One whole unchanged
rerun passed; the port owner and reliability cause remain unresolved. Previous
short-budget screenshot failures and Three warnings are not closed by this work.
Supplied lender inputs remain preserved but not numerically enforced. Actual
lender/calendar behavior, ten-hero photoreal approval, backend alignment and
physical native-device verification remain production gates.
