# Money Loop 3D Stage Design

## Decision

Build one model-driven show stage inside the dashboard's Money Loop band. The existing DOM tablist, previous/next buttons, values, signals, notes, and focus behavior remain authoritative. The Three.js canvas is a lazy, `aria-hidden` visual enhancement and never becomes the only way to select or understand an artifact.

The stage does not invent payoff outcomes. It renders the five existing `DashboardLoopArtifact` records through `buildMoneyLoopVisualContract`, version 1. Every numeric render channel is normalized to `0..1`, every warning state has restrained motion, and an incomplete model fails to the current static DOM experience.

## Artifact Grammar

| Artifact | Geometry | Meaning | Bound channels | Selection motion |
| --- | --- | --- | --- | --- |
| Income | `deposit-reservoir` | Deposits gathering before entering the loop | fill to progress; pressure to energy; tone to risk | one turn when stable |
| LOC | `credit-aperture` | Open capacity, explicitly not income | available-room fill; capacity pressure; warning tone | restrained turn when setup or utilization needs review |
| Expenses | `outflow-gate` | Planned outflow pressure | expense ratio; outflow pressure; warning tone | settle only when blocked |
| Cash Flow | `flow-core` | Income minus expenses available to recover the LOC | surplus fill; recovery pressure; cash-flow warning tone | one turn only for stable positive flow |
| Principal | `principal-shield` | Principal targeted by the bounded starter chunk | chunk-to-balance ratio; chunk pressure; readiness tone | restrained until the chunk is usable |

`stable` artifacts use `spin-once`, `caution` artifacts use `restrained-turn`, and `blocked` artifacts use `settle-only`. A spin is a selection response, not an ambient loop. No canvas label or color is the sole carrier of meaning.

## Architecture

1. `dashboard-model.ts` remains the financial source of truth and produces the five `DashboardLoopArtifact` records.
2. `artifact-visual-contract.ts` maps those records into ordered geometry descriptors, semantic state, normalized channels, palette, and accessible fallback text.
3. `MoneyLoopArtifactRail.tsx` owns active selection and all DOM semantics. It passes the active visual artifact to a dynamically imported client stage.
4. `MoneyLoopThreeStage.tsx` detects capability once, honors reduced motion and data saving, and chooses `static`, `efficient`, or `full` before loading the renderer.
5. `MoneyLoopThreeScene.tsx` uses Three.js through React Three Fiber. Procedural meshes keep the initial artifact lane free of GLB downloads and make every shape deterministic and testable.

The canvas replaces the current CSS orbit only when the visual contract is complete and capability mode is not `static`. The static orbit remains mounted as the fallback and first paint. The Three.js chunk is client-only and loaded after the stage approaches the viewport.

## Capability Policy

- `static`: WebGL unavailable, reduced motion requested, data saving enabled, or visual contract incomplete.
- `efficient`: fewer than 4 GiB reported device memory, fewer than 4 logical processors, unknown hardware capacity, or viewport narrower than 640 px. Device pixel ratio is capped at 1; shadows and expensive effects are disabled.
- `full`: WebGL available, motion allowed, data saving disabled, at least 4 GiB reported memory, at least 4 logical processors, and viewport at least 640 px. Device pixel ratio is capped at 1.5.

The renderer pauses when offscreen or when the document is hidden. It renders on demand after the selected artifact settles. There is no continuous decorative particle field or post-processing chain.

## Interaction And Motion

DOM tabs and previous/next buttons update the active artifact. The canvas reflects that state and may also raycast a visible artifact back to the same selection callback, but keyboard focus remains in the DOM controls. A stable selection rotates exactly one turn and settles in no more than 700 ms. Caution rotates no more than a half turn. Blocked state changes framing and illumination without rotational flourish.

Reduced motion uses the static fallback rather than an animated canvas. Page navigation, hydration, or scrolling must not replay a selection spin.

## Visual System

Use a neutral graphite stage with a visible ground plane and restrained multi-hue semantic materials: emerald for healthy flow, sky for neutral capacity, amber for review, and rose for blocked states. Geometry and lighting distinguish state in addition to color. No gradients are used as a substitute for 3D objects, and no decorative floating blobs or nested cards are introduced.

The primary object occupies the central stage without a decorative frame. Supporting artifacts sit on a shallow selection arc with stable dimensions so labels, controls, and canvas loading cannot shift the dashboard.

## Verification

- Unit contracts prove canonical order, exact geometry names, normalized channels, warning-aware motion, incomplete-set fallback, and capability selection.
- `test:3d` builds the app, opens desktop and mobile viewports, selects all five artifacts, checks the active DOM tab and canvas contract, and samples canvas pixels to reject blank output.
- Desktop and mobile screenshots verify framing, first-viewport containment, fallback rendering, and no overlap.
- The standing rendered smoke continues to cover seven routes, overflow, images, browser errors, and the Money Loop LOC interaction.
- The public asset budget remains at 2 MiB total; the initial procedural scene adds no public model asset.

## Non-Goals

- No new financial formulas, payoff promises, banking connections, or lender assumptions.
- No GLB asset pipeline in the first Three.js slice.
- No ambient autoplay, camera orbit control, freeform dragging, post-processing stack, or canvas-only navigation.
- No mobile native 3D port in P4; Expo parity remains P6.

