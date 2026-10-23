# Six-Table Owner Permission Matrix

The second disposable pgTAP file, `supabase/tests/owner_permission_matrix_test.sql`,
has222 declared assertions. Together with the unchanged original63, the expected
combined plan is285. Expected counts are not database execution evidence.

The matrix covers anon, authenticated-without-subject, owner A and owner B across
all six tables. It tests grants separately from actual CRUD statements, exact
visible UUID sets, both ownership directions, allowed writes, zero-row filtered
mutations, ownership-transfer rejection, composite snapshot/owner foreign keys,
nullable exports and RPC denial guards. Both JWT sources are cleared or set.
Administrator full-row comparisons detect extra, missing or changed records.
Fixtures and settings are enclosed by BEGIN/ROLLBACK; no test helper bypasses RLS.

The reviewed222 preserve the first191 candidate assertions and add31 missing
null/foreign operations. All eleven expanded assertion queries have outer order;
the administrator expected rows retain JSON ordinality. Source review counted
96 basic actor/table/CRUD cells, not96 executed authorization checks.

A standing wiring test first failed because the new file was missing, then
passed after the exact independently reviewed SQL was copied into discovery.
It checks only file presence, declared plans and transaction boundaries. Neither
that check nor client mocks establish SQL parsing, RLS or error precedence.

The actual pinned disposable CI gate must name both files and report
`Files=2, Tests=285` with `Result: PASS` twice per exact-head SQL job. Preserve
four-migration replay, lint, advisors, cleanup, raw logs and source guards.
All four migration bytes, the original63 and CLI/workflow commands remain.

This test-only change does not alter app behavior, financial calculations,
artwork, dependencies, schema, grants, authentication or managed cloud data.
It does not select a hosted backend or prove API JWTs, backup/account recovery,
cross-device behavior, provider patch status or production readiness. The earlier
36e rapid-return browser deadline failure remains unresolved and retained.
