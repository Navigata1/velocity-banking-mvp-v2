# Native Financial Input Precision

This prerequisite fixes existing native-shell data entry before aggregate Portfolio
adoption. It does not change the calculation engine, migrate scenarios, align the
separate web/native books or complete lender/device/release approval.

## Reproduced Defects

The original exported Expo app displayed a stored120.70 as121. Actual sequential
typing120.70 saved12070: per-keystroke coercion removed the decimal point and
whole-dollar formatting discarded cents. New integration tests also exposed
React Native Web's on-drag ScrollView dismissing a focused input during automatic
scrolling. Its delayed select-all could replace text already being entered.

## Current Contract

Money, APR and term fields edit local drafts. Blur or submit validates and commits
once; a no-op does not change the exact stored number or revision. Invalid drafts
restore the saved value and show feedback. Blank, incomplete, negative, malformed,
overflowing and underflowing changes never silently become zero or Infinity.

APR percentages shift their decimal text before Number conversion. Formatting
expands scientific notation without coarse rounding. Changed decimal values must
round-trip through the current Number model to the same canonical decimal text;
otherwise they are rejected. This rejects large edits whose cents were already
lost on conversion. It is not arbitrary-precision decimal arithmetic or a lender
cent/posting contract. Existing imported IEEE values survive unchanged no-ops.

Whole-number changes validate fractional digits before conversion and require a
safe integer;12.0000000000000001 cannot silently become12. Trailing zero fractions
such as12.0 are allowed. Ambiguous comma input is rejected with explicit feedback,
not interpreted as thousands. Explicit dollar-prefixed, properly grouped paste
with a decimal period remains supported. Locale-complete native keyboard behavior
is not claimed; comma-decimal device QA remains open.

Web-export numeric fields do not use delayed auto-select-all, and web programmatic
scrolling does not dismiss the keyboard. Existing iOS/Android select-all and drag
dismissal remain. The form is keyed to its existing account storage scope; a scope
change remounts it, and effect cleanup clears pending sessions. Existing owner,
revision, outbox and recovery guards remain, with no storage-key/schema change.
These safeguards are not signed-in native-device race proof.

## Verification And Remaining Work

Fifteen cheap draft contracts cover formatting, exact no-ops, supported entry,
precision loss, pre-conversion fractional terms, ambiguity, range failures and
explicit zero. Account/platform assertions in that lane are static wiring.
Real Chrome on the exported app runs375px/1440px fixtures: ten field no-ops,
sequential money/APR typing, local drafts, exactly one submit/blur commit, ten
invalid changes, feedback and exact saved inputs across navigation/reload.
The existing35 route/viewport executions and focused first-tap navigation remain.
Main push/PR CI now explicitly runs the full native persistence/input contract
suite alongside route contracts, not only the previous route-only command.

Independent review's three precision/fraction/locale findings were reproduced red
and corrected. Final review, fresh Hermes exports, current exact-head CI/SQL and
hosted web checks are required by the checkpoint evidence. Exports are not physical
iOS/Android keyboard, screen-reader, account-transition or final-device approval.

Native aggregate Portfolio still uses its legacy selected-debt amortized path;
its adoption of the shared multi-debt funded book remains open. Dashboard helper
scope, safe shared ownership, common-date wealth, lender/calendar/capacity/posting,
backend/provider/recovery, five remaining hero studies, all-ten art review and
security/native/release gates also remain. No production or cloud mutation.
