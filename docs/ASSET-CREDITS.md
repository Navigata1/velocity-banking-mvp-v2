# InterestShield Asset Credits

## Refined Auto Model

Car Concept, model and textures by **Eric Chadwick / Darmstadt Graphics Group GmbH (2024)**.

Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept

License: **Creative Commons Attribution 4.0 International**.
https://creativecommons.org/licenses/by/4.0/

Original base model: Unity Fan, public-domain / CC0, as documented by the source.

InterestShield modifications: removed logo-bearing license plate, steering emblem
and the separately licensed shared Khronos logo texture with all of its references;
removed unused material variants; optimized geometry with a bounded simplification
error; compressed geometry with Meshopt and textures as WebP; normalized scene
size and pivot. Original source copyright metadata is retained in the GLB.

This is an adapted third-party asset, not an AI reconstruction of the generated
coupe poster. No endorsement by the creators or Khronos is implied.

The asset import is pinned to source revision and SHA-256 in
`apps/media/hero-imported.json`. The app displays attribution beside the model,
and its HyperFrames turntable includes a credit line.

## Original Refined Vault

The Vault geometry and six deterministic PBR maps were authored for InterestShield
in `apps/media/scripts/build-refined-vault.mjs`. There is no third-party mesh or
texture dependency and no reconstructed-photo claim. The source and distributed
GLB hashes are recorded in `apps/media/hero-imported.json`.

The model has an open chamber, a beveled hinged door, steel/brass hardware and
brushed/turned metal surfaces. It is a refined textured candidate, not final
collection-wide photorealism approval. The shared studio lighting is locally
authored and contains no downloaded environment map.

## Original Refined House

House geometry is authored in `apps/media/scripts/build-refined-house.mjs`.
Original limestone and oak albedos were created with Codex's built-in image
generator, with unchanged sources, briefs and hashes retained under
`apps/media/sources/house/`. Micro-normal and roughness/metalness maps are authored
procedural approximations, not measured scans or reconstructed relief.

There is no third-party mesh or material source. Model, builder and material
manifest hashes are recorded in `apps/media/hero-imported.json`. This is an original
textured architectural candidate, not an exact reconstruction of its reference
poster or final collection-wide photorealism approval. See the House contract.

## Original Refined Land

Land terrain, pond, path, cutaway, trees and markers are authored in
`apps/media/scripts/build-refined-land.mjs`. Original generated meadow and single
oak-leaf albedo/opacity sources, briefs and hashes are retained in
`apps/media/sources/land/`. All other surface maps and shading are authored visual
approximations, not measured scans or surveyed geology. Folded leaf geometry is
not a full-tree image billboard.

There is no third-party model or texture source. Model, builder and material
manifest hashes are recorded in both asset manifests. This is a textured diorama
candidate, not an exact poster reconstruction or final photorealism approval.

## Original Refined Credit Card

Silver/emerald card geometry, recessed engraving, segmented chip, back details
and reeded two-sided wave coin are authored in
`apps/media/scripts/build-refined-credit-card.mjs`. Original procedural brushing,
turning and approximate PBR recipes are retained under
`apps/media/sources/credit-card/`. No downloaded mesh, generated material image,
third-party texture or issuer credential is used.

Source, configuration and GLB hashes are recorded in both asset manifests.
Metal/dielectric factors and surface maps are artistic approximations, not
measured scans. This is a textured illustration candidate, not an exact poster
reconstruction or final collection-wide photorealism approval. See its contract.

## Other Assets

The ten studio posters were generated for InterestShield using OpenAI image
generation. Original identities and SHA-256 hashes are in
`apps/media/hero-provenance.json`.

The other five base models remain locally authored 3D studies. They have not
passed the final photorealism gate and must not be represented as finished
photorealistic assets or exact reconstructions of the posters.
