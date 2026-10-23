# Canvas Capture Transport

This changes only the Money Loop browser-test transport and its standing CPU
contracts. Application animation, rendering, financial calculations, models,
materials, dependency locks and CI workflow remain unchanged.

## Request Boundary

The normal selection caller previously queried scroll separately before the
required canvas-overlay isolation evaluation. That evaluation now returns the
same cache decision and, when needed, a pre-isolation geometry snapshot.
It removes one serial browser request on a cache hit and the separate locator
geometry request on a changed-scroll path. No measured time saving is claimed.

An absolute scroll difference below1CSSpixel retains the exact previous clip
object. At or above1pixel in either direction, current fractional border geometry,
viewport and scroll are sampled before isolation. Confirmation uses the exact
candidate clip. Explicit supplied-clip callers retain unconditional precedence;
ordinary null-clip callers retain their existing post-isolation geometry path.

The `candidate.isolation` diagnostic now includes the cache/geometry observation.
Its `candidate.clip` phase follows it and measures Node-side selection/validation,
not a separate browser request. Compare old/new phase meanings explicitly.

## Unchanged Gates

- Original input timestamp includes dispatch and settlement work.
- Candidate screenshot, overlay restoration, real PNG decoding and material
  verification remain inside700ms. Confirmation restoration/decoding remain
  inside300ms from actual candidate completion.
- Fractional CSS crop, scale=css, canvas containment, overlapping-SVG isolation,
  material-change and stability checks, exactly-once restoration and original
  screenshot failure causes remain. There is no added capture/assertion retry.
- All18normal actions, six additional selection workflows, real WebGL2/DPR,
  reduced-motion behavior and20-minute CI job limits remain unchanged.

## Evidence Scope

The first expanded CPU fixture had one incorrect post-isolation geometry-read
expectation on a cached path. That fixture error is retained, not called a product
failure. Corrected unchanged-source RED:21pass/2intended behavior failures.
Current CPU coverage:25tests, including the original11and real normal-caller
callbacks, synthetic valid PNGs, thresholds, corrupt/unchanged/unstable images,
failure restoration and exact700/701and300/301boundaries. Nine private behavior
mutations are rejected. CPU clocks/DOMs are simulated, not browser/GPU evidence.

Changed-scroll invalid geometry is now validated inside the capture finally
scope, after isolation, and restored before rejection. The earlier separate
query validated it before entering isolation. The same error is not guaranteed
to win when several independent failures occur together. Cache observation is
also atomic with isolation rather than an earlier browser request; arbitrary
concurrently moving layouts do not have a proven byte-identical crop.

The prior111push screenshot failure remains failed despite its companion pass.
This optimization is not a demonstrated cause or fix for historical timing
failures. Current browser and exact-head CI proof are still required; this
contract provides no photoreal, physical-device or production approval.
