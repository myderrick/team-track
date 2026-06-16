-- The frontend client defaults to db.schema = 'app', so plain supabase.rpc(...)
-- looks for app.<function_name>. Expose wrappers for review RPCs implemented in public.

create or replace function app.staff_my_review(p_quarter text default null)
returns jsonb
language sql
stable
security definer
set search_path = app, public
as $$
  select public.staff_my_review(p_quarter);
$$;

grant execute on function app.staff_my_review(text) to authenticated;

create or replace function app.staff_acknowledge_review(
  p_quarter text default null,
  p_response text default null
)
returns void
language sql
security definer
set search_path = app, public
as $$
  select public.staff_acknowledge_review(p_quarter, p_response);
$$;

grant execute on function app.staff_acknowledge_review(text, text) to authenticated;

create or replace function app.admin_list_org_reviews(
  p_org_id uuid,
  p_quarter text default null
)
returns table(
  employee_id uuid,
  full_name text,
  department text,
  title text,
  status text,
  score numeric,
  submitted_at timestamptz,
  manager_name text
)
language sql
stable
security definer
set search_path = app, public
as $$
  select * from public.admin_list_org_reviews(p_org_id, p_quarter);
$$;

grant execute on function app.admin_list_org_reviews(uuid, text) to authenticated;

create or replace function app.admin_org_review_detail(
  p_org_id uuid,
  p_employee_id uuid,
  p_quarter text default null
)
returns jsonb
language sql
stable
security definer
set search_path = app, public
as $$
  select public.admin_org_review_detail(p_org_id, p_employee_id, p_quarter);
$$;

grant execute on function app.admin_org_review_detail(uuid, uuid, text) to authenticated;

create or replace function app.save_manager_review_summary(
  p_org_id uuid,
  p_employee_id uuid,
  p_cycle_id text,
  p_strengths text,
  p_improvements text,
  p_summary text,
  p_recommendation text
)
returns void
language sql
security definer
set search_path = app, public
as $$
  select public.save_manager_review_summary(
    p_org_id,
    p_employee_id,
    p_cycle_id,
    p_strengths,
    p_improvements,
    p_summary,
    p_recommendation
  );
$$;

grant execute on function app.save_manager_review_summary(uuid, uuid, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
