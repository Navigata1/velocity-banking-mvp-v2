-- PRIVATE candidate; not installed in supabase/tests and not SQL-executed.
-- Disposable migrated database only. All fixtures and settings roll back.
BEGIN;
SELECT plan(222);

INSERT INTO auth.users (id, email) VALUES
  ('d525cfe8-d610-40da-a3e3-00000000000a', 'permission-d525-a@example.invalid'),
  ('d525cfe8-d610-40da-a3e3-00000000000b', 'permission-d525-b@example.invalid');
INSERT INTO public.profiles (id, display_name, onboarding_status) VALUES
  ('d525cfe8-d610-40da-a3e3-00000000000a', 'Permission A', 'active'),
  ('d525cfe8-d610-40da-a3e3-00000000000b', 'Permission B', 'active');
INSERT INTO public.financial_snapshots (id, owner_id, source, assumptions_json) VALUES
  ('d525cfe8-d610-40da-a3e3-000000000101', 'd525cfe8-d610-40da-a3e3-00000000000a', 'manual-entry', '{"fixture":"A"}'),
  ('d525cfe8-d610-40da-a3e3-000000000102', 'd525cfe8-d610-40da-a3e3-00000000000b', 'manual-entry', '{"fixture":"B"}');
INSERT INTO public.simulation_runs (id, owner_id, snapshot_id, engine_version, route, result_summary_json) VALUES
  ('d525cfe8-d610-40da-a3e3-000000000201', 'd525cfe8-d610-40da-a3e3-00000000000a', 'd525cfe8-d610-40da-a3e3-000000000101', 'permission-fixture', 'simulator', '{}'),
  ('d525cfe8-d610-40da-a3e3-000000000202', 'd525cfe8-d610-40da-a3e3-00000000000b', 'd525cfe8-d610-40da-a3e3-000000000102', 'permission-fixture', 'simulator', '{}');
INSERT INTO public.learning_progress (id, owner_id) VALUES
  ('d525cfe8-d610-40da-a3e3-000000000301', 'd525cfe8-d610-40da-a3e3-00000000000a'),
  ('d525cfe8-d610-40da-a3e3-000000000302', 'd525cfe8-d610-40da-a3e3-00000000000b');
INSERT INTO public.export_records (id, owner_id, snapshot_id, export_kind) VALUES
  ('d525cfe8-d610-40da-a3e3-000000000401', 'd525cfe8-d610-40da-a3e3-00000000000a', 'd525cfe8-d610-40da-a3e3-000000000101', 'report'),
  ('d525cfe8-d610-40da-a3e3-000000000402', 'd525cfe8-d610-40da-a3e3-00000000000b', 'd525cfe8-d610-40da-a3e3-000000000102', 'report');
INSERT INTO public.audit_events (id, owner_id, event_type) VALUES
  ('d525cfe8-d610-40da-a3e3-000000000501', 'd525cfe8-d610-40da-a3e3-00000000000a', 'permission-fixture'),
  ('d525cfe8-d610-40da-a3e3-000000000502', 'd525cfe8-d610-40da-a3e3-00000000000b', 'permission-fixture');

-- Full-row administrator baseline, including any pre-existing disposable rows.
SELECT set_config('test.before.profiles', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM public.profiles t), true);
SELECT set_config('test.before.financial_snapshots', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM public.financial_snapshots t), true);
SELECT set_config('test.before.simulation_runs', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM public.simulation_runs t), true);
SELECT set_config('test.before.learning_progress', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM public.learning_progress t), true);
SELECT set_config('test.before.export_records', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM public.export_records t), true);
SELECT set_config('test.before.audit_events', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM public.audit_events t), true);

-- coverage: catalog = 57 (48 CRUD grants + 6 RLS flags + 3 RPC catalog checks).
SELECT is(has_table_privilege(r.role_name, 'public.' || t.table_name, p.operation),
  r.role_name = 'authenticated' AND t.allowed[p.ordinal], r.role_name || ' ' || t.table_name || ' ' || p.operation)
FROM (VALUES
  ('profiles', ARRAY[true,false,false,false]), ('financial_snapshots', ARRAY[true,false,false,false]),
  ('simulation_runs', ARRAY[true,true,false,true]), ('learning_progress', ARRAY[true,true,true,true]),
  ('export_records', ARRAY[true,true,false,true]), ('audit_events', ARRAY[true,false,false,false])
) t(table_name, allowed)
CROSS JOIN (VALUES ('anon'), ('authenticated')) r(role_name)
CROSS JOIN (VALUES ('SELECT',1), ('INSERT',2), ('UPDATE',3), ('DELETE',4)) p(operation, ordinal)
ORDER BY r.role_name, t.table_name, p.ordinal;
SELECT ok(c.relrowsecurity, t.table_name || ' RLS enabled')
FROM (VALUES ('profiles'), ('financial_snapshots'), ('simulation_runs'), ('learning_progress'), ('export_records'), ('audit_events')) t(table_name)
JOIN pg_class c ON c.oid = ('public.' || t.table_name)::regclass ORDER BY t.table_name;
SELECT is(has_function_privilege(r.role_name, 'public.sync_interestshield_snapshot(text,text,bigint,integer,jsonb,uuid,text)', 'EXECUTE'),
  r.allowed, r.role_name || ' current RPC EXECUTE') FROM (VALUES ('anon',false), ('authenticated',true)) r(role_name,allowed) ORDER BY r.role_name;
SELECT ok(to_regprocedure('public.sync_interestshield_snapshot(text,text,integer,jsonb,uuid,text)') IS NULL, 'old RPC signature absent');

-- coverage: anon = 27 (2 context + 24 actual CRUD denials + 1 RPC denial).
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SELECT is(current_user::text, 'anon', 'anon current_user');
SELECT is(auth.uid(), NULL::uuid, 'anon uid absent');
SELECT throws_ok(q.sql, '42501', NULL, 'anon ' || q.label) FROM (VALUES
  ('profiles SELECT', $$SELECT id FROM public.profiles$$),
  ('profiles INSERT', $$INSERT INTO public.profiles(id) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a')$$),
  ('profiles UPDATE', $$UPDATE public.profiles SET display_name = 'forbidden'$$),
  ('profiles DELETE', $$DELETE FROM public.profiles$$),
  ('financial_snapshots SELECT', $$SELECT id FROM public.financial_snapshots$$),
  ('financial_snapshots INSERT', $$INSERT INTO public.financial_snapshots(owner_id,source,assumptions_json) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a','manual-entry','{}')$$),
  ('financial_snapshots UPDATE', $$UPDATE public.financial_snapshots SET assumptions_json = '{"forbidden":true}'$$),
  ('financial_snapshots DELETE', $$DELETE FROM public.financial_snapshots$$),
  ('simulation_runs SELECT', $$SELECT id FROM public.simulation_runs$$),
  ('simulation_runs INSERT', $$INSERT INTO public.simulation_runs(owner_id,snapshot_id,engine_version,route,result_summary_json) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a','d525cfe8-d610-40da-a3e3-000000000101','forbidden','simulator','{}')$$),
  ('simulation_runs UPDATE', $$UPDATE public.simulation_runs SET engine_version = 'forbidden'$$),
  ('simulation_runs DELETE', $$DELETE FROM public.simulation_runs$$),
  ('learning_progress SELECT', $$SELECT id FROM public.learning_progress$$),
  ('learning_progress INSERT', $$INSERT INTO public.learning_progress(owner_id) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a')$$),
  ('learning_progress UPDATE', $$UPDATE public.learning_progress SET completed_lessons_json = '["forbidden"]'$$),
  ('learning_progress DELETE', $$DELETE FROM public.learning_progress$$),
  ('export_records SELECT', $$SELECT id FROM public.export_records$$),
  ('export_records INSERT', $$INSERT INTO public.export_records(owner_id,export_kind) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a','report')$$),
  ('export_records UPDATE', $$UPDATE public.export_records SET metadata_json = '{"forbidden":true}'$$),
  ('export_records DELETE', $$DELETE FROM public.export_records$$),
  ('audit_events SELECT', $$SELECT id FROM public.audit_events$$),
  ('audit_events INSERT', $$INSERT INTO public.audit_events(owner_id,event_type) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a','forbidden')$$),
  ('audit_events UPDATE', $$UPDATE public.audit_events SET event_type = 'forbidden'$$),
  ('audit_events DELETE', $$DELETE FROM public.audit_events$$)
) q(label,sql) ORDER BY q.label;
SELECT throws_ok($$SELECT public.sync_interestshield_snapshot('permission-null-snapshot','permission-null-operation',1::bigint,1,'{"contract_version":1,"storage":[{"key":"interestshield-theme","value":"light"}]}','d525cfe8-d610-40da-a3e3-00000000000a',NULL)$$, '42501', NULL, 'anon RPC execution denied');
RESET ROLE;

-- coverage: null_jwt = 27 (2 context + 6 reads + 18 mutations + 1 RPC).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SELECT is(current_user::text, 'authenticated', 'null JWT current_user');
SELECT is(auth.uid(), NULL::uuid, 'both JWT sources cleared');
SELECT results_eq(format('SELECT id FROM public.%I ORDER BY id', t.table_name), ARRAY[]::uuid[], 'null JWT empty ' || t.table_name)
FROM (VALUES ('profiles'), ('financial_snapshots'), ('simulation_runs'), ('learning_progress'), ('export_records'), ('audit_events')) t(table_name) ORDER BY t.table_name;
SELECT throws_ok(q.sql, '42501', NULL, 'null JWT ' || q.label) FROM (VALUES
  ('profiles INSERT', $$INSERT INTO public.profiles(id) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a')$$),
  ('profiles UPDATE', $$UPDATE public.profiles SET display_name = 'forbidden' WHERE id = 'd525cfe8-d610-40da-a3e3-00000000000a'$$),
  ('profiles DELETE', $$DELETE FROM public.profiles WHERE id = 'd525cfe8-d610-40da-a3e3-00000000000a'$$),
  ('snapshots INSERT', $$INSERT INTO public.financial_snapshots(owner_id,source,assumptions_json) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a','manual-entry','{}')$$),
  ('snapshots UPDATE', $$UPDATE public.financial_snapshots SET assumptions_json = '{"forbidden":true}' WHERE owner_id = 'd525cfe8-d610-40da-a3e3-00000000000a'$$),
  ('snapshots DELETE', $$DELETE FROM public.financial_snapshots WHERE owner_id = 'd525cfe8-d610-40da-a3e3-00000000000a'$$),
  ('audit INSERT', $$INSERT INTO public.audit_events(owner_id,event_type) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a','forbidden')$$),
  ('audit UPDATE', $$UPDATE public.audit_events SET event_type = 'forbidden' WHERE owner_id = 'd525cfe8-d610-40da-a3e3-00000000000a'$$),
  ('audit DELETE', $$DELETE FROM public.audit_events WHERE owner_id = 'd525cfe8-d610-40da-a3e3-00000000000a'$$),
  ('simulation INSERT', $$INSERT INTO public.simulation_runs(owner_id,snapshot_id,engine_version,route,result_summary_json) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a','d525cfe8-d610-40da-a3e3-000000000101','forbidden','simulator','{}')$$),
  ('export INSERT', $$INSERT INTO public.export_records(owner_id,export_kind) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a','report')$$),
  ('learning INSERT', $$INSERT INTO public.learning_progress(owner_id) VALUES ('d525cfe8-d610-40da-a3e3-00000000000a')$$),
  ('simulation UPDATE', $$UPDATE public.simulation_runs SET engine_version = 'forbidden'$$),
  ('export UPDATE', $$UPDATE public.export_records SET metadata_json = '{"forbidden":true}'$$)
) q(label,sql) ORDER BY q.label;
-- Mutations use top-level CTEs, not pgTAP's read-only results_eq cursors.
WITH changed AS (DELETE FROM public.simulation_runs RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'null JWT simulation DELETE zero');
WITH changed AS (DELETE FROM public.export_records RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'null JWT export DELETE zero');
WITH changed AS (DELETE FROM public.learning_progress RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'null JWT learning DELETE zero');
WITH changed AS (UPDATE public.learning_progress SET completed_lessons_json = '["forbidden"]' RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'null JWT learning UPDATE zero');
SELECT throws_ok($$SELECT public.sync_interestshield_snapshot('permission-null-snapshot','permission-null-operation',1::bigint,1,'{"contract_version":1,"storage":[{"key":"interestshield-theme","value":"light"}]}','d525cfe8-d610-40da-a3e3-00000000000a',NULL)$$, '28000', 'Snapshot sync requires an authenticated owner.', 'null JWT RPC rejects before writes');
RESET ROLE;

-- coverage: owner_a = 52 (3 context + 6 reads + 20 revoked writes + 14 run/export + 8 learning + 1 RPC).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd525cfe8-d610-40da-a3e3-00000000000a', true);
SELECT set_config('request.jwt.claims', '{"sub":"d525cfe8-d610-40da-a3e3-00000000000a","role":"authenticated"}', true);
SELECT set_config('test.other', 'd525cfe8-d610-40da-a3e3-00000000000b', true);
SELECT set_config('test.snapshot', 'd525cfe8-d610-40da-a3e3-000000000101', true);
SELECT set_config('test.foreign_snapshot', 'd525cfe8-d610-40da-a3e3-000000000102', true);
SELECT is(current_user::text, 'authenticated', 'A current_user');
SELECT is(auth.uid(), 'd525cfe8-d610-40da-a3e3-00000000000a'::uuid, 'A auth.uid');
SELECT is(current_setting('request.jwt.claims')::jsonb ->> 'sub', current_setting('request.jwt.claim.sub'), 'A both claims agree');
SELECT results_eq(format('SELECT id FROM public.%I ORDER BY id', t.table_name), ARRAY[t.id::uuid], 'A exact own ID only ' || t.table_name)
FROM (VALUES
  ('profiles','d525cfe8-d610-40da-a3e3-00000000000a'), ('financial_snapshots','d525cfe8-d610-40da-a3e3-000000000101'),
  ('simulation_runs','d525cfe8-d610-40da-a3e3-000000000201'), ('learning_progress','d525cfe8-d610-40da-a3e3-000000000301'),
  ('export_records','d525cfe8-d610-40da-a3e3-000000000401'), ('audit_events','d525cfe8-d610-40da-a3e3-000000000501')
) t(table_name,id) ORDER BY t.table_name;
SELECT throws_ok(q.sql, '42501', NULL, 'A ' || q.label) FROM (VALUES
  ('own profiles INSERT', $$INSERT INTO public.profiles(id) VALUES (auth.uid())$$),
  ('own profiles UPDATE', $$UPDATE public.profiles SET display_name = 'forbidden' WHERE id = auth.uid()$$),
  ('own profiles DELETE', $$DELETE FROM public.profiles WHERE id = auth.uid()$$),
  ('own snapshots INSERT', $$INSERT INTO public.financial_snapshots(owner_id,source,assumptions_json) VALUES (auth.uid(),'manual-entry','{}')$$),
  ('own snapshots UPDATE', $$UPDATE public.financial_snapshots SET assumptions_json = '{"forbidden":true}' WHERE owner_id = auth.uid()$$),
  ('own snapshots DELETE', $$DELETE FROM public.financial_snapshots WHERE owner_id = auth.uid()$$),
  ('own audit INSERT', $$INSERT INTO public.audit_events(owner_id,event_type) VALUES (auth.uid(),'forbidden')$$),
  ('own audit UPDATE', $$UPDATE public.audit_events SET event_type = 'forbidden' WHERE owner_id = auth.uid()$$),
  ('own audit DELETE', $$DELETE FROM public.audit_events WHERE owner_id = auth.uid()$$),
  ('foreign profiles INSERT', $$INSERT INTO public.profiles(id) VALUES (current_setting('test.other')::uuid)$$),
  ('foreign profiles UPDATE', $$UPDATE public.profiles SET display_name = 'forbidden' WHERE id = current_setting('test.other')::uuid$$),
  ('foreign profiles DELETE', $$DELETE FROM public.profiles WHERE id = current_setting('test.other')::uuid$$),
  ('foreign snapshots INSERT', $$INSERT INTO public.financial_snapshots(owner_id,source,assumptions_json) VALUES (current_setting('test.other')::uuid,'manual-entry','{}')$$),
  ('foreign snapshots UPDATE', $$UPDATE public.financial_snapshots SET assumptions_json = '{"forbidden":true}' WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign snapshots DELETE', $$DELETE FROM public.financial_snapshots WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign audit INSERT', $$INSERT INTO public.audit_events(owner_id,event_type) VALUES (current_setting('test.other')::uuid,'forbidden')$$),
  ('foreign audit UPDATE', $$UPDATE public.audit_events SET event_type = 'forbidden' WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign audit DELETE', $$DELETE FROM public.audit_events WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign simulation UPDATE', $$UPDATE public.simulation_runs SET engine_version = 'forbidden' WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign export UPDATE', $$UPDATE public.export_records SET metadata_json = '{"forbidden":true}' WHERE owner_id = current_setting('test.other')::uuid$$)
) q(label,sql) ORDER BY q.label;
WITH changed AS (INSERT INTO public.simulation_runs(id,owner_id,snapshot_id,engine_version,route,result_summary_json) VALUES ('d525cfe8-d610-40da-a3e3-000000000211',auth.uid(),current_setting('test.snapshot')::uuid,'permission-positive','simulator','{}') RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000211'::uuid], 'A own simulation INSERT');
WITH changed AS (DELETE FROM public.simulation_runs WHERE owner_id = current_setting('test.other')::uuid RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'A foreign simulation DELETE zero');
SELECT throws_ok($$UPDATE public.simulation_runs SET engine_version = 'forbidden' WHERE owner_id = auth.uid()$$, '42501', NULL, 'A own simulation UPDATE denied');
SELECT throws_ok($$INSERT INTO public.simulation_runs(owner_id,snapshot_id,engine_version,route,result_summary_json) VALUES (current_setting('test.other')::uuid,current_setting('test.foreign_snapshot')::uuid,'forbidden','simulator','{}')$$, '42501', NULL, 'A foreign-owner simulation INSERT');
SELECT throws_ok($$INSERT INTO public.simulation_runs(owner_id,snapshot_id,engine_version,route,result_summary_json) VALUES (auth.uid(),current_setting('test.foreign_snapshot')::uuid,'forbidden','simulator','{}')$$, '23503', NULL, 'A own simulation foreign snapshot FK');
WITH changed AS (DELETE FROM public.simulation_runs WHERE id = 'd525cfe8-d610-40da-a3e3-000000000211' RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000211'::uuid], 'A own simulation DELETE');
WITH changed AS (INSERT INTO public.export_records(id,owner_id,snapshot_id,export_kind) VALUES ('d525cfe8-d610-40da-a3e3-000000000411',auth.uid(),current_setting('test.snapshot')::uuid,'report') RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000411'::uuid], 'A own export INSERT');
WITH changed AS (DELETE FROM public.export_records WHERE owner_id = current_setting('test.other')::uuid RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'A foreign export DELETE zero');
SELECT throws_ok($$UPDATE public.export_records SET metadata_json = '{"forbidden":true}' WHERE owner_id = auth.uid()$$, '42501', NULL, 'A own export UPDATE denied');
SELECT throws_ok($$INSERT INTO public.export_records(owner_id,snapshot_id,export_kind) VALUES (current_setting('test.other')::uuid,current_setting('test.foreign_snapshot')::uuid,'report')$$, '42501', NULL, 'A foreign-owner export INSERT');
SELECT throws_ok($$INSERT INTO public.export_records(owner_id,snapshot_id,export_kind) VALUES (auth.uid(),current_setting('test.foreign_snapshot')::uuid,'report')$$, '23503', NULL, 'A own export foreign snapshot FK');
WITH changed AS (DELETE FROM public.export_records WHERE id = 'd525cfe8-d610-40da-a3e3-000000000411' RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000411'::uuid], 'A own export DELETE');
WITH changed AS (INSERT INTO public.export_records(id,owner_id,snapshot_id,export_kind) VALUES ('d525cfe8-d610-40da-a3e3-000000000421',auth.uid(),NULL,'report') RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000421'::uuid], 'A NULL snapshot export allowed');
WITH changed AS (DELETE FROM public.export_records WHERE id = 'd525cfe8-d610-40da-a3e3-000000000421' AND snapshot_id IS NULL RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000421'::uuid], 'A NULL export persisted and deleted');
WITH changed AS (UPDATE public.learning_progress SET completed_lessons_json = '["permission-check"]' WHERE owner_id = auth.uid() RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000301'::uuid], 'A own learning UPDATE');
SELECT is((SELECT completed_lessons_json FROM public.learning_progress), '["permission-check"]'::jsonb, 'A learning UPDATE payload');
WITH changed AS (UPDATE public.learning_progress SET completed_lessons_json = '["forbidden"]' WHERE owner_id = current_setting('test.other')::uuid RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'A foreign learning UPDATE zero');
WITH changed AS (DELETE FROM public.learning_progress WHERE owner_id = current_setting('test.other')::uuid RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'A foreign learning DELETE zero');
SELECT throws_ok($$UPDATE public.learning_progress SET owner_id = current_setting('test.other')::uuid WHERE owner_id = auth.uid()$$, '42501', NULL, 'A learning ownership transfer denied');
SELECT throws_ok($$INSERT INTO public.learning_progress(owner_id) VALUES (current_setting('test.other')::uuid)$$, '42501', NULL, 'A foreign learning INSERT');
WITH changed AS (DELETE FROM public.learning_progress WHERE owner_id = auth.uid() RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000301'::uuid], 'A own learning DELETE');
WITH changed AS (INSERT INTO public.learning_progress(id,owner_id) VALUES ('d525cfe8-d610-40da-a3e3-000000000301',auth.uid()) RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000301'::uuid], 'A own learning INSERT restores fixture');
SELECT throws_ok($$SELECT public.sync_interestshield_snapshot('permission-a-snapshot','permission-a-operation',1::bigint,1,'{"contract_version":1,"storage":[{"key":"interestshield-theme","value":"light"}]}',current_setting('test.other')::uuid,NULL)$$, '42501', 'Snapshot sync stopped because the authenticated owner changed.', 'A RPC expected-owner mismatch');
RESET ROLE;

-- coverage: owner_b = 52 (same independent assertions with A/B reversed).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd525cfe8-d610-40da-a3e3-00000000000b', true);
SELECT set_config('request.jwt.claims', '{"sub":"d525cfe8-d610-40da-a3e3-00000000000b","role":"authenticated"}', true);
SELECT set_config('test.other', 'd525cfe8-d610-40da-a3e3-00000000000a', true);
SELECT set_config('test.snapshot', 'd525cfe8-d610-40da-a3e3-000000000102', true);
SELECT set_config('test.foreign_snapshot', 'd525cfe8-d610-40da-a3e3-000000000101', true);
SELECT is(current_user::text, 'authenticated', 'B current_user');
SELECT is(auth.uid(), 'd525cfe8-d610-40da-a3e3-00000000000b'::uuid, 'B auth.uid');
SELECT is(current_setting('request.jwt.claims')::jsonb ->> 'sub', current_setting('request.jwt.claim.sub'), 'B both claims agree');
SELECT results_eq(format('SELECT id FROM public.%I ORDER BY id', t.table_name), ARRAY[t.id::uuid], 'B exact own ID only ' || t.table_name)
FROM (VALUES
  ('profiles','d525cfe8-d610-40da-a3e3-00000000000b'), ('financial_snapshots','d525cfe8-d610-40da-a3e3-000000000102'),
  ('simulation_runs','d525cfe8-d610-40da-a3e3-000000000202'), ('learning_progress','d525cfe8-d610-40da-a3e3-000000000302'),
  ('export_records','d525cfe8-d610-40da-a3e3-000000000402'), ('audit_events','d525cfe8-d610-40da-a3e3-000000000502')
) t(table_name,id) ORDER BY t.table_name;
SELECT throws_ok(q.sql, '42501', NULL, 'B ' || q.label) FROM (VALUES
  ('own profiles INSERT', $$INSERT INTO public.profiles(id) VALUES (auth.uid())$$),
  ('own profiles UPDATE', $$UPDATE public.profiles SET display_name = 'forbidden' WHERE id = auth.uid()$$),
  ('own profiles DELETE', $$DELETE FROM public.profiles WHERE id = auth.uid()$$),
  ('own snapshots INSERT', $$INSERT INTO public.financial_snapshots(owner_id,source,assumptions_json) VALUES (auth.uid(),'manual-entry','{}')$$),
  ('own snapshots UPDATE', $$UPDATE public.financial_snapshots SET assumptions_json = '{"forbidden":true}' WHERE owner_id = auth.uid()$$),
  ('own snapshots DELETE', $$DELETE FROM public.financial_snapshots WHERE owner_id = auth.uid()$$),
  ('own audit INSERT', $$INSERT INTO public.audit_events(owner_id,event_type) VALUES (auth.uid(),'forbidden')$$),
  ('own audit UPDATE', $$UPDATE public.audit_events SET event_type = 'forbidden' WHERE owner_id = auth.uid()$$),
  ('own audit DELETE', $$DELETE FROM public.audit_events WHERE owner_id = auth.uid()$$),
  ('foreign profiles INSERT', $$INSERT INTO public.profiles(id) VALUES (current_setting('test.other')::uuid)$$),
  ('foreign profiles UPDATE', $$UPDATE public.profiles SET display_name = 'forbidden' WHERE id = current_setting('test.other')::uuid$$),
  ('foreign profiles DELETE', $$DELETE FROM public.profiles WHERE id = current_setting('test.other')::uuid$$),
  ('foreign snapshots INSERT', $$INSERT INTO public.financial_snapshots(owner_id,source,assumptions_json) VALUES (current_setting('test.other')::uuid,'manual-entry','{}')$$),
  ('foreign snapshots UPDATE', $$UPDATE public.financial_snapshots SET assumptions_json = '{"forbidden":true}' WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign snapshots DELETE', $$DELETE FROM public.financial_snapshots WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign audit INSERT', $$INSERT INTO public.audit_events(owner_id,event_type) VALUES (current_setting('test.other')::uuid,'forbidden')$$),
  ('foreign audit UPDATE', $$UPDATE public.audit_events SET event_type = 'forbidden' WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign audit DELETE', $$DELETE FROM public.audit_events WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign simulation UPDATE', $$UPDATE public.simulation_runs SET engine_version = 'forbidden' WHERE owner_id = current_setting('test.other')::uuid$$),
  ('foreign export UPDATE', $$UPDATE public.export_records SET metadata_json = '{"forbidden":true}' WHERE owner_id = current_setting('test.other')::uuid$$)
) q(label,sql) ORDER BY q.label;
WITH changed AS (INSERT INTO public.simulation_runs(id,owner_id,snapshot_id,engine_version,route,result_summary_json) VALUES ('d525cfe8-d610-40da-a3e3-000000000212',auth.uid(),current_setting('test.snapshot')::uuid,'permission-positive','simulator','{}') RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000212'::uuid], 'B own simulation INSERT');
WITH changed AS (DELETE FROM public.simulation_runs WHERE owner_id = current_setting('test.other')::uuid RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'B foreign simulation DELETE zero');
SELECT throws_ok($$UPDATE public.simulation_runs SET engine_version = 'forbidden' WHERE owner_id = auth.uid()$$, '42501', NULL, 'B own simulation UPDATE denied');
SELECT throws_ok($$INSERT INTO public.simulation_runs(owner_id,snapshot_id,engine_version,route,result_summary_json) VALUES (current_setting('test.other')::uuid,current_setting('test.foreign_snapshot')::uuid,'forbidden','simulator','{}')$$, '42501', NULL, 'B foreign-owner simulation INSERT');
SELECT throws_ok($$INSERT INTO public.simulation_runs(owner_id,snapshot_id,engine_version,route,result_summary_json) VALUES (auth.uid(),current_setting('test.foreign_snapshot')::uuid,'forbidden','simulator','{}')$$, '23503', NULL, 'B own simulation foreign snapshot FK');
WITH changed AS (DELETE FROM public.simulation_runs WHERE id = 'd525cfe8-d610-40da-a3e3-000000000212' RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000212'::uuid], 'B own simulation DELETE');
WITH changed AS (INSERT INTO public.export_records(id,owner_id,snapshot_id,export_kind) VALUES ('d525cfe8-d610-40da-a3e3-000000000412',auth.uid(),current_setting('test.snapshot')::uuid,'report') RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000412'::uuid], 'B own export INSERT');
WITH changed AS (DELETE FROM public.export_records WHERE owner_id = current_setting('test.other')::uuid RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'B foreign export DELETE zero');
SELECT throws_ok($$UPDATE public.export_records SET metadata_json = '{"forbidden":true}' WHERE owner_id = auth.uid()$$, '42501', NULL, 'B own export UPDATE denied');
SELECT throws_ok($$INSERT INTO public.export_records(owner_id,snapshot_id,export_kind) VALUES (current_setting('test.other')::uuid,current_setting('test.foreign_snapshot')::uuid,'report')$$, '42501', NULL, 'B foreign-owner export INSERT');
SELECT throws_ok($$INSERT INTO public.export_records(owner_id,snapshot_id,export_kind) VALUES (auth.uid(),current_setting('test.foreign_snapshot')::uuid,'report')$$, '23503', NULL, 'B own export foreign snapshot FK');
WITH changed AS (DELETE FROM public.export_records WHERE id = 'd525cfe8-d610-40da-a3e3-000000000412' RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000412'::uuid], 'B own export DELETE');
WITH changed AS (INSERT INTO public.export_records(id,owner_id,snapshot_id,export_kind) VALUES ('d525cfe8-d610-40da-a3e3-000000000422',auth.uid(),NULL,'report') RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000422'::uuid], 'B NULL snapshot export allowed');
WITH changed AS (DELETE FROM public.export_records WHERE id = 'd525cfe8-d610-40da-a3e3-000000000422' AND snapshot_id IS NULL RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000422'::uuid], 'B NULL export persisted and deleted');
WITH changed AS (UPDATE public.learning_progress SET completed_lessons_json = '["permission-check"]' WHERE owner_id = auth.uid() RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000302'::uuid], 'B own learning UPDATE');
SELECT is((SELECT completed_lessons_json FROM public.learning_progress), '["permission-check"]'::jsonb, 'B learning UPDATE payload');
WITH changed AS (UPDATE public.learning_progress SET completed_lessons_json = '["forbidden"]' WHERE owner_id = current_setting('test.other')::uuid RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'B foreign learning UPDATE zero');
WITH changed AS (DELETE FROM public.learning_progress WHERE owner_id = current_setting('test.other')::uuid RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY[]::uuid[], 'B foreign learning DELETE zero');
SELECT throws_ok($$UPDATE public.learning_progress SET owner_id = current_setting('test.other')::uuid WHERE owner_id = auth.uid()$$, '42501', NULL, 'B learning ownership transfer denied');
SELECT throws_ok($$INSERT INTO public.learning_progress(owner_id) VALUES (current_setting('test.other')::uuid)$$, '42501', NULL, 'B foreign learning INSERT');
WITH changed AS (DELETE FROM public.learning_progress WHERE owner_id = auth.uid() RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000302'::uuid], 'B own learning DELETE');
WITH changed AS (INSERT INTO public.learning_progress(id,owner_id) VALUES ('d525cfe8-d610-40da-a3e3-000000000302',auth.uid()) RETURNING id)
SELECT is(ARRAY(SELECT id FROM changed ORDER BY id), ARRAY['d525cfe8-d610-40da-a3e3-000000000302'::uuid], 'B own learning INSERT restores fixture');
SELECT throws_ok($$SELECT public.sync_interestshield_snapshot('permission-b-snapshot','permission-b-operation',1::bigint,1,'{"contract_version":1,"storage":[{"key":"interestshield-theme","value":"light"}]}',current_setting('test.other')::uuid,NULL)$$, '42501', 'Snapshot sync stopped because the authenticated owner changed.', 'B RPC expected-owner mismatch');
RESET ROLE;

-- coverage: admin_end = 7 (1 context + 6 complete row/payload comparisons).
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SELECT ok(current_user = session_user AND (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user), 'administrator restored');
-- Positive temporary rows were deleted and learning was restored with transaction-stable now().
-- Equality covers all columns, IDs, ownership, extra inserts and any untouched rows.
SELECT results_eq(format('SELECT to_jsonb(t) FROM public.%I t ORDER BY id', t.table_name),
  format('SELECT value FROM jsonb_array_elements(current_setting(%L)::jsonb) WITH ORDINALITY AS expected(value, ordinal) ORDER BY ordinal', 'test.before.' || t.table_name),
  'admin all rows unchanged: no forbidden inserts/updates/deletes in ' || t.table_name)
FROM (VALUES ('profiles'), ('financial_snapshots'), ('simulation_runs'), ('learning_progress'), ('export_records'), ('audit_events')) t(table_name) ORDER BY t.table_name;
SELECT * FROM finish();
ROLLBACK;
