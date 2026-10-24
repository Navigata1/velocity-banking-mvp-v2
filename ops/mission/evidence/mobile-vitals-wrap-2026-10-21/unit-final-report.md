# Final Bounded Unit-Visibility Re-Review

## Findings

No remaining actionable findings in this bounded re-review. The descendant `/day` visibility P2 from `unit-review-report.md` is CLOSED on the exact executable pins below. Unmodified product markup remains at its previously reviewed hash. No code change requested.

Reviewed HEAD/base: `3b58beffd14db959cedc667b1c892ef5c0cc672b` plus dirty executable files. Reviewer: OpenAI Codex, verifier only. This is the requested independent bounded working-diff review, not a clean-clone cross-family ceremony or CI/production approval. Earlier reports/raw evidence are preserved, not rewritten.

## Exact Pins

SHA-256, identical at probe start, probe end and the subsequent read-only terminal hash check:

```text
e966bf3a2499d7a50792f3f89ca042791514537dd00a570825bc9ffea97d5b5c  apps/web/src/app/page.tsx
a24e9a659ea6f4614b6f23464b04aca3bb8289670585b78cba283727e0999dae  apps/web/scripts/smoke-dashboard-interest.cjs
df7744d9e3594e38f547bf3b92b4c258f5c7ee49cdfaab88365449dbb7978114  apps/web/scripts/engine-regression-tests.cjs
7a5d5f422841d8ca74c0bc6391d172846ef996f1a2aaf5329d026a09de8389fb  complete extracted current layout/control helpers
```

The smoke pin includes the final indentation-only cleanup, not the earlier `15b807...` or `4c9dc6...` source. This verdict is invalidated by a change to HEAD or reviewed executable hashes. Docs, ignored parent scripts and metadata were deliberately not pinned.

## Actual Controls

The current `vitalLayout`, `assertVitalLayout` and `checkVitalOracleControls` functions were extracted unchanged from the pinned source. Only the control function's file-output sink was redirected to `unit-final-parent-controls.json`. No shared smoke loop or shared test-results directory was used.

All TEN current actual-DOM controls reject: paragraph opacity, paragraph visibility, ancestor opacity, paragraph clipping, ancestor clipping, label collision, empty value, unit-span opacity, unit-span visibility and unit-span clipping. Every receipt has `rejected=true` and `originalNodes=true`, `originalText=true`, `originalStyles=true`. The function's post-control layout deep equality also passes after every control.

An independent live-handle snapshot around the entire control function confirms the same original paragraph/descendant nodes, TextNode data and semantic CSSStyleDeclaration values afterward. Handles are disposed in finally. No reliance on raw `style=""` versus absent-attribute serialization was added. This verifies the intended restoration contract rather than relabeling the earlier raw-HTML restoration failure as an oracle RED.

Separately, the original opacity/visibility counterexamples and one-pixel overflow clip were repeated on the actual large-import unit span at 280px with Verdana. All THREE are now rejected: opacity/visibility produce `visible=false`; clipping produces `/day contained=false`. Exact text remains `Est. $200,000.00/day`. Each style is restored and exact positive-layout equality is asserted. These are three executions at a different viewport/font, not three additional unique classes beyond the standing ten.

The code inspection matches those results: each TextNode contributes its containing-element-to-outer-paragraph visibility/opacity and clipping ancestors, supplementing the existing paragraph-to-root checks. The previous omission of the unit span is therefore covered by both source behavior and the actual failing styles.

## Positive Checks

Six isolated fixture contexts, 17 asserted positive checkpoints, all passed on the exact current helper:

- House and large-import at 280px with system-ui and Verdana; large-import also passes Georgia. Full amounts/cents and atomic `/day` remain readable; the wider-font amount and unit can occupy separate lines without clipping or shrinking below 12px.
- Exact raw length 18 (`Est. $9,999.99/day`) and 19 (`Est. $10,000.00/day`) at 280px with system-ui and Verdana. Actual lengths and computed 14px/12px sizes are asserted.
- Negative cash `-$90,000,000` with stabilize coaching, and nonzero large cents `Est. $200,000.01/day`, both at 280px with system-ui and Verdana.
- After the actual ten-control function: real monthly income 8200 -> 8300 -> 8200; real mortgage balance 285000 -> 285100, with React updating the retained prefix to `Est. $51.52/day`, then back to 285000. Actual Simulator navigation and House reselection restore `Est. $51.50/day`; normalized financial inputs are exactly preserved.
- House 375x667 retains all four vitals and a loaded hero figure intersection of 211px. Desktop 1440x900 retains the unmodified 24px value and no WBR/unit wrapper. Product hash is unchanged from the preceding unit-markup review; no fresh whole-page pixel-equivalence claim is made.
- All positive checks retain the unchanged visibility, token, vertical/clipping, label separation, minimum size, all-four-first-viewport, loaded hero and horizontal-overflow assertions. No false rejection of the sampled real font rectangles was observed. Chrome accessibility-tree StaticText aggregation exactly equals the literal full expected daily-interest value in all six Verdana contexts.

Correct title, meaningful dashboard content and no framework overlays. Zero console errors/warnings or page errors in all six contexts. New fallback/short-viewport screenshots were opened and visually inspected. Images, receipts and full current helper source are saved under `unit-final-*`.

## Commands And Results

```powershell
git rev-parse HEAD
git diff -- apps/web/src/app/page.tsx apps/web/scripts/smoke-dashboard-interest.cjs apps/web/scripts/engine-regression-tests.cjs
node .superpowers/sdd/2026-10-21-mobile-vitals/unit-final-probe.cjs
Get-FileHash -Algorithm SHA256 -LiteralPath 'apps/web/src/app/page.tsx','apps/web/scripts/smoke-dashboard-interest.cjs','apps/web/scripts/engine-regression-tests.cjs'
```

Probe exit: 0. Started `2026-10-21T11:16:34.434Z`, finished `2026-10-21T11:16:45.761Z`. Chrome `155.0.8059.85`, repository Playwright, Browser plugin absent, explicit user Chrome authorization. Private finite built server `http://127.0.0.1:52290`, PID 27100. Browser and server closed in finally; evidence records `serverStopped=true`. Subsequent process/listener queries explicitly returned `OwnedServerProcessAbsent=True` and `OwnedPortListenerAbsent=True`.

Raw results: `unit-final-probe.log`, `unit-final-evidence.json`, `unit-final-parent-controls.json`, `unit-final-helper-source.txt`, `unit-final-working.diff`, per-check JSON and PNG files. `unit-final-artifacts.json` enumerates this re-review's new artifacts with hashes. All earlier `review-*` AND `unit-review-*` files were hash-checked unchanged.

## Boundaries And Handoff

Only new ignored `unit-final-*` scratch artifacts were authored. No tracked edits, commit/push, install/dependency, auth/env/schema/data/service/goal changes, CI actions, other-chat messages or subagents. Fixture seeding and edits use only isolated private test-context localStorage. Ports 53143/53144 untouched. Browser/server and exec work are TERMINAL for the parent's strict-batch scheduling.

Parent reports full18/wider-font/ten-control, lint/web348 and media/video gates green; those were not duplicated or claimed as this verifier's runs. No strict Three/WebGL/full shared loop was run. Saved Linux `3b58bef` CI failures and the genuine old-helper opacity/visibility false acceptances remain historical failed evidence, not successful gates; this local review does not turn that failed HEAD into verified CI or create a publication receipt. A subsequent pushed correction still requires its own exact-head CI/hosted proof.

No arbitrary-font, other CSS paint-mode, universal accessibility, Linux vendor/device, financial or production approval. No broader application audit was performed. Within the requested descendant-style/restore/fallback scope, the P2 is closed and no further finding remains.
