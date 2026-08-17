-- Mila Core: persistenter Mandanten-Kontext
-- Mandantenbezogene Projekte/Fahrzeuge/Kontakte und bestätigte Muster.

alter table public.mila_intake_cases
  add column if not exists client_id text;

create index if not exists mila_intake_cases_user_client_idx
  on public.mila_intake_cases(user_id, client_id);

create table if not exists public.mila_memory_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  entity_type text not null check (entity_type in ('project','vehicle','contact')),
  name text not null,
  aliases jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id, entity_type, name)
);

create table if not exists public.mila_memory_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  field text not null,
  label text not null,
  value text not null,
  confidence text not null default 'medium' check (confidence in ('low','medium','high')),
  confirmations integer not null default 1 check (confirmations > 0),
  evidence_labels jsonb not null default '[]'::jsonb,
  last_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id, field, value)
);

create index if not exists mila_memory_entities_user_client_idx
  on public.mila_memory_entities(user_id, client_id, entity_type, active);

create index if not exists mila_memory_patterns_user_client_idx
  on public.mila_memory_patterns(user_id, client_id, field);

alter table public.mila_memory_entities enable row level security;
alter table public.mila_memory_patterns enable row level security;

drop policy if exists "mila_memory_entities_owner_all" on public.mila_memory_entities;
create policy "mila_memory_entities_owner_all"
  on public.mila_memory_entities
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "mila_memory_patterns_owner_all" on public.mila_memory_patterns;
create policy "mila_memory_patterns_owner_all"
  on public.mila_memory_patterns
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
