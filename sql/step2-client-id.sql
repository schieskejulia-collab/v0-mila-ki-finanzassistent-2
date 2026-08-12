-- Mila Schritt 2: Mandantenzuordnung
-- Kann gefahrlos mehrfach ausgeführt werden.

alter table public.expenses
  add column if not exists client_id text;

alter table public.incomes
  add column if not exists client_id text;

alter table public.obligations
  add column if not exists client_id text;

alter table public.documents
  add column if not exists client_id text;

create index if not exists expenses_user_client_idx
  on public.expenses (user_id, client_id);

create index if not exists incomes_user_client_idx
  on public.incomes (user_id, client_id);

create index if not exists obligations_user_client_idx
  on public.obligations (user_id, client_id);

create index if not exists documents_user_client_idx
  on public.documents (user_id, client_id);
