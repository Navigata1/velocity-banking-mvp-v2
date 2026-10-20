# House Refinement Contract

This R1-T2 slice replaces the House geometry study, not the dashboard layout or
financial engine. It preserves the original pale limestone, charcoal standing-seam
roofs, tall dark-framed windows, oak entry/garage, warm rooms and planted forecourt.
The result is a textured collection candidate, not an exact poster reconstruction,
a scanned real building, or final photorealism approval. Land and six other model
refinements remain open; Auto and Vault are also still collection candidates.

## Sources And Shipping

`apps/media/scripts/build-refined-house.mjs` authors the real geometry. Original
generated material PNGs and their briefs/hashes are retained unchanged under
`apps/media/sources/house/`. They were produced with Codex's built-in image
generator; no paid external GPU job or third-party model was used. Only the
albedos are image-generated. The micro-normal and packed roughness/metalness maps
are deterministic authored approximations, not measured or reconstructed relief.
The source material manifest and canonical-LF builder have recorded SHA-256 hashes.

The self-contained GLB contains six WebP maps: two 1024px albedos and four 256px
auxiliary maps. It has 31,316 unique-mesh triangles and 155 reusable meshes. The
standing 1.25 MiB House cap and 10 MiB public-asset budget remain unchanged. An early
1.38 MiB candidate failed the existing gate; auxiliary-map resolution and albedo
encoding were optimized instead of increasing the cap. The final candidate is
1,144,500 bytes. The authoritative value/hash is in `apps/media/hero-models.json`.

Publication uses the existing bounded exclusive manifest lock, atomic per-file
replacement and full-rebuild preservation. Model and two manifests are not a
single crash-atomic transaction: interrupted publication still requires regenerate
and revalidate. No stale-lock theft or new publication mechanism was introduced.

## Geometry And Presentation

Walls have real openings, window reveals, transparent glazing, mullions and sills.
Authored room floors, plaster, sofa, bed, dining table and lamps supply visible
depth. The entry has piers/lintel, sidelights and hardware; garage panel joints,
standing seams, gutters, drainpipes, chimney and connected tree branches are actual
geometry. Side/rear elevations remain modeled throughout the turn. Planting stays
outside the garage approach. Shared roof dimensions govern both roof slopes and
wall/gable profiles so the overhang does not create an open attic slot.

The House's authored orientation exposes its recognizable front at the existing
shared rest angle. Shared camera, studio lighting, timing and dashboard controls
are unchanged. The eight-second smooth full revolution and one-second rest remain
finite and seekable in HyperFrames. The reference poster stays the default;
3D inspection is opt-in and lazy-loaded. No financial value is baked into the model.

## Reproductions And Verification

The initial three asset tests failed against the old untextured study. Subsequent
geometry checks reproduced a retained stone wall blocking tower rooms, an exposed
east connecting-wall gap and mismatched roof/gable slopes. Independent read-only
review also found an uncapped garage rear gable. These were corrected, and the
committed aperture/whole-scene ray probes inspect decoded triangles, not just node
names. A separate triangle-bounds regression caught shrub leaves in the driveway
before their placement/spread was corrected.

Run all six `house-refinement.test.mjs` cases and the complete 47 media contracts,
web regressions/build/lint, all ten desktop/mobile hero checks, poster/decode/network
fallbacks, reduced motion and rendered routes. Rebuild the House HyperFrames MP4
and verify motion, return and rest in actual pixels; recheck unchanged videos too.
After changes to shared lighting, all ten videos must be rebuilt, not just rechecked.
Require final exact-SHA push/PR CI, isolated SQL, Vercel and hosted-browser proof.

Visual fidelity still needs collection art review. Texture counts, a passing
rotation test and an independent geometry review do not establish photorealism or
production readiness. The normal/roughness approximations, economical foliage,
illustrative interiors and poster/model differences remain visible limitations.
No saved scenario, app dependency, account, backend/schema, DNS or production
environment change is part of this slice.
