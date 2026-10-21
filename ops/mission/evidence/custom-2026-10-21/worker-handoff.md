# Custom TDD Sidecar: RED Ready

HEAD observed before edits: 8e2f25ef6b81ffc65b9f96644170834c511078d3, clean.
Only product-tree write: apps/media/scripts/custom-refinement.test.mjs.
No builder/config/model/manifest/helper/UI/engine/doc/other-test edits. No import
of the absent builder, child-process spawning, network, install, server or render.

Exact no-child-process command from repo root:

```powershell
node --experimental-test-isolation=none --test apps/media/scripts/custom-refinement.test.mjs
```

Node v22.22.2. Final genuine RED retained in worker-final-red.tap.log: 14 tests,
0 pass, 14 fail, 0 skip, exit 1, duration 342.721ms. Prior corrected RED is also
retained in worker-red.tap.log. Every final failure ERR_ASSERTION:
missing refined-textured imported record, zero PBR textures versus twelve,
or missing named rendered Custom components. No ENOENT/import/TypeError failures.
All pre-load adversarial fixtures reached the expected feature assertions.
An initial endpoint-oracle flaw was found and repaired before retained RED:
endpoint tests now clip triangles, rejecting a mid-span support that a whole-
triangle selection would accidentally accept. No product implementation occurred.

## Author Contract

- Four procedural original PBR triplets, twelve used embedded 256px WebPs;
  images=[]; config.surfaces steel/radial/dial/enamel with roughness,
  normalScale and tile. Normal packing lossless VP8L, >99% decoded unit normals
  within .025; intentionally reused map bytes need NOT have different hashes.
- Named mats C-Steel-Linear, C-Steel-Radial, C-Dial, C-Enamel-Green/Red.
  No emission. Both manifests, GLB hash, LF-normalized builder hash and canonical
  JSON recipe hash are independently verified.
- C-Assembly supplies the author y-up frame (case XZ). Stage actual minY0/max3.2.
  C-Case closed shell with lower central floor and raised rim; actual radial
  surface sections enforce circularity (a square with matching bounds fails).
  C-Dial closed
  seated cylinder top .264 +/- .025, dark. C-Rose closed raised faceted metal
  eight-point body: radial sampling section at Y .28; C-Tick-0..59 closed,
  evenly spaced, radial, seated; indices divisible by five are longer majors.
- C-Needle-North/South closed faceted green/red bodies under a shared Y-rotated
  group. C-Axle meets dial and C-Pivot; BOTH actual needle roots touch both
  axle and pivot using geometry clipped to the actual +/- .12 pivot-root region,
  not entire long faces. C-Glass closed thin BLEND lens inside case, above full
  needle and pivot with .002 clearance, actually covering projected vertices
  and triangle-center samples.
- C-Lid-Group hinge author [0,.4,-.96], open rotation about X approximately
  -1.92; C-Lid direct child. Closed cup centered local z+.95, concave -Y;
  sampled floor .015, rim lower by >.025, exterior back >.015 beyond floor.
  Actual lid rises >.9 above case top rather than hanging below case.
- C-Hinge-Pin spans ALL five closed hollow C-Hinge-Knuckle-0..4. Even
  knuckles case-parented; odd knuckles direct children of C-Lid-Group.
  Empty X bores are tested without pin, then actual radial bore/pin clearance.
  Interleaved X intervals do not overlap and are separated by <.035.
- C-Hinge-Case-Link--1/1 root on case and join outer knuckles0/4;
  C-Hinge-Lid-Link--1/1 are direct lid-group children joining lid and knuckles1/3.
  Opposite actual endpoint surface regions must meet the two supports. ALL
  five knuckles additionally touch their proper case/lid skin or brackets.
- C-Lug at front z1.04 +/- .1 meets case and C-Bail centered z1.30 +/- .1.
  Bail closed with actual empty Y-aperture; inserted solid infill must fail.
- Per-shell directed manifold/positive outward volume, not aggregate-volume
  acceptance. Contact uses bounded edges and actual surface distances, not
  AABB overlaps, containment, open-mesh parity or unbounded ray hits.
  Fixture checks include open/inverted/mixed-winding shells, nested skins/
  solids, disjoint overlapping-AABB triangles, detached/midspan supports,
  filled rings, slab lids, disk roses, normalized/collapsed/out-of-range UVs,
  GPU TRS expansion and inverse-transpose normals under nonuniform scaling.
- Original limits remain 524288 bytes, 65000 unique AND rendered triangles,
  10485760 total public bytes, meshopt position/UV quantization16. Acorn extracts
  the REAL saveRefinedHero callback and executes fresh exact-cap/+1-byte cases;
  removed, stale/unused-fresh-read and >= boundary mutations must be rejected.

Full original129 media suite includes forbidden child spawning/temp writes;
parent owns that baseline/full-suite gate. Worker separately runs its read-only
subset with test isolation disabled: 108/108 pass, 0 fail/skip, exit0,
14330.2569ms. Summary excerpt and command: worker-existing-readonly.log.
