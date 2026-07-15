BEGIN;
SELECT plan(48);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@example.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'owner-b@example.invalid');

INSERT INTO public.profiles (id, display_name, onboarding_status)
VALUES
  ('00000000-0000-0000-0000-00000000000a', 'Owner A', 'active'),
  ('00000000-0000-0000-0000-00000000000b', 'Owner B', 'active');

INSERT INTO public.financial_snapshots (id, owner_id, idempotency_key, assumptions_json)
VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-00000000000a', 'owner-a-fixture-001', '{"owner":"a"}'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-00000000000b', 'owner-b-fixture-001', '{"owner":"b"}');

INSERT INTO public.simulation_runs (id, owner_id, snapshot_id, engine_version, route, result_summary_json)
VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000101', '2.0.0', 'simulator', '{}'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000102', '2.0.0', 'simulator', '{}');

INSERT INTO public.learning_progress (id, owner_id)
VALUES ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-00000000000a');

INSERT INTO public.export_records (id, owner_id, snapshot_id, export_kind)
VALUES ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000101', 'report');

INSERT INTO public.audit_events (id, owner_id, event_type)
VALUES ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-00000000000a', 'fixture-created');

SELECT ok(NOT has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anon cannot read profiles');
SELECT ok(NOT has_table_privilege('anon', 'public.financial_snapshots', 'INSERT'), 'anon cannot insert snapshots');
SELECT ok(
  NOT has_function_privilege('anon', 'public.sync_interestshield_snapshot(text, text, integer, jsonb, uuid, text)', 'EXECUTE'),
  'anon cannot call atomic snapshot sync'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.sync_interestshield_snapshot(text, text, integer, jsonb, uuid, text)', 'EXECUTE'),
  'authenticated users can call atomic snapshot sync'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.financial_snapshots', 'INSERT'),
  'authenticated clients cannot bypass atomic snapshot writes'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.audit_events', 'INSERT'),
  'authenticated clients cannot forge atomic sync receipts'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);

SELECT is((SELECT count(*) FROM public.profiles), 1::bigint, 'owner A sees only their profile');
SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-00000000000b'),
  0::bigint,
  'owner A cannot see owner B profile'
);
SELECT throws_ok(
  $$INSERT INTO public.financial_snapshots (id, owner_id, idempotency_key, assumptions_json)
    VALUES ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-00000000000a', 'owner-a-fixture-002', '{}')$$,
  '42501',
  NULL,
  'owner A must use the atomic RPC to insert a snapshot'
);
SELECT throws_ok(
  $$INSERT INTO public.financial_snapshots (id, owner_id, idempotency_key, assumptions_json)
    VALUES ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-00000000000b', 'owner-b-fixture-002', '{}')$$,
  '42501',
  NULL,
  'owner A cannot insert a snapshot for owner B'
);
SELECT is((SELECT count(*) FROM public.financial_snapshots), 1::bigint, 'owner A sees only their existing snapshot');
SELECT throws_ok(
  $$UPDATE public.financial_snapshots
    SET assumptions_json = '{"updated":true}'
    WHERE id = '00000000-0000-0000-0000-000000000101'$$,
  '42501',
  NULL,
  'owner A must use the atomic RPC to update a snapshot'
);
SELECT throws_ok(
  $$UPDATE public.financial_snapshots
    SET owner_id = '00000000-0000-0000-0000-00000000000b'
    WHERE id = '00000000-0000-0000-0000-000000000101'$$,
  '42501',
  NULL,
  'owner A cannot transfer snapshot ownership'
);
SELECT throws_ok(
  $$INSERT INTO public.financial_snapshots (owner_id, idempotency_key, assumptions_json)
    VALUES ('00000000-0000-0000-0000-00000000000a', 'owner-a-fixture-001', '{}')$$,
  '42501',
  NULL,
  'direct duplicate snapshot writes are denied before uniqueness handling'
);
SELECT is((SELECT count(*) FROM public.simulation_runs), 1::bigint, 'owner A cannot see owner B runs');
SELECT throws_ok(
  $$INSERT INTO public.audit_events (owner_id, event_type) VALUES ('00000000-0000-0000-0000-00000000000a', 'owner-action')$$,
  '42501',
  NULL,
  'owner A cannot append unaudited client events directly'
);
SELECT throws_ok(
  $$DELETE FROM public.audit_events WHERE owner_id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501',
  NULL,
  'owner A cannot delete audit history'
);
SELECT lives_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-001',
    'owner-a-mobile-operation-001',
    1,
    '{"contract_version":1,"storage":[{"key":"interestshield-mobile-assumptions-v1","value":"first"}]}'::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  'owner A can atomically sync a mobile snapshot'
);
SELECT is(
  (SELECT count(*) FROM public.financial_snapshots WHERE idempotency_key = 'owner-a-mobile-sync-001'),
  1::bigint,
  'atomic sync creates one owner-scoped snapshot'
);
SELECT is(
  (SELECT assumptions_json #>> '{storage,0,value}' FROM public.financial_snapshots WHERE idempotency_key = 'owner-a-mobile-sync-001'),
  'first',
  'atomic sync stores the validated assumptions envelope'
);
SELECT is(
  (SELECT count(*) FROM public.audit_events WHERE event_type = 'snapshot-synced' AND idempotency_key = 'owner-a-mobile-operation-001'),
  1::bigint,
  'atomic sync appends one idempotent audit event'
);
SELECT throws_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-account-change',
    'owner-a-mobile-operation-account-change',
    1,
    '{"contract_version":1,"storage":[{"key":"interestshield-mobile-assumptions-v1","value":"account-change"}]}'::jsonb,
    '00000000-0000-0000-0000-00000000000b',
    'Owner A Mobile'
  )$$,
  '42501',
  NULL,
  'atomic sync rejects an expected owner that differs from the active JWT'
);
SELECT is(
  (SELECT count(*) FROM public.financial_snapshots WHERE idempotency_key = 'owner-a-mobile-sync-account-change'),
  0::bigint,
  'an account-change rejection cannot write a snapshot'
);
SELECT lives_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-001',
    'owner-a-mobile-operation-001',
    1,
    '{"contract_version":1,"storage":[{"key":"interestshield-mobile-assumptions-v1","value":"first"}]}'::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  'replaying the same operation with the same request is safe'
);
SELECT is(
  (SELECT count(*) FROM public.financial_snapshots WHERE idempotency_key = 'owner-a-mobile-sync-001'),
  1::bigint,
  'replay does not duplicate the snapshot'
);
SELECT is(
  (SELECT assumptions_json #>> '{storage,0,value}' FROM public.financial_snapshots WHERE idempotency_key = 'owner-a-mobile-sync-001'),
  'first',
  'an exact replay leaves the existing snapshot payload unchanged'
);
SELECT is(
  (SELECT count(*) FROM public.audit_events WHERE event_type = 'snapshot-synced' AND idempotency_key = 'owner-a-mobile-operation-001'),
  1::bigint,
  'replay does not duplicate the audit event'
);
SELECT throws_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-001',
    'owner-a-mobile-operation-001',
    1,
    '{"contract_version":1,"storage":[{"key":"interestshield-mobile-assumptions-v1","value":"changed"}]}'::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  '22023',
  NULL,
  'reusing an operation key with a different request is rejected'
);
SELECT is(
  (SELECT assumptions_json #>> '{storage,0,value}' FROM public.financial_snapshots WHERE idempotency_key = 'owner-a-mobile-sync-001'),
  'first',
  'a rejected operation-key collision cannot mutate the snapshot'
);
SELECT lives_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-001',
    'owner-a-mobile-operation-002',
    1,
    '{"contract_version":1,"storage":[{"key":"interestshield-mobile-assumptions-v1","value":"third"}]}'::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  'a new logical sync can update the stable install snapshot'
);
SELECT is(
  (SELECT count(*) FROM public.audit_events WHERE event_type = 'snapshot-synced' AND owner_id = '00000000-0000-0000-0000-00000000000a'),
  2::bigint,
  'a new operation key appends a distinct audit event'
);
SELECT throws_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-bad',
    'owner-a-mobile-operation-bad',
    1,
    '{"contract_version":2,"storage":[]}'::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  '22023',
  NULL,
  'atomic sync rejects an invalid snapshot contract'
);
SELECT throws_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-null',
    'owner-a-mobile-operation-null',
    1,
    NULL::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  '22023',
  NULL,
  'atomic sync rejects a null assumptions envelope'
);
SELECT throws_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-missing-version',
    'owner-a-mobile-operation-missing-version',
    1,
    '{"storage":[{"key":"interestshield-mobile-assumptions-v1","value":"missing-version"}]}'::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  '22023',
  NULL,
  'atomic sync rejects an assumptions envelope without a contract version'
);
SELECT throws_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-missing-key',
    'owner-a-mobile-operation-missing-key',
    1,
    '{"contract_version":1,"storage":[{"value":"missing-key"}]}'::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  '22023',
  NULL,
  'atomic sync rejects a storage entry without a key'
);
RESET ROLE;
SELECT lives_ok(
  $$INSERT INTO public.audit_events (owner_id, event_type, idempotency_key, event_json)
    VALUES (
      '00000000-0000-0000-0000-00000000000a',
      'snapshot-synced',
      'owner-a-mobile-operation-malformed',
      '{}'::jsonb
    )$$,
  'owner A can create a malformed same-owner receipt fixture'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
SELECT throws_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-malformed',
    'owner-a-mobile-operation-malformed',
    1,
    '{"contract_version":1,"storage":[{"key":"interestshield-mobile-assumptions-v1","value":"malformed"}]}'::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  '22023',
  NULL,
  'a receipt without a matching fingerprint is rejected'
);
SELECT is(
  (SELECT count(*) FROM public.financial_snapshots WHERE idempotency_key = 'owner-a-mobile-sync-malformed'),
  0::bigint,
  'a malformed receipt cannot authorize snapshot mutation'
);

RESET ROLE;
CREATE FUNCTION public.fail_atomic_sync_audit_for_test()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'simulated audit failure';
END;
$$;
CREATE TRIGGER fail_atomic_sync_audit_for_test
  BEFORE INSERT ON public.audit_events
  FOR EACH ROW
  WHEN (NEW.idempotency_key = 'owner-a-mobile-operation-rollback')
  EXECUTE FUNCTION public.fail_atomic_sync_audit_for_test();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
SELECT throws_ok(
  $$SELECT public.sync_interestshield_snapshot(
    'owner-a-mobile-sync-rollback',
    'owner-a-mobile-operation-rollback',
    1,
    '{"contract_version":1,"storage":[{"key":"interestshield-mobile-assumptions-v1","value":"rollback"}]}'::jsonb,
    '00000000-0000-0000-0000-00000000000a',
    'Owner A Mobile'
  )$$,
  'P0001',
  'simulated audit failure',
  'audit failure aborts the atomic sync call'
);
SELECT is(
  (SELECT count(*) FROM public.financial_snapshots WHERE idempotency_key = 'owner-a-mobile-sync-rollback'),
  0::bigint,
  'audit failure rolls back the snapshot upsert'
);

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);

SELECT lives_ok(
  $$INSERT INTO public.financial_snapshots (id, owner_id, idempotency_key, assumptions_json)
    VALUES ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-00000000000b', 'owner-a-fixture-001', '{}')$$,
  'different owners may use the same client idempotency key'
);

SELECT throws_ok(
  $$INSERT INTO public.simulation_runs (owner_id, snapshot_id, engine_version, route, result_summary_json)
    VALUES ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000101', '2.0.0', 'simulator', '{}')$$,
  '23503',
  NULL,
  'database rejects cross-owner snapshot references'
);

DELETE FROM public.financial_snapshots WHERE id = '00000000-0000-0000-0000-000000000101';
SELECT is(
  (SELECT count(*) FROM public.export_records WHERE id = '00000000-0000-0000-0000-000000000301' AND snapshot_id IS NULL AND owner_id = '00000000-0000-0000-0000-00000000000a'),
  1::bigint,
  'snapshot deletion preserves export ownership and clears only snapshot_id'
);
SELECT is(
  (SELECT count(*) FROM public.simulation_runs WHERE id = '00000000-0000-0000-0000-000000000201'),
  0::bigint,
  'snapshot deletion cascades to dependent simulation runs'
);

DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-00000000000a';
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-00000000000a'), 0::bigint, 'auth deletion removes profile');
SELECT is((SELECT count(*) FROM public.financial_snapshots WHERE owner_id = '00000000-0000-0000-0000-00000000000a'), 0::bigint, 'auth deletion removes snapshots');
SELECT is((SELECT count(*) FROM public.learning_progress WHERE owner_id = '00000000-0000-0000-0000-00000000000a'), 0::bigint, 'auth deletion removes learning progress');
SELECT is((SELECT count(*) FROM public.audit_events WHERE owner_id = '00000000-0000-0000-0000-00000000000a'), 0::bigint, 'auth deletion removes audit events');

SELECT * FROM finish();
ROLLBACK;
