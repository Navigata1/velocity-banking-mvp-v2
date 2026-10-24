# Independent Hero Framing Survey

2026-10-21. Authorized MissionControlTier2 read-only sidecar; only this report was written. No diagnostic script, product/gate/manifest/asset/state changes, Git commands, network, dependency installation, builds, rendering, browser, GPU, or server. Baseline `c9d3acccb8ee22fd6f08b29d7eacca91eee6ec49` is supplied by the parent, not independently Git-verified. Literal-byte source and asset pins appear below.

## Verdict

**Yes: the current sphere fit materially reduces geometric screen occupancy, especially for `car` and `studentLoan`. A full-yaw cylinder/frustum fit is analytically safe and brings their desktop cameras 38.6% closer with the same 1.08 distance margin.** This does not establish photorealism, visual quality, or approval. No fresh screenshots were taken or assessed by this sidecar; the parent owns that work.

The effect is not universal: measured `recreation` and `creditCard` assemblies are tall, not flat, and cylinder-only gains are just 4.1% and 6.2%. Further improvement there requires preserving radius/height correlation, not an arbitrary camera zoom. Some existing undersizing comes from conservative transformed primitive boxes, not just the sphere formula. An implementation using only today's coarse `Box3` corners will recover less than the precise-geometry table predicts.

## Evidence And Assumptions

- Read `apps/web/src/components/hero/HeroModelStage.tsx:39-42,62,80-82`, `turntable.ts:1-14`, `AssetHero.tsx:34`, and `apps/media/hero-turntables/index.html:41,57-61`. Paths here are repository-relative within `C:/Users/IslandDevCrew/Documents/Interest Shield`.
- Current fit: vertical FOV 32 degrees; near/far 0.1/50; direction `normalize(3.3,1.35,4.8)`; distance `1.08 * max(0.1,rSphere) / sin(atan(tan(16deg) * min(1,max(0.25,aspect))))`. Numerical baseline is a direct transcription of the read helper, not execution of product/gates.
- `rSphere` is half the diagonal of `new Box3().setFromObject(scene)` at yaw zero, not a minimum enclosing sphere of actual vertices. The default `precise=false` transforms each local primitive box. Camera target is that coarse box center, fixed throughout the turn.
- Actual geometry was decoded with existing `@gltf-transform/core` NodeIO 4.5.1, `ALL_EXTENSIONS`, and existing MeshoptDecoder. Normalized POSITION values use `Accessor.getElement`; world transforms use NodeIO `getWorldMatrix` and Three Matrix4/Vector3. No GLB geometry byte parser was hand-written; original accessor metadata came from `NodeIO.binaryToJSON`.
- Default scene only, all referenced vertices, every `EXT_mesh_gpu_instancing` instance TRS included (instance matrices rounded through Float32 as in Three). `personal` has instancing; omitting it invalidates the measurement. All ten have one scene, zero skins, zero animations, zero morph targets, and triangle primitives. No shader vertex displacement is modeled.
- 486,571 referenced vertex occurrences after per-primitive index deduplication and instancing. Geometry support maxima include all triangles: a linear plane inequality attains its triangle maximum at a vertex; radial norm is convex and its maximum also occurs at a vertex. Materials, alpha, culling, and occlusion may reduce visible pixels; they cannot invalidate this conservative geometric containment.
- All world-space bounds below are after authored normalization, before the root scene's yaw. The actual yaw pivot is **scene origin `(0,0,0)`**, not a mesh-local pivot, child translation, or fitted box center. No scene geometry is recentered by the current stage.
- Aspect means **canvas width/height**, not browser viewport ratio. Representative source-derived M = 351/270 = 1.3 (375px mobile, 24px horizontal padding); D = 725.333333/420 = 1.726984127 (1440px viewport, 224px nav, 48px padding, 16px gap, 1.7:1 grid); V = 1920/1080 = 1.777777778 (video source). M/D are layout assumptions, not fresh DOM measurements; parent should substitute captured canvas sizes. Formula accepts any positive aspect.
- Video predictions assume freshly prepared copies of the pinned GLBs/helper, not approval of old vendor copies or existing MP4s. Credit/progress overlays and safe title areas are not frustum planes and are excluded.

## Measured Geometry

Units are normalized stage units. Bounds are tight world-space **surface** AABBs, not current coarse camera boxes. R is `max hypot(x,z)` about the actual yaw axis; Rc is the conservative radius of the tight AABB's furthest XZ corner. `rvMin` is the vertex-only radial minimum. The true triangle-surface radial minimum is **0 for every asset**, independently checked by origin-to-projected-triangle/segment distance; vertex minima alone must not be mistaken for surface minima.

| Asset | Actual min XYZ | Actual max XYZ | rvMin / R / Rc |
|---|---|---|---|
| car | -0.933512, 0.000000, -1.600000 | 0.933512, 0.843712, 1.600000 | 0.005163 / 1.700454 / 1.852416 |
| house | -1.245233, 0.000042, -1.599990 | 1.245233, 2.095505, 1.599990 | 0.041975 / 1.826685 / 2.027455 |
| land | -1.600000, 0.000073, -1.321551 | 1.600042, 2.005895, 1.321651 | 0.011485 / 2.064862 / 2.075306 |
| creditCard | -1.190135, -0.000003, -1.024836 | 1.190135, 3.199990, 1.024828 | 0.019334 / 1.558123 / 1.570577 |
| studentLoan | -1.514930, 0.000000, -1.600001 | 1.514929, 1.451620, 1.599995 | 0.055074 / 1.634707 / 2.203410 |
| medical | -1.599999, -0.000001, -1.345923 | 1.599998, 2.260951, 1.345945 | 0.028411 / 1.693809 / 2.090829 |
| personal | -1.599975, -0.000012, -1.292845 | 1.600008, 2.339987, 1.292859 | 0.016454 / 1.896060 / 2.057063 |
| recreation | -0.413661, 0.000002, -1.217748 | 0.413652, 3.200001, 1.217748 | 0.016500 / 1.223052 / 1.286089 |
| custom | -1.274124, 0.000001, -0.906378 | 1.274110, 3.200001, 0.906387 | 0.001273 / 1.418749 / 1.563627 |
| vault | -1.197479, -0.000010, -1.600000 | 1.197417, 2.595406, 1.599986 | 0.010450 / 1.913972 / 1.998488 |

All actual XZ midpoints are within 0.000050 of the origin; all ground minima are within 0.000073 of Y=0. Longest spans are approximately 3.2. Centers are AABB midpoints, not centroids or centers of mass.

| Asset | Actual AABB center XYZ | Current coarse camera target XYZ | Current rSphere |
|---|---|---|---|
| car | 0.000000, 0.421856, 0.000000 | -0.003650, 0.363454, 0.000000 | 1.945596 |
| house | 0.000000, 1.047774, 0.000000 | 0.000000, 1.047774, 0.000000 | 2.284146 |
| land | 0.000021, 1.002984, 0.000050 | 0.000021, 1.002984, 0.000050 | 2.304892 |
| creditCard | 0.000000, 1.599993, -0.000004 | 0.044216, 1.588145, 0.004105 | 2.297867 |
| studentLoan | -0.000001, 0.725810, -0.000003 | -0.004624, 0.725810, -0.005298 | 2.327422 |
| medical | -0.000001, 1.130475, 0.000011 | 0.090464, 1.130475, 0.135498 | 2.517531 |
| personal | 0.000017, 1.169987, 0.000007 | -0.068502, 1.169987, -0.071752 | 2.655887 |
| recreation | -0.000004, 1.600001, 0.000000 | 0.004705, 1.600001, 0.006916 | 2.078629 |
| custom | -0.000007, 1.600001, 0.000004 | 0.031636, 1.636676, -0.000170 | 2.568937 |
| vault | -0.000031, 1.297698, -0.000007 | 0.001479, 1.297698, 0.003682 | 2.386073 |

All scene-root child rotations are identity. Nine stage-root child translations are zero. Car's child translation is `(0.000180850,0.000180746,-0.175111089)` with uniform scale 0.734373748; that is already included in the measured vertices and is **not** the root scene's yaw pivot. Coarse targets for medical/personal visibly differ numerically from the true axis; a sphere centered there is not automatically invariant under origin yaw. Actual continuous-yaw containment below nevertheless passes for all ten. Do not diagnose existing clipping solely from this structural mismatch.

## Independent Derivation

Let `target=(pivotX,cy,pivotZ)`, `cy=(minY+maxY)/2`, `H=(maxY-minY)/2`, `e=atan2(1.35,hypot(3.3,4.8))=13.048599134deg`, `s=sin(e)=0.225777449`, `c=cos(e)=0.974178907`. In the horizontal camera basis, let `p` point toward the camera and `t` right; a full yaw makes each vertex trace `p^2+t^2=rho^2` at fixed `y=worldY-cy`. Use `tv=tan(16deg)=0.286745386`, `th=aspect*tv`, with no aspect clamp.

```text
zCam = c*p + s*y                  (positive toward camera)
xCam = t
yCam = -s*p + c*y
depth = d - zCam

depth > 0
d >= zCam + abs(xCam)/th
d >= zCam + abs(yCam)/tv
```

The parent's plane inequalities are correct **only with this zCam sign, camera basis, and positive depth**. They do not themselves enforce near/far. Maximizing a linear form `A*p+B*t` on a horizontal circle gives `rho*hypot(A,B)`; the vertical form has no t component. Maximizing additionally over the symmetric cylinder `rho<=R, abs(y)<=H` gives the exact side-plane requirement for that enclosing cylinder:

```text
DH = abs(s)*H + R*sqrt(c*c + 1/(th*th))
DV = max over k in {-1,+1}:
       abs(s + k*c/tv)*H + abs(c - k*s/tv)*R
dSides = max(DH,DV)
Z = abs(c)*R + abs(s)*H
d = max(1.08*dSides, near + Z + epsilon)
depth interval is contained in [d-Z, d+Z]; require d+Z+epsilon < far.
```

This is both sufficient and tight for a filled cylinder: DH has a tangent-circle witness; each DV branch has a rim/height-sign witness. No angle sampling is needed. The midpoint target is justified for this symmetric enclosing cylinder, not claimed to be the minimax screen target for every asymmetric real assembly. `1.08` multiplies **distance**; it is not a promise of exactly 8% blank pixels or an exact 1/1.08 occupancy.

For comparison, retaining each real vertex's `(rho,y)` gives a tighter, also exact all-yaw side-plane requirement for the actual static triangulated geometry at the specified target:

```text
dExact = max over all transformed referenced vertices:
  s*y + rho*sqrt(c*c + 1/(th*th)),
  (s + c/tv)*y + abs(c - s/tv)*rho,
  (s - c/tv)*y + abs(c + s/tv)*rho
```

This comparison is not a second proposed API or an implementation requirement. It quantifies cylinder slack from combining a maximum radius and a height that may occur on different vertices. AABB-corner R is safe but unnecessarily conservative, especially for studentLoan (2.203410 versus actual 1.634707). `max(width,depth)/2` is not a safe replacement for R in general.

## Predicted Occupancy And Risk

`W x H` is the projected bounding rectangle as a percentage of canvas width/height at current rest yaw `-0.55`, **not shaded-pixel area**. Each arrow compares current coarse-sphere camera with actual-geometry cylinder camera targeting `(0,cy,0)`. `N` is the exact maximum absolute X/Y normalized-device coordinate over **every yaw**, all vertices; N>1 means side clipping, N<1 proves side containment under the stated assumptions. The swept extrema need not occur in one frame. Current off-axis target offsets are retained in current-camera calculations.

| Asset | Aspect | Distance current -> cylinder | Rest W% x H% current -> cylinder | Full-yaw N current -> cylinder |
|---|---|---|---|---|
| car | M | 7.623 -> 5.344 | 59.2 x 29.0 -> 85.2 x 42.9 | 0.6140 -> 0.8948 |
| car | D | 7.623 -> 4.680 | 44.6 x 29.0 -> 73.7 x 49.7 | 0.4622 -> 0.7815 |
| car | V | 7.623 -> 4.680 | 43.3 x 29.0 -> 71.6 x 49.7 | 0.4490 -> 0.7614 |
| house | M | 8.950 -> 7.064 | 50.8 x 51.2 -> 64.1 x 66.5 | 0.6727 -> 0.9022 |
| house | D | 8.950 -> 7.064 | 38.2 x 51.2 -> 48.2 x 66.5 | 0.6727 -> 0.9022 |
| house | V | 8.950 -> 7.064 | 37.1 x 51.2 -> 46.9 x 66.5 | 0.6727 -> 0.9022 |
| land | M | 9.031 -> 7.364 | 50.2 x 52.3 -> 61.6 x 65.8 | 0.6946 -> 0.9022 |
| land | D | 9.031 -> 7.364 | 37.8 x 52.3 -> 46.3 x 65.8 | 0.6946 -> 0.9022 |
| land | V | 9.031 -> 7.364 | 36.7 x 52.3 -> 45.0 x 65.8 | 0.6946 -> 0.9022 |
| creditCard | M | 9.003 -> 8.445 | 36.9 x 66.9 -> 39.4 x 71.6 | 0.7268 -> 0.7896 |
| creditCard | D | 9.003 -> 8.445 | 27.8 x 66.9 -> 29.7 x 71.6 | 0.7268 -> 0.7896 |
| creditCard | V | 9.003 -> 8.445 | 27.0 x 66.9 -> 28.8 x 71.6 | 0.7268 -> 0.7896 |
| studentLoan | M | 9.119 -> 5.596 | 46.6 x 39.3 -> 75.9 x 66.2 | 0.4933 -> 0.8507 |
| studentLoan | D | 9.119 -> 5.596 | 35.1 x 39.3 -> 57.2 x 66.2 | 0.4661 -> 0.8507 |
| studentLoan | V | 9.119 -> 5.596 | 34.1 x 39.3 -> 55.5 x 66.2 | 0.4661 -> 0.8507 |
| medical | M | 9.864 -> 7.095 | 40.4 x 49.8 -> 57.6 x 73.0 | 0.5689 -> 0.8823 |
| medical | D | 9.864 -> 7.095 | 30.4 x 49.8 -> 43.3 x 73.0 | 0.5689 -> 0.8823 |
| medical | V | 9.864 -> 7.095 | 29.5 x 49.8 -> 42.1 x 73.0 | 0.5689 -> 0.8823 |
| personal | M | 10.406 -> 7.615 | 40.4 x 47.3 -> 55.4 x 65.2 | 0.5777 -> 0.8119 |
| personal | D | 10.406 -> 7.615 | 30.4 x 47.3 -> 41.7 x 65.2 | 0.5777 -> 0.8119 |
| personal | V | 10.406 -> 7.615 | 29.5 x 47.3 -> 40.5 x 65.2 | 0.5777 -> 0.8119 |
| recreation | M | 8.144 -> 7.807 | 38.8 x 67.2 -> 40.5 x 70.2 | 0.7019 -> 0.7374 |
| recreation | D | 8.144 -> 7.807 | 29.2 x 67.2 -> 30.5 x 70.2 | 0.7019 -> 0.7374 |
| recreation | V | 8.144 -> 7.807 | 28.4 x 67.2 -> 29.6 x 70.2 | 0.7019 -> 0.7374 |
| custom | M | 10.066 -> 8.180 | 26.7 x 64.3 -> 32.7 x 80.2 | 0.7247 -> 0.9019 |
| custom | D | 10.066 -> 8.180 | 20.1 x 64.3 -> 24.6 x 80.2 | 0.7247 -> 0.9019 |
| custom | V | 10.066 -> 8.180 | 19.5 x 64.3 -> 23.9 x 80.2 | 0.7247 -> 0.9019 |
| vault | M | 9.349 -> 8.086 | 52.3 x 55.0 -> 61.0 x 63.4 | 0.7098 -> 0.8430 |
| vault | D | 9.349 -> 8.086 | 39.4 x 55.0 -> 45.9 x 63.4 | 0.7098 -> 0.8430 |
| vault | V | 9.349 -> 8.086 | 38.2 x 55.0 -> 44.6 x 63.4 | 0.7098 -> 0.8430 |

Vault's actual compact source layout differs: mobile 327/240 gives `49.9 x 55.0 -> 58.2 x 63.4`; desktop 592/300 gives `34.5 x 55.0 -> 40.2 x 63.4`. Its distance and full-yaw N remain 8.086359 and 0.843049 in both cases.

All three representative-aspect cases for every asset pass side and near/far containment, for both current and cylinder fits. Following depth ranges are actual continuous-yaw extrema for the cylinder camera, pooled across M/D/V, not just distances to the enclosing cylinder. Smaller than 0.1 or larger than 50 would be a failure.

| Asset | Desktop distance reduction | Cylinder d | Tight-AABB-corner d | Actual per-vertex exact d | Actual depth range |
|---|---|---|---|---|---|
| car | 38.6% | 4.6801 | 4.9692 | 4.1986 | 3.032 .. 7.030 |
| house | 21.1% | 7.0640 | 7.4460 | 7.0454 | 5.387 .. 9.077 |
| land | 18.5% | 7.3637 | 7.3835 | 7.3637 | 5.448 .. 9.602 |
| creditCard | 6.2% | 8.4448 | 8.4685 | 7.3622 | 7.025 .. 10.235 |
| studentLoan | 38.6% | 5.5961 | 6.6781 | 5.3598 | 3.869 .. 7.317 |
| medical | 28.1% | 7.0947 | 7.8500 | 6.9350 | 5.385 .. 8.984 |
| personal | 26.8% | 7.6148 | 7.9211 | 6.9419 | 5.809 .. 9.574 |
| recreation | 4.1% | 7.8073 | 7.9273 | 6.4411 | 6.682 .. 9.168 |
| custom | 18.7% | 8.1796 | 8.4553 | 8.0716 | 6.631 .. 9.896 |
| vault | 13.5% | 8.0864 | 8.2471 | 7.5861 | 5.938 .. 10.200 |

Distance comparison columns use D/V, which have identical vertical-limited cylinder distances for these assets. The extra corner columns use the **tight** measured AABB; they are not interchangeable with today's coarse Box3. Cheap fallback using today's coarse box for both Rcorner and height instead yields D/V distances: car 5.2356, house 7.4502, land 7.3835, creditCard 8.7344, studentLoan 6.7066, medical 8.4518, personal 8.7302, recreation 8.0205, custom 9.6387, vault 8.2617. For example, custom's gain falls to 4.2%, recreation's to 1.5%. Coarse corner radii must use absolute coordinates relative to the **yaw pivot**, not merely half-spans.

Per-asset residual risks: car's mobile fit becomes horizontal-limited (5.3443 versus 4.6801 desktop); house and land approach N=0.9022 and should not receive an additional unproved zoom; creditCard and recreation remain cylinder-slack/height-limited; studentLoan is particularly penalized by AABB corners; medical and personal need axis-centered targets and transformed bounds; custom has substantial coarse primitive-box inflation; vault's safe credit/progress overlay clearance is outside this geometry proof. No present M/D/V clipping defect was established.

## One Proposed API Contract

Pure shared math, no Three/DOM dependency, no asset manifest or gate changes implied:

```ts
type HeroRotationBounds = {
  pivotXZ: readonly [number, number];
  radiusXZ: number;
  minY: number;
  maxY: number;
};
type HeroFrame = {
  target: readonly [number, number, number];
  distance: number;
  depthRange: readonly [number, number]; // Conservative cylinder depths.
};
declare function fitHeroTurntable(
  bounds: HeroRotationBounds,
  aspect: number,
  options?: {
    verticalFovDegrees?: number; // 32
    elevationRadians?: number; // atan2(1.35,hypot(3.3,4.8))
    margin?: number; // 1.08, a distance multiplier >= 1
    near?: number; // 0.1
    far?: number; // 50
  },
): HeroFrame;
```

Contract: bounds are finite, nonempty, in loaded scene/world units with **all node/instance transforms included**; `radiusXZ` encloses geometry about the supplied actual rotation axis, `minY<=maxY`, R>=0, at least one positive extent. Aspect is finite and >0 (never silently clamp to 0.25); FOV lies strictly between 0 and 180 degrees; abs(elevation)<pi/2; 0<near<far; margin>=1. Reject invalid or impossible far-plane inputs explicitly. Use `epsilon=1e-6*max(1,R,H)` for the depth guard and the derived formulas above. Return `target=[pivotX,(minY+maxY)/2,pivotZ]`, `distance=d`, `depthRange=[d-Z,d+Z]`. Consumer positions its camera at target plus the existing normalized direction times d, and looks at target. Current assets require `pivotXZ=[0,0]`. A caller supplying another pivot must actually rotate geometry around that pivot.

Measure once before changing scene yaw, retain immutable bounds, and refit only on aspect/options changes. Never compute new bounds from the already-rotating object each frame. A conservative coarse box is acceptable if explicitly distinguished from true vertex bounds. `Box3.setFromObject(object,true)` still uses a conservative instancing path in this installed Three version; it is not by itself an exact personal-bound measurement. For a true R, transform referenced POSITION vertices and each instance matrix once; no per-frame scan, GPU readback, or exhaustive yaw search is required. A cylinder is not guaranteed to beat a valid invariant sphere for arbitrary future shapes, so treat these gains as asset-specific evidence.

## Numerical Proof And Negative Controls

All runs were CPU-only in a persistent Node REPL with existing local libraries; no auxiliary diagnostic file was created. Three's real `PerspectiveCamera`, `lookAt`, `updateMatrixWorld`, and `Vector3.project` independently verified projected rectangles for all 486,571 vertices at all three representative aspects: **1,459,713 projections**, maximum discrepancy from the derived coordinate equations **4.440892099e-16 NDC**.

For each asset at aspects `[0.2,0.25,9/16,1,1.3,1.726984127,16/9,3]`, find the exact worst vertex/side from dExact and construct its analytic yaw witness. Horizontal witness has `(p,t)=rho*(c,1/th)/hypot(c,1/th)`; vertical branch k has `p=sign(c-k*s/tv)*rho,t=0`. At the **unmargined exact distance**, independent Three projection must touch that plane. **80/80 witnesses passed**, maximum contact error **3.330669074e-15 NDC**. All 80 actual-geometry cylinder fits additionally passed analytic continuous-yaw side/positive-depth/near/far checks. The final independent pass used the stage's actual near/far **0.1/50**, not just the proof camera's 0.1/100; the largest depth across all 80 was **41.428727733**. All 30 current-camera M/D/V cases also passed their actual clip range.

The continuous-yaw occupancy evaluator was not a GPU simulation or angular grid. For a vertex with horizontal radius rho, target horizontal components `(p0,t0)`, and y relative to target, write `D=d+c*p0-s*y`. Its horizontal projected ratio before th division is `(t-t0)/(D-c*p)`. Extrema k are the two real roots of `(t0+k*D)^2=rho^2*(1+k*k*c*c)`, provided `D>c*rho`. Vertical extrema are the endpoint ratios `(c*y+s*p0-s*p)/(D-c*p)` at `p=+/-rho`. Taking extrema over all vertices proves the reported all-yaw N; current target offsets are included. Depth extrema are `D+/-c*rho`.

Synthetic fixtures use points at `(rho=R,y=+/-H)` so their yaw sweep attains the cylinder's exact support bounds. Tests use the same pinned elevation/FOV and distance margin; figures are computed results, not desired targets.

| Fixture R,H | Aspect | Cylinder d | Full-yaw N |
|---|---|---|---|
| flat 2,0.1 | 9/16 | 13.580365431 | 0.924173810 |
| flat 2,0.1 | 1.3 | 6.189097171 | 0.917038609 |
| flat 2,0.1 | 16/9 | 4.755314655 | 0.909636938 |
| flat 2,0.1 | 3 | 4.147497755 | 0.861718679 |
| tall 0.15,2 | 9/16, 1.3, 16/9, 3 | 7.856250467 | 0.919826553 |
| balanced 1,1 | 9/16 | 7.021830378 | 0.921791385 |
| balanced 1,1 | 1.3, 16/9, 3 | 5.327798314 | 0.913820152 |

All six deliberately unsafe controls were required to fail, and did:

| Negative control | Result |
|---|---|
| Omit perspective depth: flat R=2,H=0.1,16/9, `1.08*max(R/th,H/tv)` | d=4.237208549; N=1.049794493 clips. Correct unmargined plane requirement is already 4.403069125. |
| Use center-relative R=1 for geometry offset X=1.2 but rotate around origin; H=0.2, aspect 1.3 | Actual pivot radius=2.2; bad d=3.131124532 gives N=2.658047172; safe enclosing-cylinder d=6.829952456. |
| Arbitrarily reduce actual studentLoan cylinder distance by 20%,16/9 | d=4.476905288; N=1.155858522 clips. |
| Current helper's 0.25 aspect floor applied to real aspect 0.2, R=1,H=0.1 fixture, sphere radius=hypot(1,0.1) | d=15.179625011; N=1.152810279 clips; actual-aspect cylinder d=18.885788932. This is outside current representative layouts, not a claimed current-screen regression. |
| Fit only an initial end-on bar, R=2,H=0.1, aspect 1.3 | d=4.147497755 passes initial N=0.861718679 but clips during full yaw at N=1.475683054; full-yaw d=6.189097171. |
| Reduce exact cylinder side requirement by 1%, R=1.2,H=0.6, aspect 1.3 | d=3.976654787; N=1.013648242 clips. |

Parent implementation tests should preserve these independent fixtures, reject NaN/Infinity/nonpositive aspects/invalid bounds, cover changed pivot/instance transforms, and assert near/far rejection rather than silently returning a clipped camera. This report does not claim production tests, visual capture, heavy gates, or CI ran.

## Literal-Byte Pins

SHA-256, read from current filesystem; no line-ending normalization. Source references are pinned independently of the supplied Git baseline. Installed bounds code is included to identify the conservative-box semantics used in the baseline reconstruction.

| Source | SHA-256 |
|---|---|
| apps/web/src/components/hero/HeroModelStage.tsx | `b613999f1b117b52d3d92a9361b5b39b41af52352d7ce6ed5fe03bb203fe8daa` |
| apps/web/src/components/hero/turntable.ts | `ea4ca3afa595b848a7735ad96082478fe195173271baa99951d5574c20a2954a` |
| apps/web/src/components/hero/AssetHero.tsx | `e8cca04af1e34e358a9a0d2365380fc9dc57236b3249a60086494232cd9f121e` |
| apps/media/hero-turntables/index.html | `5a0f26f4e0f9290a9cbb6256a1243c344899b8451b698ec56a7339b18c2779c1` |
| apps/web/node_modules/three/src/math/Box3.js | `382b33a3b235b3f5a37a8949d8f8a9efdf056c62ce5ed79692b54944a80487e1` |
| apps/web/node_modules/three/examples/jsm/loaders/GLTFLoader.js | `97642d720f16cc9a0c9844934198e4d0c023bea8e89576d0f7545d03b2d103d2` |

All GLBs below are `apps/web/public/heroes/<asset>.glb`:

| Asset | Bytes | SHA-256 |
|---|---|---|
| car | 2232520 | `5d7fb0b2aa1457ce7e0013d3b7e04ba6568c3dd21941dc5df05a3bf969489225` |
| house | 1145320 | `ec008a1681930595a11579c6b19a1c02377d3211aea8a36b03e2aff9bd244f33` |
| land | 709260 | `4b09041fd2f952a7cddef196d9a2078360194913e1ff175ef96b89c5ff7aa3de` |
| creditCard | 523764 | `b3f08cc7e2e081deee13f86f88bdc02a7ff7b46ac97beb3155d4f5c4b4188025` |
| studentLoan | 723868 | `56dfe51ad199bdafcc0cc5ced65321a16a4e087693f645d6d12c6bc14fb98d12` |
| medical | 509120 | `b6df483391ee3d552f8a128ab8327484d833754f6a907e7fa0899eca5dd6c615` |
| personal | 519844 | `e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79` |
| recreation | 521544 | `c7ce5658eefd0e928ea857e70ca35803e2812308032a071cdcb82412434f41a7` |
| custom | 237844 | `2753182d024be862fc7ab5e5b18100cc6a7bbcc736213471b4a6e2083517aa7b` |
| vault | 719996 | `6846a098bbdd974f89101de68548e90bced312991745eae88549a3a6f9129594` |

Final readback verified all six source pins and all ten asset pins still matched, all 30 occupancy table rows were present, and this report was ASCII. Handoff: geometry-only diagnosis complete. Parent retains ownership of actual-current ten-hero captures, implementation, production tests, heavy gates, CI, visual approval, and shipping. The report does not authorize changes to those surfaces.
