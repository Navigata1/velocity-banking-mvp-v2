# InterestShield hero turntables

This project is deliberately separate from the existing educational video reel.
It uses Three.js 0.185.1 from apps/web and HyperFrames 0.7.56 from apps/media.

- Nine-second 1920 x 1080 composition, 30 fps export.
- One full eight-second revolution with zero endpoint velocity; one-second hold.
- `heroAngleAt` is transpiled from the web viewer, not reimplemented here.
- The slim progress index indicates completion of the single revolution.
- Local GLBs, local modules and local GSAP only. No render-time remote assets.
- Models are independently authored studies, not reconstructions of the generated
  product-reference posters. Final photorealistic mesh fidelity remains an art gate.
- No financial values or payoff claims in this composition.

Run `npm --prefix apps/media run render:heroes` to render all ten, or append a
hero id after `--` to render selected heroes. Output stays in ignored
`apps/media/hyperframes/output/heroes/` and is not automatically added to the app.

The web app defaults to optimized posters. Actual model inspection is an explicit
choice, with reduced-motion support and offscreen/context cleanup.
