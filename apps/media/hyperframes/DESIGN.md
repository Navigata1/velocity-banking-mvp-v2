# InterestShield Motion Design Contract

Identity contract version: `1`

## Intent

InterestShield motion is a calm financial show stage. It makes balances, tradeoffs, and assumptions easier to inspect without turning modeled outcomes into promises. Each artifact has one financial meaning, one finite entrance, and one settled state.

## Palette

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#07111F` | Primary stage |
| Surface | `#102235` | Data panels and tracks |
| Raised surface | `#183247` | Selected artifacts |
| Ink | `#F5F7F2` | Primary copy |
| Muted ink | `#C6D0D8` | Explanations and assumptions |
| Progress | `#34D399` | Positive cash flow and modeled principal movement |
| Information | `#38BDF8` | Neutral explanation and available room |
| Caution | `#FBBF24` | High utilization or setup needed |
| Blocked | `#FB7185` | Unsupported projection or action |
| Editorial | `#C4B5FD` | Story emphasis only |

Color never carries status alone. Every semantic color is paired with a label, number, shape, or explanatory sentence.

## Typography

- Display: `Literata Variable`, weights 700-900. Use for short editorial headlines.
- Body: `Geist Variable`, weights 350-700. Use for calm coaching copy.
- Data: `Geist Mono Variable`, weights 500-700. Use for assumptions and modeled values with tabular numerals.
- Fonts are local files copied from exact package versions. No runtime font or CDN requests.
- Minimum landscape sizes: 84px headline, 44px supporting copy, 32px label.

## Composition

- Canvas: 1920x1080 at 30 fps.
- Safe area: 96px left/right and 100px top/bottom.
- Caption rail: at least 120px from each edge and 110px from the bottom.
- Content uses grid and flex layout. Absolute positioning is reserved for the show-stage artifact and decorative tracks.
- The primary metric and captions must never overlap.

## Motion

- All authored timing maps to integer frames at 30 fps.
- First meaningful action begins at frame 6 (0.2 seconds).
- Timelines are finite, paused, synchronous, and registered with HyperFrames.
- Artifacts may turn once and settle; no continuous ambient rotation.
- Every scene has a deliberate entrance. Circle and diamond iris transitions echo the shield aperture and replace generic wipes.
- Reduced motion removes turns and clip-path travel, preserving only opacity and static state changes.

## Story Semantics

- Utilization is pressure: `balance / limit`, labeled `% used`.
- Available capacity is room: `max(0, limit - balance)`, labeled `$ open`.
- These channels remain visually and textually separate.
- Cash flow means income minus expenses. It is not income, credit, or guaranteed savings.
- Any future computed output must carry its assumption and engine contract version.

## Voice And Captions

- Truth-first, hope-forward, plain, calm, conditional, and agency-preserving.
- Captions are no more than 38 characters per line, visible for at least 1000ms, and limited to two lines.
- Use `Modeled`, `Assumption`, or `Projection blocked` wherever the output calls for it.
- Required footer: `Educational tool. Not financial advice.`

## What NOT to Do

- Do not use fear, shame, debt-elimination promises, or universal savings claims.
- Do not render unlabeled modeled numbers or decorative data without a traceable meaning.
- Do not swap utilization and capacity onto one unlabeled scale.
- Do not use continuous spinning, wall-clock animation, unseeded randomness, network assets, or looping timelines.
- Do not shrink a dashboard into a video frame, crowd the stage with cards, or allow tiny and overflowing captions.
