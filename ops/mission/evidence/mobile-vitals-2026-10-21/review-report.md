# Independent Tier 2 MC Review: Mobile Vitals

Disposition: CHANGES REQUESTED, test-oracle gaps only. No defect observed in the unmodified product layout within the bounded checks below.

Reviewed baseline HEAD: `caefd8086180513b3fb6c1cf85492174996a437b`.
Reviewer: OpenAI Codex, independent verifier in this chat; author family not independently established. This is the explicitly requested dirty-working-diff review, not a clean-clone cross-family ceremony or production approval.
Final browser run: 2026-10-21T10:38:08.593Z through 10:38:17.034Z, exit 0.
Verdict binds the three exact file hashes below and is invalidated by a change to any reviewed file or HEAD.

## Findings

### P2: Hidden values satisfy the new visibility guard

File: `apps/web/scripts/smoke-dashboard-interest.cjs:53-57`, assertion at line 68.
The guard establishes card geometry and unpainted text geometry, not whether the label/value is actually painted. With the real House dashboard at 375x900, injecting the following CSS makes the entire Next Move value disappear while all four-vital guards, inherited interest amount containment, page overflow guard and hero guard still accept the page:

```css
[data-testid="dashboard-mobile-vital-next-move"]>p:nth-child(2){visibility:hidden!important}
```

Receipt: `review-mutant-hidden-next-move.json`, `guards.accepted=true`; independent inspection reports `painted=false` for that value. Screenshot: `review-mutant-hidden-next-move.png`. Add actual label/value visibility checks, including ancestor visibility/opacity, and a failing browser negative control. This is a test gap, not a claim that the current UI hides values.

### P2: Vertical clipping passes currency containment

File: `apps/web/scripts/smoke-dashboard-interest.cjs:46-54`, assertion at line 68.
Only left/right are compared; glyph height is measured without checking glyph bottom against the actual clipping rectangle. This real DOM/CSS mutation reduces the daily-interest value to a few top pixels, but the new guards plus the inherited amount/overflow/hero guards still pass:

```css
[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2){height:5px!important;overflow:hidden!important}
```

Receipt: `review-mutant-vertical-currency-clip.json`, `guards.accepted=true`; independent inspection finds `fullyContained=false` for the interest value. Screenshot: `review-mutant-vertical-currency-clip.png`. Check vertical glyph containment against element/card and relevant clipping ancestors, and retain a negative-control RED. No vertical clipping was observed in the unmodified UI.

### P2: Label/value collisions remain accepted

File: `apps/web/scripts/smoke-dashboard-interest.cjs:65-70`.
Each text element is checked separately. Shifting the cash-flow value over its label leaves both token streams horizontally contained and passes all the same guards:

```css
[data-testid="dashboard-mobile-vital-cash-flow"]>p:nth-child(2){position:relative!important;top:-23px!important}
```

Receipt: `review-mutant-label-value-collision.json`, `guards.accepted=true`; independent character-rectangle inspection reports `overlap=true`. Screenshot: `review-mutant-label-value-collision.png`. Check actual label/value glyph rectangles for intersection and add a failing control. No label/value collision was observed in the unmodified UI.

## Bounded Verification

- The flow was House dashboard -> inspect all four vitals -> edit monthly income to zero -> observe the persisted zero and `Restore positive cash flow` -> return to the first viewport.
- Chrome `155.0.8059.85`, regular repository Playwright. Browser plugin not available; explicit user Chrome authorization applies. No dependency installation.
- Five additional fixture cases, not a duplicate 18-case gate: House 375x900; negative cash flow `-$90,000,000` at 280x653; sub-cent `<$0.01/day` at 280x900; exact raw-value lengths 18 and 19 (`Est. $9,999.99/day`, `Est. $10,000.00/day`) at 280x900. The threshold cases actually assert raw lengths and 14px/12px computed sizes.
- All five unmodified cases passed extracted standing guards plus independent paint, full-character containment and label/value overlap checks. This includes `Stabilize first`, invalid-payoff Next Move, negative-cash coaching and a numeric ETA. No page errors, console errors/warnings or framework overlay in these contexts; correct title and House heading recorded.
- All four vitals and hero hint remained in the inspected first viewports. Also checked House 375x667, hero figure visible intersection 211px; negative 280x653 intersection 167.5px. These are wrapper intersection measurements, not a claim of that many nontransparent image pixels.
- Six actual CSS mutants were checked. Original four-column layout reproduces the genuine `/day` split and is rejected. Forced narrow currency chopping is rejected. Pushing the hero offscreen is rejected. The three mutants above are accepted and visually broken.
- At 1440x900, desktop vitals and whole-viewport screenshots were pixel-identical with the old mobile layout injected after image loading/settlement. Screenshot files are `review-desktop-current.png` and `review-desktop-mobile-reverted.png`. This is bounded original-theme desktop evidence, not an all-browser or all-theme guarantee.
- Reversing only the three specified substitutions in `page.tsx` reproduces the baseline file exactly after CRLF normalization. No financial/scenario/motion/persistence/asset source edits occur in that file. The two removed source-only exact-one-row assertions are intentionally incompatible with the new two-column design; their removal is not a financial-math waiver. Other inherited assertions remain in the diff.
- Parent reports final 18-case gate, web348 and lint GREEN. I did not rerun those gates, rebuild, run media/WebGL/timing jobs, or treat those reports as my own completed verification. No 768/1264 boundary rerun, financial-engine certification, native-device, alternate-browser, accessibility or production approval.

## Exact Pins

SHA-256, identical before and after the final probe and verified again before report creation:

```text
01211b504632c98c4fd951656a7b4c02362a4f0b56591e491675613fe9444297  apps/web/src/app/page.tsx
9c35fb5ad7850a10a7a15e295a925a5f741fe3ce00e31a8be8b3cc9c4e93a54d  apps/web/scripts/smoke-dashboard-interest.cjs
df7744d9e3594e38f547bf3b92b4c258f5c7ee49cdfaab88365449dbb7978114  apps/web/scripts/engine-regression-tests.cjs
13dfd2a38989c7b35e70945488de62d236f414d03384691f55befc6847ea42c1  extracted standing layout oracle
```

The smoke hash includes the parent's metric-only `heroVisibleHeight` receipt update. Initial pre-update smoke hash observed was `40cdcb78bd9ebca8f792caac35d8a498f396a08fad33fce45038849eb1abbdcf`; no product edit accompanied that update.

## Reproduce And Evidence

Run from `C:/Users/IslandDevCrew/Documents/Interest Shield`:

```powershell
git rev-parse HEAD
git diff -- apps/web/src/app/page.tsx apps/web/scripts/smoke-dashboard-interest.cjs apps/web/scripts/engine-regression-tests.cjs
node .superpowers/sdd/2026-10-21-mobile-vitals/review-probe.cjs
Get-FileHash -Algorithm SHA256 -LiteralPath 'apps/web/src/app/page.tsx','apps/web/scripts/smoke-dashboard-interest.cjs','apps/web/scripts/engine-regression-tests.cjs'
```

The probe extracts the actual current `vitalLayout` and `assertVitalLayout` functions without rewriting them; it runs them against the browser DOM, with separate inherited amount/overflow/hero guards. It does not execute or claim the full standing smoke loop. Raw functions, working diff, final log and complete character-level receipts are saved as `review-oracle-source.txt`, `review-working.diff`, `review-probe.log`, and `review-evidence.json`. The last command exited 0; expected rejected mutants are logged, not presented as product failures. Screenshots were opened and visually inspected for all three findings and the negative/desktop cases.

Earlier scratch attempts are retained as `review-initial-*` through `review-sixth-*`. They include a reviewer locator ambiguity; an overbroad image wait including nonloaded images; unstable whole-page desktop screenshots while responsive/image states settled; and an interaction viewport check before resetting editor scroll. These were reviewer-harness limitations, not product findings. The final run corrected scope/settlement, explicitly verified threshold lengths and reset scroll before interaction first-viewport checks. No unchanged full gate was repeated.

## Boundaries And Changed Files

Only ignored `.superpowers/sdd/2026-10-21-mobile-vitals/review-*` scratch artifacts were authored. `review-artifacts.json` enumerates them with hashes. No tracked edit, commit, push, service configuration, auth/env/schema/data/dependency/goal change, or message to another chat/agent was made. Browser seeding/editing used only isolated test-context localStorage on the private ephemeral origin.

Final private built-server origin was `http://127.0.0.1:63190`, PID 27276, started with the repository `built-server-harness.cjs`. Browser closed and server stopped in `finally`; `review-evidence.json` records `serverStopped=true`. A final PID/listener query found neither that process nor a listening port 63190. Ports 53143/53144 and shared test-results were not touched.

At the final status check, the three reviewed tracked modifications were unchanged. Parent-created untracked `docs/mobile-vitals-contract-2026-10-21.md` had appeared; this verifier did not author, alter or include it in the review pins. Re-review should use the final strengthened-oracle hashes, not carry this verdict forward.
