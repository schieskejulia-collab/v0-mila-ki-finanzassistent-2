-- Mila Voice Intake: Webhook-Wiederholungen dürfen keinen Anruf doppelt anlegen.
-- source_reference wird für Voice als voice:<provider>:<call_id> gesetzt.

create unique index if not exists mila_intake_cases_user_source_reference_uidx
  on public.mila_intake_cases (user_id, source_reference)
  where source_reference is not null;
