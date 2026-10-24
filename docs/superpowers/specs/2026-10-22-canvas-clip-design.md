# Strict Canvas Clip Snapshot

## Decision

Use the independent review's smaller alternative, not overlay/geometry fusion.
Resolve the canvas CSS border box, viewport and scroll in one strict locator
evaluate after overlay isolation. Keep validation inside the existing caller's
restoration-protected body. Do not reuse the earlier overlap rectangle.

This is a measured test-harness optimization candidate, NOT an established CI
root-cause fix. No runtime, motion, material, financial or asset change is planned.

## Evidence

- Both original f7821ba CI events failed desktop rapid-return capture with1ms
  remaining; the one whole unchanged push retry also failed, with32ms remaining.
  PR retry passed all three jobs; the required pair still failed. No third
  unchanged retry. The failed checkpoint is recorded at PR256 comment6349085540.
- Uninstrumented local/hosted desktop rapid decoded passes were630/639ms.
- Exact-source private baseline2bdff92e passed6/6; phase capture includes a
  10.03ms clip resolution. CPU2 diagnostic b2723111 failed desktop decode13mslate
  and mobile helper/restore16mslate (screenshot about7mslate,decode not reached);
  their clip phases cost23.52/22.37ms. Other4pass.
- These are local observations. CPU throttling does not emulate Node decoding,
  GPU/compositor/whole-machine contention or Linux CI. Instrumentation overhead
  remains possible; no arithmetic extrapolation guarantees a future pass.
- Initial d301c6e1 diagnostic used a VM realm and failed prototype-sensitive
  equality before the measured workflows. Retained as invalid harness evidence,
  not a product defect. Host-realm CommonJS evaluation keeps original assertions.

## Required Contract

- Keep the strict attached canvas locator and current main-document scope.
- Return unrounded CSS border-box x/y/width/height and separate scrollY.
- No DPR, drawing-buffer, scroll-offset arithmetic, clamping or edge tolerance.
- Require finite numbers, positive dimensions and complete viewport containment.
- Exactly fitting right/bottom boundaries remain valid.
- Explicit supplied clips keep identity/precedence; do not recalculate them.
- Missing/ambiguous/detached targets reject; no partial-canvas screenshot success.
- Geometry errors and screenshot errors retain existing exactly-once restoration.
- Keep actual pixels authoritative, including measurable-but-hidden WebGL
  adversary rejection and original material/spatial stability thresholds.
- Do not change450ms motion,700ms decoded/restored candidate,300ms confirmation,
  deadline origins, original18actions, six extra workflows or retry policy.
- Add buffered phase diagnostics to the six-workflow smoke using the existing
  timing helper. Flush on failure after the measured operation, never during it.
- Preserve financial/runtime/assets/dependencies/locks/SQL/workflow/cap bytes.

## Limits

The browser snapshot is coherent within one callback, not atomic with a later
protocol screenshot. Preserve/expose race limitations; do not claim iframe,
pinch-zoom, hardware, production or universal timing reliability approval.

## Candidate Findings

The real six-workflow diagnostic passed normally. Artificial CPU2 passed5/6:
desktop rapid-return decode finished nine ms beyond the700ms deadline, so the
original assertion rejected it. The old CPU2 sample passed4/6. Neither establishes a reliable latency
improvement or explains the original CI failure. Failure phases now identify
wait/isolation/clip/capture/restore/decode costs without changing those budgets.

Fixed O,O,N,N and N,N,O,O interior captures produced equal observed old/new PNG
hash sets for eight viewport/fixture pairs. Rotated widths differ by about
0.00001049 desktop/0.00000191 mobile CSS px; exact coordinate parity is NOT claimed.
128 real boundary/locator cases had matching acceptance, including actual
quantized near-edge placements. This is finite main-document evidence only.
Twenty CPU groups include real isolation/restoration callbacks and a rejected
deletion-only cleanup mutant. Generic zero/removed isolation failures are not
misreported as resolver-branch coverage; separate direct-locator proof exists.
