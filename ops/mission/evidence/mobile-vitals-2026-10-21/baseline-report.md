# Tier2 Sidecar Baseline Verification

Verified 2026-10-21T10:31:08Z through 10:31:15Z. Baseline only: **1550/1550 checks passed; no unexplained artifact drift found.** These are verification checks, not newly executed application tests.

## Identity And Scope

- Fixed Git HEAD: `caefd8086180513b3fb6c1cf85492174996a437b`.
- Local branch and local origin ref: `codex/restoration/asset-heroes`; origin URL is `https://github.com/Navigata1/velocity-banking-mvp-v2.git`. Fresh authenticated origin-ref API agrees with HEAD.
- Fresh PR256 API: OPEN, draft, exact same head/repository/branch; target `Navigata1/velocity-banking-mvp-v2:main`.
- Parent-owned changes to `apps/web/src/app/page.tsx` and `apps/web/scripts/smoke-dashboard-interest.cjs` were present at verifier start/end. Source verification uses fixed Git object bytes, not these dirty files. No dirty-tree failure asserted.
- Final file inventory also observed concurrent changes to `apps/web/scripts/engine-regression-tests.cjs`. This sidecar did not edit it; its baseline source check likewise used fixed HEAD bytes.
- All sidecar writes are ignored `baseline-*` files in this directory. No tracked edits, commits, push, browser UI, services, tests/builds/renders, CI reruns, auth/config/env mutation, goals, agents, deployments or promotions.

## Exact-Head CI

Both `CI` events report `completed` / `success`, attempt 1, exact SHA, two successful jobs and all successful steps. Actual attempt-1 ZIP archives were fetched read-only; all step logs were inspected and reconstructed in the prior GitHub CLI format. Both old scratch logs and freshly reconstructed logs match every recorded postflight hash.

| Event / Run | Web Job / SQL Job | Confirmed Per Event |
| --- | --- | --- |
| push `39581976729` | `119161517160` / `119161517435` | 145 media, 27 stills, 348 regressions/reference lane, native 49, full new contract summaries, SQL 63 twice |
| pull_request `39581984357` | `119161541407` / `119161541969` | Same, independently present in this event's full logs |

Native browser 49 is 35 route/accessibility + 12 Portfolio + 2 financial-input executions. Media summary is 145 passed, zero failed/skipped/cancelled. Contract summaries include APR15, portable-book17, canonical-persistence22, real-store3, native-input19, encrypted-storage9, owner-storage14, lifecycle13, whole-book8, Portfolio-hook7, transfer16, paired-snapshot18, Recovery-hook16 and Recovery-review11.

Precise log anchors: push web lines 591 (348), 2037-2043 (145/zero failures), 2713 (27), 3382-3501 (new native contracts); PR web lines 607, 2053-2059, 2728, 3397-3516 respectively. SQL push lines 813-814 and 836-837; PR lines 822-823 and 845-846 each show `Tests=63` and `Result: PASS`. Native execution lines and every selected contract summary are indexed in `baseline-results.json`.

| Full Job Log | Bytes | SHA-256, Matching Prior Receipt |
| --- | ---: | --- |
| baseline-push-web.log | 536695 | `003ef06f7b742a24a9faa5e246206b818e09e8c4d74b7c12928fd1ed3efc0578` |
| baseline-push-sql.log | 118566 | `77b9c3f35b367ffc33f2107f9743e7b7dd39e37d361bb7f672acf0bcdfaee53f` |
| baseline-pull_request-web.log | 538241 | `b2f6b27a730c8404a7ff2a533e04ed563112b603d840751793040a355af5105f` |
| baseline-pull_request-sql.log | 119458 | `f34fe91ac51354e2b9edaa72dc2b17bcc7596a86fdd0f9f1bc220b57ae54d69c` |

## Evidence And Artifacts

- Custom `postflight.json` head, draft/open metadata and embedded local receipt agree. Its SHA-256 is `073f9ee5f232502af87d287cedf30283aa44de58b766d9573b231124ffe239b0`; unchanged during verification.
- All **285 normalized source fingerprints** match fixed HEAD. All **109 committed Custom evidence files** match recorded raw hashes/sizes at HEAD and on disk. HEAD `artifact-receipt.json` equals `postflight.local`.
- All **198 entries** in Desktop `Custom-caefd80-File-Manifest.json` match exact bytes/sizes; manifest head/receipt match. Manifest SHA-256: `fc3b944c86d88568bfad0d1b25ff2aa54ff470128e732a239b753f3c312beb00`.
- Desktop report: 115997 bytes, SHA-256 `d83d95cad4551fb53b5e762ba1fc9ec58672e031867f9ce2c1c79ec802db42bf`; same as projection report. Desktop verification JSON equals current Custom postflight.
- HEAD source preflight state hash matches `05672e6e34ee54f92fe4bed3bc07a6ea1352e8a457d12fff6eae95dea40852c4`; projected state matches `2c7c02d090eba6a1cf0ee4b0447c1b13d0535ccd0124a779295fecd9c2b505dd`.
- All ten HEAD GLBs/posters match model/provenance records. Current artifacts match: 10 public GLBs, 20 GLB vendor copies across both media pipelines, 10 posters and 10 MP4s, including exact sizes. Current video records equal committed verification and postflight snapshots. Model/imported records match by ID. No videos/models were regenerated.

## Fresh Vercel Read

Authenticated read-only deployment, project and team APIs confirm deployment `dpl_7oWB7mK6JzvF9dgkZs2fEurrQyfg`, READY, `target: null`, exact HEAD/branch/repository, project `prj_AYKVLmLw6D1vZmOFPQ512WdfpM5s`. Project account `team_rccC7q4MEQxCAEz45598ttAe` resolves to team slug `islanddevcrew`.

Preview: `https://velocity-banking-mvp-v2-btrr3qe0h-islanddevcrew.vercel.app`. Prior `deployment-final.json` agrees with embedded postflight deployment and fresh identity/state. No preview routes or browser interactions were rerun.

## Qualifications And Existing Findings

- Renderer raw-byte distinction: receipt hashes the CRLF checkout (20469 bytes, `c61b7ed4427296a60531b894ffe560ee4087fdf45a5f6df86aaff16a7a4bb495`); Git HEAD stores LF (20071 bytes, `faf32253aa3cabf5b5c14278d812d37764afa5e987c99c1932d51a1764c968b2`). Normalized bytes and explicit CRLF reproduction match. Do not describe these raw hashes as identical.
- Imported/model array orders differ, but all ten complete records match by ID. Log reconstruction must retain internal empty lines/BOMs and render ESC as `^[` to match prior `gh` logs. Initial verifier-assumption issues are recorded in `baseline-diagnostics.json`, not hidden as artifact drift.
- CI success does not mean an advisory-free toolchain: push web lines 152/1122/2912 record 12 web-install (2 moderate/10 high), 13 media (5 moderate/8 high), and 40 mobile (12 moderate/28 high) findings. PR lines 168/1138/2927 independently agree. Web runtime audit reports zero separately. Node20 upload-artifact deprecation warnings remain at push 3560 / PR 3575. No remediation attempted.
- The existing hosted82/browser/art/device/release claims were not rerun. No final art, physical-device, lender/backend/security or production approval is conferred. This baseline does not validate the parent's new mobile-vital implementation or a later commit.

## Changed Files

Only this directory's ignored `baseline-*` files. `baseline-files.json` lists their exact names, sizes, SHA-256 values and ignore status (excluding its own self-hash). Sources: `baseline-verify.cjs`, fresh GitHub metadata, two raw CI ZIPs, four full job logs, three raw Vercel responses, results, diagnostics, Git status snapshots, this report and the inventory helper. No tracked file was changed by the sidecar.
