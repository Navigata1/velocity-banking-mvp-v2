BEGIN;
SELECT plan(19);

INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@example.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'owner-b@example.invalid');

INSERT INTO public.profiles (id, display_name, onboarding_status)
VALUES
  ('00000000-0000-0000-0000-00000000000a', 'Owner A', 'active'),
  ('00000000-0000-0000-0000-00000000000b', 'Owner B', 'active');

INSERT INTO public.financial_snapshots (id, owner_id, assumptions_json)
VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-00000000000a', '{"owner":"a"}'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-00000000000b', '{"owner":"b"}');

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

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);

SELECT is((SELECT count(*) FROM public.profiles), 1::bigint, 'owner A sees only their profile');
SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-00000000000b'),
  0::bigint,
  'owner A cannot see owner B profile'
);
SELECT lives_ok(
  $$INSERT INTO public.financial_snapshots (id, owner_id, assumptions_json)
    VALUES ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-00000000000a', '{}')$$,
  'owner A can insert their own snapshot'
);
SELECT throws_ok(
  $$INSERT INTO public.financial_snapshots (id, owner_id, assumptions_json)
    VALUES ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-00000000000b', '{}')$$,
  '42501',
  NULL,
  'owner A cannot insert a snapshot for owner B'
);
SELECT is((SELECT count(*) FROM public.financial_snapshots), 2::bigint, 'owner A sees only their two snapshots');
SELECT lives_ok(
  $$UPDATE public.financial_snapshots
    SET assumptions_json = '{"updated":true}'
    WHERE id = '00000000-0000-0000-0000-000000000101'$$,
  'owner A can update their own snapshot'
);
SELECT throws_ok(
  $$UPDATE public.financial_snapshots
    SET owner_id = '00000000-0000-0000-0000-00000000000b'
    WHERE id = '00000000-0000-0000-0000-000000000101'$$,
  '42501',
  NULL,
  'owner A cannot transfer snapshot ownership'
);
SELECT is((SELECT count(*) FROM public.simulation_runs), 1::bigint, 'owner A cannot see owner B runs');
SELECT lives_ok(
  $$INSERT INTO public.audit_events (owner_id, event_type) VALUES ('00000000-0000-0000-0000-00000000000a', 'owner-action')$$,
  'owner A can append an audit event'
);
SELECT throws_ok(
  $$DELETE FROM public.audit_events WHERE owner_id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501',
  NULL,
  'owner A cannot delete audit history'
);

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);

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
