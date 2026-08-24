-- Mila: interne Triggerfunktionen dürfen nicht über die öffentliche RPC-API
-- von anonymen oder angemeldeten Nutzern direkt aufgerufen werden.
-- Die Trigger selbst laufen weiterhin unverändert in der Datenbank.

revoke execute on function public.mila_block_child_changes_after_completion() from public, anon, authenticated;
revoke execute on function public.mila_enforce_case_child_ownership() from public, anon, authenticated;
revoke execute on function public.mila_freeze_completed_case() from public, anon, authenticated;
revoke execute on function public.mila_invalidate_case_handoff(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.mila_invalidate_handoff_from_document() from public, anon, authenticated;
revoke execute on function public.mila_invalidate_handoff_from_task() from public, anon, authenticated;
revoke execute on function public.mila_invalidate_handoff_from_update() from public, anon, authenticated;
revoke execute on function public.mila_log_case_history() from public, anon, authenticated;
revoke execute on function public.mila_log_case_update_history() from public, anon, authenticated;
revoke execute on function public.mila_log_document_context_change() from public, anon, authenticated;
revoke execute on function public.mila_log_document_history() from public, anon, authenticated;
revoke execute on function public.mila_log_task_history() from public, anon, authenticated;
revoke execute on function public.mila_require_handoff_before_completion() from public, anon, authenticated;
revoke execute on function public.mila_require_readiness_before_handoff() from public, anon, authenticated;
revoke execute on function public.mila_snapshot_handoff_on_prepare() from public, anon, authenticated;
revoke execute on function public.notify_client_document_uploaded() from public, anon, authenticated;
revoke execute on function public.notify_client_question_answered() from public, anon, authenticated;

-- Der CRM-Zeitstempel-Trigger benötigt keine veränderliche Suchreihenfolge.
alter function public.set_crm_contacts_updated_at() set search_path = public;
