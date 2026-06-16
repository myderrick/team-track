-- Consolidated fix: 1-on-1s + notifications in one correctly-ordered, idempotent script.
-- Safe to run repeatedly. Supersedes the separate 140000/150000 files if those didn't apply.

-- ════════════════════════════════════════════════════════════════════════════
-- 1) Tables (must exist before the functions that reference them)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists app.one_on_ones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  manager_employee_id uuid,
  employee_id uuid not null,
  scheduled_at timestamptz,
  location text,
  agenda text,
  notes text,
  status text not null default 'scheduled',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists one_on_ones_org_emp_idx on app.one_on_ones (organization_id, employee_id);
create index if not exists one_on_ones_org_mgr_idx on app.one_on_ones (organization_id, manager_employee_id);
alter table app.one_on_ones enable row level security;

create table if not exists app.user_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  meta jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists user_notifications_user_unread_idx
  on app.user_notifications (user_id, is_read, created_at desc);
alter table app.user_notifications enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- 2) Notifications helper + reads
-- ════════════════════════════════════════════════════════════════════════════
create or replace function app.notify(
  p_org_id uuid, p_user_id uuid, p_kind text, p_title text, p_body text, p_link text
)
returns void language sql security definer set search_path = app, public as $$
  insert into app.user_notifications(organization_id, user_id, kind, title, body, link)
  select p_org_id, p_user_id, p_kind, p_title, p_body, p_link
  where p_user_id is not null;
$$;

create or replace function public.list_notifications(p_limit integer default 20)
returns table(id uuid, kind text, title text, body text, link text, is_read boolean, created_at timestamptz)
language sql stable security definer set search_path = app, public as $$
  select n.id, n.kind::text, n.title::text, n.body::text, n.link::text, n.is_read, n.created_at
  from app.user_notifications n
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;
grant execute on function public.list_notifications(integer) to authenticated;

create or replace function public.notification_unread_count()
returns integer language sql stable security definer set search_path = app, public as $$
  select count(*)::int from app.user_notifications where user_id = auth.uid() and is_read = false;
$$;
grant execute on function public.notification_unread_count() to authenticated;

create or replace function public.mark_notification_read(p_id uuid)
returns void language sql security definer set search_path = app, public as $$
  update app.user_notifications set is_read = true, read_at = now()
  where id = p_id and user_id = auth.uid();
$$;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void language sql security definer set search_path = app, public as $$
  update app.user_notifications set is_read = true, read_at = now()
  where user_id = auth.uid() and is_read = false;
$$;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3) 1-on-1 reads / mutations
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.list_one_on_ones(p_org_id uuid)
returns table(
  id uuid, employee_id uuid, employee_name text, manager_employee_id uuid, manager_name text,
  scheduled_at timestamptz, location text, agenda text, notes text, status text, can_manage boolean
)
language plpgsql stable security definer set search_path = app, public as $$
declare
  v_me uuid;
  v_admin boolean := app.is_org_admin(p_org_id);
begin
  select e.id into v_me from app.employees e
  where e.organization_id = p_org_id and (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  limit 1;

  return query
  select
    o.id, o.employee_id, emp.full_name::text, o.manager_employee_id, mgr.full_name::text,
    o.scheduled_at, o.location::text, o.agenda::text, o.notes::text, o.status::text,
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

create or replace function public.delete_one_on_one(p_id uuid)
returns void language plpgsql security definer set search_path = app, public as $$
declare v_org uuid; v_mgr uuid; v_me uuid;
begin
  select organization_id, manager_employee_id into v_org, v_mgr from app.one_on_ones where id = p_id;
  if v_org is null then raise exception '1-on-1 not found'; end if;
  select e.id into v_me from app.employees e
  where e.organization_id = v_org and (e.user_id = auth.uid() or e.auth_user_id = auth.uid()) limit 1;
  if not app.is_org_admin(v_org) and (v_me is distinct from v_mgr) then
    raise exception 'Not allowed to delete this 1-on-1';
  end if;
  delete from app.one_on_ones where id = p_id;
end;
$$;
grant execute on function public.delete_one_on_one(uuid) to authenticated;

create or replace function public.upsert_one_on_one(
  p_id uuid, p_org_id uuid, p_employee_id uuid, p_scheduled_at timestamptz,
  p_agenda text, p_location text, p_status text, p_notes text
)
returns uuid language plpgsql security definer set search_path = app, public as $$
declare v_me uuid; v_emp_mgr uuid; v_status text; v_id uuid; v_emp_user uuid;
begin
  select e.id into v_me from app.employees e
  where e.organization_id = p_org_id and (e.user_id = auth.uid() or e.auth_user_id = auth.uid()) limit 1;

  select manager_employee_id into v_emp_mgr from app.employees
  where id = p_employee_id and organization_id = p_org_id;

  if not app.is_org_admin(p_org_id) and (v_me is null or v_me is distinct from v_emp_mgr) then
    raise exception 'Only the employee''s manager or an admin can schedule this 1-on-1';
  end if;

  v_status := coalesce(nullif(p_status, ''), 'scheduled');
  if v_status not in ('scheduled', 'completed', 'cancelled') then
    raise exception 'Invalid status: %', p_status;
  end if;

  if p_id is null then
    insert into app.one_on_ones(organization_id, manager_employee_id, employee_id, scheduled_at, agenda, location, status, notes, created_by)
    values (p_org_id, coalesce(v_emp_mgr, v_me), p_employee_id, p_scheduled_at, p_agenda, p_location, v_status, p_notes, auth.uid())
    returning id into v_id;

    select coalesce(e.user_id, e.auth_user_id) into v_emp_user from app.employees e where e.id = p_employee_id;
    perform app.notify(p_org_id, v_emp_user, 'one_on_one', 'New 1-on-1 scheduled',
      coalesce('On ' || to_char(p_scheduled_at, 'Mon DD, HH24:MI'), 'Time to be confirmed'), '/staff/one-on-ones');
  else
    update app.one_on_ones
       set scheduled_at = p_scheduled_at, agenda = p_agenda, location = p_location,
           status = v_status, notes = p_notes, updated_at = now()
     where id = p_id and organization_id = p_org_id
     returning id into v_id;
    if v_id is null then raise exception '1-on-1 not found'; end if;
  end if;
  return v_id;
end;
$$;
grant execute on function public.upsert_one_on_one(uuid, uuid, uuid, timestamptz, text, text, text, text) to authenticated;

-- review acknowledgement now also notifies the manager (depends on app.resolve_cycle_id + app.review_acknowledgements from 130000)
create or replace function public.staff_acknowledge_review(p_quarter text default null, p_response text default null)
returns void language plpgsql security definer set search_path = app, public as $$
declare v_emp uuid; v_org uuid; v_cycle uuid; v_name text; v_mgr_user uuid;
begin
  select e.id, e.organization_id, e.full_name into v_emp, v_org, v_name
  from app.employees e
  where (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  order by e.created_at desc limit 1;
  if v_emp is null then raise exception 'No employee mapped to the current user'; end if;

  v_cycle := app.resolve_cycle_id(v_org, p_quarter);

  insert into app.review_acknowledgements(organization_id, employee_id, cycle_id, acknowledged_at, response)
  values (v_org, v_emp, v_cycle, now(), p_response)
  on conflict (organization_id, employee_id, cycle_id)
  do update set acknowledged_at = now(), response = excluded.response, updated_at = now();

  select coalesce(mgr.user_id, mgr.auth_user_id) into v_mgr_user
  from app.employees emp join app.employees mgr on mgr.id = emp.manager_employee_id
  where emp.id = v_emp;

  perform app.notify(v_org, v_mgr_user, 'review_ack', 'Review acknowledged',
    coalesce(v_name, 'An employee') || ' acknowledged their review', '/manager/reviews');
end;
$$;
grant execute on function public.staff_acknowledge_review(text, text) to authenticated;
