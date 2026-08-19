-- Mila: Jede Unterlage gehört optional zu genau einem Vorgang.
-- Die aktive Akte bleibt über client_id erhalten; case_id stellt die direkte
-- Rückverfolgbarkeit vom Dokument zum Sachverhalt her.

alter table public.documents
  add column if not exists case_id uuid
  references public.mila_intake_cases(id)
  on delete set null;

create index if not exists documents_user_client_case_idx
  on public.documents (user_id, client_id, case_id);

create index if not exists mila_intake_cases_user_client_idx
  on public.mila_intake_cases (user_id, client_id, created_at desc);
