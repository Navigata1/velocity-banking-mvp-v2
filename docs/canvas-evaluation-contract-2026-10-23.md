# Direct Canvas Isolation Evaluation

This is a test-helper optimization, not a financial, artwork or application-motion change.
Both first-attempt CI events for617a2f8 remain failed; their screenshots started with5ms
and35ms remaining. A new source change requires new complete exact-head checks.

## Behavior

Isolation now queries the live DOM inside one page evaluation rather than resolving,
evaluating and disposing a locator handle. It requires exactly one connected HTML canvas
contained in the current stage. It fails closed on missing, ambiguous, detached or
foreign-stage inputs. The existing clip resolver still uses its strict locator snapshot.

The original overlap algorithm, SVG-overlay requirement, early restoration stash, inline
value/priority restoration, supplied clip precedence and post-isolation geometry remain.
PNG capture, opacity/blank rejection, pixel comparisons, actionability, clock origins,
450ms motion,700ms decoded/restored candidate and300ms confirmation remain unchanged.

`page.evaluate` has no per-call timeout. The removed locator timeout bounded selector
attachment, not arbitrary evaluation callback execution. Screenshot completion and outer
workflow checks still reject late results, including restoration/decode. Neither path
establishes a hard cancellation bound; the owned test job provides process containment.

## Evidence And Limits

- Permanent real-callback tests: genuine9pass/2fail RED, then11overlay tests PASS;
 10clip tests and the standing helper entry pass. CPU placeholders are not rendered pixels.
- Predetermined static ABBA comparison:8actual WebGL captures with exact decoded-pixel
 parity and style restoration at desktop/mobile, plus two hidden-canvas negative controls.
 Candidate isolation3.22-4.15ms versus baseline9.06-14.43ms in this small sample.
- Original six-workflow collection:6baseline and6candidate PASS with exact stored bytes,
 financial vitals, focus and real pixels. Candidate maximum611ms in that run, not a future
 reliability guarantee. Overall totals were mixed; no uniform speed improvement is claimed.
- Both collections used the existing q9 preview, explicitly not a new compiled617 build.
 New isolated-build gates are required for the actual source proposal.
- Private decoder-field and VM-prototype harness failures are retained, with CPU
 reproductions before correction. They are not application or timing failures.
- Independent initial review found a private-pin attribution gap, fixed for future
 collections with a genuine negative control. Historical reviewed copies matched their
 recorded hashes; no contamination was demonstrated. The old sample was not rerun.

Installed Playwright source supports the evaluation-path hypothesis, not a measured CDP
roundtrip count, trusted-input latency, CI root cause, or sufficient remote deadline margin.
All production, final photoreal collection, physical-device and backend recovery gates
remain open. No unchanged CI rerun or production promotion is authorized by local success.
