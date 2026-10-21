# Bounded Currency Boundary Review

Local BASE/HEAD: `578b87d03b5959aec889925a20b3d64d69507cc0`.
This is source/reversibility and bounded non-UI verification of the sm10rem
extension, the new permanent boundary gate, and its package wiring. The prior
font helper was checked unchanged. No full suite, build, browser, server or CI
operation was run by this reviewer.

## Findings

No P1/P2 identified in the reviewed source changes. The candidate does not lower
font size, change currency text/notation, weaken the standing geometry predicate,
or hide overflow. Rendered fit remains the parent's actual-browser gate.

## Component Reversibility

`apps/web/src/app/portfolio/PortfolioCommonMonth.tsx:45` adds only
`sm:grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))]`.
Removing that one class reproduces the578 component text. Base9rem is retained,
and the sm track override uses the same sm prefix as the existing14px text style.
There is no formatter, engine, native, dependency, asset, clipping or money change.

The read RED artifact records actual690px geometry: a144px track, Verdana14,
156.359375px currency glyph extent, fits=false. At a16px root,10rem supplies a
160px minimum instead of144px, leaving3.640625px over that observed glyph width
when the container permits the minimum. Below sm, the existing9rem/12px behavior
is unchanged. These are source/track calculations, not a fresh render guarantee.

## Canonical Fixture And Test Oracle

The original scratch `currency-width-boundary.cjs` seeds an actual version2,
decimal-APR canonical Portfolio book and reads the actual comparison metric.
Its `viewportWidth` field is distinct from the old metric `width` field. That
scratch diagnostic checks width/font only; it is not the permanent full guard.

The new `apps/web/scripts/smoke-portfolio-currency-width.cjs` strengthens and
permanently wires the same boundary into the standing Portfolio command:

- Book: one entered debt of1e9, LOC0; the actual Comparison month input is set0.
- Independent bounded API check strictly decoded that exact fixture and obtained
  initial net-1e9 in all three policies. Formatting is exactly
  `-$1,000,000,000.00`; a magnitude above1e9 uses scientific notation. No fake
  displayed value or altered formatter is used to pass the boundary.
- Eleven widths are explicit:280/375/640/690/700/768/1024/1100/1120/1280/1440.
- The actual Velocity net value must equal the complete currency string, fit,
  stay inside its metric bounds, occupy one line, use font>=12 and avoid page
  overflow. Page errors and console errors also fail. The existing1px geometry
  allowance is not widened for this case.
- Requested Verdana is scoped to each isolated context, and the receipt honestly
  names `fontFamilyRequested`; it does not claim the physical font on every OS.
- Receipt fields are `viewportWidth` and `metricWidth`, avoiding the earlier
  viewport/metric-width collision. They are distinct in the extracted geometry
  and controller checks.
- Every context is closed in finally. Local server ownership is released after
  browser shutdown in the normal and assertion-failure paths exercised here.
  Hosted origin mode skips local server creation. Cleanup API failures themselves
  were not simulated or certified.

This is one maximum-standard-notation fixture at eleven widths, not eleven lender
examples or a replacement for the existing three-policy/whole-page browser suite.
The permanent guard covers the requested case more strictly than the earlier
scratch width-only diagnostic.

## Package Wiring

Only the existing `scripts.smoke:portfolio:built` value changes, appending
`&& node scripts/smoke-portfolio-currency-width.cjs` after the existing commands.
Reversing that append produces the complete prior package object. There are no
other package fields, dependencies, lockfiles or script keys changed.

Compared with7bd72ac, the four reviewed web files are the already reviewed font
helper, comparison component, package manifest and new permanent gate. Compared
with local578b87d, the helper is already committed and unchanged; the new delta is
the sm class, package append and new gate. Documentation/ops edits are parent-owned
and outside executable race checks.

## Bounded Probe Results

`currency-review-source-probe.json` records exit0, about0.8seconds of bounded work:

- Canonical1b/H0 API and exact full-string formatting checks pass.
- Component-only class reversal passes.
- The extracted real geometry callback rejects synthetic144px overflow and a
  synthetic wrapped range, while160px contains the supplied156.359375px extent.
- The actual extracted gate controller was run on memory-only fake ports. It
  keeps viewport/metric fields distinct, completes eleven synthetic contexts,
  skips local server creation in hosted mode, and releases owned resources on
  normal completion and seven forced assertion/error paths.
- Forced failures covered old144px fit, wrapping, clipping, font11.99, page
  overflow, incorrect full text and page errors. Each rejects; these are unit
  checks of the guard/controller, not actual rendered-browser receipts.

The inspectable test-only program is `currency-review-probe-source.txt`. No real
DOM, font rendering, browser, network, server or canonical test-results directory
was involved in those probes.

## Declined To Judge

- Parent's actual permanent11-width run, default/native/standing gates, compiled
  CSS and final screenshots are not executed or borrowed as fresh evidence here.
- Parent-reported prior578 serial gates/core31/reference23247/media/native/default/
  wider-font passes belong to that earlier candidate, not this new source patch.
- Parent's primary120-web/native70/ten-hosted-suite inventory and shipping-validator
  RED/GREEN updates were not independently recounted or reviewed in this slice.
- No whole R2, physical device, production, CI/hosted receipt or Desktop publication
  approval is made. Failed7bd72ac remains failed on the two previously reported
  web CI runs; successful local gates do not replace fresh pushed CI events.

## Verdict

No P1/P2 identified in this bounded source and test-oracle review. The permanent
gate preserves the requested full-currency/fit/containment/one-line/font/error
checks, with explicit boundary coverage and unchanged financial math. Actual
rendering and publication remain parent gates; this is not release approval.

## Pin Reconciliation

`currency-review-pins.json` preserves the initial239-file snapshot before the
permanent gate/package extension. Initially only the component differed from
both578 and the prior font review; the other238 pins and six math modules matched.
The raw Git/check-out comparison identified114 CRLF-only byte differences, not
additional content edits.

The authorized extension is explicit in `currency-review-extended-pins.json` and
`currency-review-extension-reconciliation.json`: the subset becomes240 files,
adding the permanent gate and changing the package, with the component already
reviewed. Relative to the prior239 font pins:237 remain exactly unchanged, two
existing files change (component/package), and one file is added. The existing
font helper and all six math modules still match their previous raw hashes.

This240-file web/mobile/engine subset is not a claim to have recounted the parent's
full293-source shipping inventory. Full SHA-256 values, including the six math
pins and scratch input pins, are retained in the reconciliation artifacts. The
final inventory/HEAD/hash check is `currency-review-final-race-check.json`.

## Commands And Scope

Read-only Git diff/status/HEAD, batch baseline-content comparison, canonical and
synthetic probes completed with exit0. The initial extension-membership check
exited1 because the expected filename list used a different order; sorting the
review helper's list corrected it. This was not source drift or a product RED.
The permanent script and scratch script received syntax-only Node checks without
executing their server/browser entrypoints.

Only `currency-review-*` artifacts were written by this reviewer. Existing product,
tests, docs, ops, prior review evidence, index, Git state, dependencies, browser,
server, canonical outputs and unrelated processes/ports were not changed.
