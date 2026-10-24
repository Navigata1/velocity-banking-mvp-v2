# Controlled Car And Card Material Refinements

## Decision

Keep two localized presentation refinements. Car paint has less coarse grain;
the silver Card has clearer brushed shading. Neither change establishes final
photorealism or completes the collection's art gate. The original dashboard,
source assets and financial calculations remain intact.

- Car: multiply the loaded `Paint 1 Carmine` and `Paint 2 Carmine` normal scales
  by 0.5, approximately 0.30 to 0.15 on the delivered model.
- Card: change only `CC-Brushed-Silver` anisotropy from 0.65 to 0.30. Emerald and
  turned-silver response, grain maps and normal scale stay unchanged.

`hero-materials.ts` is shared by the web viewer and HyperFrames preparation.
Both call it after successful model loading, before attaching/rendering the
scene, never from animation or Replay. A material-identity Set deduplicates
bindings; all targets are validated before mutation. A weak scene guard prevents
repeated application without retaining disposed scenes.

Fresh scene ownership is required. Three's `scene.clone(true)` shares materials;
the scene guard does not isolate separately cloned roots. Both production
callsites independently load their models and do not use that cloning path.

## Evidence

The local private study uses four independently loaded fixtures, identical
1920x1080/DPR1 framing, original lighting/environment/exposure, the same eight
second turn and one second rest. Four lint/strict checks pass. Fresh full frames
at 0/2/3/4/5/6/8.5 seconds provide 14 matched A/B comparisons; pixel checks reject
blank or edge-clipped art and confirm every pair is a real material change.

Four direct readiness probes identify SwiftShader and execute nine repeated
seeks each. Material values and camera stay fixed; each fixture requests one
model, completes exactly one revolution and holds its final pose. The original
GLBs, ten posters and three source/provenance manifests remain byte-identical.

Independent CPU review checks real GLTFLoader/MeshoptDecoder material graphs,
deduplication, atomic failure, zero/sign preservation, material/resource ownership
and late-load cleanup. Independent visual review prefers both bounded changes.
Car raw-frame review covers the two initial/front views independently, with
parent review extending to opposite/rear views and seven-angle sheets. Card
independent review covers two full frames and all seven sheet thumbnails. This
is not full-resolution approval of every angle or a temporal-shimmer assessment.

Permanent tests cover unit policy, actual component load/Replay/failure and
stale-model behavior, plus shared media preparation/application wiring. Tests
must reject a Car-hardcoded callsite and removed media application. Broader
standing browser, calculation, media, native and release checks remain required.

## Limits

- Car's broad bright reflections and Card's dark emerald reverse remain open.
- Car Tireside remains the existing lossy adaptation. Other source pins and
  public byte budgets are not changed to obtain this refinement.
- Initial study failures are retained: external-module fixture bundling, then
  a favicon404 and software ReadPixels warnings in the direct probe. The fixture
  uses the working inline-module form; its server handles the incidental icon.
  Four exact software performance warnings remain recorded for Car A.
- Inherited hardware/D3D X4122 remains open. Strict software success is not
  hardware clearance, and no warning is attributed to this material adjustment
  without causal evidence.
- This change does not alter amortization, daily accrual, comparison funding,
  scenario ownership, lender/calendar assumptions, backend/schema or dependencies.

Local evidence lives under `ops/mission/evidence/hero-materials-2026-10-22/`;
the pinned raw logs/images are in the ignored material lab on this workstation.
Each pushed head still needs both complete CI events, its exact automatic
preview, hosted workflows, actual browser inspection and a read-back receipt.
No merge, production promotion or custom-domain change is part of this slice.
