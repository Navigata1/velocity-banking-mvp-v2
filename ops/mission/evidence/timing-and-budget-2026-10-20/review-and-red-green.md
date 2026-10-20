# Timing And Budget Verification

Base checkpoint: 30b810e4d374a62328c359904819c39ea9f81de0, green in both hosted
jobs and Vercel. This working-tree receipt does not claim hosted checks for a
future pushed SHA.

## Reproductions

Inactive mortgage choices and Guardian frequency/old minimum-only claims failed
the new contracts before removal/copy corrections. Legacy data retention passed
and remains asserted. Timing removal is complete, not a new dated payment engine.

New Money Loop regressions failed before correction: an affordable $101 final
obligation on a $200 budget was rejected; zero residual after scheduled payments
was confused with no household budget; a stale 999 age could authorize an unfunded
chunk; an overstated hint could invent recovery cash; omitted/NaN routing could
pay a loan without income. Routed shortfalls also used a paydown label. The
coaching and native Vault contracts prevent informational paused-chunk guidance
from suppressing otherwise valid payoff paths.

Independent reviewer Sagan found two more P2 cases: exact $120.70 affordability
lost to floating-point reconstruction, and a calendar with zero surplus overridden
by an optimistic monthly summary. Both failed in reproduced tests, were fixed,
and cleared on focused re-review. Eight calendar/fallback probes passed. Reviewer
Lovelace's two old Guardian answer-bank findings were likewise fixed and cleared.

## Local Green Evidence

- 289 regressions and ancillary web contracts pass.
- Two anonymized fixtures, 78 closed-form comparisons and 25 zero-recovery
  conservation cases pass. These are educational models, not lender statements.
- Native contracts/types, Expo web/seven routes and Android/iOS Hermes exports pass.
- Six payoff scenarios plus two persisted timing modes at 1440px/375px pass, 16
  browser cases total. Timing values and unrelated household fields survive a real
  mortgage edit and navigation; signed results, chart geometry, paused-chunk
  coaching and no overflow/page errors are asserted.
- Initial dashboard text lookup found a hidden responsive duplicate; the harness
  now selects the visible copy, preserving the actual visibility assertion.
- Web build/lint, seven rendered routes, clean runtime audit and full media check
  pass. The final source-hashed scenario file was regenerated and checked after
  the last boundary correction; exact-head hosted media verification is required.

## Still Open

Mortgage/Portfolio preflight and comparison scope, the current full-budget planner
allocation policy versus the Simulator policy, scenario ownership, actual lender
terms/calendar integration, intra-month capacity, nine photoreal models, backend
alignment, toolchain remediation, domain and final-device verification.

No production deployment or merge. Goal remains active.

Vault's remaining mortgage comparison-scope problem is now disclosed before its
deltas and asserted in source/browser gates. This is a temporary truthfulness
guardrail, not completion of the equal-budget/liability calculation task.

## Domain Follow-Up Regression Correction

Both hosted jobs on cf5a3e4 failed at the web regression step: the release-runbook
contract still required the now-obsolete unknown-hostname wording. A fresh full
local npm test reproduced exactly that failure. The metadata-only contract had
passed, but did not cover this second runbook assertion; the earlier full-suite
receipt predates the domain edit and was not final-head proof.

The runbook contract now requires the verified apex/www binding, the instruction
not to replace working records, the explicit no-production-mutation scope and
the final NEXT_PUBLIC_SITE_URL release check. It also rejects the obsolete
unknown-hostname blocker. No application behavior, pipeline gate, timeout or
production configuration is changed by this correction. Full local and exact
pushed-head verification must pass before a new green receipt is recorded.
