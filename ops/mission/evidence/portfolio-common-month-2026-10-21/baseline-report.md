# R2 Common-Month Baseline Verification

**PASS: 4,134 / 4,134 baseline checks; no baseline drift found. These are not new application tests.**

- Exact pinned HEAD: `1aec5bf7be3d0f3c26079141245e4c7291fd8778`.
- Branch: `codex/restoration/asset-heroes`; fresh remote branch and draft/open PR 256 agree, checked at start and end.
- Verification completed: `2026-10-21T12:02:07.393Z`.
- Receipt comment `6315242743` was fetched read-only, belongs to PR 256, and names the exact HEAD.
- Prior goal turn made verified progress; no goal or mission state was changed.

## Coverage

- 285 normalized source fingerprints from `git show <pinned HEAD>:<path>`; concurrent product edits excluded from baseline-drift judgments.
- 138 current immutable tracked files: media, public assets, dependency manifests/locks, SQL/config, and CI workflows, compared against pinned Git bytes (LF-normalized text).
- 189 recorded evidence files checked both from committed Git bytes and current disk bytes.
- All 322 Desktop manifest files; all 324 journal targets and staged files; all 48 recoverable backups.
- All 10 model/poster/video identities, all 20 vendor GLBs, current served GLBs/posters, and committed GLBs/posters.
- Both complete attempt-1 CI events, four jobs, 116 successful steps, each step uniquely resolved in fetched log archives.
- Each event logs 348 regressions, 145 media contracts, 27 rendered stills, 49 native browser executions (35 route + 12 portfolio + 2 input), the full contract markers, and SQL63 twice. These historical counts were not rerun.

## Exact Local Hashes

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| Postflight | 157054 | `4c08e19ceeb9bbd20adda0b3f6807afab0ab5647c9c96507561762137aef7cea` |
| Desktop manifest | 61106 | `3f9a7605349bb20c13c95331021ac58af0421db42cb56bd65348fe0ea5fd10e1` |
| Desktop standalone report | 121936 | `720ebd84c8a94bb6cc49c7ee46bb0c77e63e8a32fc8464c9b4668ba5e3d864df` |
| Committed publication journal | 306013 | `59e4febef6136ad1c64bd5a6b9d66d9cbd780dca722932dc1ef7de85c1fb3af0` |

## Complete CI Log Hashes

| Event / Run / Attempt | Job ID | Steps | SHA-256 |
|---|---:|---:|---|
| push / 39592109336 / 1 | 119195373490 | 40 | `4d8a72badc51c1901fbb1141ee8354198cfe14cba3c2e3efe8f97dba7b48e11a` |
| push / 39592109336 / 1 | 119195373844 | 18 | `e7f5829550155848862877e06cf8e9187f684d1038266228538af8e96060923f` |
| pull_request / 39592115293 / 1 | 119195392054 | 18 | `71dc5c517b51f11c7f482656277487eace5bc4feee754d946061b6aedd083dfc` |
| pull_request / 39592115293 / 1 | 119195392392 | 40 | `afde474e281c9429ee5d32dc90ee2a2ff9b371aeab81bb7762ff94cffd85f5f6` |

The original CI run and attempt records, complete job/step metadata, ZIP archive SHA-256 and individual entry hashes, full normalized job logs, and historical contract summary line numbers are retained in `baseline-v2-*`. ZIP bytes stayed in memory. Log normalization is documented in `baseline-verify-v2.cjs` and `baseline-v2-results.json`.

## Authenticated Vercel Readback

- Deployment: `dpl_9xWRX1G7xEpNinJ88YmCPCHpnpE9`; `state=READY`, `readyState=READY`, `target=null`.
- Project: `prj_AYKVLmLw6D1vZmOFPQ512WdfpM5s`.
- Team-scoped request: `team_rccC7q4MEQxCAEz45598ttAe`; authenticated get_team independently resolves `islanddevcrew`.
- Commit: `1aec5bf7be3d0f3c26079141245e4c7291fd8778`.
- Only selected deployment/team metadata is saved. No private environment payloads are printed or saved.

## Verifier Correction

The first pass retained in `baseline-results.json` had 4,127 passes and three checker false negatives, all at journal entry 322. The generated File-Manifest.json entry has no pre-publication `expected` field, only durable `after`. Revision 2 allows this only for that exact manifest target, compares it against the independently read manifest hash, and rechecks the target and staged bytes. The complete corrected pass has zero discrepancies. No baseline content was repaired or changed, and the first run was not overwritten.

## Reproduction And Scope

From the repo root run `node .superpowers/sdd/2026-10-21-common-month/baseline-verify-v2.cjs` with existing `gh` Navigata1 credentials and existing adm-zip installed. Outputs use exclusive creation and never overwrite evidence; for another run, use an unused baseline output prefix in a new baseline-prefixed verifier copy. Vercel metadata must be freshly selected through the read-only connector before a later reproduction.

All writes from this sidecar are confined to new `.superpowers/sdd/2026-10-21-common-month/baseline-*` files. No application test suites, browsers, servers, dependency installs, cloud/schema changes, Git mutations, PR comments, user sessions/ports 53143 or 53144, or unrelated agents were touched. Credentials stayed in memory and existing gh config was not modified. Untracked common-month design/plan files appeared concurrently and are recorded as context only. Parent owns R2 implementation and review.

`baseline-files.json` fingerprints all sidecar files except itself; its own hash is returned separately. The packet is supporting evidence, not production certification.
