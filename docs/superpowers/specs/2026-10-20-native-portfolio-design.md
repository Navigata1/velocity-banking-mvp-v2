# Native Funded Portfolio Design

## Intent And Authority

Restore a truthful native multi-debt Portfolio using the same funded book as web,
without silently replacing existing single-debt scenarios. The user explicitly
delegated design decisions and execution without repeated approval questions.
This is architectural work delivered in reviewed, test-first slices, not a claim
that the native port, scenario coherence or production release is already done.

## Decisions

Use a portable, versioned Portfolio document and the existing shared simulation.
Keep the independently meaningful single-debt scenario intact. A silent merge
would guess which household figures or minimum-payment policies are authoritative.
An unsaved chart-only adapter would not meet the requested native end state.

Canonical documents use version2 and `aprUnit: 'decimal'`. Their `data` contains
the existing flat Portfolio fields: debts, monthlyIncome, monthlyExpenses,
extraMonthlyPayment, chunkAmount, loc, strategy, focusMode, splitRatioPrimary.
Each debt retains its category, kind, fixed/percentage minimum, promo terms,
payment source, optional term, notes and identity. No rounded cents, coercion of
numeric strings, changed debt IDs, or derived projection results are persisted.
Version1 web exports are read as legacy mixed-unit inputs, converted once to
canonical decimals without writing back to the source. Unknown versions, duplicate
or reserved IDs, malformed present fields and nonfinite numbers fail explicitly.
Missing Portfolio is distinct from an explicitly empty initialized book.

## APR Boundary

Existing scalar APIs interpret values above1 as percentage points. This default
must remain compatible with saved legacy data. New canonical Portfolio calls use
an explicit decimal APR mode:2 means200%, not2%. Add `APRUnit = 'legacy' | 'decimal'`
to shared rate helpers and optional `aprUnit` on Portfolio, Money Loop month and
LOC-accrual inputs. Normalize legacy Portfolio rates once, use decimal rates in
all its ranking, loan/LOC interest and rationale paths, and pass decimal mode
through the Money Loop boundary. Do not cap supported rates at100% or change
legacy behavior to hide the ambiguity. Test the1 boundary, rates above1, promos,
LOC ranking and month-by-month conservation. This does not establish lender terms,
day-count rules, posted-cent rounding, fees or practical suitability.

## Persistence And Ownership

Native gets a distinct versioned physical Portfolio key with UUID-normalized owner
suffixes and explicit guest scope. Reuse authentic owner locks and revision CAS.
No guest-to-account adoption is implicit. No existing assumption key is renamed,
deleted or overwritten. First creation can explicitly copy the current single-debt
scenario; subsequent edits belong to the complete Portfolio book only.

Use chunked secure storage for a potentially large book; detect corrupt or missing
chunks and stop rather than return a fresh empty default. Save failure or stale
revision must be visible and must not be advertised as durable. Account changes
invalidate drafts and pending UI updates. Scenario-only reset leaves the book intact.

## UI And Calculation Contract

Replace the native Portfolio's selected-debt projection with `simulatePortfolio`
over all entered debts plus the separate LOC. Support adding, editing and removing
debts; fixed and percentage minimums; promo terms; all three strategies; single and
split focus; funded extra cap; LOC inputs; and chunk controls only where supported.
Reuse precise numeric drafts and native accessibility patterns. Never add a second
source of cash. Show total liabilities including LOC, actual current allocation,
retained cash, failed/cleared results, warnings and educational assumptions.
No layout-wide redesign, marketing hero, authentication expansion or dependencies.
Imported oversized/subcent numbers and unrelated saved fields survive no-op edits.

## Snapshot And Recovery Contract

Use the existing allowed logical key `interestshield-portfolio-v1` with a portable
versioned document as its value; physical native keys/envelopes are not transmitted.
Pair the Portfolio entry with the current scenario in prepared snapshots. Preserve
existing queued requests and immutable operation IDs; never rewrite their payloads.

Recovery review binds owner, source identity/revision, Portfolio presence/content,
and frozen destination scenario/book fingerprints. Missing legacy source books
preserve the destination owner's book; explicit empty books replace it only after
review. Invalid/duplicate present entries reject before staging. Guest adoption
copies without deleting the guest. Book-only web recovery preserves the scenario.

One owner lock covers reread/CAS, durable staging, both replacements, journal commit
and release. The journal records before and target fingerprints for each store.
Resume accepts each store independently as before-or-target, repairs interrupted
partial pairs, and stops on unrelated third states. No flush before both stores are
durable. Pending or failed startup recovery blocks edits/replay until resolved.
This is durable replay, not a claim of a crash-atomic two-key storage transaction.

## Web Compatibility

Web must read canonical documents with their explicit APR mode and export them
without silently losing that metadata. Preserve legacy persisted bytes during any
physical-key upgrade. Adapt snapshot collection/recovery through the existing
logical key rather than mutate the backend whitelist or a managed project. Prove
both-direction backups with legacy6.5% and canonical200% rates. Cross-route scenario
consolidation and common-date wealth remain separately open until actually verified.

## Required Evidence

- Observe red before every behavior change; preserve failing and passing logs.
- Existing financial reference outputs and default legacy behavior remain unchanged.
- Canonical APR paths support above100% correctly without double normalization.
- Native owner isolation, CAS, unavailable/corrupt storage and account races fail safe.
- Paired recovery tests interrupt every write/commit boundary and preserve old queues.
- Render actual native multi-debt fixtures at375/1440 and existing responsive widths;
  exercise real edits, strategies, reload, failures, LOC-only and cleared books.
- Repeat fresh web regressions/references/build/lint, media/hero checks, native
  contracts/types/web export and Android/iOS Hermes exports; exports are not device QA.
- Independent reviews and both complete exact-head CI events, real SQL, exact preview
  and hosted route/calculation proof precede a final checkpoint receipt.

Keep draft PR256, the unchanged20-minute CI cap, every standing pixel/deadline
assertion and all remaining art/backend/lender/security/device/release gates.
No merge, production promotion, cloud/schema/DNS/access changes or paid GPU work.

## Source Boundary

CFPB's daily periodic rate explanation allows360 or365 depending on the issuer:
https://www.consumerfinance.gov/ask-cfpb/what-is-a-daily-periodic-rate-on-a-credit-card-en-46/
The existing365-day educational estimate is retained, not promoted to a universal
lender contract. Source checking does not certify the application's calculations.
