# Land Refinement Contract

This R1-T2 slice preserves the original cutaway parcel, winding path, pond, four
survey stakes and three broad-canopy trees. It replaces one flat-color geometry
study with an original textured candidate. It is not a surveyed parcel, geological
model, exact poster reconstruction or final photorealism approval. The dashboard,
camera, studio lighting, finite turn timing and financial engine stay unchanged.

## Sources And Delivery

`apps/media/scripts/build-refined-land.mjs` deterministically authors the terrain,
pond level set, draped path, layered cut faces, connected woody components, folded
leaf cards, reeds, stones and survey markers. Original generated meadow and single
oak-leaf images, briefs and hashes are retained under `apps/media/sources/land/`.
The original generator outputs remain preserved too. No paid external GPU job or
third-party model/texture source was used.

The meadow albedo is delivered at 448px and the alpha-tested leaf at 256x384px.
Procedural soil/bark, micro-normal, roughness and water-ripple maps are authored
visual approximations, not measurements. Eight unique embedded WebP maps are
shared where their content is identical. Individual leaves are folded geometry on
connected branch systems, not full-tree image billboards. Leaf/cut-face tinting is
an artistic shading approximation, not a photometric light bake.

The candidate is 709,260 bytes, 32 reusable meshes and 49,834 unique-mesh triangles.
The per-model target is 0.7 MiB, below the standing 1.25 MiB allowance; the entire
public collection remains under its unchanged 10 MiB cap. Richer intermediate builds
failed both budgets before publication. Subpixel root/pebble subdivisions and
delivery image sizes were optimized; original high-resolution sources are intact.
Only about 38 KiB of public headroom remains, so subsequent models must recover
space through intentional optimization, not silently raise the aggregate cap.

## Geometry And Publication

A single height field supplies terrain vertices, path contact, stake/tree roots
and cutaway rims. The recessed pond is real geometry. Its level waterline is solved
against that field, with tolerance for triangulation/position quantization. The
path is clipped within the parcel. Irregular strata share layer boundaries and
have embedded stone/root details, outward-facing sides and a closed underside.

The existing exclusive publication lock protects model/manifest updates. Projected
collection bytes are checked both before publication and freshly inside the locked
callback before writing. The new guard has an AST wiring/rejection regression;
this is not a new end-to-end concurrent-budget stress test. Existing real lock/
concurrency contracts remain enforced. Model plus two manifests are not one
crash-atomic transaction; interruption still requires regeneration/revalidation.

Source, material-manifest and GLB hashes are recorded in both asset manifests.
Regeneration must reproduce identical model bytes, and full study regeneration
must preserve all four protected candidates and all other model records.

## Verification And Limits

The first five tests rejected the old study. Actual terrain rays then caught the
path extending outside the parcel. A sixth test rejected missing cut-face detail.
Independent review identified coverage gaps; committed branch-component/trunk and
outward side/underside tests now inspect actual decoded geometry. They reject
deliberately detached branches and reversed faces in memory. The publication
contract also rejects an intentionally removed guard and checks its exact 10 MiB
threshold. These negative probes never mutate shipped files.

Run all nine Land cases, the full 56 media contracts, web regressions/build/lint,
all ten desktop/375px hero checks, loading/reduced-motion/failure checks, rendered
routes, full media validation and the HyperFrames pixel verifier. Rebuild Land's
1080p nine-second turn and recheck the nine unchanged videos. Any shared studio/
camera/timing edit would instead require rebuilding all ten. Both final exact-head
CI runs, isolated SQL, Vercel and hosted browser proof remain mandatory.

The view remains an economical illustrative diorama: simplified canopy/foliage,
rock geometry, water optics, exposed layers and authored shading differ from the
generated poster. Normal maps do not prove realistic geology. Collection-wide
photorealism/art approval remains open for all four candidates; six studies remain.
No runtime/dependency/scenario/backend/DNS/credential or production change belongs
to this slice.
