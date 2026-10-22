# Hero Replay Continuity

Baseline: `462a218342dfa95343bde6882546e99e882e5c99`.

## Defect And Bounded Change

Replay was a dependency of the scene-ownership effect. Every click disposed the
renderer, model, textures and environment, loaded them again, and signalled
`onReady(false)`. The previous poster briefly returned over the real model.
The actual built-browser regression failed on the disconnected original canvas
before the implementation changed.

Replay now invokes a ref to the current scene's restart callback. That callback
cancels the pending RAF, resets elapsed and previous timestamps, renders the
initial pose, and schedules the same finite turn unless reduced motion is set.
Actual scene cleanup clears the callback and retains all original disposal.
Loading, failures, context loss and offscreen ownership stay separate from Replay.

## Proof Required

- All ten real models at desktop1440 and phone375 retain their actual canvas.
- No extra GLB request, no ready reset or poster reveal during Replay.
- Pixel evidence shows initial-pose reset and renewed original-cadence motion.
- Reduced-motion Replay retains the original still pose and loaded canvas.
- Actual-component CPU lifecycle checks reach the eight-second endpoint, stop
  scheduling/rendering, retain one RAF through rapid replays, and clean up once.
  Permanent mutants reject missing cancellation, a shortened turn and infinite
  RAF. These are scheduler checks, not GPU or browser-event-ordering proof.
- Standing browser/fallback/financial/native/media/CI gates retain original caps.
- Both new complete exact-head CI events, exact READY automatic preview,
  hosted138/seven routes/20served hashes and actual browser proof before receipt.

The evidence directory is `ops/mission/evidence/hero-replay-2026-10-22/`.
Local preflight is not a hosted or production completion claim.

## Material Findings, Not New Artwork

The independent CPU survey records the Car's source-preserved flake normal at
roughly6.08degrees mean local tilt, and Card brushing at roughly0.041degrees.
These are local texel measurements, not screen realism scores. The current
Car paint PNG is not the historical lossy paint payload. Missing maps, reversed
roughness channels, gamma errors and a causal link to X4122 were not demonstrated.

Two isolated future paired-render experiments are documented in the survey:
Car paint normal strength .30vs.15, and Card silver anisotropy .65vs.30.
They have NOT been rendered, shipped, or approved. Keep fresh matching A/B
frames, camera, backend, lights, maps, source bytes, attribution and budgets.
Card has only524bytes of model-budget headroom. Do not add larger buffers/maps
or make a collection-wide lighting change to compensate for unproven causes.

All ten GLBs/posters/three asset manifests and nine financial modules are frozen
in this slice. Photoreal/full-angle/material identity approval, unchanged lossy
Tireside, inherited hardware/D3D X4122, media-toolchain security and remaining
scenario/lender/calendar/backend/accessibility/device/native/release gates stay
open. No merge or production promotion is authorized by this checkpoint.
