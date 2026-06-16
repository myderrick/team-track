-- PostgREST keeps its own schema cache for /rest/v1/rpc/*.
-- If functions exist in pg_proc but RPC calls still return 404, force a cache reload.

grant execute on function public.list_notifications(integer) to authenticated;
grant execute on function public.notification_unread_count() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.list_one_on_ones(uuid) to authenticated;
grant execute on function public.upsert_one_on_one(uuid, uuid, uuid, timestamptz, text, text, text, text) to authenticated;
grant execute on function public.delete_one_on_one(uuid) to authenticated;

notify pgrst, 'reload schema';
