# Vault Feature: Wealth Transfer Timeline (Shareable)

This comes from the Opus concept: make the invisible visible — not just interest paid, but opportunity cost.

## What it shows (simple)
- Total interest paid under baseline
- Interest avoided under velocity plan
- Optional: what that avoided interest could become if invested (user sets a rate)

## MVP version (inside Vault)
- A single “Share Card”:
  - “Months saved”
  - “Interest avoided”
  - “Cash flow unlocked”
  - A gentle CTA: “Run your own simulation”

## Growth version (interactive timeline)
6-step experience:
0) Input numbers
1) “Wealth Transfer” total interest projection
2) “Stolen Future” opportunity cost slider
3) “Generational view” (optional)
4) Side-by-side baseline vs velocity
5) Export + share

## Included prototype (reference)
In `prototypes/wealth-transfer-timeline/` you’ll find:
- `wealth-transfer-timeline.jsx` — Opus web JSX prototype (Tailwind)
- `PORT_TO_REACT_NATIVE_NOTES.md` — port guidance to Expo/React Native
- `WealthTransferTimeline.native.tsx` — RN starter component (MVP-safe)

## Guardrails
- Show assumptions clearly
- Label investment returns as hypothetical
- Provide disclaimers
