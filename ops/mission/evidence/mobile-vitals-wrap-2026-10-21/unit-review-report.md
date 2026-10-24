# Independent Unit-Wrap Re-Review

Disposition: CHANGES REQUESTED for one P2 test-oracle gap. No unmodified product-layout defect found in the bounded checks. The requested platform-width correction itself passes the sampled fallback-font cases.

Reviewed HEAD/base: `3b58beffd14db959cedc667b1c892ef5c0cc672b`, with the dirty executable hashes below. Reviewer: OpenAI Codex, verifier only. Earlier verdicts do not transfer to these changed files. This is not a clean-clone cross-family ceremony or production/CI approval.

## Finding

### P2: Newly nested /day span can disappear while visibility checks pass

Location: `apps/web/scripts/smoke-dashboard-interest.cjs:42-46`, consumed by `:79`.

`inspect(element)` walks visibility/clipping ancestors starting at the value paragraph, but obtains glyph ranges from ALL descendant TextNodes. It therefore ignores the style of the new descendant unit span introduced at `apps/web/src/app/page.tsx:138`. On the actual large-import dashboard at 280x900 with Verdana, either mutation below removes the visible `/day` unit while preserving exact `textContent`, token geometry, all four-vital assertions and the inherited amount-fit guard:

```css
[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2)>span { opacity: 0; }
[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2)>span { visibility: hidden; }
```

These were injected separately, not together. Both return `accepted=true`, `fits=true`, and `text="Est. $200,000.00/day"`. The screenshot of the opacity control contains the full amount but no daily unit. Exact source/helper pins stayed stable. This is a regression-coverage hole caused by the new nested markup, not a claim that the shipped CSS currently hides the unit. The existing seven controls hide the paragraph or its ancestors and do not cover this descendant path.

Requested correction: include each text node's actual containing element and its ancestor chain in visibility/clipping evaluation, then retain span-only opacity/visibility negative controls alongside the existing seven. Preserve the current full text, minimum size, token/vertical checks and original-node restoration. No product-style change is requested for this finding.

Reproduction: `node .superpowers/sdd/2026-10-21-mobile-vitals/unit-review-descendant-probe.cjs` (exit 0, measurement run exposing two accepted defects, NOT a passing gate). Evidence: `unit-review-descendant-evidence.json`, `unit-review-unit-opacity-zero.png`, `unit-review-unit-visibility-hidden.png`. A third span-only one-pixel overflow control IS rejected by the current vertical bounds; this is recorded rather than generalized into a clipping failure.

## Positive Verification

Main command: `node .superpowers/sdd/2026-10-21-mobile-vitals/unit-review-probe.cjs`, exit 0, `2026-10-21T11:06:44.336Z` through `2026-10-21T11:07:02.933Z`. Chrome `155.0.8059.85`, repository Playwright, Browser plugin absent, explicit user Chrome authorization. No dependencies installed.

- All six original literal fixtures were independently checked at 280px with system-ui AND Verdana, plus 375px system-ui: House `$51.50`, Auto `$4.23`, cleared `$0.00`, sub-cent `<$0.01`, independent-rounding `$1.47`, large-import `$200,000.00`, each retaining exact `Est. .../day` text. Caption-producing model source is unchanged; this probe did not separately reassert caption strings.
- Additional 280px system-ui/Verdana checks covered exact raw lengths 18/19 (`Est. $9,999.99/day` at 14px and `Est. $10,000.00/day` at 12px), negative cash `-$90,000,000`, and large nonzero cents `Est. $200,000.01/day`. All four vitals passed full-character containment/paint/label-value separation and the unchanged standing token helper. Minimum value size was not reduced.
- The 280px large-import case also passed Georgia. With Verdana, the full currency is intact and the atomic `/day` moves to its own line. The unit is an `inline-block` with `white-space:nowrap`; one WBR exists; neither hidden text nor an aria-label substitute is used.
- All 10 fixture contexts had their exact full daily-interest value independently reconstructed from Chrome's Accessibility tree and compared with the literal expected string. All passed. ARIA snapshots are in `unit-review-*-accessibility.json`. This is browser accessibility-tree evidence, not a screen-reader-device certification.
- Original flat text was temporarily restored in the browser using the ORIGINAL saved child-node references for final restoration. Under the same Verdana font, the pre-fix markup genuinely fails: scroll width 118px versus client width 107px and `/day` token not contained. Restoring the unit markup makes it pass again; exact positive layout equality is asserted. No timeout or vertical-glyph claim is used to explain this overflow.
- The actual current `checkVitalOracleControls` function was extracted unchanged and executed once with ONLY its file-output sink redirected to `unit-review-parent-controls.json`. All seven actual DOM controls rejected. All original five interest-value nodes (paragraph, prefix TextNode, WBR, span, unit TextNode) retained identity; markup and geometry restored exactly. No shared loop or shared result directory was used.
- After those seven controls: real income 8200 -> 8300 -> 8200 edits passed; real mortgage balance 285000 -> 285100 updated the React-owned prefix to `Est. $51.52/day`, then restored to 285000 / `Est. $51.50/day`. Navigation to Simulator and back with House selection preserved the normalized financial inputs exactly, including unrelated LOC/debt/frequency/mortgage fields. This exercises the restored React nodes, rather than only checking markup strings.
- House 375x667 retains all four vitals and the loaded hero hint. House 1440x900 renders the unchanged desktop 24px value with no unit span/WBR. Reverting ONLY the new mobile branch reproduces the HEAD page source exactly after CRLF normalization; desktop/financial/motion/persistence/asset source is unchanged. No whole-page pixel-baseline equivalence claim is made.
- Console/page errors and warnings: zero in all 10 contexts; correct title, no framework overlay or horizontal page overflow. Positive, flat-markup RED and span-opacity screenshots were opened and inspected. The main run records 31 asserted positive checkpoints, one additional duplicate desktop snapshot, and one expected legacy RED; these are not 33 independent workflows or a standing-suite completion claim.

## Exact Pins

SHA-256, identical at start/end of BOTH private runs and checked again before report:

```text
e966bf3a2499d7a50792f3f89ca042791514537dd00a570825bc9ffea97d5b5c  apps/web/src/app/page.tsx
4c9dc62afe83128fc9ff3c8dafbd6ef6614b7671ae9546a652a29999d13cb679  apps/web/scripts/smoke-dashboard-interest.cjs
df7744d9e3594e38f547bf3b92b4c258f5c7ee49cdfaab88365449dbb7978114  apps/web/scripts/engine-regression-tests.cjs
2d34384f056df7e68af2f572845e53c984f328baebebee9bd0a7fd9e7aeb4a98  complete extracted current layout/control helpers
```

This verdict binds HEAD plus these executable hashes and is invalidated by changes. Docs were deliberately NOT pinned; concurrent parent documentation work does not invalidate executable verification.

## Failed CI Context

Read-only inspection of the saved push/PR metadata and raw logs confirms both runs `39587774650` / `39587777183` at exact `3b58beffd14db959cedc667b1c892ef5c0cc672b` failed Web and mobile quality gates while Isolated SQL and owner isolation succeeded. Both logs show all five earlier 280px fixtures passing, then `large-import amount overflow: {"fits":false,"width":107,"height":30,"scroll":113,"client":107}`. Parent's fallback-font RED also reports unit containment/fit failure.

The independent same-font flat-markup RED above corroborates a real horizontal-layout defect with platform-dependent widths. The exact Linux font is still unknown. These Windows fallback-font checks are NOT a Linux CI rerun, and the failed `3b58bef` remains failed/unverified. No receipt was created and no CI/GitHub/service state was changed. Parent reports local build/full18/seven-control/wider-font/web348/lint GREEN; those standing gates were not duplicated or claimed as this verifier's runs. Hosted 88 and future strict batches are likewise not verified by this report.

## Artifacts And Terminal Handoff

Only new ignored `unit-review-*` files were authored. `unit-review-artifacts.json` enumerates new scripts, receipts, screenshots, helpers, diff and report with hashes. Earlier `review-*` evidence was checked unchanged. No tracked edits, commits, pushes, installs, auth/env/schema/service/data/dependency/goal mutations, CI actions, subagents or messages to other chats. Seed/edit state exists only in isolated private test-context localStorage.

Main private origin `http://127.0.0.1:61872`, PID 26164, and descendant-probe origin/PID recorded in `unit-review-descendant-evidence.json` (PID 21716). Both browser/server lifetimes ended in finally; both receipts record `serverStopped=true`, stable executable hashes, and no outstanding exec session. Ports 53143/53144 were not operated on. No timing/WebGL/media/full shared loops were run. Browser work is terminal for the parent's strict-batch scheduling, but the test-only P2 above remains for author correction/re-review.

Residual scope: no universal font/locale/vendor/device/paint/accessibility or financial/production approval. The actual unmodified unit-wrap layout, exact text and node restoration passed the sampled cases; one concrete nested-unit visibility gap remains in the test oracle.
