# Visible-Time Hero Clock

## Scope

InterestShield keeps its finite full turn, original rest pose, easing, materials,
camera, asset-centered dashboard and reduced-motion option. This correction changes
the web stage's time accounting, not its artwork or financial calculations.

The previous `Math.min(delta, 0.1)` discarded visible time when callbacks arrived
more than 100ms apart. In a controlled actual-component test, sixteen 500ms
intervals advanced only 1.6 seconds of the eight-second turn.

## Clock Rules

- The first visible RAF establishes the timestamp origin. Zero is a valid timestamp.
- Subsequent visible RAF intervals count in full, with negative deltas bounded at zero.
- The endpoint remains one revolution after eight accumulated visible seconds.
- Once the endpoint is reached, the stage requests no more animation frames.
- Document visibility transitions clear the previous timestamp. Hidden gaps are not
  counted, even when the browser delivers no callbacks while hidden.
- Replay cancels the pending frame and resets both elapsed time and its timestamp.
  The first subsequent visible frame establishes the new origin.
- Reduced motion stays at the original still pose. Replay does not refetch the
  asset, compound material changes or construct another renderer.
- Teardown removes the owned visibility listener before resource disposal.

## Parent Lifetime Boundary

`AssetHero` still removes its child when its visibility/on-screen conditions are
false. Returning to view therefore creates a fresh stage under that existing
policy. Child-clock pause tests do not promise that the whole application retains
the same object, does not refetch, or resumes the same turn after hiding.

The private parent/child probe executes the actual sources through a synchronous
hook/event bridge. It covers hidden/offscreen disposal and fresh creation, model
key change with reduced motion, loading failure/retry and late disposed loads.
It is not actual React scheduling, WebGL/browser or physical-device proof.

## Evidence and Release Status

The permanent lifecycle suite first retained three passing baseline cases and
seven intended assertion failures against unchanged production source. The clock
correction then passed ten cases. An additional visible-Replay-origin case raises
the current total to eleven. Six targeted mutations reintroduce the old cap,
truthy timestamp, missing visibility reset, missing listener removal, stale Replay
timestamp and stale Replay elapsed time; each must fail its selected behavioral
assertion. Existing resource, material, ownership and error contracts remain.

Fresh web tests, 227 media contracts, full web lint and TypeScript checks pass.
Independent review and fresh full release gates are recorded separately; this
document alone does not approve a push or production release.

The initial private parent probe had a recursive walker bug; its four stack
overflows are retained as harness failures, not application REDs. The next run's
cross-VM prototype comparison failure is also retained. Only the corrected four
passing cases support the bounded parent-policy statement above.

## Limits

This is not a click-to-rest wall-clock, frame-rate, smoothness, energy or memory
guarantee. A slow or stalled browser can skip visual samples while still reaching
the right time endpoint. No claim is made that the clamp caused historical Chrome
instrumentation delays. Existing financial, backend, device, accessibility and
all-ten photoreal production gates remain open. PR256 remains draft.
