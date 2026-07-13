# InterestShield HyperFrames Project

## Source Of Truth

- Read `DESIGN.md` before changing a composition.
- Keep the renderer isolated inside `apps/media`.
- Run `npm --prefix apps/media run check` after every composition change.

## Composition Rules

1. Use only finite, paused GSAP timelines registered on `window.__timelines`.
2. Use explicit `fromTo` states for seek-safe entrances.
3. Keep all subcomposition CSS, markup, scripts, and timeline registration inside its `template`.
4. Match each parent `data-composition-id` to the child root and timeline ID.
5. Use local pinned assets only. Do not fetch fonts, scripts, media, or data at render time.
6. Keep captions and disclosures plain, conditional, and within the visual identity limits.
7. Do not use wall-clock time, timers, Promises, unseeded randomness, or looping motion.
8. Regenerate `evidence/animation-map.json` after source changes with `npm --prefix apps/media run map:hyperframes`.

## Generated Files

Do not commit `vendor/`, `.thumbnails/`, `.hyperframes/`, `snapshots/`, or `output/`.
