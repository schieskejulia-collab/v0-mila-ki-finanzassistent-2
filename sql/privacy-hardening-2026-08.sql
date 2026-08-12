-- Mila Datenschutz-Hardening – August 2026
-- Idempotent: kann mehrfach ausgeführt werden.
-- Ziel: Mandantentrennung, RLS, private Uploads und zeitlich begrenzte Portal-Links.

-- 1) Upload-Links zeitlich begrenzen.
alter table if exists public.client_upload_links
  add column if not exists expires_at timestamptz;

alter table if exists public.client_upload_links
  add column if not exists last_used_at timestamptz;

update public.client_upload_links
set expires_at = coalesce(expires_at, created_at + interval '7 days')
where expires_at is null;

-- 2) Private Storage-Konfiguration erzwingen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-uploads',
  'client-uploads',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3) RLS für alle aktuell zentralen nutzerbezogenen Tabellen.
do $$
declare
  t text;
begin
  foreach t in array array[
    'expenses','incomes','obligations','goals','merchant_memory','documents',
    'clients','client_questions','client_upload_links','notifications'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);

      execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
      execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
      execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
      execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);

      execute format(
        'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
        t || '_select_own', t
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
        t || '_insert_own', t
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
        t || '_update_own', t
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
        t || '_delete_own', t
      );
    end if;
  end loop;
end $$;

-- 4) Der Upload-Bucket bleibt privat. Direkte Browser-Zugriffe auf Storage-Objekte
-- werden nicht pauschal freigegeben. Mila liefert Dokumente über authentifizierte
-- Server-Routen bzw. zeitlich begrenzte Mandanten-Portal-Links aus.

-- 5) Hilfsindex für gültige Upload-Links.
create index if not exists client_upload_links_valid_idx
  on public.client_upload_links (token, active, expires_at)
  where active = true;
