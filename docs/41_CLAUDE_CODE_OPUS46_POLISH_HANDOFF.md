# Claude Code (Opus 4.6) Transitional Handoff — Polish + Remotion Layer

This handoff assumes Codex completed the functional MVP. The mission now is **feel, clarity, and delight**—without losing truth-first math.

---

## North Star

This app exists to help people feel:
- “I’m not trapped.”
- “I have a plan.”
- “Even if life happens, I can recover and keep going.”

Tone: calm, encouraging, practical.  
Default: **single lane focus**.  
Never shame. Never exaggerate. Always label estimates.

---

## What success looks like

1) The first-run flow feels like a guided moment:
- Click-to-play intro (muted by default, captions visible).
- Skip is respected.
- After intro, the user sees a powerful “Vault reveal” and then the app becomes their cockpit.

2) The UI is cohesive and “welcoming health dashboard” calm:
- consistent spacing, typography, and emphasis
- minimal but meaningful microinteractions
- no visual clutter

3) Remotion enhances *understanding*:
- short “Money Loop” intro video
- small animated explainers (chunk meter, interest burn gauge)
- transitions that feel smooth and intentional

---

## Remotion plan (recommended)

### A) Keep video assets inside the repo
- Put Remotion source in `apps/video` (recommended) OR `apps/web/src/remotion`.
- Render to mp4 and ship it in `apps/web/public/intro/`.

### B) In-app video playback
- Use HTML `<video>` for reliability.
- Provide captions (`.vtt`) and keep default muted.
- Provide a visible “Enable sound” button.

### C) Micro explainers
Add 2–3 mini animations (5–10s each), not a whole movie:
- “Interest burns daily” gauge animation
- “Deposit lowers average balance” animation
- “Chunk meter fills → deploy chunk” animation

These can be:
- Remotion renders (mp4) OR
- Framer Motion / CSS animations (lighter)

---

## UX polish tasks (high-impact)

### 1) Page transitions
- Use Framer Motion for route transitions.
- Keep motion subtle (ease, short durations).
- Respect reduced-motion settings.

### 2) Coach moments
Add small “Coach Copy” microcopy in:
- Dashboard “Next Move”
- Simulator results
- Portfolio “One lane recommended”
- Emergency warning states

### 3) Data visualization cleanup
- Ensure charts have labels and explain “estimate”.
- If a value is derived, show the assumption in a tooltip.

### 4) Accessibility
- contrast checks
- keyboard navigation in modals
- proper aria labels for toggles + dropdowns

---

## Teacher voice guidelines

Use phrases like:
- “Let’s keep it simple.”
- “One lane at a time.”
- “Recovery is part of the plan.”
- “We’re building momentum, not perfection.”

When users ask about emergencies:
- reassure
- stabilize basics
- resume the plan when ready

---

## Claude Code prompt (paste as your initial instruction)

You are working on **InterestShield**, a velocity banking education + simulation app.

Non-negotiables:
- truth-first math, clearly labeled estimates
- calm teacher tone (encouragement + recovery mindset)
- single lane focus default
- no shame, no guarantees, not financial advice

Your job:
1) polish UI consistency (spacing, typography, component cohesion)
2) add smooth transitions and subtle microinteractions
3) integrate Remotion compositions for:
   - a 60–75s “Money Loop” intro
   - 2–3 short micro explainers
4) improve onboarding clarity so new users never think this is just a budget app

Work in small commits. Do not refactor large structures unless needed.
Preserve existing visuals and improve them incrementally.

Acceptance:
- first-run flow feels guided and calm
- intro plays click-to-play with captions, muted default, enable-sound button
- animations enhance understanding, never distract
- Lighthouse performance remains solid
