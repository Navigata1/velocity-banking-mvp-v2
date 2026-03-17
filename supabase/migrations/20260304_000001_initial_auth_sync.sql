create extension if not exists pgcrypto;

-- profiles table
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  name text,
  currency text default 'USD',
  created_at timestamptz default now()
);

-- portfolio state
create table if not exists portfolio_state (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null unique,
  data_json jsonb not null default '{}',
  schema_version int default 1,
  updated_at timestamptz default now()
);

-- preferences state
create table if not exists preferences_state (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null unique,
  data_json jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- gamification events
create table if not exists gamification_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  event_type text not null,
  event_data jsonb default '{}',
  created_at timestamptz default now()
);

-- RLS policies
alter table profiles enable row level security;
alter table portfolio_state enable row level security;
alter table preferences_state enable row level security;
alter table gamification_events enable row level security;

drop policy if exists "Users own their profile" on profiles;
drop policy if exists "Users own their portfolio" on portfolio_state;
drop policy if exists "Users own their preferences" on preferences_state;
drop policy if exists "Users own their events" on gamification_events;

create policy "Users own their profile" on profiles for all using (auth.uid() = user_id);
create policy "Users own their portfolio" on portfolio_state for all using (profile_id in (select id from profiles where user_id = auth.uid()));
create policy "Users own their preferences" on preferences_state for all using (profile_id in (select id from profiles where user_id = auth.uid()));
create policy "Users own their events" on gamification_events for all using (profile_id in (select id from profiles where user_id = auth.uid()));

