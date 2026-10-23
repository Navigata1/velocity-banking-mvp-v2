# House Depth Study

## Decision

Run a private baseline/candidate comparison of House self-shadows. This is the
agent's implementation choice under the user's autonomous go-ahead, not a new
user-approved artistic result. Keep the current product unless the candidate
shows a useful, consistent gain.

The verified starting point is6ff5568, PR256 receipt6360930706. Its fresh29local
gates, both complete first-attempt CI events, second full hosted15/210/20 run,
and eight actual IAB financial states pass. It is not production-ready.

## Why This Hypothesis

The current HeroModelStage sets an environment, hemisphere light and two direct
lights, but enables no shadow map or mesh cast/receive flags. Fresh full-size
House imagery is detailed but still reads as a flat-lit miniature. Existing
glass/interiors/recesses make self-shadowing a concrete hypothesis; absence of
shadows is not proof that adding them improves the result.

The earlier House half-normal study was rejected as effectively imperceptible.
Earlier Car clearcoat/direct-light/HDR scalar studies were also rejected. Do
not repackage any of those exact candidates as new progress.

## Alternatives Considered

- Reduce fill or change the room: changes the lighting balance and repeats
  earlier broad-lighting tradeoffs. Not selected for this comparison.
- Bake new occlusion maps: changes asset sources, approximate material maps and
  delivery budgets before proving the missing-depth hypothesis. Deferred.
- Test shadows from the existing key on the existing geometry: selected because
  camera, room, exposure, asset and material parameters can remain identical.

## Frozen Boundary

- Original House GLB, all ten GLBs/posters, source maps and provenance stay exact.
- Existing light positions/intensities/targets, room, exposure1.15, primary
  camera/framing, yaw/easing and finite8second turn plus1second rest stay exact.
- No new ground plane, decorative stage, UI, financial calculation or persistence.
- Baseline and candidate use independently loaded, unshared scenes/resources.
- Candidate changes only key-shadow configuration and eligible mesh flags.
- Transparent glazing must not become an opaque shadow caster. Alpha-cutout
  foliage needs its real material cutoff preserved, not rectangular leaf cards.
- Fit the shadow camera to the whole rotation envelope; never move the main
  camera or the light target to manufacture a better composition.
- Use the installed Three0.185.1 and local HyperFrames0.7.56 wrappers. No new
  dependency, lock update, automatic skill upgrade, telemetry upload or cloud render.
- Existing450/700/300ms/pixel/geometry gates are not changed for a visual candidate.
- Initial diagnostic settings are a2048shadow map,2.5% envelope padding, zero
  depth bias and a half-texel world-space normal offset. These are the agent's
  starting values, not measured optima. Pass the actual Three namespace into
  the private helper so Node and browser execute identical helper bytes.

## Acceptance

Use one predeclared A/B collection at0,2,3,4,5,6,8.5seconds,1920x1080/DPR1.
Inspect all fourteen original-size frames, not just a contact sheet. Record
nonblank/framing checks, real renderer/shader warnings, draw counts, fetches,
seek determinism and owned-resource cleanup. Software measurements are not
physical-device performance or hardware clearance.

Reject if shadows add acne, detached edges, opaque glass, leaf rectangles,
moving frustum cuts, unclear details or no meaningful visible improvement.
An accepted private comparison still needs real375px web/video review,
permanent contracts, the standing local/remote/hosted/manual gates and a new
exact-head receipt before product adoption. All-ten photoreal approval remains open.
