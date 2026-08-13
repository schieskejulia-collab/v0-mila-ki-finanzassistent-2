-- Mila Case Loop: Rückfragen, Antworten, Notizen und Übergabe
create table if not exists public.mila_case_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.mila_intake_cases(id) on delete cascade,
  kind text not null check (kind in ('question','answer','note','handoff')),
  content text not null,
  status text not null default 'open' check (status in ('open','waiting','done')),
  created_at timestamptz not null default now()
);
alter table public.mila_case_updates enable row level security;
drop policy if exists "Users manage own Mila case updates" on public.mila_case_updates;
create policy "Users manage own Mila case updates" on public.mila_case_updates for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index if not exists mila_case_updates_case_idx on public.mila_case_updates (user_id, case_id, created_at desc);
alter table public.mila_intake_cases add column if not exists handoff_summary text;
alter table public.mila_intake_cases add column if not exists handoff_ready boolean not null default false;
alter table public.mila_intake_cases add column if not exists completed_at timestamptz;
create or replace function public.mila_case_owner_matches() returns trigger language plpgsql security invoker set search_path = public as $$ begin if not exists (select 1 from public.mila_intake_cases c where c.id = new.case_id and c.user_id = new.user_id) then raise exception 'case owner mismatch'; end if; return new; end; $$;
drop trigger if exists mila_case_updates_owner_check on public.mila_case_updates;
create trigger mila_case_updates_owner_check before insert or update on public.mila_case_updates for each row execute function public.mila_case_owner_matches();