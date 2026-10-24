# Guardian Question-Time Context

Restore scenario coherence without changing financial formulas or the answer bank.
Teacher Mode previously personalized canonical Portfolio questions with the separate
single-target store. Actual callback tests reproduced 3500 instead of shared 950.

## Ownership

- `/portfolio` always selects the shared book.
- `/` and `/simulator` select it only when the first `scenario` value is exactly
  `portfolio`. Bare, unknown, differently cased and unsupported routes stay legacy.
- At submission, shared personalization requires ready persistence and finite
  income, expenses and their difference. Otherwise omit personalization; never
  substitute legacy values for an unavailable shared book.
- Copy the current dollar values at question time, before the existing 300ms
  callback. Later navigation or edits must not relabel that answer's source.
- Teacher answers show shared, unavailable shared, or single-target provenance.
  Ordinary answers, intent classification and blank-question behavior stay intact.
- No new persistence fields, migrations, formulas, advice or authentication.

## Verification

The real callback and formatter run with controlled hooks/timers: baseline
31 passing and seven assertion failures; corrected source 38 passing, including
all 28 original navigation cases. Independent source/CPU review is bounded.

The standing shared-dashboard browser workflow adds three canonical and two
legacy routes at 280/375/1440px. Its distinct persisted fixtures are shared 950
and legacy 8111 - 4222 = 3889, not the CPU mock's 3500. It requires amount and
source in the same answer and exact preservation of all three book keys.
An actual browser probe then found 20px overflow at 280px, with close/send controls
outside the dialog. The compact header uses two rows and the composer permits
input shrinkage while preserving the send button's dimensions. The standing smoke
requires horizontal dialog fit and contained input/button bounds. This is bounded
layout coverage, not a general accessibility approval.
Local, hosted, exact-head CI and final device evidence remain separate gates.
