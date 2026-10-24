# Comparison Verification Receipt

Base: 58d0df57e1602a95f8a175daf34e8724444c8ebd.
This receipt describes local working-tree verification. Hosted checks must match
the eventual pushed SHA; the earlier base had two green CI runs and Vercel.

## Red

The original implementation failed five new regressions. In the zero-interest
case (loan 600, LOC 400, available budget 500, scheduled loan payment 100), its
baseline projected six months instead of two and removed the existing LOC.
The new shared helper was absent. The low-chunk higher-rate Velocity case could
not expose signed slower/more-interest outcomes because deltas were clamped.

## Green

- 275 web regressions and all ancillary npm-test contracts passed.
- Two existing anonymized financial fixtures and 78 closed-form cases passed.
- ESLint, Next production build and native TypeScript check passed.
- All native port contracts passed, including web/Expo strategy and cash parity.
- Three actual-browser scenarios passed at 1440px and 375px.
- All seven rendered web routes passed at desktop/mobile widths.
- Expo web export/seven routes and Android/iOS Hermes exports passed locally.
- Full media checks passed: 35 contracts, HyperFrames strict check and 27
  Remotion stills. The source-hashed scenario JSON was regenerated after the
  final shared-engine text update; the hosted gate must check that exact version.

## Independent Review

Read-only reviewer Kepler found no blocking financial defect. Its 1,000 deterministic
probes found no material conservation errors. One P3 empty-chart backwards-axis
finding was fixed and is now asserted by the browser gate. No heavy/browser suite
was delegated to this reviewer.

Visual inspection rejected the first comparison screenshots because scroll-reveal
opacity was still zero. The harness now scrolls to the comparison, waits for visible
ancestors, asserts nontrivial PNG output and captures actual cards. Curated replacement
screenshots show the slower/higher-interest result without overflow.

## Deliberately Not Claimed

No full production readiness, cross-route lender-term coverage, final device QA,
live backend isolation, new completed photoreal models, or production deployment.
Mortgage/Vault-web, Portfolio, dashboard helpers and the remaining R2/R3 tasks
stay open. No lender minimum was invented or presented as verified.
