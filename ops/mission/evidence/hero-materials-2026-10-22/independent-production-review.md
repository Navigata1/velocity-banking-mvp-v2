# Independent Production Material Review

## Findings

### P3: Permanent component lifecycle coverage is still Car-only

At [hero-lifecycle-tests.cjs:79](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/hero-lifecycle-tests.cjs:79>)
the default model is Car, and its resolver at line 87 always constructs paint
materials. The Card helper unit tests are useful, but do not exercise a delivered
Card through the actual component load, Replay and rejection paths. A future
Car-hardcoded loadcall could therefore escape this particular lifecycle suite.

Action: retain a Card component scenario and a stale Car -> Card load scenario
in the permanent lifecycle tests. The sidecar probes exercise both successfully
and reject an in-memory Car-hardcoded callsite mutant. No current runtime defect
was found: the actual loadcall correctly passes `model` at
[HeroModelStage.tsx:97](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/components/hero/HeroModelStage.tsx:97>).

### P3: Shared media material wiring lacks a permanent specific contract

The new source-to-vendor preparation at
[prepare-hyperframes-assets.mjs:48](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/prepare-hyperframes-assets.mjs:48>)
and loadcall at
[index.html:59](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/hero-turntables/index.html:59>)
are correct on inspection. No tracked test found in the inspected tree explicitly
asserts this shared material import, prepared asset and pre-render application.
Generic lint/layout/motion checks are not an assertion of the selected material
parameters; web-only material tests cannot prove media parity.

Action: retain a small media CPU contract checking the shared import, helper
asset preparation and one load-scope application before scene attachment. The
sidecar supplies such an AST-based check and proves it rejects an in-memory
removed-call mutant. This is a regression-coverage gap, not a failure of the
current HTML or a claim that the parent's full gates would accept that mutant.

## Verdict And Checked Behavior

No blocking correctness, resource, idempotence or scope defect found for the
current independently loaded production scenes. CPU-acceptable for the narrow
accepted Car/Card adaptations, subject to the parent's full gates. No tracked
fix is requested by this review; the two findings above are nonblocking test
retention recommendations.

- The helper selects only exact `/heroes/car.glb` and `/heroes/creditCard.glb`
  paths and exact raw material names. Other model paths return untouched.
- A material-identity Set deduplicates mesh/array bindings without conflating
  distinct objects with the same name. All targets and their bindings are
  validated before the mutation loop. The WeakSet is updated only on success,
  so failed validation does not poison a retry.
- The scene-level WeakSet prevents repeated Car halving on the same scene.
  The helper creates no replacement material, map, geometry, texture or GPU
  resource; the WeakSet does not strongly retain old scene roots.
- Web refinement occurs after the late-load/texture-failure guard and before
  attaching the object. Its catch disposes the rejected model before reporting
  failure. Replay/animation callbacks do not refine again.
- HyperFrames imports the transpiled same TypeScript helper, using the same
  import-mapped Three namespace. It refines after successful loading and before
  scene attachment, outside `renderAt`, GSAP updates and `hf-seek`.
- Preparation emits ESM from the actual web helper before copying the vendor
  tree. That path was inspected and its relevant AST/output checked in memory;
  the real preparation script was not run or allowed to write vendor assets.
- Existing resource tests remain connected through `hero-resource-tests.cjs`,
  which requires lifecycle, replay-clock and material contracts. The existing
  normal-sign/zero and validation/retry tests were reviewed, not rerun as a full
  suite. Parent RED/GREEN logs are corroborating supplied evidence only.

## Independent CPU Evidence

[review-production-probes.test.mjs](<C:/Users/IslandDevCrew/Documents/Interest Shield/.superpowers/sdd/2026-10-22-material-lab/review-production-probes.test.mjs>)
passes **8/8** focused tests, exit 0:

```powershell
node --test .superpowers/sdd/2026-10-22-material-lab/review-production-probes.test.mjs
```

- Real delivered GLBs loaded through installed GLTFLoader/MeshoptDecoder on CPU,
  with only image decoding replaced by placeholder textures. Each model was
  independently parsed twice; material identities were disjoint between loads.
- Production Car reaches approximately `[0.15000000596046448,0.15000000596046448]`
  for both authored paint bindings and stays there over eight repeat calls.
  Production Card silver reaches `0.3`; its loaded `[0.08,-0.08]` normal scale
  remains unchanged. Complete material serialization outside the intended
  parameter, texture identities/source/version, transforms and geometry/index
  bytes remain unchanged. Original GLB file hashes remain pinned.
- The actual component executes in the parent's CPU boundary harness, without
  executing that harness's full test suite. A late Car result after switching
  models is disposed without refinement; the subsequent real Card loads,
  survives eight Replays and releases resources once on teardown.
- A real Card graph with invalid silver anisotropy is rejected before readiness.
  Unique geometries, materials, textures and synthetic shared closable image
  handles are all released exactly once, including after subsequent unmount.
- Negative controls reject a Car-hardcoded component call and missing media
  call. These validate the sidecar checks, not the parent's whole test suite.
- One characterization test reproduces the remaining alias limit: refine a Car
  root, then refine `scene.clone(true)`, and shared paint reaches one-quarter.
  Passing that test documents the hazard; it does not mean clones are isolated.
- The final source-snapshot assertion and repeated file hashes show no reviewed
  production-file drift during these probes. The initial reviewer run's two
  failures were cross-VM array prototype assertions, fixed only in the sidecar
  using `Array.from`; they were not production defects or relaxed expectations.

## Exact Source Hashes

Raw-file SHA-256; rechecked after the focused tests. These label the reviewed
snapshot, not an unverified commit or a future edited version.

| Source | SHA-256 |
| --- | --- |
| [web helper](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/components/hero/hero-materials.ts>) | `8546fa5b770094de939e5d22312c3ee1c3979e0c05b18ebf296bf092923ee2a2` |
| [component](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/components/hero/HeroModelStage.tsx>) | `dabf53570e0557d79b7c77665d26b6e683bc64abe1c455f454b66c5786b39a15` |
| [unit contracts](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/hero-material-tests.cjs>) | `516bb7d7cc6c822009ade8396f774f89fb54d9035ffec19d3e5f8f6a879f9308` |
| [lifecycle](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/hero-lifecycle-tests.cjs>) | `8b3587af08ff6b2708ea8dca889df667b8b77bad272a1c2f1e3a171283846d98` |
| [resource entry](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/hero-resource-tests.cjs>) | `55392e12884b276be7a04f8bd2fedd824b7d5cf32711b72ff21017850075375b` |
| [preparation](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/prepare-hyperframes-assets.mjs>) | `067af1b5397a31f38492a92bdb020cad7a698ce30dcf53a5aa217c903cf8ac16` |
| [media callsite](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/hero-turntables/index.html>) | `552f183eb26f8917d3d1b244a944d11a970a8c354c64e0083addb561e775b569` |
| [frozen Car input](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/car.glb>) | `5d7fb0b2aa1457ce7e0013d3b7e04ba6568c3dd21941dc5df05a3bf969489225` |
| [frozen Card input](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/creditCard.glb>) | `b3f08cc7e2e081deee13f86f88bdc02a7ff7b46ac97beb3155d4f5c4b4188025` |
| [independent probe file](<C:/Users/IslandDevCrew/Documents/Interest Shield/.superpowers/sdd/2026-10-22-material-lab/review-production-probes.test.mjs>) | `978dcf4a6ed6e46d2810bc0ffcb4acfdd06ee9a87eba5e6627c6712948369c63` |

## Approval Limits

- Approval is only the selected Car paint-normal multiplier `0.5` and Card
  brushed-silver anisotropy `0.3` on the pinned delivered assets. Materials are
  changed at presentation load time, not baked into source GLBs or posters.
- Fresh scene ownership remains required: scene-level idempotence does not
  protect distinct roots that share materials. The current reviewed callsites
  load independently and do not clone scene roots, satisfying that contract.
- CPU image placeholders and fake renderer/React boundary hooks do not establish
  decoded-image readiness, shader compilation, actual browser behavior or visual
  parity of the production renderer. No new visual review was performed here.
- The parent's broader Car raw/sheet review and both narrow candidate approvals
  are accepted as supplied. Independent prior visual review remains Car 0/2 raw
  and Card 0/2 raw plus Card seven-angle sheets; this pass does not expand it.
- Residual Car hotspots, final collection photorealism, hardware clearance,
  publication and full production gates remain separate. Historical association
  of frozen assets with `dd32` is supplied by the parent; this review verifies
  file hashes matching the earlier reviewed assets, not git history.
- Only this report and `review-production-probes.test.mjs` were written in the
  authorized lab. No tracked edits, git commands, network, browser/GPU, builds,
  full-gate reruns, commits, other-agent calls, server or dependency mutation.
  Ports 53143/53144 were not touched.

## Authorized Test-Retention Follow-Up

Both P3 recommendations above are now implemented under the parent's direct,
bounded authorization. This follow-up supersedes their open retention status;
the earlier review and hash table remain a record of the preceding snapshot.

Only these two tracked test files were changed, using apply_patch:

- [hero-lifecycle-tests.cjs](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/hero-lifecycle-tests.cjs>) extends the existing CPU harness, executing the actual component and material helper against real Three synthetic fixtures. Existing Car scenarios, assertions and nine PASS markers remain intact.
- [hero-material-wiring.test.mjs](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/hero-material-wiring.test.mjs>) is a new three-test AST contract using the already-installed Acorn/parse5 packages. It reads local source only and does not execute asset preparation, rendering or network I/O.

This existing review Markdown file was the only additional file written. No
production source, resource/replay-clock test file, dependency or server changed.

### Retained Component Coverage

- Card load changes only silver anisotropy to `0.3`, retaining emerald `0.5`,
  turned silver `0.25` and normal scales `[0.08,-0.08]`. Shared scalar/array
  material bindings use real Three objects, not material mocks.
- A full turn, repeated rapid Replay and another full turn retain material
  serialization, one renderer/model/canvas, stable readiness, and zero early
  resource disposal. Unmount releases shared resources exactly once.
- Both missing silver and nonfinite silver reject before readiness or RAF,
  leave the other alloys unchanged and dispose geometry/materials/texture/image
  once, including after repeated teardown.
- Switching from a pending Car load to Card disposes a late Car result before
  material refinement, ignores its stale error callback, then independently
  loads/replays Card. Both renderer lifetimes and models are released once.
- The retained hardcoded-Car negative control changes only an in-memory source
  string and must fail the Card component load assertion. Existing three Car
  replay/clock negative controls remain unchanged.
- The Card image fixture includes serializable one-pixel CPU data so the full
  material snapshot produces no Texture serialization warnings; warnings were
  not suppressed and snapshot expectations were not relaxed.

### Retained Media Coverage

- The preparation AST must read the actual web material source, feed that same
  binding to the ESM/ES2022 transpiler, write the shared vendor module and only
  then recursively copy that vendor tree into the hero composition.
- The HTML must import that prepared helper using the shared Three import map.
  Exactly one helper invocation must be top-level, use the selected model path
  and loaded scene, and precede scene attachment and the initial render.
- Removing that call in memory must fail the explicit one-load-refinement
  assertion. No real source or fixture is mutated by a negative control.

### Focused Results And Exact Markers

Only the following two test commands were run for this implementation. Both
exit 0, with no warnings in the final runs:

```powershell
node apps/web/scripts/hero-lifecycle-tests.cjs
node --test apps/media/scripts/hero-material-wiring.test.mjs
```

Lifecycle output has **13 PASS markers: 9 preserved + 4 added**. New markers:

```text
PASS hero lifecycle Card load and Replay: silver 0.3, other alloys stable, one model/canvas, resources released once
PASS hero lifecycle Card rejection: missing or invalid silver never ready, resources released once
PASS hero lifecycle stale Car->Card: late Car unrefined and released, Card isolated through Replay and teardown
PASS hero lifecycle negative control rejected: hardcoded Car material path
```

Media TAP output has **3 tests, 3 pass, 0 fail**. Exact subtest names:

```text
Hero material preparation emits the shared web source as ESM before copying vendor assets
Hero turntable imports shared materials and refines once before scene attachment or rendering
Hero material wiring rejects a removed load call
```

### New Source Pins And Limits

Raw-file SHA-256 after the focused GREEN runs:

| Final test source | SHA-256 |
| --- | --- |
| [hero-lifecycle-tests.cjs](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/hero-lifecycle-tests.cjs>) | `bc867ca778e4674eb1acb0ce1a2b8159481092b2769fba50db24d3df4982e1f1` |
| [hero-material-wiring.test.mjs](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/hero-material-wiring.test.mjs>) | `19b1210ec19231cf3dbcbc9827db1567d1e5330dd9a90245498384e702421b95` |

Rechecked web helper/component, media preparation/HTML and both frozen GLBs:
all six hashes match the earlier Exact Source Hashes table. No full gates,
browser/GPU checks, builds, network/server operations, git commands, commits or
other-agent calls were run. Final-source web tests/lint and full media checks
remain with the parent as requested; the original narrow visual and runtime
approval limits are unchanged.
