-- Mila Intake + Triage + Coordination
-- Erweiterung fuer Telefon, E-Mail, Upload und manuelle Eingaben.
-- Fachliche Entscheidungen bleiben beim Menschen/Kanzleiinhaber.

create extension if not exists pgcrypto;

create table if not exists public.mila_intake_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'manual' check (source in ('phone','email','upload','form','manual')),
  caller_name text,
  company text,
  phone text,
  email text,
  subject text not null,
  summary text not null default '',
  urgency text not null default 'normal' check (urgency in ('low','normal','high','critical')),
  category text not null default 'other',
  status text not null default 'new' check (status in ('new','needs_info','standard','human_review','in_progress','waiting','done')),
  assigned_to text,
  due_at timestamptz,
  requires_human boolean not null default true,
  sensitive boolean not null default false,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mila_coordination_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.mila_intake_cases(id) on delete cascade,
  title text not null,
  contact_name text,
  contact_channel text,
  goal text,
  status text not null default 'open' check (status in ('open','waiting','blocked','done')),
  due_at timestamptz,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mila_intake_cases enable row level security;
alter table public.mila_coordination_tasks enable row level security;

drop policy if exists "Users manage own Mila intake cases" on public.mila_intake_cases;
create policy "Users manage own Mila intake cases"
on public.mila_intake_cases
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own Mila coordination tasks" on public.mila_coordination_tasks;
create policy "Users manage own Mila coordination tasks"
on public.mila_coordination_tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists mila_intake_cases_user_status_idx
  on public.mila_intake_cases (user_id, status, created_at desc);

create index if not exists mila_intake_cases_user_urgency_idx
  on public.mila_intake_cases (user_id, urgency, due_at);

create index if not exists mila_coordination_tasks_user_status_idx
  on public.mila_coordination_tasks (user_id, status, due_at);

create or replace function public.set_mila_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mila_intake_cases_set_updated_at on public.mila_intake_cases;
create trigger mila_intake_cases_set_updated_at
before update on public.mila_intake_cases
for each row execute function public.set_mila_updated_at();

drop trigger if exists mila_coordination_tasks_set_updated_at on public.mila_coordination_tasks;
create trigger mila_coordination_tasks_set_updated_at
before update on public.mila_coordination_tasks
for each row execute function public.set_mila_updated_at();
