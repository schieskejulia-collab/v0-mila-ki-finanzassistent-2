-- Korrektur zur vorherigen Härtung: PostgreSQL vergibt EXECUTE standardmäßig
-- über PUBLIC. Diese internen Triggerfunktionen dürfen daher auch dort nicht
-- ausführbar sein.

revoke execute on function public.mila_block_child_changes_after_completion() from public;
revoke execute on function public.mila_enforce_case_child_ownership() from public;
revoke execute on function public.mila_freeze_completed_case() from public;
revoke execute on function public.mila_invalidate_case_handoff(uuid, uuid) from public;
revoke execute on function public.mila_invalidate_handoff_from_document() from public;
revoke execute on function public.mila_invalidate_handoff_from_task() from public;
revoke execute on function public.mila_invalidate_handoff_from_update() from public;
revoke execute on function public.mila_log_case_history() from public;
revoke execute on function public.mila_log_case_update_history() from public;
revoke execute on function public.mila_log_document_context_change() from public;
revoke execute on function public.mila_log_document_history() from public;
revoke execute on function public.mila_log_task_history() from public;
revoke execute on function public.mila_require_handoff_before_completion() from public;
revoke execute on function public.mila_require_readiness_before_handoff() from public;
revoke execute on function public.mila_snapshot_handoff_on_prepare() from public;
revoke execute on function public.notify_client_document_uploaded() from public;
revoke execute on function public.notify_client_question_answered() from public;
