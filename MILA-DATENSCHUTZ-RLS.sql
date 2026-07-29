-- Mila Datenschutz-Basis für Supabase
-- Erst im Supabase SQL Editor ausführen, wenn die genannten Tabellen existieren.
-- Ziel: Jede Nutzerin sieht und verändert ausschließlich eigene Datensätze.

alter table public.expenses enable row level security;
alter table public.incomes enable row level security;
alter table public.obligations enable row level security;
alter table public.goals enable row level security;
alter table public.merchant_memory enable row level security;

drop policy if exists "expenses_select_own" on public.expenses;
drop policy if exists "expenses_insert_own" on public.expenses;
drop policy if exists "expenses_update_own" on public.expenses;
drop policy if exists "expenses_delete_own" on public.expenses;

create policy "expenses_select_own"
on public.expenses for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "expenses_insert_own"
on public.expenses for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "expenses_update_own"
on public.expenses for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "expenses_delete_own"
on public.expenses for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "incomes_select_own" on public.incomes;
drop policy if exists "incomes_insert_own" on public.incomes;
drop policy if exists "incomes_update_own" on public.incomes;
drop policy if exists "incomes_delete_own" on public.incomes;

create policy "incomes_select_own"
on public.incomes for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "incomes_insert_own"
on public.incomes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "incomes_update_own"
on public.incomes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "incomes_delete_own"
on public.incomes for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "obligations_select_own" on public.obligations;
drop policy if exists "obligations_insert_own" on public.obligations;
drop policy if exists "obligations_update_own" on public.obligations;
drop policy if exists "obligations_delete_own" on public.obligations;

create policy "obligations_select_own"
on public.obligations for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "obligations_insert_own"
on public.obligations for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "obligations_update_own"
on public.obligations for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "obligations_delete_own"
on public.obligations for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "goals_select_own" on public.goals;
drop policy if exists "goals_insert_own" on public.goals;
drop policy if exists "goals_update_own" on public.goals;
drop policy if exists "goals_delete_own" on public.goals;

create policy "goals_select_own"
on public.goals for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "goals_insert_own"
on public.goals for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "goals_update_own"
on public.goals for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "goals_delete_own"
on public.goals for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "merchant_memory_select_own" on public.merchant_memory;
drop policy if exists "merchant_memory_insert_own" on public.merchant_memory;
drop policy if exists "merchant_memory_update_own" on public.merchant_memory;
drop policy if exists "merchant_memory_delete_own" on public.merchant_memory;

create policy "merchant_memory_select_own"
on public.merchant_memory for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "merchant_memory_insert_own"
on public.merchant_memory for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "merchant_memory_update_own"
on public.merchant_memory for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "merchant_memory_delete_own"
on public.merchant_memory for delete
to authenticated
using ((select auth.uid()) = user_id);
