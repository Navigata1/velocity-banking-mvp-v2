# InterestShield Mission Journal

## 2026-07-13T01:38Z - session 1 kickoff
- Bootstrapped Mission Control from the July 12 State of the Union using inline execution with a cooling-off refutation pass.
- Confirmed the mission starts at P0 Release Truth; Vercel authentication and domain ownership are the first external gates.
- Next: merge this heartbeat, then inspect Vercel project state and promote only the verified green main artifact.

## 2026-07-13T01:45Z - P0 baseline gates recorded
- Passed P0-G1 through P0-G3: 238 regressions, accessibility contract, production build, and seven local routes.
- P0-G4 failed on the expected stale public marker; evidence names the green dfb4d91 deployment target and exact promotion commands.
- No production state was changed before the target and rollback facts were recorded.

## 2026-07-13T01:50Z - bootstrap PR merged, P1 activated
- PR #216 merged at b73e773 after two GitHub CI runs and Vercel preview checks passed.
- P0-T1 is parked as an external auth blocker: connector OAuth grant expired and CLI has no local credentials.
- Activated P1 so the independent financial correctness work continues; next is the canonical LOC ledger continuity fix under TDD.

## 2026-07-13T01:54Z - P1 ledger continuity verified locally
- Added a regression that failed on the discontinuous LOC interest event: $4,206.66 was reported where the routed balance plus interest was $3,131.66.
- Rebased the interest and summary events on the post-income, post-expense LOC balance without changing the average-daily-balance interest calculation.
- P1-G1 through P1-G3 pass: 239 regressions and accessibility contracts, the Next.js production build, and Expo TypeScript.

## 2026-07-13T02:00Z - P1 lender terms contract verified locally
- PR #218 merged at 8371089 after both GitHub quality workflows and the Vercel preview passed; P1-T1 is done.
- Added lender terms contract v2.0.0 for fees, rate mode, draw and repayment periods, minimum draw, minimum payment, provenance, and confidence.
- Missing terms block projection readiness; user and model values remain estimated until every required field is sourced from lender documents.
- P1 gates pass with 240 regressions, web lint, the Next.js production build, and Expo TypeScript.

## 2026-07-13T02:07Z - P1 transaction calendar verified locally
- PR #219 merged at ab98490 after both GitHub quality workflows and the Vercel preview passed; P1-T2 is done.
- Added dated LOC deposits and expenses using the actual calendar month and each day's closing balance, without daily interest compounding.
- Leap-year, 31-day-month, invalid-calendar fallback, ending-balance, and simulator method-label fixtures pass.
- P1 gates pass with 241 regressions, web lint, the Next.js production build, and Expo TypeScript.

## 2026-07-13T02:13Z - P1 independent reference lane verified locally
- PR #220 merged at 5df5e43 after both GitHub quality workflows and the Vercel preview passed; P1-T3 is done.
- Added two synthetic, anonymized lender scenarios explicitly labeled as software fixtures rather than lender quotes.
- A separate CommonJS reference lane compares production outputs against closed-form amortization and an independently implemented dated daily-balance ledger.
- P1 gates pass with 241 regressions, two independent reference scenarios, web lint, the Next.js production build, and Expo TypeScript.

## 2026-07-13T02:25Z - P1 closed and P2 owner schema verified locally
- PR #221 merged at 6435909 after both GitHub quality workflows and the Vercel preview passed; Calculation Contract v2 is complete.
- Repaired child ownership through profiles and added owner-consistent composite snapshot foreign keys for simulation runs and exports.
- Revoked automatic and anon Data API privileges; client audit events are now append-only.
- A clean local PostgreSQL 17 reset, six-table source contract, catalog inspection, schema lint, and Supabase security advisors pass.
- The connected Supabase organization has no InterestShield project, so no unrelated cloud project was changed.

## 2026-07-13T02:32Z - P2 adversarial RLS verified locally
- PR #222 merged at 1ee9a10 after both GitHub quality workflows and the Vercel preview passed; P2-T1 is done.
- Added 19 pgTAP checks with synthetic owner A, owner B, and anon contexts against local Supabase PostgreSQL 17.
- The suite proves owner isolation, cross-owner write rejection, composite snapshot ownership, append-only audit history, export retention, and deletion cascades.
- Supabase schema lint and security advisors remain clean; web tests, lint, build, and Expo TypeScript pass.
