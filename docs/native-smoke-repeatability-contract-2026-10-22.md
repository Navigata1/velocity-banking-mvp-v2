# Native Dated Smoke Repeatability

## Failure

After the canvas candidate's full local run stopped at a Remotion target closure,
the remaining native accessibility command reached its dated fixture and failed:
`use a fresh dated smoke output directory; previous receipts are never overwritten`.
The caller reused `outputDirectory/dated-plan`, whose old verification.json was
intentionally protected. This is a test-caller repeatability defect, not a new
application storage failure or evidence that old receipts should be deleted.

## Narrow Fix

- Preserve the existing default parent and MOBILE_ACCESSIBILITY_OUTPUT override.
- Allocate `dated-plan/<UUID>` for each invocation of the actual main function.
- Print that path so fresh dated receipts can be identified in the command log.
- Retain the fixture's existing-file guard and all15 browser workflows unchanged.
- Preserve old dated receipts byte-for-byte; reject a UUID child that already
  contains a protected verification receipt.
- Retain outer browser/server cleanup after success or failure.

Other accessibility output paths retain their existing behavior. This change
does not claim that every historical non-dated output is immutable.
The guard is still receipt-based, not an exclusive directory reservation: a UUID
directory without verification.json can be reused. No atomic nonce claim is made.

## Evidence Required

Three standing CPU groups execute the actual caller with mocked external systems
and the actual dated guard prefix: repeated per-invocation output/custom-root/old
receipt preservation, collision rejection/cleanup, and standing wiring while
retaining the literal one-percent fee oracle. Old code genuinely produced1pass/
2fail; the narrow fix produces3pass. CPU boundary witnesses are not rendered proof.

Two complete real native smokes must then use the same parent and protected old
receipt, produce distinct UUID outputs with15passing dated cases each, close the
created dated contexts, and preserve the old receipt's exact hash. A new frozen-
source full29 and both complete new-head CI events remain required before a
verified checkpoint. Neither a selected failed-frame replay nor a collection of
partially passing commands is a successful full run.

## Preserved Limits

Canvas full1lint/full2desktop701ms/full3Remotion Target closed, artificialCPU2
nine-ms-late failure, and remote f782 required-pair failure remain intact. The
native fix does not diagnose Remotion or establish700ms timing reliability.
No app/math/art/dependency/SQL/workflow/cap change. No physical-device, fullR3,
backend, final photoreal or production approval. DraftPR256 remains unmerged.
