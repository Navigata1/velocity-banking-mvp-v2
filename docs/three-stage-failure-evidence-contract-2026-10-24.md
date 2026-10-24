# Three-Stage Failure Evidence

The c8 push failed its unchanged 700ms graphics deadline at 704ms, before viewport
PNGs were written. The mandatory evidence upload consequently had no files.
This repair retains diagnostics; it does not establish or fix the timing cause.

## Contract

- Buffer only captures already returned by the standing capture helper. Do not
  request another screenshot or write evidence inside the measured candidate path.
- Keep the original primary failure across overlay, context, browser and server
  cleanup. Record cleanup errors separately.
- Write a bounded failure JSON and available raw pre-click/candidate/confirmation
  buffers best-effort, using exclusive file creation. Raw buffers are not pixel
  approval. Retention failure must not turn a failed test into success.
- Start a fresh `selection-workflows` phase before handing off to the separate
  six-workflow runner; do not misattribute its failure to reduced motion.
- Preserve the 450/700/300ms limits, pixel oracles, actions and normal workflows.
- Register the focused 11-case CPU suite in the standing web test command.

## Verification

Root CPU evidence preserves genuine assertion REDs and 11-case GREENs. A reserved
fixture-local `module` variable failed the first full lint gate; the four-reference
`fixtureModule` rename preserves test bodies. That failed gate remains recorded.

A separate private negative browser variant throws only after a valid decoded
material candidate passes the original deadline. Its expected exit1 must retain
real decodable candidate pixels and the exact injected error. This verifies failure
retention, not success of the injected workflow. Normal graphics must pass separately.
Neither source review nor one passing run proves universal timing margin or release
readiness. New pushed revisions require their own complete standing CI evidence.
