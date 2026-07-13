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

## 2026-07-13T02:44Z - P2 snapshot idempotency verified locally
- PR #223 merged at f324aed after both GitHub quality workflows and the Vercel preview passed; P2-T2 is done.
- Added an owner-scoped snapshot idempotency key and a database check requiring it for local-demo handoffs.
- Clean reset and 21 pgTAP checks prove same-owner retries cannot duplicate rows while different owners remain independent.
- A dedicated cloud project is a $10 monthly cost, so local Auth/RLS remains the implementation lane until the production cost gate is explicitly approved.

## 2026-07-13T02:50Z - P2 shared snapshot mutation verified
- PR #224 merged at 46b2425 after both GitHub quality workflows and the Vercel preview passed.
- Added a dependency-free persistence contract shared by future web and Expo adapters.
- The contract validates owner UUID, durable idempotency key, known storage keys, duplicate entries, deterministic ordering, and explicit Supabase upsert targets.
- Web regression 242, Supabase 21-test gate, lint, build, and Expo TypeScript pass.

## 2026-07-13T03:05Z - P2 web Supabase adapter verified
- PR #226 merged at 5680560 after both GitHub quality workflows and the Vercel preview passed.
- Pinned supabase-js 2.110.2 and Supabase SSR 0.12.0, with browser configuration limited to URL and publishable key.
- The web adapter derives ownership from getClaims, then performs profile, idempotent snapshot, and audit mutations in order.
- npm audit exposed high-severity Next.js 16.1.6 advisories with a non-major 16.2.10 fix; upgrade is queued as a separate security PR.

## 2026-07-13T03:12Z - Next.js production advisories cleared locally
- Upgraded Next.js and its ESLint config from 16.1.6 to 16.2.10 and forced the nested PostCSS dependency to patched 8.5.10.
- Production audit moved from one high plus one moderate vulnerable package to zero vulnerabilities.
- The first build exposed stale .next/dev type artifacts from 16.1.6; a verified clean-cache rebuild passed all eight static routes on 16.2.10.
- Web regression 242, independent reference fixtures, accessibility contracts, lint, production build, and seven-route HTTP smoke pass; GitHub and Vercel review remain.

## 2026-07-13T03:16Z - P2 Expo Supabase adapter verified locally
- PR #227 merged at 30eba5b after both GitHub quality workflows and the Vercel preview passed; the web production audit is zero.
- Added publishable-key-only Expo configuration, native chunked SecureStore session persistence, web localStorage fallback, and AppState-aware token refresh.
- Mobile snapshot sync derives the owner from verified claims, reuses a durable install idempotency key, and appends the same owner-scoped audit contract as web.
- Expo adapter tests, TypeScript, seven-route web export smoke, Android Hermes bundle export, web 242 regressions, lint, build, and web adapter contract pass.
- Expo SDK 56 still inherits ten moderate CLI/config audit findings; npm's suggested Expo 46 downgrade is not viable and is tracked as an upstream risk.

## 2026-07-13T03:28Z - P2 web account and explicit sync verified locally
- PR #228 merged at ec6918d after both GitHub quality workflows and the Vercel preview passed.
- Replaced the unused fake demo identity with passwordless email auth, observed session state, explicit local snapshot sync, and sign-out.
- A missing Supabase configuration renders a calm local-only state; no network write occurs until the user signs in and presses sync.
- Browser install identity is durable, mobile-only storage is excluded, sync still derives owner identity from getClaims, and offline attempts preserve local data.
- Web account contract, 242 regressions, accessibility, lint, build, seven-route HTTP smoke, and Chrome responsive smoke at 1440px and 390px pass with no horizontal overflow or console errors.
- In-app browser control was unavailable during this pass; Chrome and automated smoke are the recorded browser evidence.

## 2026-07-13T03:36Z - P2 Expo account and deep-link sync verified locally
- PR #229 merged at 46aeb10 after both GitHub quality workflows and the Vercel preview passed.
- Added passwordless email sign-in, observed session state, explicit encrypted-local snapshot sync, sign-out, and offline-safe status copy to Expo Settings.
- Native callbacks exchange either PKCE codes or access/refresh token fragments through the process-locked SecureStore client.
- Expo account and adapter contracts, TypeScript, SDK compatibility, seven-route web export smoke, Android Hermes bundle export, and the complete web test/lint/build chain pass.
- P2-T3 is ready to close after this focused Expo workflow PR merges; no dedicated cloud project is created without the known $10 monthly cost gate.

## 2026-07-13T03:45Z - P2 restore and retention drill verified locally
- PR #230 merged at e86eac8 after both GitHub quality workflows and the Vercel preview passed; P2-T3 is done.
- The first archive attempts exposed missing auth schema, role ownership, filter-intersection, public schema collision, and managed auth.uid dependencies; each failure informed the final deterministic drill.
- The passing drill restores separate auth identity and public application archives into an isolated database, with one synthetic row in every owned table.
- Verification proves the exact snapshot payload, six tables, six RLS-enabled tables, and twenty policies; finally cleanup leaves zero synthetic owners, temporary databases, or archives.
- Added an explicit retention schedule, deletion boundaries, managed production recovery gate, and incident procedure. No cloud backup is claimed before a dedicated project exists.
