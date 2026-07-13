# InterestShield Visual Identity and Motion Contract

Contract version: `1`

The executable source of truth is `src/visual-identity.mjs`. This document explains the intent behind that contract for designers, writers, and composition authors. A change to the identity starts in the executable contract, receives a failing test, and then updates this document.

## Brand Posture

InterestShield is a truth-first, hope-forward financial education tool. Its visual voice should feel calm enough for a difficult money conversation and precise enough to earn trust.

- Promise: "See the interest. Model the tradeoffs. Keep your agency."
- Explain before persuading.
- Name assumptions, limitations, and blocked projections.
- Show progress without celebration theater.
- Never shame a person for a balance, income, expense, or prior decision.
- End every educational composition with "Educational tool. Not financial advice."

## Semantic Color

The canvas is deep ink blue, not pure black. Readable neutrals are cool and lightly green-tinted. Semantic colors retain the meanings already used by the application and the Money Loop artifact stage.

| Token | Hex | Meaning |
| --- | --- | --- |
| Canvas | `#07111F` | Primary frame background |
| Surface | `#102235` | Reserved content zone |
| Raised surface | `#183247` | Secondary data plane |
| Ink | `#F5F7F2` | Primary readable text |
| Muted ink | `#C6D0D8` | Secondary readable text |
| Progress | `#34D399` | Positive cash flow and recoverable movement |
| Information | `#38BDF8` | Neutral explanation, room, and assumptions |
| Caution | `#FBBF24` | Setup work or a planning guardrail |
| Blocked | `#FB7185` | A result the current inputs do not support |
| Editorial | `#C4B5FD` | Story emphasis, never financial status |

Every tested foreground/background pair meets WCAG AA for normal text. Color never carries status alone; pair it with language, shape, or both. Do not introduce one-off colors inside a composition.

## Typography

- Display: Literata Variable at 700 or 900 for human, editorial emphasis.
- Body: Geist Variable at 350, 500, or 700 for direct coach language.
- Data: Geist Mono Variable at 500 or 700 with tabular numerals.
- Minimum at a 1080-pixel reference width: 84 px headline, 44 px supporting copy, 32 px label.
- Keep letter spacing at zero. Dark-canvas body copy uses at least 1.45 line height.
- Package exact, versioned WOFF2 files in the media workspace. Rendering may not depend on a live font request.

Use one expressive face per scene. Data earns the mono face; it is not decorative texture. Wrap copy or split a scene before reducing text below its minimum.

## Composition Formats

All compositions are authored at 30 fps in these exact frames:

| Format | Frame | Content safe area | Caption reserve |
| --- | --- | --- | --- |
| Landscape | 1920 x 1080 | 100 px top/bottom, 96 px sides | 120 px sides, 110 px bottom |
| Portrait | 1080 x 1920 | 140 px top, 220 px bottom, 72 px sides | 84 px sides, 260 px bottom |
| Square | 1080 x 1080 | 100 px top, 120 px bottom, 88 px sides | 104 px sides, 144 px bottom |

Build a composition for each frame rather than scaling a landscape layout. Every scene gets one primary message, one supporting visual, and no more than two background accents. Reserve readable elements in normal flow or a deliberate grid; absolute positioning is for background and layered visual treatments.

## Motion Language

Time is measured in integer frames. Wall-clock animation, CSS animation, and unseeded randomness are prohibited. Remotion receives the integer frame directly. HyperFrames receives seconds through the exact `frame / fps` conversion.

- First action begins at frame 6, never frame 0.
- Durations: 6 frames micro, 12 standard, 21 deliberate, 36 cinematic.
- Every scene builds in the first 30 percent, breathes through 70 percent, then resolves.
- Stagger sequences finish within 15 frames.
- One ambient motion is the maximum in a scene. Stillness is a valid choice.
- Stable artifacts make one turn and settle within 21 frames.
- Caution artifacts make at most a half turn and settle.
- Blocked artifacts settle without turning.
- Entrances use the contract's enter curve; exits are shorter and use the exit curve.

Procedural variation uses a UTF-8 string seed hashed with `fnv1a-32-utf8`, then sampled with `xorshift32`. The executable test vectors are the cross-renderer authority. A renderer may not substitute its platform random number generator.

Reduced motion removes ambient movement, replaces spatial transitions with a cut or opacity-only transition, and holds each readable state for at least 60 frames.

## Accessibility and Captions

- Captions are mandatory for spoken content, even when a platform can generate its own.
- Use at most two lines and 38 characters per line.
- Keep captions visible for at least 1000 ms.
- Minimum caption size is 46 px in landscape and square, 52 px in portrait.
- Caption backing must preserve a tested contrast pair over every sampled frame.
- Speaker changes need a visible cue. Captions may never cover the primary metric.
- Financial status needs text or a distinct shape in addition to color.
- A reduced-motion rendering must communicate the same facts and ordering.

## Financial Data Semantics

Every visual parameter must trace to a versioned engine input or output. If a decorative value cannot be explained, remove it.

- Income maps to the deposit reservoir.
- LOC maps to the credit aperture.
- Expenses map to the outflow gate.
- Cash flow maps to the flow core.
- Principal maps to the principal shield.

Utilization always means percentage used. Available capacity always means currency or percentage open. They have opposite visual directions and must never share an unlabeled progress scale. A media label must say `% used` or `open` next to the value. Utilization accepts an engine ratio, multiplies it by 100, and rounds to the nearest whole percent. Available capacity is `max(0, limit - balance)` and renders as whole US dollars. A missing or non-positive limit shows setup language instead of a percentage. A missing, non-finite, or negative balance shows "Balance needed" and never implies unused capacity.

LOC utilization changes aperture pressure. Cash flow changes pulse cadence and direction. Interest burn changes thermal intensity beside a labeled value. Projection confidence changes focus and edge definition. None of those channels may imply income, wealth, certainty, or lender approval.

Modeled values carry an assumption cue. A blocked projection shows its reason rather than displaying zero as a result. A comparison is only shown when both scenarios are compatible and valid.

## First Three Stories

1. `baseline-comparison`: compare compatible valid payoff paths without recommending one.
2. `first-money-loop-month`: explain deposits, expenses, LOC recovery, interest, and principal movement in order.
3. `blocked-plan`: explain why a result is withheld and which input or guardrail needs attention.

Each story consumes versioned engine JSON. It does not calculate financial results inside HyperFrames or Remotion. P5-T3 will add the strict scenario schema and representative fixtures before authoring the Remotion scenes.

## Runtime Boundary

HyperFrames owns HTML and GSAP campaign/tutorial compositions. Remotion owns programmatic scenario explainers and still renders. Both live under `apps/media`.

The web calculator and Expo app may consume only versioned JSON and rendered static outputs. Their manifests and lockfiles may not contain the HyperFrames, GSAP, or Remotion package families, including scoped packages and npm aliases. Generated web assets publish under `apps/web/public/media/generated` and remain subject to the web asset budget.

## Explicit Anti-Patterns

- Fear or shame language.
- Guaranteed outcomes, universal savings percentages, or debt-elimination promises.
- Unlabeled modeled numbers or unsupported before/after claims.
- Swapping LOC utilization and available-capacity scales.
- Decorative data with no model meaning.
- Continuous spinning, constant zoom, or motion at frame zero.
- Shrinking a dashboard into a video frame.
- Tiny, overflowing, or primary-metric-covering captions.
- Color-only status.
- Renderer packages inside calculator or mobile runtime bundles.
- Wall-clock animation or unseeded randomness.
- Dense card grids, decorative pills, gradient text, or a one-note cyan/purple palette.

## Contract Snapshot

This generated block lets CI prove that the readable specification matches the executable contract. Run `npm run sync:identity-doc` after an intentional contract change.

<!-- identity-snapshot:start -->
`sha256:253fe28be24a9077b782658b445bcfba7a32cb6c64ca52c43b577139846f61c5`
<!-- identity-snapshot:end -->
