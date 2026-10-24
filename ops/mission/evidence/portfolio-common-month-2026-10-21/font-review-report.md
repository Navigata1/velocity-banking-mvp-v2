# Bounded Font Fix Source Review

Failed BASE/HEAD: `7bd72ac67f2e0aa32cd0275361c6bf983eb4ea47`.
Target: uncommitted changes in two web files only. No browser, server, build,
full suite, CI query or cloud action was performed by this reviewer.

## Findings

No P1/P2 source issue identified in the two-file change. The strict existing
geometry predicate is retained, not relaxed to obtain a passing result.
This is source/reversibility review, not verification that rendered currency fits.

## Component Change

`apps/web/src/app/portfolio/PortfolioCommonMonth.tsx:45` replaces the fixed
two-column/sm-five-column layout with
`repeat(auto-fit,minmax(min(100%,9rem),1fr))`.

Reversing that single class replacement reproduces the baseline component text.
There is no font-size, formatter, amount, engine, native, asset, dependency,
clipping, ellipsis or money-text change. The old observed214px metric area minus
16px gap gives99px per fixed column. With a16px root, the new minimum is144px,
so the same area uses one214px column. `min(100%,9rem)` also avoids imposing a
144px minimum on a narrower container. This explains the intended layout change;
it does not measure glyphs or certify all responsive boundaries.

## Helper And Reversibility

`apps/web/scripts/smoke-portfolio-common-month.cjs` adds diagnostics and a bounded
font stress path without changing its seven fixtures, widths or four DOM controls.

- Existing page/section no-overflow checks and15-metric count remain.
- The exact same metric predicate requires fontSize>=12, visible nonempty text,
  fitting/contained glyphs and every whitespace-delimited token on one line.
  Currency tokens therefore cannot pass by clipping or splitting across lines.
- `comparisonGeometry` differs only by recording fontFamily. Its glyph ranges,
  ancestor checks, containment, width and one-line logic remain unchanged.
- The original four-control block, fixture list and metric predicate compare
  byte-for-byte equal after checkout newline normalization.
- Optional font input accepts only Verdana, Arial, sans-serif or serif. It is
  passed by the standalone web entrypoint; existing native invocation omits it.
  Optional reproduction-mode CSS lives only in its isolated context, which closes
  in finally; it is not written to product styles or saved records.
- Default web large-values/280 injects Verdana, runs the same strict geometry
  guard, removes its style in finally, and deep-compares the restored geometry
  with the original before logging `PASS common-month wider-font 280px`.
- That nested probe adds no receipt/case. The standing fixture count remains
  seven times three widths=21, with an additional marker/receipt field, not22 cases.
  Native does not run the extra Verdana path.

Bounded synthetic controller checks executed the actual extracted helper function
with memory-only ports, not a browser or DOM. They verified successful style
removal, removal/context cleanup on a forced Verdana geometry failure, detection
of a forced failed restoration, no extra native style, rejection of six invalid
font inputs, and one returned receipt for one case despite the extra marker.
Ten synthetic bad geometries were rejected, including font11.99, page/section
overflow, clipped glyphs, split currency, hidden/empty text and missing metrics.
These checks establish controller/guard behavior only, not real font rendering.

## Failed Head Remains Failed

User-disclosed complete CI39605673471 and39605676575 both FAILED the web funded-
Portfolio step on large-values/280 section overflow. SQL success does not turn
the web result green. Existing local/hosted/IAB passes are not a fresh receipt,
and no Desktop publication or release approval is recorded here.

The read local `wide-font-red.log` reports Verdana,12px,99px metric width,
sectionOverflow=true and uncontained full-currency strings. This supports a
local wider-font reproducer of the layout weakness. It does not identify the
Linux CI font. A CSS font-family request/diagnostic also does not prove physical
font availability on every machine.

## Declined To Judge

- Actual one-line full currency, compiled grid CSS, all-font/all-width fit and
  visual quality: parent owns the fresh rendered tests and screenshot inspection.
- Parent's planned Verdana/default21, native70, boundary checks, fresh complete
  CI, hosted proof and new IAB: not executed or borrowed as evidence here.
- Whole R2, production, physical device and final release/publication remain open.

## Verdict

No P1/P2 identified in this bounded source/reversibility review. Preserve strict
font>=12, full-token containment and no-overflow gates in the fresh actual renders.
The uncommitted candidate is not yet a verified replacement for failed7bd72ac.

## Pins And Commands

`font-review-pins.json` captures239 raw executable/manifest/lock/style hashes.
`font-review-scope-classification.json` verifies only these content changes versus
the failed head:

1. `apps/web/src/app/portfolio/PortfolioCommonMonth.tsx`
2. `apps/web/scripts/smoke-portfolio-common-month.cjs`

The same two files are the only raw-pin changes versus the prior oracle review;
the other237 match exactly. In particular the six math modules, reference tests,
native source and locks retain their prior pins. Git blob bytes and Windows
checkout bytes differ at114 other files only by CRLF; the initial raw comparison
is retained and explicitly classified, not called114 product edits. Normalized
content and `git diff --name-only` agree on exactly the two scoped changes.

`font-review-diff.patch` retains the full two-file patch. `font-review-math-pins.json`
records the unchanged six math hashes. Final inventory/HEAD/hash reconciliation
is `font-review-final-race-check.json`.

Fresh bounded commands:

- Local Git HEAD/status/diff and raw source pinning: exit0. The239 baseline blobs
  were read without changing the index; that read session completed normally.
- Single `git cat-file --batch` newline/content classification: exit0.
- Source-equivalence, strict-guard synthetic negatives and memory-only restoration
  controller probe: exit0; result is `font-review-source-probe.json`.
- An initial inline-controller invocation exited1 before execution because of
  CommonJS top-level await. Wrapping the test-only program in an async function
  corrected the harness; this was not an app RED or product finding.

Only `font-review-*` scratch evidence was written. No source, existing executable
or test, prior evidence, docs, Git state, browser, server, publication, dependency,
canonical test-results or unrelated process/port was changed by this reviewer.
