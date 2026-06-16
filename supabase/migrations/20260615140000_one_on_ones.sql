-- 1-on-1s: lightweight scheduled meetings between a manager and a report.
-- Manager (or admin) schedules; both the manager and the employee can view.

create table if not exists app.one_on_ones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  manager_employee_id uuid,
  employee_id uuid not null,
  scheduled_at timestamptz,
  location text,
  agenda text,
  notes text,
  status text not null default 'scheduled',  -- scheduled | completed | cancelled
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists one_on_ones_org_emp_idx on app.one_on_ones (organization_id, employee_id);
create index if not exists one_on_ones_org_mgr_idx on app.one_on_ones (organization_id, manager_employee_id);

-- Access only through the security-definer RPCs below.
alter table app.one_on_ones enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- List 1-on-1s relevant to the caller (admin: all in org; otherwise as manager or as employee)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.list_one_on_ones(p_org_id uuid)
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
language plpgsql
stable
security definer
set search_path = app, public
as $$
declare
  v_me uuid;
  v_admin boolean := app.is_org_admin(p_org_id);
begin
  select e.id into v_me
  from app.employees e
  where e.organization_id = p_org_id
    and (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  limit 1;

  return query
  select
    o.id,
    o.employee_id,
    emp.full_name::text as employee_name,
    o.manager_employee_id,
    mgr.full_name::text as manager_name,
    o.scheduled_at,
    o.location::text,
    o.agenda::text,
    o.notes::text,
    o.status::text,
    (v_admin or o.manager_employee_id = v_me) as can_manage
  from app.one_on_ones o
  join app.employees emp on emp.id = o.employee_id
  left join app.employees mgr on mgr.id = o.manager_employee_id
  where o.organization_id = p_org_id
    and (v_admin or o.employee_id = v_me or o.manager_employee_id = v_me)
  order by o.scheduled_at desc nulls last;
end;
$$;

grant execute on function public.list_one_on_ones(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Create or update a 1-on-1 (manager of the employee, or admin)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.upsert_one_on_one(
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
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_me uuid;
  v_emp_mgr uuid;
  v_status text;
  v_id uuid;
begin
  select e.id into v_me
  from app.employees e
  where e.organization_id = p_org_id
    and (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  limit 1;

  select manager_employee_id into v_emp_mgr
  from app.employees
  where id = p_employee_id and organization_id = p_org_id;

  if not app.is_org_admin(p_org_id) and (v_me is null or v_me is distinct from v_emp_mgr) then
    raise exception 'Only the employee''s manager or an admin can schedule this 1-on-1';
  end if;

  v_status := coalesce(nullif(p_status, ''), 'scheduled');
  if v_status not in ('scheduled', 'completed', 'cancelled') then
    raise exception 'Invalid status: %', p_status;
  end if;

  if p_id is null then
    insert into app.one_on_ones(
      organization_id, manager_employee_id, employee_id, scheduled_at,
      agenda, location, status, notes, created_by
    )
    values (
      p_org_id, coalesce(v_emp_mgr, v_me), p_employee_id, p_scheduled_at,
      p_agenda, p_location, v_status, p_notes, auth.uid()
    )
    returning id into v_id;
  else
    update app.one_on_ones
       set scheduled_at = p_scheduled_at,
           agenda = p_agenda,
           location = p_location,
           status = v_status,
           notes = p_notes,
           updated_at = now()
     where id = p_id and organization_id = p_org_id
     returning id into v_id;

    if v_id is null then
      raise exception '1-on-1 not found';
    end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.upsert_one_on_one(uuid, uuid, uuid, timestamptz, text, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Delete a 1-on-1 (its manager, or admin)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.delete_one_on_one(p_id uuid)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_org uuid;
  v_mgr uuid;
  v_me uuid;
begin
  select organization_id, manager_employee_id into v_org, v_mgr
  from app.one_on_ones where id = p_id;

  if v_org is null then
    raise exception '1-on-1 not found';
  end if;

  select e.id into v_me
  from app.employees e
  where e.organization_id = v_org
    and (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  limit 1;

  if not app.is_org_admin(v_org) and (v_me is distinct from v_mgr) then
    raise exception 'Not allowed to delete this 1-on-1';
  end if;

  delete from app.one_on_ones where id = p_id;
end;
$$;

grant execute on function public.delete_one_on_one(uuid) to authenticated;
