# Independent Material Study Review

## Verdict

Conditional CPU pass for the supplied helper, applied once to an independently
loaded scene. No correctness defect found in shared-material deduplication,
pre-mutation target validation, raw-name selection, or zero/sign preservation
under that contract. This is not fixture integration or visual approval.

Two reproducible caller hazards remain acceptance conditions, not newly found
violations of the existing DESIGN's explicit fresh-load/one-time requirement.
Do not treat the original test title's "exactly once" as cross-call protection.

## Actionable Integration Hazards

### P2: Re-entering the Car helper silently compounds the experiment

- Location: [material-variants.mjs:19](<C:/Users/IslandDevCrew/Documents/Interest Shield/.superpowers/sdd/2026-10-22-material-lab/material-variants.mjs:19>).
- Reproduction: two calls on the same real Three material produce
  `[0.3,-0.3] -> [0.15,-0.15] -> [0.075,-0.075]`, without rejection.
- The Set deduplicates bindings within one invocation only. The original five
  tests do not execute the helper twice on one scene.
- Required before adoption: keep application in the completed model-load path,
  outside seek/render callbacks; prove repeated seeks leave the material values
  and application count unchanged. A repeated-load guard or source-based
  idempotent application is an alternative if re-entry cannot be excluded.
- Independent reproducer: [review-material-probes.test.mjs:117](<C:/Users/IslandDevCrew/Documents/Interest Shield/.superpowers/sdd/2026-10-22-material-lab/review-material-probes.test.mjs:117>).

### P2: Cloning a scene does not isolate A/B materials

- Location: helper's in-place mutation at lines 19-20; fixture caller owns
  isolation. No supplied fixture callsite was included in this review.
- Reproduction: `baseline.clone(true)` shares each material object; applying B
  also changes A. Calling `baseline` afterward returns `[]` and does not restore A.
- Required before adoption: independently parse/load the GLB for each variant,
  or clone every unique material while retaining its internal mesh sharing.
  Assert A/B material identity sets are disjoint and A remains unchanged after B.
  Separate standalone fixtures with independent loads satisfy this condition.
- Independent reproducer: [review-material-probes.test.mjs:125](<C:/Users/IslandDevCrew/Documents/Interest Shield/.superpowers/sdd/2026-10-22-material-lab/review-material-probes.test.mjs:125>).

## Evidence

- Original suite: 5/5 pass. Independent suite: 23/23 pass. Two independent tests
  intentionally assert the hazardous behavior above; their passing is evidence
  of reproduction, not evidence that the hazards are prevented.
- Multiple mesh bindings and material arrays do not multiply a shared object
  twice. Distinct material objects with the same raw name are each handled once.
- Later invalid duplicate targets refuse without mutating earlier valid ones:
  missing map/scale, non-Vector2, NaN and infinities for Car; nonfinite,
  out-of-range and nonnumeric anisotropy for Card. Missing the second paint name
  also refuses before mutation. These cases were absent from the original suite.
- Positive/negative zero, mixed component signs, and immutable before/after log
  snapshots pass. Node-style names `Paint_1_Carmine`/`Paint_2_Carmine` fail closed.
- Actual delivered GLBs were parsed by the installed Three GLTFLoader and
  MeshoptDecoder on CPU. Only image decoding was replaced by placeholder
  textures; real geometry, material construction and texture transforms ran.
  No browser, renderer, GPU, network request or server was used.
- Delivered Car has the exact raw target names `Paint 1 Carmine` and
  `Paint 2 Carmine`. Both loaded strengths were
  `[0.30000001192092896,0.30000001192092896]`, becoming
  `[0.15000000596046448,0.15000000596046448]`. Do not force a negative Y merely
  because the synthetic unit fixture uses one. The installed loader flips Y
  for derivative tangents when needed; the helper preserves whatever it loads.
- Car paint PNG payload matches source pin
  `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e`.
  Authored 30x30 tiling and Paint 2 rotation `0.585398` are present. Material
  serialization, texture identity/sampling/transforms, non-target normal scales,
  node transforms and geometry/index bytes remain unchanged after the study.
- Delivered Card's raw silver anisotropy is `0.65`, changed to `0.3` only.
  All other serialized material factors/maps, normal scales and geometry remain
  unchanged, including emerald/turned materials. Both GLBs' on-disk hashes are
  unchanged after the probes.
- Current Car recipe hash, Card builder hash and Card material-source JSON hash
  match their local `hero-models.json` records. No remote provenance was fetched.

## Reproduction And Pins

From `C:/Users/IslandDevCrew/Documents/Interest Shield`:

```powershell
node --test .superpowers/sdd/2026-10-22-material-lab/material-variants.test.mjs .superpowers/sdd/2026-10-22-material-lab/review-material-probes.test.mjs
```

Reviewed SHA-256 values:

| Input | SHA-256 |
| --- | --- |
| material-variants.mjs | `7ff61adc6222304e3afea583429cabf90457a55501a47c93ac8c64abf2f6aa4d` |
| material-variants.test.mjs | `67b92070025ed932eff1cb1ba028325a6aef34ceae3b1254cba0041224102f0a` |
| delivered car.glb | `5d7fb0b2aa1457ce7e0013d3b7e04ba6568c3dd21941dc5df05a3bf969489225` |
| delivered creditCard.glb | `b3f08cc7e2e081deee13f86f88bdc02a7ff7b46ac97beb3155d4f5c4b4188025` |

Only this report and `review-material-probes.test.mjs` were written, in the
authorized private lab directory. No original helper/test, tracked source,
asset, manifest or other agent state was modified. No git command, build,
dependency installation, other-agent call or interaction with ports 53143/53144.
Ignored status was accepted from the authorization, not checked with git.

Image decoding/readiness, shader compilation, fixture load/seek behavior and
matched A/B visual quality remain unverified. Await the actual matched PNGs for
visual review; these CPU results cannot select an artistic winner.
