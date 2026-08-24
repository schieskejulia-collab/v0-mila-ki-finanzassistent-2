-- Mila: Der Übernahmebestand gehört dauerhaft zur Akte, nicht nur zu einem Gerät.

create table if not exists public.mila_client_takeovers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  start_date date not null,
  period_start date not null,
  existing_files text not null check (existing_files in ('yes', 'no', 'unknown')),
  completeness text not null check (completeness in ('yes', 'no', 'unknown')),
  handoff_rhythm text not null check (handoff_rhythm in ('kanzlei', 'monthly', 'quarterly', 'halfyear', 'yearly', 'individual')),
  note text,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists mila_client_takeovers_user_client_idx
  on public.mila_client_takeovers (user_id, client_id);

alter table public.mila_client_takeovers enable row level security;

grant select, insert, update, delete on table public.mila_client_takeovers to authenticated;

drop policy if exists mila_client_takeovers_select_own on public.mila_client_takeovers;
create policy mila_client_takeovers_select_own
  on public.mila_client_takeovers for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists mila_client_takeovers_insert_own on public.mila_client_takeovers;
create policy mila_client_takeovers_insert_own
  on public.mila_client_takeovers for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.clients
      where clients.id = mila_client_takeovers.client_id
        and clients.user_id = (select auth.uid())
    )
  );

drop policy if exists mila_client_takeovers_update_own on public.mila_client_takeovers;
create policy mila_client_takeovers_update_own
  on public.mila_client_takeovers for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.clients
      where clients.id = mila_client_takeovers.client_id
        and clients.user_id = (select auth.uid())
    )
  );

drop policy if exists mila_client_takeovers_delete_own on public.mila_client_takeovers;
create policy mila_client_takeovers_delete_own
  on public.mila_client_takeovers for delete to authenticated
  using ((select auth.uid()) = user_id);
