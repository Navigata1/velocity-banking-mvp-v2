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

## Other Assets

The ten studio posters were generated for InterestShield using OpenAI image
generation. Original identities and SHA-256 hashes are in
`apps/media/hero-provenance.json`.

The other eight base models remain locally authored 3D studies. They have not
passed the final photorealism gate and must not be represented as finished
photorealistic assets or exact reconstructions of the posters.
