# Strict Selection Return Diagnostics

This is diagnostic and CI-artifact work, not a Money Loop animation fix or proof
of the historical capture timeout's cause. The actual click, state read, action
order, 450ms observation, 700ms decode and 300ms stability limits stay unchanged.
`settledPixels` and its separate capture-phase origin remain byte-identical.

`returnStarted` stays before the existing click. A separate timing instance wraps
only the existing `previous.click()` and following state read. These measurements
are Node client-call roundtrips, not pure DOM dispatch, GPU or compositor time.
Both success and failure retain the separate observation. Failure logs and its
receipt are recorded before the existing debug screenshot, including a failure
before pixel capture or a secondary screenshot rejection. No retry is added.

The standing catch-extraction test explicitly receives the new lexical local;
it does not obtain it from a global shim. Every original assertion is retained.
Two durable cases check observations with and without capture-phase evidence
while the debug screenshot is pending and after it rejects. Private full-caller
tests cover the unchanged operation sequence and strict boundary controls.

The existing Three test step gains only `id: three_stage`. Its existing proof
upload runs only after that actual step succeeds or fails, excluding cancellation
and skipped/missing outcomes. Commands, paths, required-file behavior, step order,
SQL passes and job/cleanup caps are unchanged; only two frozen step hashes change.
The explicit status function avoids the default success-only condition, consistent
with [GitHub's expression reference](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions).
CPU truth tables are not a live GitHub expression-engine test.

V1 remains held: 53 private passes used a shim that masked the actual standing
suite's ReferenceError (baseline5/5, candidate4/5). V2 repairs the harness binding,
adds durable coverage and is independently accepted for limited CPU integration.
Root full regressions, lint, types and CI contracts pass; new remote proof is
still pending. Neither
passing instrumentation nor a later successful run retroactively proves a cause.
No assets, application behavior, financial calculation or dependency changes.
