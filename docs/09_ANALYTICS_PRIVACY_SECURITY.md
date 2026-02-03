# Privacy, Security, Analytics & Compliance

## Data classification
- P0: balances, income, expenses, account identifiers (never send without consent)
- P1: app usage metrics (anonymized, aggregated)
- P2: content engagement (lesson completion)

## Storage
- Offline-first local DB (encrypted)
- Optional cloud backup (later), opt-in only

## App store compliance notes
Avoid copy that implies guaranteed results.
Avoid aggressive language that could be flagged (“robbery”, “theft”) in store metadata.
Use it in educational content carefully with context.

## Disclaimers (MVP)
- “Not financial advice”
- “Check your lender terms”
- “Variable APR and minimum payments differ”

## Analytics events (MVP minimal)
- onboarding_completed
- simulation_ran
- plan_created
- reminder_enabled
- lesson_completed
All user-identifying data stripped.
