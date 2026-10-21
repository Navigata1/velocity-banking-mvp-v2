# Native Input Precision And Canvas Diagnostics

Previous goal turn: progress. Reverified baseline8f65aef with complete push/PR CI
39523732339(attempt2)/39523736791, real SQL, exact Vercel and hosted72-case/routes/
model proof. Final receipt:
https://github.com/Navigata1/velocity-banking-mvp-v2/pull/256#issuecomment-6305482572

## Reproductions And Review

Actual original exported Chrome displayed stored120.70 as121. Sequential typing
120.70 saved12070 (`typing-red.log`); no financial engine error was needed to cause
that bad input. New validated drafts preserve cents/APR/no-ops and commit only
valid completed values. A later real integration trace found web ScrollView
programmatic-scroll blur committing partial input, plus delayed select-all races.
Web-specific dismissal/selection is corrected; native platform policy remains.

Read-only reviewer Hegel01a15c0c-855b-7f40-bfa3-5b0cdf830fb8 reproduced lost large
cents, pre-conversion fractional terms becoming integers and ambiguous comma
input becoming thousandfold values. Three new cases were observed red. Canonical
decimal round-trip validation, raw fractional-digit checks and explicit comma
ambiguity rejection now pass all15 committed cases. Re-review found no important
scoped issues. Extra transient reviewer probes are not counted as committed proof.
The reviewer did no build/browser/device work or broad financial/security approval.

Account-scope remount and session cleanup retain the existing storage version,
keys, owner/revision/outbox/recovery guards. Static lifecycle wiring and parser
tests do not establish signed-in native-device race correctness. Comma-decimal
keyboard usability remains a final-device/locale gate; ambiguous data is rejected,
not silently reinterpreted. Number round-trip is not arbitrary-precision finance.

Gauss01a15c04-0176-71c3-a8a1-e1450da0e180 implemented diagnostics only. Fake-clock
red shows a9ms screenshot invocation budget previously reportedas1ms at catch.
Read-only Cicero01a15c0c-8727-7063-8478-334bdd2b1716 cleared the final four-script
change. Four deterministic cases preserve absolute700ms/300ms limits, all pixel
assertions, exactly-once calls and original causes. Full lint caught a test-local
module binding; it was renamed, not suppressed. No application motion change.

## Failed Evidence Retained

- `three-stage-contention.log`:718ms decoded candidate under simultaneous Hermes
  export. Phase data shows settled-state around587ms, capture689, test-overlay
  cleanup712 and decode718. The unchanged gate correctly rejected it. A serial
  full run passes. This local cost breakdown does not explain the older CI miss.
- `heroes-navigation-failure.log`: initial hero suite reached Vault but did not
  find its hero DOM within120s. Separate route smoke passed. A read-only Playwright
  observation preload logs navigation, HTTP/page/console errors without changing
  assertions or graphics settings; all ten models then passed. No runtime/GPU or
  navigation fix is claimed. Fallback checks were run separately and passed.
- Original input, review and timing red logs plus the web blur-call trace remain.
  Shell invocation/fixture mistakes are not represented as product red evidence.

## Final Local Proof

340 web regressions and prior reference lanes; production build/types/lint;
15 native draft cases, existing identity/recovery/root route contracts; real375px/
1440px fixtures with ten no-ops, sequential money/APR entry, single submit commit,
ten invalid changes, feedback and saved-input navigation/reload;35 existing native
route/viewport executions and focused first-tap navigation; fresh Android/iOS
Hermes exports; seven web routes; actual all-ten viewers/fallbacks;65 media
contracts and27 fresh Remotion stills; ten unchanged videos rechecked, not rebuilt.
Existing media warning/info notices remain disclosed. Exports are not device QA.

`artifact-receipt.json` binds final source, normalized retained logs, native
exports/screenshots, timing records, unchanged models/videos and generated report.
All financial-engine, scenario, model, shared studio/camera/animation, dependency,
backend/schema/DNS/credential bytes are unchanged. Older restoration overview
counts are refreshed with this substantive fix.

Native aggregate Portfolio adoption remains unfinished; input precision is its
prerequisite, not a replacement for the full funded multi-debt book. Shared scenario
ownership, common-date wealth, lender/calendar/posting/capacity, dedicated backend/
recovery/provider, art/security/native-device/release gates remain open. Five
textured candidates and five studies still require final all-ten art review.

This committed report is preflight. Require both new exact-head complete CI events,
real SQL, exact Vercel and hosted72-case/routes evidence before the final PR receipt.
Fold that receipt into the next substantive update; no report-only push loop,
merge, production promotion, cloud mutation, paid GPU or relaxed CI limits.
