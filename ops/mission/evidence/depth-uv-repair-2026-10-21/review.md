# MissionControlTier2 Independent Asset Review

## Findings First

### F1 - [P2] The shipped-chart verifier accepts non-finite UVs

Pin: [material-uv-charts.test.mjs:39](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/material-uv-charts.test.mjs:39>), file SHA-256 `62312fb9fbf357007f533d3dd5b9b262f506f986c196ddd97a92d456163840a7`.

`Math.abs(determinant) < 1e-12` is false for `NaN`. The helper does not assert finite UV elements or a finite determinant. Extracting the real `charts` function with Acorn and replacing actual normal-mapped UV accessors in memory with float32 `NaN`, then separately `Infinity`, incorrectly returns zero failures for all three shipped models. It still inspects 10,106 / 20,172 / 13,340 scene-used nondegenerate triangles, so the coverage floor does not prevent this false green. These are invalid charts, not a legitimate zero-failure result.

Requested parent action: explicitly reject non-finite chart coordinates/determinants and add a negative control starting from the valid actual GLB. House/Card's existing refinement finiteness checks cover positions, not UVs. Student's separate all-semantic finiteness guard is useful but does not repair this shared verifier. No shipped GLB was changed for this reproduction, and all current shipped coordinates independently checked finite. This is a test-oracle defect, not an observed defect in the repaired artifacts. Reported promptly in commentary; reviewer did not edit tests.

## Verdict And Boundary

One P2 validation finding. No geometry, material, image, metadata, or protected-scope regression found at the exact pins below. The actual depth-chart repair is supported by independent decoded before/after measurements, not just counts or the implementation's tests. Close F1 before treating the shared verifier as a complete chart-validity gate.

Base and current HEAD: `189eeaea5ae04554564474cf9a741b416b82c817`; branch `codex/restoration/asset-heroes`. Review covers the current uncommitted three builders, two new tests, three GLBs, and two manifests. Saved `before/{house,creditCard,studentLoan}.glb` bytes each equal their actual Git-base blobs. Only this `review.md` was written by this reviewer. No generator, asset/source/test edits, publication, build, render, browser, server, npm, cloud, commit, or push. Parent owns those lanes and mission state; unrelated agent `01a15930` was not contacted or modified.

## Exact Artifact Pins

| Asset | Git-base SHA-256 | Reviewed SHA-256 |
| --- | --- | --- |
| House | `fd4b44c07ba6a36e1711923874b158d02dcf75eda289836dea6dbd890360a639` | `ec008a1681930595a11579c6b19a1c02377d3211aea8a36b03e2aff9bd244f33` |
| Credit Card | `223aebb70009929f4b69829e59e8e8487d4783e90b192e076a10c570a0983a17` | `b3f08cc7e2e081deee13f86f88bdc02a7ff7b46ac97beb3155d4f5c4b4188025` |
| Student Loan | `284d956676b8b7656edb4a927de084ee4508549692e8dc859225e32a5ca18222` | `56dfe51ad199bdafcc0cc5ced65321a16a4e087693f645d6d12c6bc14fb98d12` |

Normalized-LF builder SHA-256 values independently match both manifests:

- House: `69b177d43ccf4655d2a8d4132ff2ac6e26b30b09b36c3f9cf04eeff291842a6b`.
- Card: `db342fc5cfb51b6ba12da512ac6a3b738bab2b4e5fcdc0bbcf1a6b5bc8b264b5`.
- Student: `48d99dc525248b488180947becd28733a7516c461382db055aff7eec791a33ce`.
- Student helper test: `ddef9c814909b9834fcda98f6a0a166c0277e3759ed15ea89d32646a007fcc37`.

All three record pairs are identical across the two manifests, correctly version 3, with actual GLB byte counts/hashes. Their material-config hashes independently recompute correctly from JSON; configs remain byte-identical to Git base.

## Decoded Geometry And Charts

NodeIO + Meshopt decoding, actual scene traversal, world-position transforms and inverse-transpose normal transforms were used. Triangles were matched per mesh use by cyclic oriented corner positions, preserving winding. Duplicate/degenerate coincident triangles were matched by their corner attributes, not arbitrarily by occurrence order. Exact decoded oriented position/normal triangle multisets match, including unnormalized transformed normals; maximum position/normal difference is zero. Previously noncollapsed UV corners match exactly, maximum difference zero. This includes House front/back caps, Card front/bevel/coin faces, and Student broad ribbon faces. Vertex/index ordering is not claimed identical.

| Model | Unique triangles | Scene-used triangle instances | Old collapsed mapped triangles | New collapsed | Existing degenerate instances |
| --- | ---: | ---: | ---: | ---: | ---: |
| House | 31,316 | 45,216 | 244 | 0 | 2 |
| Credit Card | 18,008 | 26,408 | 2,704 | 0 | 0 |
| Student Loan | 29,348 | 34,940 | 1,040 | 0 | 480 |

Counts are unchanged. Degenerates were already present in the base; no claim that this repair eliminates inherited geometry issues. The shared real verifier independently reproduces all three old failure counts directly on saved originals. Its constant-chart controls are meaningful, and Student's selective side/cap controls reject 256/4/260 triangles respectively, plus 516 for constant UVs.

- House changes UVs only on the 244 previously collapsed wall/reveal triangles across 12 wall mesh uses. Three's native side chart divided by 3.1 retains cap XY mapping. No measured compressed geometry/normal/front-cap delta.
- Card changes UVs only on previously collapsed XY-degenerate triangles. Default face scales, coin face scales, native side U, and zero-aligned Z/max-face-scale projection are consistent with the source diff. Noncollapsed cap/bevel maps remain exact after compression. Contacts share optimized meshes, so unique triangles and scene-used triangles intentionally differ.
- Student changes UVs only on the four ribbons' 260 previously collapsed side/cap triangles each. Normal computation remains before seam duplication. Source geometry has 528 vertices per ribbon versus original 260; weld/compression yields **461**, not 528, decoded vertices, still 516 triangles. Position, winding, original smoothed normals and all broad-face UVs remain exact after compression.
- The four hardcoded Student position/normal snapshots and common broad-face UV hash were independently reproduced by AST-extracting only the original helpers/authored calls from `git show <base>:apps/media/scripts/build-refined-student-loan.mjs`. All five hashes match. No builder top-level I/O was executed.

All inspected position/normal/UV values are finite. On repaired nondegenerate triangles, minimum absolute UV determinants are House `0.012160837420147175`, Card `2.654350341379995e-8`, Student `0.0010416667209938169`. World-space `dP/du` and `dP/dv` are finite and span a nonzero area on every repaired triangle; maximum derivative length is respectively 1.088401 / 6.596499 / 0.917020. Existing normal-texture transforms have nonzero scales: House 1x1; Card 1x8 or 1x1; Student 2x2, 1x1 or 4x4. Thus they do not destroy chart rank. This is derivative validity, not a texture-quality or all-angle art verdict.

All six components of decoded world bounds match base exactly. Grounding/max-span remain within the existing tests: min Y is House `0.00004224677104848473`, Card `-0.0000031021440348166784`, Student `0`; largest span is approximately 3.2 for each.

## Identity, Scope And Budgets

All GLB material, texture, sampler, asset/copyright JSON values are exact base matches, including full original copyright strings. All embedded image bytes are exact: House 6, Card 6, Student 9, **21 total**. No lossless/lossy image conversion slipped into this repair. House/Card top-level GLB JSON changes are confined to `bufferViews`/`buffers`; Student additionally changes `accessors`/`meshes` for seam attributes. Node/scene transforms and names are unchanged.

Every other tracked public file is byte-identical to Git base, including the seven other GLBs and all ten posters. Actual recursive public bytes equal tracked public bytes, **9,960,534**, leaving **525,226** below the unchanged 10 MiB cap. Git source diff is confined to the three builders and two manifests; financial/math/UI source and other model builders remain unchanged.

Car GLB is byte-identical to base: `8b47003fb31a8d1e41f271a05bf64bf6f68b84625d18992f1201a7f66e65ce54`. Its active original paint normal PNG remains `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e`; independently decoded RGB remains `f084dbffd99641c57a397c5de7b5defec889114310ed07861711b043bf787477`. Existing Car fidelity test passes including source filters, 30x30 tiling and strength.

| Asset | Bytes | Unchanged cap | Headroom |
| --- | ---: | ---: | ---: |
| House | 1,145,320 | 1,310,720 | 165,400 |
| Card | 523,764 | 524,288 | **524** |
| Student | 723,868 | 786,432 | 62,564 |

Card headroom is exceptionally tight, about 0.10%. Preserve the cap; do not raise it to accommodate future optimizer/export drift. No cap failure was reproduced on the final pinned artifact. Earlier parent budget-failure evidence is not erased by this final pass.

AST-extracted `saveRefinedHero` publication callbacks are text-exact to base for all three builders. Original model/aggregate/triangle cap expressions are exact too. No weakening of locked publication or caps found; reviewer did not execute publication.

## Commands And Results

Run from `C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media`:

```powershell
node --test --test-reporter=spec scripts/material-uv-charts.test.mjs scripts/student-loan-uv-geometry.test.mjs
node --test --test-reporter=spec scripts/car-paint-fidelity.test.mjs scripts/house-refinement.test.mjs scripts/credit-card-refinement.test.mjs scripts/student-loan-refinement.test.mjs
git diff --check
```

Fresh results: **19/19**, **26/26**, diff check exit 0. All were pure Node inspection tests, with no generator or rendering execution. No full parent gate results are claimed here.

F1 minimal read-only reproduction from the same directory, using the exact actual verifier rather than a rewritten approximation:

```powershell
node --input-type=module -e @'
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from 'acorn';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix4,Vector3} from '../web/node_modules/three/build/three.module.js';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({'meshopt.decoder':MeshoptDecoder});
const s=fs.readFileSync('scripts/material-uv-charts.test.mjs','utf8');
const n=parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.id?.name==='charts');
const charts=vm.runInNewContext('('+s.slice(n.start,n.end)+')',{assert,Matrix4,Vector3});
const root=(await io.readBinary(fs.readFileSync('../web/public/heroes/house.glb'))).getRoot();
assert.equal(charts(root).failures.length,0);
for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
  const m=p.getMaterial();if(!m?.getNormalTexture())continue;
  const uv=p.getAttribute('TEXCOORD_'+m.getNormalTextureInfo().getTexCoord());
  uv.setArray(new Float32Array(uv.getCount()*2).fill(NaN));
}
const r=charts(root);
console.log({inspected:r.inspected,failures:r.failures.length});
// Observed: { inspected: 10106, failures: 0 }, incorrectly accepted.
'@
```

## Remaining Approval Limits

No new browser, GPU, rendered/material appearance, all-angle collection art, publication, CI, hosted or shipping approval is provided. Existing HyperFrames hardware X4122 warning remains open and parent-reported as reproduced on unchanged Car; this reviewer did not rerun hardware diagnostics or change any graphics source. No all-photoreal claim. This independent lane does not replace the parent's serial full gates.


## F1 Closure And Complete Raw Source Pins

**Final status: F1 CLOSED.** This appended re-review supersedes the historical open-F1 status and old shared-test hash above; the original finding, reproduction and normalized builder pins are preserved as evidence. No new findings in the final `material-uv-charts.test.mjs`.

Final verifier pin: `91e96f04621a55d59d2f43a84a7d34be5d49467f55a04e99668a247f4cdf9e56`, 3,774 raw bytes. The condition at line 39 now rejects non-finite coordinates **and** determinants, in addition to the existing near-zero determinant guard. The three negative-control cases at lines 55 onward each reload a fresh actual root for constant 0.5, NaN, +Infinity and -Infinity; they require the unmodified root to pass before each mutation. Float32 replacement accessors prevent integer conversion from silently erasing non-finite test inputs.

Independent closure evidence:

- Fresh exact command from `apps/media`: `node --test --test-reporter=spec scripts/material-uv-charts.test.mjs` -> **6 tests, 6 pass, 0 fail, exit 0**. The suite still has three positive and three negative-control test cases, not additional counted tests for each loop iteration. No full-media test count is independently claimed in this follow-up.
- Parent's `nonfinite-red.log` was inspected: three positive cases pass, all three new negative-control cases fail on NaN before the fix, total 3/6. This is retained RED evidence, not a current failure.
- Separately AST-extracted the exact final `charts` helper and exercised all **12** model/value combinations against fresh actual GLB roots. Confirmed via accessor `getElement`/Object.is that the intended Float32 constant/NaN/+Infinity/-Infinity values actually reach the verifier, including originally normalized accessors.
- Each mutation rejects every inspected mapped nondegenerate triangle: House **10,106**, Card **20,172**, Student **13,340**. Inspected counts remain identical to each healthy root; no empty-scene, removed-normal-map, skipped-surface or unrelated-assertion shortcut explains success. Unique mutated accessors are respectively 44 / 6 / 13.
- Disabled **only** the new finiteness condition in an in-memory copy of the AST-extracted helper, without writing any source. All nine non-finite combinations then incorrectly report zero failures again, while all three finite constant combinations remain rejected by the determinant test. This independently establishes that the new guard and the new controls address F1 specifically.

The following machine-readable pins cover **all seven non-GLB reviewed source paths**, read directly as raw bytes, without line-ending normalization. They supplement, not replace, the earlier normalized builder pins. On this checkout the three raw builder hashes equal their earlier normalized-LF hashes. Original GLB/Car/other artifact pins and approval limits remain as recorded; no broader source, artifact, browser, build, rendering, cloud or shipping re-review was performed in this follow-up. Only `review.md` was modified by the reviewer.

```json
{
  "finding": "F1",
  "status": "closed",
  "baseCommit": "189eeaea5ae04554564474cf9a741b416b82c817",
  "testWorkingDirectory": "C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media",
  "testCommand": "node --test --test-reporter=spec scripts/material-uv-charts.test.mjs",
  "freshTestResult": {
    "tests": 6,
    "pass": 6,
    "fail": 0,
    "exitCode": 0
  },
  "reviewedSourceFiles": [
    {
      "path": "apps/media/scripts/build-refined-house.mjs",
      "bytes": 17965,
      "rawSha256": "69b177d43ccf4655d2a8d4132ff2ac6e26b30b09b36c3f9cf04eeff291842a6b"
    },
    {
      "path": "apps/media/scripts/build-refined-credit-card.mjs",
      "bytes": 12452,
      "rawSha256": "db342fc5cfb51b6ba12da512ac6a3b738bab2b4e5fcdc0bbcf1a6b5bc8b264b5"
    },
    {
      "path": "apps/media/scripts/build-refined-student-loan.mjs",
      "bytes": 17582,
      "rawSha256": "48d99dc525248b488180947becd28733a7516c461382db055aff7eec791a33ce"
    },
    {
      "path": "apps/media/scripts/material-uv-charts.test.mjs",
      "bytes": 3774,
      "rawSha256": "91e96f04621a55d59d2f43a84a7d34be5d49467f55a04e99668a247f4cdf9e56"
    },
    {
      "path": "apps/media/scripts/student-loan-uv-geometry.test.mjs",
      "bytes": 6720,
      "rawSha256": "ddef9c814909b9834fcda98f6a0a166c0277e3759ed15ea89d32646a007fcc37"
    },
    {
      "path": "apps/media/hero-imported.json",
      "bytes": 9510,
      "rawSha256": "679024087903b4e5d583871ef5baf425511e4213e55ed42964dbb0f18b73a542"
    },
    {
      "path": "apps/media/hero-models.json",
      "bytes": 9510,
      "rawSha256": "1035ac018869e11f94f7b40b6b97abec0d3f6ea1283cd9301da8179ab2899ceb"
    }
  ]
}
```
