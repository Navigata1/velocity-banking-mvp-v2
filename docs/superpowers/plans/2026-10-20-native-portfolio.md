# Native Funded Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** A persistent, owner-safe native multi-debt Portfolio using the shared funded engine and portable, recoverable web/native books.

**Architecture:** Keep the existing single-debt scenario intact. Add an explicit-unit portable Portfolio document, owner-scoped book storage and UI, then paired snapshot/recovery and web compatibility. Review each independently testable slice; no slice alone completes the native port.

**Tech Stack:** Existing TypeScript, React Native/Expo, React, shared engine, SecureStore/Web Locks, current snapshot RPC and node contract/Chrome smoke harnesses. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-20-native-portfolio-design.md`

## Global Constraints

- Preserve existing single-debt saved scenarios and legacy APR interpretation.
- Canonical documents use version2 and `aprUnit: 'decimal'`.
- No rounded cents, coercion of numeric strings, changed debt IDs, or derived projection results are persisted.
- Missing Portfolio is distinct from an explicitly empty initialized book.
- Keep draft PR256, the unchanged20-minute CI cap, every standing pixel/deadline assertion and all remaining art/backend/lender/security/device/release gates.
- No merge, production promotion, cloud/schema/DNS/access changes or paid GPU work.

## Review Focus

- APRs at/above100% must not be reinterpreted or normalized twice; pin in Task1.
- Unknown versions, corrupt present books and duplicate IDs must never become empty defaults; pin in Tasks2/3.
- Account changes during drafts, saves and recovery must not leak or overwrite owners; pin in Tasks3/5.
- Missing legacy books and half-applied paired restores must preserve recoverable data and old queues; pin in Task5.
- Unsupported or rejected projections must not show payoff/cash claims; imported precise and oversized values survive no-ops; pin in Tasks4/6.

## Task1: Explicit APR Units Through The Funded Engine

**Files:** `packages/financial-engine/src/index.ts`, `src/portfolio.ts`; new `apps/web/scripts/portfolio-apr-unit-tests.cjs`; existing web test entry.
**Interfaces:** `APRUnit = 'legacy' | 'decimal'`; optional unit parameter on shared rate/daily-interest helpers; optional `aprUnit` on Portfolio, Money Loop month and LOC-accrual inputs. Defaults remain legacy. Portfolio normalizes legacy values once, then uses decimal mode internally.

- [ ] Add behavior tests before code: default6.5 equals0.065; explicit2 gives monthly2/12 and daily2/365; default2 remains0.02; boundary1 and1.0001 do not jump in decimal mode.
- [ ] Observe red for unsupported explicit mode, not a missing-file or module error.
- [ ] Propagate decimal mode through Portfolio ranking, promos, debt/LOC interest and Money Loop month/accrual. Never use a cap at100% or implicit double-normalization workaround.
- [ ] Prove independently calculated one-month charges, target order, promo transition and row conservation in all policies/focus modes. Retain legacy whole-percent tests and all current financial references.
- [ ] Run web suite/build/lint and native types/contracts. Independent review; commit the coherent slice. Keep native UI adoption open.

## Task2: Portable Canonical Book Codec

**Files:** new `packages/financial-engine/src/portfolio-book.ts`; public shared Portfolio exports; new codec contracts in existing CI lanes.
**Interfaces:** `PortfolioBook` matches existing persisted flat fields. `decodePortfolioBook(value: unknown): PortfolioBook`; `decodePortfolioDocument(json: string): PortfolioBook`; `encodePortfolioDocument(book: PortfolioBook): string`; `portfolioBookInputs(book): PortfolioSimulationInputs` sets decimal mode and600-month horizon.

- [ ] Red tests: legacy export/persisted shapes convert once; version2 decimal2 remains2; all debt terms and subcent/large numbers survive; input is not mutated; empty book is valid but absence is not an empty book.
- [ ] Reject unknown versions, malformed fields, duplicate/reserved IDs, strings-as-money, nonfinite/overflowing totals and invalid ratios before state writes.
- [ ] Implement strict canonical validation and explicit legacy adapter, not runtime projection cloning. Commit reviewed codec with standing unit tests.

## Task3: Owner-Scoped Native Book Persistence

**Files:** new native Portfolio storage, hook/provider and storage contract alongside existing assumptions code; root layout provider wiring.
**Interfaces:** load/save/replace with owner UUID normalization, revision CAS, authentic owner-lock token reuse; absent book remains explicit. Reuse chunked secure storage with corruption detection.

- [ ] Red tests for guest/A/B isolation, revision conflict, no implicit adoption/reset, failed writes, missing chunks and account change during async work.
- [ ] Implement separate physical book storage without renaming/deleting scenario keys. Hydration and recovery gates invalidate stale drafts; never mark failed persistence as saved.
- [ ] Run full native contracts/types and browser reload/owner fixtures; independent review and focused commit.

## Task4: Real Native Aggregate Portfolio

**Files:** native Portfolio route, dedicated controls/debt editor/result presentation; reuse precise numeric component and shared engine.

- [ ] Red browser fixtures for two loans plus LOC, funded cap/cash, real strategy/focus edits, percent minimum/promo, current target, LOC-only, cleared, rejected funding and fractional values.
- [ ] Implement complete debt CRUD and inputs, explicit initial copy from scenario, portable JSON import/export review, financial assumptions and correct failed-state suppression. Do not leave a selected-debt adapter as the completed port.
- [ ] Validate375/1440 plus existing five viewport route matrix, no-op preservation, navigation/reload, focus/keyboard/screen-reader states and no overflow/errors. Review and commit in focused component slices.

## Task5: Paired Snapshot And Recovery

**Files:** native snapshot sync/outbox/recovery, auth startup readiness and Settings/account review UI; current negative contract suites.

- [ ] Extend prepared entries using existing allowed logical Portfolio key. Bind frozen review fingerprints for both stores; support book-only/legacy source preservation.
- [ ] Add red interruption tests at stage, either store write, both writes and queue commit; fresh-instance resume accepts each before-or-target independently, stops on third-state edits and preserves immutable queued requests.
- [ ] Implement durable paired restore under one authentic owner lock, no deadlock, no flush before both are durable, no edits/replay while recovery is pending/failed. No remote/schema changes.
- [ ] Prove owner switches, source-book-only changes, stale confirmation, missing vs empty vs corrupt books, guest copy and storage failure. Review and commit focused slices.

## Task6: Web Compatibility And Final Native Checkpoint

**Files:** web Portfolio store/import/export, safe physical-key compatibility adapter and existing logical snapshot collection/recovery; committed browser and reference lanes.

- [ ] Red tests for both-direction version2 backups, legacy6.5%, canonical200%, original persisted bytes unchanged, unsupported versions and interrupted upgrade.
- [ ] Implement explicit canonical mode in web without rewriting/deleting original legacy data. Preserve error feedback, current household ownership and no automatic cross-store consolidation.
- [ ] Run all standing web/financial/media/hero/native gates, fresh Hermes exports, independent review, both exact-head full pipelines/SQL, exact preview and hosted routes/calculation fixtures. Retain every failure and unchanged gate cap.
- [ ] Update mission state/journal and generated SOTU with actual closure only. Fold prior b41b6a3 receipt6306173894 into the next substantive update. Push on existing restoration branch, retain draft/no promotion.

## Execution

Tier2 implement/verify split. Parent implements dependent data/model work; delegate
only disjoint workers or fresh skeptical review. User's explicit autonomous-design
instruction replaces repeated human approval prompts, not evidence or review gates.
Do not end at a plan-only checkpoint; execute Task1 and continue toward the full spec.
