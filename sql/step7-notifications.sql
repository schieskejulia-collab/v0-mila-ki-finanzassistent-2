create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id text,
  type text not null check (type in ('antwort','upload','info')),
  title text not null,
  message text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

create index if not exists notifications_user_client_idx
  on public.notifications (user_id, client_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.notify_client_question_answered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'beantwortet'
     and (old.status is distinct from new.status or old.answer is distinct from new.answer) then
    insert into public.notifications (user_id, client_id, type, title, message, href)
    values (
      new.user_id,
      new.client_id,
      'antwort',
      'Neue Antwort vom Mandanten',
      left(coalesce(new.question, 'Eine Rückfrage wurde beantwortet.'), 220),
      '/rueckfragen'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_client_question_answered on public.client_questions;
create trigger trg_notify_client_question_answered
after update on public.client_questions
for each row
execute function public.notify_client_question_answered();

create or replace function public.notify_client_document_uploaded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.note, '') ilike 'Vom Mandanten%' then
    insert into public.notifications (user_id, client_id, type, title, message, href)
    values (
      new.user_id,
      new.client_id,
      'upload',
      'Neue Unterlage vom Mandanten',
      left(coalesce(new.title, new.file_name, 'Neue Unterlage'), 220),
      '/dokumente'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_client_document_uploaded on public.documents;
create trigger trg_notify_client_document_uploaded
after insert on public.documents
for each row
execute function public.notify_client_document_uploaded();
