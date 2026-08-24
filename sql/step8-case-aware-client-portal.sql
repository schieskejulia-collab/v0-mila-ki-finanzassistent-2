-- Schritt 8: Mandantenportal fest mit einem Mila-Vorgang verbinden.
-- Dadurch bleiben Nachreichungen und Antworten im selben Arbeitsstand wie
-- Eingang, Rückfragen, Dokumentenmappe und Übergabe.

alter table public.client_upload_links
  add column if not exists case_id uuid references public.mila_intake_cases(id) on delete cascade;

alter table public.client_questions
  add column if not exists case_id uuid references public.mila_intake_cases(id) on delete cascade;

create index if not exists client_upload_links_case_idx
  on public.client_upload_links (user_id, client_id, case_id, active, created_at desc);

create index if not exists client_questions_case_idx
  on public.client_questions (user_id, client_id, case_id, status, created_at desc);

-- Ein Portal-Link darf nur auf einen Vorgang desselben Eigentümers zeigen.
create or replace function public.client_portal_case_owner_matches()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.case_id is not null and not exists (
    select 1 from public.mila_intake_cases c
    where c.id = new.case_id
      and c.user_id = new.user_id
      and c.client_id::text = new.client_id
  ) then
    raise exception 'portal case owner mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists client_upload_links_case_owner_check on public.client_upload_links;
create trigger client_upload_links_case_owner_check
before insert or update on public.client_upload_links
for each row execute function public.client_portal_case_owner_matches();

drop trigger if exists client_questions_case_owner_check on public.client_questions;
create trigger client_questions_case_owner_check
before insert or update on public.client_questions
for each row execute function public.client_portal_case_owner_matches();
