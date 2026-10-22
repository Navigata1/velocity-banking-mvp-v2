# Integration Review: FINAL CLOSED

Date: 2026-10-21. Final source pin check: 2026-10-21T23:40:10Z.
Reviewer: OpenAI Codex, independently delegated integration/testproof seat.
Workspace: `C:/Users/IslandDevCrew/Documents/Interest Shield`.
Baseline and observed HEAD: `c9d3acccb8ee22fd6f08b29d7eacca91eee6ec49`.
Disposition: **FINAL CLOSED - P2 RESOLVED. No remaining actionable integration
finding in the reviewed eight-file snapshot; no P0/P1 found.**
The original P2 and its actual RED evidence are preserved below, followed by
the parent's focused fix and the independent GREEN rerun. This closes the
sampled-frame proof gap, not full-yaw math, runtime gates, or collection art.

This is the user-authorized Mission-control Tier2 working-tree review, not a
clean-clone, cross-family, exact-commit merge approval. The eight literal files
and raw-byte pins below bind this result. A change to a reviewed file voids its
review coverage and requires inspection of the new bytes.

## Finding

### P2 RESOLVED: Video skipped containment checks on its mid-turn frame

Original location: `apps/media/scripts/verify-hero-turntables.mjs:23-30`.
Current fix: `apps/media/scripts/verify-hero-turntables.mjs:9,23-27`.
Related coverage: `apps/media/scripts/hero-presentation.test.mjs:14-35` and
`apps/web/scripts/smoke-heroes.cjs:175,202`.

Before the fix, `presentationBounds(image,id,region)` was inside `if(time===0)`.
At 4 seconds and 8.5 seconds the verifier only applied its existing color-count,
motion and closure checks. Unlike the browser proof, which applies
`visibleBounds` to its second sampled pose, video never checked the mid-turn
silhouette against the artwork edges. A valid initial frame, visibly changed but
clipped middle frame, and matching final frame received the normal all-ten PASS
and verification JSON. Thus the shared helper did not establish the same
sampled-pose containment criterion in browser and video.

This is a demonstrated false positive in proof wiring, NOT a claim that the
current camera math or any current export actually clips. Huygens owns the
separate geometric/mathematical containment review.

Evidence: evaluated the actual, unmodified verifier source in `vm.SourceTextModule`
with IO-only adapters. `ffprobe` metadata and decoded PNG inputs were synthetic;
filesystem writes and child processes were intercepted. The real
`presentationBounds`, `visibleBounds`, `samplePngPixels`, and
`compareSpatialDescriptors` implementations executed. No browser, GPU, codec,
ffmpeg, server, or disk output was used.

The 1920x1080 RGBA fixtures had opaque black backgrounds. Initial/rest foreground
occupied x=[300,1620), y=[100,920), with RGB channels
`80+x%80`, `80+y%80`, `80+(x+y)%80`. Middle foreground instead occupied
x=[0,1620), y=[100,920), with the same RGB pattern plus 70 per channel. That
middle frame reaches the artwork's left edge. The shared visibility helper
rejects it with `model touches canvas edge`; the pre-fix video verifier accepted
the sequence for all ten ids:

```text
Initial presentation height: 89.1304% of the 920px artwork viewport
Initial/middle color counts: 981 / 981
Motion changedCellCount: 64
Motion maxCellDistance: 70.00000000000004
Motion meanCellDistance: 62.39130434782611
Closure changedCellCount / maxCellDistance / meanCellDistance: 0 / 0 / 0
Verifier: all 10 PASS; all 31 attempted output writes intercepted in memory
```

Requested action (now implemented): import the same `visibleBounds` helper and enforce it against the same
art rectangle on EVERY already-sampled video frame. Retain the minimum-height
check at the controlled initial pose; requiring that minimum at every angle
could wrongly reject a naturally narrow/short turned silhouette. Add a lightweight
pure pipeline control that makes the actual verifier reject the clipped 4s
fixture. Do not change thresholds, sample times/cadence, readiness deadlines,
stage caps, or the existing motion/closure conditions.

The six existing helper tests passed because they did not execute this verifier
branch. Their success did not invalidate the original finding.

### Observed RED, Parent Fix, Independent GREEN

At the user's explicit request, this reviewer added ONLY the disjoint new source
`apps/media/scripts/hero-turntable-proof.test.mjs` (87 lines). It executes the
actual verifier source using TypeScript's AST/transpilation to adapt only ESM
`import.meta.url` and its local `require` binding into an async CJS VM. It does
not replace the verifier's conditions, loops or assertions. It runs under plain
`node --test`, with no experimental VM flag, child process, dependency addition,
workflow change, browser, GPU, ffmpeg, or filesystem output. Existing pinned
`sharp` encodes synthetic PNGs in memory; the actual shared helper, PNG decoder,
pixel sampler, spatial comparison and video hashing all execute. Only external
video IO is adapted, with output writes retained in a Map.

The new negatives independently isolate clipping at 4s and at 8.5s. At the rest
pose, the added clipping strip is entirely outside the central motion/closure
sampling rectangle, so old closure logic still accepts it. The valid positive
must write a real verification JSON payload covering all ten ids, with the
expected full-canvas dimensions and artwork rectangle.

Actual pre-fix command, with verifier raw SHA256
`32d752e5657833c93f37c42dc5e210a8001a1d4f00315e04be74818f203b078d`:

```text
node --test apps/media/scripts/hero-turntable-proof.test.mjs
not ok - rejects geometry clipped only in the 4s frame
         Missing expected rejection.
not ok - rejects geometry clipped only in the 8.5s rest frame
         Missing expected rejection.
ok     - accepts a contained moving sequence for all ten heroes
tests 3; pass 1; fail 2; exit 1; TAP duration 9070.6097ms
```

These are the observed two genuine REDs plus one positive GREEN, BEFORE any
parent verifier edit. The first draft of the flag-free harness instead hit an
ESM/CJS `require` TDZ collision (all three setup failures); that was corrected
in the test adapter, not product code, before the genuine RED run. The earlier
`SourceTextModule` exploratory control remains separately documented above.

Parent then imported `visibleBounds`, moved the same art rectangle outside the
initial-pose conditional, and called `visibleBounds(image,region)` for EVERY
already-sampled 0/4/8.5s frame. `presentationBounds` stays initial-pose-only.
Inspection confirms no threshold, cadence, deadline, cap, or motion/closure
relaxation in that fix. This reviewer did not edit the verifier.

Independent final rerun, with final eight-file pins below:

```text
node --test apps/media/scripts/hero-turntable-proof.test.mjs apps/media/scripts/hero-presentation.test.mjs
ok - 4s clipping rejected with model touches canvas edge
ok - 8.5s rest clipping rejected with model touches canvas edge
ok - contained moving sequence accepted for all ten heroes
ok - all six existing shared presentation cases
tests 9; pass 9; fail 0; exit 0; TAP duration 4201.7279ms
```

P2 is RESOLVED at these literal source pins. This is independent pure pipeline
verification, not reliance on the parent's separate GREEN run. No additional
product source changes or heavy gates were performed for closure. Parent's
initial media count of 216 predates this test; it is not final-source coverage.
The final full-media count/run remains the parent's responsibility and is not
guessed or certified here. Parent-owned full-28 run 42238 was not disturbed.

## Runtime And Integration Assessment

- `HeroModelStage.tsx:43-59,87-101`: bounds are measured once on successful load;
  fitting is on load/resize, not inside animation. No model-profile allocation
  or geometry traversal was added to each animation frame. This is a source
  observation, not a measured hardware performance claim.
- Measurement failure disposes the unadopted model and calls the existing
  fallback. Fit failure calls fallback after adoption; `AssetHero` removes the
  failed stage, whose cleanup owns model/environment/renderer disposal. The
  late-load/disposed guard remains before measurement. No new leak or fallback
  regression was found in static inspection and the pure controls below.
- Zero-sized resize notifications are ignored; positive sizes use their actual
  aspect. Existing poster-first opt-in, failed-stage removal, reduced motion,
  finite turn, observer cleanup, RAF cancellation, and context cleanup remain.
- `index.html:37-43`: drawing buffer/CSS canvas remain 1920x1080. With pixel ratio
  1, WebGL viewport (0,110,1920,920) maps to screen x=[0,1920), y=[50,970),
  because `1080-(110+920)=50`. Camera aspect is 1920/920, not 1920/1080.
  Credits/progress remain below this art region. Shared PMREM creation uses
  render-target viewports and restores the main target; no conflicting main
  `setViewport` call was found in that path. Actual pixels remain the parent's gate.
- Browser and HF import the same measurement implementation and camera
  FOV/direction/near/far constants, target the same origin/Y-midpoint, and use
  the same fit helper. Their layouts/aspects intentionally differ.
- `prepare-hyperframes-assets.mjs:44-48`: the new module is transpiled as ES2022
  alongside the shared camera module, then copied into the turntable vendor
  directory. Its `HeroRotationBounds` import is type-only; there is no new
  unresolved extensionless runtime import of `./turntable` in that output.
- The helper retains RGB delta >40, foreground >2%, and the existing edge
  exclusion. Domain minimum heights are car .38, house .57, land .58,
  creditCard .72, studentLoan .50, medical .58, personal .56, recreation .71,
  custom .70, vault .58. Region validation and unknown-domain rejection work.
  These are silhouette/presence tests, not material fidelity or photoreal tests.
- The reviewed diff does not weaken the existing 120000ms readiness checks,
  16ms primer / 15x100ms sample cadence, eight-second revolution, one-second
  video hold, motion/color thresholds, or 0.1/50 camera planes. Parent runner
  still specifies `timeout:1200000` per stage; this reviewer did not change it.

## Lightweight Test Evidence

All commands completed; no test process or server was left running by this seat.

1. `node --test apps/media/scripts/hero-presentation.test.mjs`: 6/6 PASS, including
   a fresh repeat after the parent's lint-comment correction (129.57ms TAP run).
2. `node apps/web/scripts/hero-resource-tests.cjs`: PASS; shared geometry,
   material, texture, decoded-image disposal once each; temporary reflection
   resources released on success and PMREM failure. No WebGL renderer created.
3. In-memory execution of transpiled actual `HeroModelStage.tsx` with fake
   renderer/loader/hooks: success, measurement throw, fit throw, late successful
   load after unmount, and resize fit throw all PASS. Model geometry/material/
   texture/image and environment/renderer/context/DOM cleanup each counted
   exactly once. Initial load failures and late-load branches never reported
   `onReady(true)`; successful resize did not repeat measurement. This tests
   wiring, not real React/WebGL.
4. Actual verifier plus synthetic decoded rasters: reproduced the P2 false
   positive above, using real pixel/visibility comparisons and mocked IO only.
5. `git diff --check <baseline> -- <five tracked scope files>`: PASS. The two
   new untracked scope files were read directly; both are pinned below.
6. Final closure: pipeline and shared presentation tests, 9/9 PASS, as recorded
   above. The new pipeline test was unchanged between genuine RED and GREEN:
   raw SHA256 `f1200d9a8dad44efd1b547b27ba1f9e1e8ea03b9209b3f8519e1650f72e3c3f7`.
7. Final `git diff --check -- apps/media/scripts/verify-hero-turntables.mjs`:
   PASS after the parent's focused fix.

The first VM probe lacked the `URL` global and failed before executing the
verifier; the corrected pure probe above completed. No product source was
changed to accommodate the harness.

Parent reports attempt-1 stopped at lint after web tests passed, fixed ONLY the
helper's adjacent-script `no-require-imports` declaration, preserved the failed
logs under `attempt-1/`, and restarted the full 28-stage sequence. I observed
that comment and refreshed its pin. I did NOT run or certify that full sequence,
lint, build, browser, GPU, actual exports, hosted checks, or physical hardware;
their real logs, including failures, remain authoritative. No suppressed-log,
retry-until-green, or final-full-gate success claim is made here.

## Remaining Art Quality And Declined Judgments

I inspected the four saved local images pinned below; I did not create new
captures. In `candidate-car.jpg`, the model is inspectable and recognizable,
but remains a different concept-car body from the coupe poster, with very dark
lower surfaces and concentrated, uneven bright red highlights. Framing alone
does not resolve those material/identity differences. In `candidate-house.jpg`,
the larger facade is recognizable, but flat window/interior response, simple
planting, and repeated simplified surface detail remain visibly unlike the
poster's richer materials, landscaping and interior depth. These are scoped
observations of the saved views, not freshly verified all-angle art findings.

- Full-yaw fitting equations, mesh measurement correctness, model transforms,
  actual asset support witnesses, and numerical controls: explicitly delegated
  to Huygens, not independently re-audited here.
- All-ten fresh desktop/mobile/video appearance, smoothness, actual GPU disposal,
  browser/hardware errors, and performance budgets: parent's serial gates/manual
  inspection; not inferred from fake-renderer controls or old JPEGs.
- Models/posters/manifests/financial engine: frozen and not edited by this seat;
  no new asset-level or financial correctness approval.
- Photoreal collection completion: OPEN. Passing framing/presence thresholds
  would not close it. The other eight models were not visually approved here.
- Formal cross-family clean-clone review and final merge/production authority:
  not claimed by this delegated dirty-tree integration report.

## Exact Reviewed Source Pins

Literal relative paths below resolve under the workspace root stated above.
SHA256 values are of raw on-disk bytes, not normalized text or Git-filtered
content. The lint declaration is included in the final helper pin. The verifier
pin now includes the parent's P2 fix; the eighth pin is the authorized regression
test, unchanged between genuine RED and GREEN. The other six original scope
files match the preceding closed-review snapshot.

```text
c987ae95b11793b7cf85b92bb9683150d366e69d7f1238169b55420aaf9859d9  apps/web/src/components/hero/HeroModelStage.tsx
5abefd51a7e806b967cfe7d2b15d28628698bf5088e873e7f9b6778287af1594  apps/media/hero-turntables/index.html
b3d61bf64503b48ea4a31ed793c4d8c1138aa56828db47489901f77ae10089c5  apps/media/scripts/prepare-hyperframes-assets.mjs
4e059eb5c14378e76745c1ec2afc715601c0f7aba2cae7cdd0fbe37e451c2584  apps/web/scripts/hero-presentation-proof.cjs
4d4dce7e3e128732c2826d0ad080305302d0ebe2f14d79a065d12df4a74cb4d7  apps/web/scripts/smoke-heroes.cjs
7e59eb6769e01d53e2488f64587aaba7c19906a3ae0445ec1ce091fd93f94ada  apps/media/scripts/verify-hero-turntables.mjs
ccd276f2428874b4aa4aef26320b76348211d4c7e0b1c90e83769c8c9d899c0a  apps/media/scripts/hero-presentation.test.mjs
f1200d9a8dad44efd1b547b27ba1f9e1e8ea03b9209b3f8519e1650f72e3c3f7  apps/media/scripts/hero-turntable-proof.test.mjs
```

Independent raw Git blob identifiers (`git hash-object --no-filters`, no writes),
in the same path order:

```text
7e90ec2c61a1d16d2ec00ee43317b8d83737beb4
22f6ba9cbca8321b748387fb6731e279f639f0b8
296419057854fdb951fe02246283fcb7680719cd
cb14e89f55db55320fa8fe63dadf910ca49695d0
13a5e59250f65de9360f3948806254aa9ce0b1ab
028d77b53c36bbeaf7070de1bbddbcf0921385c4
e10dfc28465d25b5e94bb17b0818d32f578ea984
3c781bfe268ca0c419c46e4059c76f557993820b
```

Supporting source raw SHA256 pins (read for caller/API/resource context, NOT an
additional math/mesh audit):

```text
e8cca04af1e34e358a9a0d2365380fc9dc57236b3249a60086494232cd9f121e  apps/web/src/components/hero/AssetHero.tsx
ab47fbfd534664f7945cb37fbe142e02fa207b693e57c19be3057b8f3626dc5b  apps/web/src/components/hero/studio-environment.ts
e0ffd1c18cbf8e93cb62ee23f89cff915aec0ce0e7231f75691dee17f39f8d60  apps/web/scripts/png-pixel-proof.cjs
ea6a1ab17b9b67f9011be20f4c0c352cbf78ee65cd9fc3ac1d548b650c457f69  apps/web/scripts/hero-resource-tests.cjs
e3a488ca249bf4fae70220b98c790362283dfcc298369f54bbc03a53f40c23b0  apps/web/src/components/hero/turntable.ts
a1f04843f1a1feca67f563b01ec474ec44806a4abd23334aca68ed13363fab56  apps/web/src/components/hero/hero-geometry-bounds.ts
```

Saved visual evidence raw SHA256 pins (paths relative to this report directory):

```text
e044a37312f0d54c985e1652a21c2fa5ff71569ab8108cfe3b59e148166cf551  candidate-car.jpg
01975739c39c7ce071bbbd5f3b440f7250e65d53cb14f8a96460e953d55ff141  02-car-poster-aligned.jpg
e0f0cff27ac3de3609050e09cdca42cd33eb54dfd2f0e2d6c2c99e816235075b  candidate-house.jpg
cb1012a9fd5519455d6802852df422a0e92a0499432f26dd3476647679bf1fac  03-house-poster-aligned.jpg
```

Across the review and explicitly authorized follow-up, only this ignored report
and the disjoint new regression test were written, via `apply_patch`. During
final closure only this report was changed. No preexisting tracked product
source, index, commit, mission state, asset, other agent, browser, or server was
changed by this reviewer. Report ignore rule was verified with `git check-ignore -v`:
`.superpowers/sdd/.gitignore:1:*`.
