-- In-app notifications (per recipient auth user).

create table if not exists app.user_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  user_id uuid not null,        -- recipient (auth.users id)
  kind text not null,           -- one_on_one | review_ack | review_published | goal_assigned | ...
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Internal helper: create a notification (no-op if recipient is null)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function app.notify(
  p_org_id uuid,
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_link text
)
returns void
language sql
security definer
set search_path = app, public
as $$
  insert into app.user_notifications(organization_id, user_id, kind, title, body, link)
  select p_org_id, p_user_id, p_kind, p_title, p_body, p_link
  where p_user_id is not null;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reads / mutations for the signed-in user
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.list_notifications(p_limit integer default 20)
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
  select n.id, n.kind, n.title, n.body, n.link, n.is_read, n.created_at
  from app.user_notifications n
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

grant execute on function public.list_notifications(integer) to authenticated;

create or replace function public.notification_unread_count()
returns integer
language sql
stable
security definer
set search_path = app, public
as $$
  select count(*)::int from app.user_notifications
  where user_id = auth.uid() and is_read = false;
$$;

grant execute on function public.notification_unread_count() to authenticated;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language sql
security definer
set search_path = app, public
as $$
  update app.user_notifications set is_read = true, read_at = now()
  where id = p_id and user_id = auth.uid();
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = app, public
as $$
  update app.user_notifications set is_read = true, read_at = now()
  where user_id = auth.uid() and is_read = false;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Wire notifications into events we own:
--   (1) scheduling a 1-on-1 -> notify the employee
--   (2) acknowledging a review -> notify the manager
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
  v_emp_user uuid;
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

    select coalesce(e.user_id, e.auth_user_id) into v_emp_user
    from app.employees e where e.id = p_employee_id;

    perform app.notify(
      p_org_id, v_emp_user, 'one_on_one',
      'New 1-on-1 scheduled',
      coalesce('On ' || to_char(p_scheduled_at, 'Mon DD, HH24:MI'), 'Time to be confirmed'),
      '/staff/one-on-ones'
    );
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

create or replace function public.staff_acknowledge_review(
  p_quarter text default null,
  p_response text default null
)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_emp uuid;
  v_org uuid;
  v_cycle uuid;
  v_name text;
  v_mgr_user uuid;
begin
  select e.id, e.organization_id, e.full_name into v_emp, v_org, v_name
  from app.employees e
  where (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  order by e.created_at desc
  limit 1;

  if v_emp is null then
    raise exception 'No employee mapped to the current user';
  end if;

  v_cycle := app.resolve_cycle_id(v_org, p_quarter);

  insert into app.review_acknowledgements(organization_id, employee_id, cycle_id, acknowledged_at, response)
  values (v_org, v_emp, v_cycle, now(), p_response)
  on conflict (organization_id, employee_id, cycle_id)
  do update set acknowledged_at = now(), response = excluded.response, updated_at = now();

  -- notify the employee's manager
  select coalesce(mgr.user_id, mgr.auth_user_id) into v_mgr_user
  from app.employees emp
  join app.employees mgr on mgr.id = emp.manager_employee_id
  where emp.id = v_emp;

  perform app.notify(
    v_org, v_mgr_user, 'review_ack',
    'Review acknowledged',
    coalesce(v_name, 'An employee') || ' acknowledged their review',
    '/manager/reviews'
  );
end;
$$;

grant execute on function public.staff_acknowledge_review(text, text) to authenticated;
