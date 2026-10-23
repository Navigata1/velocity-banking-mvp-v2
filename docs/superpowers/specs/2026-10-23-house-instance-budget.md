# House Opaque Reuse Budget

## Decision

Use existing Three0.185.1 `InstancedMesh` in a private runtime study to group
repeated static opaque House meshes sharing the exact geometry and material.
The decoded current GLB contains445 mesh nodes/155 mesh resources; a read-only
inventory finds256 potentially avoidable opaque draws in groups of at least3.
That inventory is not a runtime eligibility or measured performance result.

Preserve the current asset, named hierarchy, material/texture identities, camera,
lighting, geometry, turn timing, original Car/House/Vault identity and all finance
behavior. No GLB rewrite, simplification, joining dissimilar geometry, dependency
change or new renderer. Offline glTF joining/instancing was considered but would
rewrite named hierarchy used by existing provenance/aperture contracts. Native
runtime instancing keeps those source bytes intact. No batching via a new
multi-draw/texture-based system; this is shared-geometry instancing only.

## Contract

House-only `configureHouseInstances({THREE,scene,model})` returns idempotent owned
cleanup. Other nine models and unknown paths are exact no-ops before inspecting
bindings. Groups contain at least3 visible leaf static Mesh nodes with a single
opaque opacity1 material, shared geometry/material identity and matching render
order/layers/cast/receive flags. Exclude transparent, skinned, morph, existing
instanced/batched, custom render/depth hooks and unsupported transforms. Support
only finite positive nonsheared root-relative transforms. No shader/material
mutation. Preserve original nodes in place with reversible visibility flags.

Construct/validate all batches before changing any original visibility. Store
matrices relative to the scene root, reuse geometry/material without owning or
disposing them, set compatible flags and compute batch bounds. Original child
visibility and hierarchy restore exactly; remove/dispose only owned instance
objects, even after disposal errors. Repeated setup with the same root is
idempotent. Treat the model as static beneath its root for the owned lifetime;
the root may rotate. No live child animation, arbitrary concurrent rebinding,
hostile proxy or reentrant-callback contract.

## Evidence And Adoption

First compare unchanged no-shadow House to instanced no-shadow House; isolate
this optimization from the held shadow proposal. Genuine CPU RED/GREEN and
actual real-House matched phone/desktop images must retain silhouette, openings,
glass ordering and visual detail. Verify source/asset pins, world transforms,
material identity, finite turn/rest/repeated seeks, one fetch, allocated resources
and requested cleanup. Measure actual renderer calls/triangles; neither those
counters nor software elapsed time establish hardware FPS, memory, energy or
photorealism. The existing product RSC finding remainsFAILED.

Only after an independently accepted private result, scope permanent typed
web/shared-media integration, dedicated regression contracts and fresh source-
bound standing29/CI/READY/hosted/manual shipping proof. No automatic adoption,
production promotion, metadata-only push, GLB/source rewrite or paid GPU.
