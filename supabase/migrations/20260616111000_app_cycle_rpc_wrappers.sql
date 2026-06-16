-- The frontend Supabase client defaults to db.schema = 'app'.
-- Expose app-schema wrappers for review-cycle admin RPCs implemented in public.

create or replace function app.admin_list_cycles(p_org_id uuid)
returns table(
  id uuid,
  title text,
  start_date date,
  end_date date,
  status text,
  is_current boolean,
  reviewed_count integer
)
language sql
stable
security definer
set search_path = app, public
as $$
  select * from public.admin_list_cycles(p_org_id);
$$;

grant execute on function app.admin_list_cycles(uuid) to authenticated;

create or replace function app.admin_upsert_cycle(
  p_id uuid,
  p_org_id uuid,
  p_title text,
  p_start_date date,
  p_end_date date,
  p_status text
)
returns uuid
language sql
security definer
set search_path = app, public
as $$
  select public.admin_upsert_cycle(
    p_id,
    p_org_id,
    p_title,
    p_start_date,
    p_end_date,
    p_status
  );
$$;

grant execute on function app.admin_upsert_cycle(uuid, uuid, text, date, date, text) to authenticated;

create or replace function app.admin_set_cycle_status(
  p_id uuid,
  p_org_id uuid,
  p_status text
)
returns void
language sql
security definer
set search_path = app, public
as $$
  select public.admin_set_cycle_status(p_id, p_org_id, p_status);
$$;

grant execute on function app.admin_set_cycle_status(uuid, uuid, text) to authenticated;

create or replace function app.admin_delete_cycle(
  p_id uuid,
  p_org_id uuid
)
returns void
language sql
security definer
set search_path = app, public
as $$
  select public.admin_delete_cycle(p_id, p_org_id);
$$;

grant execute on function app.admin_delete_cycle(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
