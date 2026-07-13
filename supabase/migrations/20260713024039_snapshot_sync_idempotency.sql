alter table public.financial_snapshots
  add column idempotency_key text;

alter table public.financial_snapshots
  add constraint financial_snapshots_handoff_idempotency_key_check
  check (
    (source = 'local-demo-handoff' and idempotency_key is not null and length(btrim(idempotency_key)) >= 16)
    or source <> 'local-demo-handoff'
  );

alter table public.financial_snapshots
  add constraint financial_snapshots_owner_idempotency_key_unique
  unique (owner_id, idempotency_key);
