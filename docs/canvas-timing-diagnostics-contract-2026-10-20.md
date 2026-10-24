# Canvas Timing Diagnostics

This test-only change records phase costs without changing application animation,
the700ms decoded-selection limit,300ms stability limit, absolute deadlines, pixel
assertions or retry policy. It is not a fix for the original CI reliability miss.

The old capture error recomputed remaining time after rejection and called that
the invocation budget. A fake clock reproduces a supplied9ms timeout being reported
as1ms. The corrected error retains the actual invocation-time budget and original
exception cause. Monotonic timings record dispatch, parallel waits, scrolling,
clip/isolation, capture, cleanup and decode, including failure states. Overlapping
phases are not additive; a wait still running when another fails has no end time.

Four deterministic tests cover accurate invocation budgets, unchanged absolute
deadline rejection, exactly-once calls, phase/error tracking and dispatch failure
reporting. The existing helper suite runs them. A read-only independent review
found no scoped issue; it did not establish production performance or root cause.

A fresh local run during concurrent Hermes export failed at718ms: settled-state
wait returned around587ms, capture completed around689ms, test-overlay cleanup
ended around712ms, and decode ended around718ms. The unchanged gate correctly
rejected it. A subsequent serial full desktop/mobile/reduced-motion run passed.
This identifies costs in that local run, not the cause of the earlier CI miss or
an application runtime defect. Instrumentation overhead remains a residual risk.

Both final exact-head complete CI events and hosted proof remain mandatory. Keep
failed logs and do not loosen the limit, move verification outside the deadline,
silently retry assertions or retune runtime motion merely to make a test pass.
