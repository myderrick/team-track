-- The frontend Supabase client defaults to db.schema = 'app'.
-- Plain supabase.rpc(...) therefore resolves RPCs as app.<function_name>.
-- Keep the public RPCs intact and expose app-schema wrappers for the default client.

create or replace function app.list_notifications(p_limit integer default 20)
returns table(
  id uuid,
  kind text,
  title text,
  body text,
  link text,
  is_read boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = app, public
as $$
  select *
  from public.list_notifications(p_limit);
$$;

grant execute on function app.list_notifications(integer) to authenticated;

create or replace function app.notification_unread_count()
returns integer
language sql
stable
security definer
set search_path = app, public
as $$
  select public.notification_unread_count();
$$;

grant execute on function app.notification_unread_count() to authenticated;

create or replace function app.mark_notification_read(p_id uuid)
returns void
language sql
security definer
set search_path = app, public
as $$
  select public.mark_notification_read(p_id);
$$;

grant execute on function app.mark_notification_read(uuid) to authenticated;

create or replace function app.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = app, public
as $$
  select public.mark_all_notifications_read();
$$;

grant execute on function app.mark_all_notifications_read() to authenticated;

create or replace function app.list_one_on_ones(p_org_id uuid)
returns table(
  id uuid,
  employee_id uuid,
  employee_name text,
  manager_employee_id uuid,
  manager_name text,
  scheduled_at timestamptz,
  location text,
  agenda text,
  notes text,
  status text,
  can_manage boolean
)
language sql
stable
security definer
set search_path = app, public
as $$
  select *
  from public.list_one_on_ones(p_org_id);
$$;

grant execute on function app.list_one_on_ones(uuid) to authenticated;

create or replace function app.upsert_one_on_one(
  p_id uuid,
  p_org_id uuid,
  p_employee_id uuid,
  p_scheduled_at timestamptz,
  p_agenda text,
  p_location text,
  p_status text,
  p_notes text
)
returns uuid
language sql
security definer
set search_path = app, public
as $$
  select public.upsert_one_on_one(
    p_id,
    p_org_id,
    p_employee_id,
    p_scheduled_at,
    p_agenda,
    p_location,
    p_status,
    p_notes
  );
$$;

grant execute on function app.upsert_one_on_one(uuid, uuid, uuid, timestamptz, text, text, text, text) to authenticated;

create or replace function app.delete_one_on_one(p_id uuid)
returns void
language sql
security definer
set search_path = app, public
as $$
  select public.delete_one_on_one(p_id);
$$;

grant execute on function app.delete_one_on_one(uuid) to authenticated;

notify pgrst, 'reload schema';
