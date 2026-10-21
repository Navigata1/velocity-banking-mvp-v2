# Credit Card Refinement Contract

This R1-T3 slice preserves the silver front card, emerald rear card and silver
wave coin. It refines actual geometry, not a rotating flat poster. Dashboard
layout, camera, shared studio, finite turn timing and financial calculations are
unchanged. It is an authored illustration, not an exact poster reconstruction,
scanned payment card, financial credential or final photorealism approval.

## Sources And Delivery

`apps/media/scripts/build-refined-credit-card.mjs` authors the model and six
embedded 256px WebP maps from the original parameters in
`apps/media/sources/credit-card/materials.json`. No downloaded model, third-party
texture, generated material image or paid GPU job is used. Source, configuration
and delivered GLB hashes are recorded in both asset manifests.

Two thin rounded cards have real recessed sweeping grooves, eight inset beveled
chip contacts and actual back stripe/signature panels. The beveled coin has
96 real edge reeds and two-sided recessed wave faces. Components are grounded
and normalized to the existing stage. The final GLB is 516,984 bytes, 11 reusable
meshes and 18,008 unique-mesh triangles. Six maps supply authored brushing/turning,
micro-normal and roughness/metalness approximations, not measured reflectance.
Silver/turned metallic factors are 0.84 and emerald 0.90, with zero emission.
Delivered roughness comes from the ORM maps with factor 1, not the initial
constructor roughness values. The silver is intentionally readable in the
existing studio but differs from the reference's polished appearance.

The 0.5 MiB candidate target and standing 10 MiB public cap are unchanged.
Public assets total 10,415,192 bytes, leaving 70,568 bytes of headroom and
recovering 31,924 bytes from the old study. Richer intermediate models failed
before publication. Conservative simplification, padded UV domains, 16-bit
position/UV quantization and Meshopt compression retain the actual engraving.

## Geometry And Publication

The first six cases rejected the old study. Post-compression checks then caught
reversed cap slivers and inverted UVs. Geometry/UV correction and conservative
simplification resolved those defects; a larger MikkTSpace tangent experiment
was rejected and is not part of the delivered fix. Independent review also
caught detached chip substrate and insufficient coin/budget assertions.

Nine committed cases inspect decoded geometry and sources: closed card bodies,
actual groove depth, XYZ chip attachment, two-sided coin engraving, 384 angular
edge samples proving 96 reeds, outward cap winding/UVs/nonoverlap, finite bounds
and locked budget wiring. Negative in-memory probes reject hidden groove filler,
detached substrate in depth or sideways, duplicate cap triangles, plain coin
faces, missing reeds, guard removal and a stale-total guard with an unused fresh
size call. These probes never corrupt shipped files.

The existing exclusive publication lock is retained. Aggregate bytes are
recomputed inside the locked callback and directly feed the guard before writing.
This is static dataflow/negative proof, not a new end-to-end concurrency stress
test. Existing lock/overlap tests remain enforced. Model plus two manifests are
not one crash-atomic transaction; interruption requires regeneration/revalidation.

## Verification And Limits

Require identical recipe regeneration and full study regeneration preserving all
ten records/bytes. Run nine Credit Card cases and the full 65 media contracts,
web regressions/build/lint, all ten 1440px/375px actual-model/fallback checks and
all seven routes. Rebuild this 1080p nine-second HyperFrames turn (eight-second
revolution plus one-second rest), then recheck all ten videos. Nine unchanged
videos are rechecked, not rebuilt. Full media validation renders 27 fresh stills.
Both final exact-head CI events, real SQL, exact Vercel and hosted browser proof
remain mandatory before calling the draft verified.

Read-only independent review cleared final GLB SHA
`223aebb70009929f4b69829e59e8e8487d4783e90b192e076a10c570a0983a17`
and all nine tests. It did not approve art, finance, security or production.
Five textured candidates and five remaining studies still require final all-ten
art review. No runtime, scenario, dependency, backend, DNS, credential, native
or production change belongs to this slice.
