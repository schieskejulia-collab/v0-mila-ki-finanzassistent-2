create table if not exists public.client_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  client_id text not null,
  document_id text,
  question text not null,
  answer text,
  status text not null default 'offen' check (status in ('offen','beantwortet','erledigt')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  completed_at timestamptz
);

create index if not exists client_questions_user_client_idx
  on public.client_questions (user_id, client_id, status, created_at desc);

alter table public.client_questions enable row level security;

create policy "client_questions_select_own" on public.client_questions
for select to authenticated using (auth.uid() = user_id);
create policy "client_questions_insert_own" on public.client_questions
for insert to authenticated with check (auth.uid() = user_id);
create policy "client_questions_update_own" on public.client_questions
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "client_questions_delete_own" on public.client_questions
for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.client_upload_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  client_id text not null,
  token uuid not null default gen_random_uuid() unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists client_upload_links_user_client_idx
  on public.client_upload_links (user_id, client_id);

alter table public.client_upload_links enable row level security;

create policy "client_upload_links_own" on public.client_upload_links
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
