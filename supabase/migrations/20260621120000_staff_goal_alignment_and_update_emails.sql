-- Staff-created goals can align to org goals, and assigned employees are emailed
-- when employee-visible goal details change.

create or replace function app.current_employee_for_auth()
returns app.employees
language sql
security definer
set search_path = app, public
as $$
  select e
  from app.employees e
  where e.user_id = auth.uid()
     or e.auth_user_id = auth.uid()
  order by e.created_at desc nulls last
  limit 1;
$$;

create or replace function public.add_self_goal(
  p_title text,
  p_description text default null,
  p_category text default 'performance',
  p_measure_type text default 'numeric',
  p_unit text default null,
  p_target_value numeric default null,
  p_deadline date default null,
  p_currency text default null,
  p_quarter text default null,
  p_org_goal_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_employee app.employees%rowtype;
  v_goal_id uuid;
  v_org_goal_label text;
  v_category text := coalesce(nullif(trim(p_category), ''), 'performance');
  v_measure_type text := coalesce(nullif(trim(p_measure_type), ''), 'numeric');
begin
  if auth.uid() is null then
    raise exception 'Sign in before creating a goal';
  end if;

  select * into v_employee from app.current_employee_for_auth();
  if v_employee.id is null then
    raise exception 'No employee profile linked to this user';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Goal title is required';
  end if;

  if v_category in ('development', 'learning', 'growth') then
    v_category := 'learning_development_growth';
  end if;

  if p_org_goal_id is not null then
    select og.label into v_org_goal_label
    from app.org_goals og
    where og.id = p_org_goal_id
      and og.organization_id = v_employee.organization_id;

    if v_org_goal_label is null then
      raise exception 'Org goal does not belong to your organization';
    end if;
  end if;

  insert into app.goals (
    organization_id,
    owner_employee_id,
    label,
    description,
    unit,
    currency,
    target_value,
    start_value,
    deadline,
    quarter,
    measure_type,
    org_goal_id,
    is_active,
    meta
  )
  values (
    v_employee.organization_id,
    v_employee.id,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    case when v_measure_type = 'numeric' then nullif(trim(coalesce(p_unit, '')), '') else null end,
    case when v_measure_type = 'monetary' then nullif(trim(coalesce(p_currency, '')), '') else null end,
    case when v_measure_type = 'qualitative' then null else p_target_value end,
    0,
    p_deadline,
    nullif(trim(coalesce(p_quarter, '')), ''),
    v_measure_type,
    p_org_goal_id,
    true,
    jsonb_build_object(
      'self_selected', true,
      'category', v_category,
      'org_goal_id', p_org_goal_id,
      'alignment_label', coalesce(v_org_goal_label, 'None')
    )
  )
  returning id into v_goal_id;

  return v_goal_id;
end;
$$;

grant execute on function public.add_self_goal(text, text, text, text, text, numeric, date, text, text, uuid) to authenticated;

create or replace function public.update_self_goal(
  p_goal_id uuid,
  p_title text default null,
  p_description text default null,
  p_category text default null,
  p_measure_type text default null,
  p_unit text default null,
  p_target_value numeric default null,
  p_deadline date default null,
  p_currency text default null,
  p_org_goal_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_employee app.employees%rowtype;
  v_goal app.goals%rowtype;
  v_org_goal_label text;
  v_category text := coalesce(nullif(trim(p_category), ''), 'performance');
  v_measure_type text := coalesce(nullif(trim(p_measure_type), ''), 'numeric');
begin
  if auth.uid() is null then
    raise exception 'Sign in before updating a goal';
  end if;

  select * into v_employee from app.current_employee_for_auth();
  if v_employee.id is null then
    raise exception 'No employee profile linked to this user';
  end if;

  select * into v_goal
  from app.goals
  where id = p_goal_id
    and organization_id = v_employee.organization_id
    and owner_employee_id = v_employee.id
    and coalesce((meta->>'self_selected')::boolean, false) = true;

  if v_goal.id is null then
    raise exception 'Self-created goal not found';
  end if;

  if v_category in ('development', 'learning', 'growth') then
    v_category := 'learning_development_growth';
  end if;

  if p_org_goal_id is not null then
    select og.label into v_org_goal_label
    from app.org_goals og
    where og.id = p_org_goal_id
      and og.organization_id = v_employee.organization_id;

    if v_org_goal_label is null then
      raise exception 'Org goal does not belong to your organization';
    end if;
  end if;

  update app.goals
     set label = coalesce(nullif(trim(p_title), ''), label),
         description = nullif(trim(coalesce(p_description, '')), ''),
         unit = case when v_measure_type = 'numeric' then nullif(trim(coalesce(p_unit, '')), '') else null end,
         currency = case when v_measure_type = 'monetary' then nullif(trim(coalesce(p_currency, '')), '') else null end,
         target_value = case when v_measure_type = 'qualitative' then null else p_target_value end,
         deadline = p_deadline,
         measure_type = v_measure_type,
         org_goal_id = p_org_goal_id,
         meta = coalesce(meta, '{}'::jsonb) ||
           jsonb_build_object(
             'self_selected', true,
             'category', v_category,
             'org_goal_id', p_org_goal_id,
             'alignment_label', coalesce(v_org_goal_label, 'None')
           )
   where id = p_goal_id;
end;
$$;

grant execute on function public.update_self_goal(uuid, text, text, text, text, text, numeric, date, text, uuid) to authenticated;

create or replace function app.enqueue_goal_update_email()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_employee record;
  v_subject text;
  v_body text;
  v_outbox_id bigint;
begin
  if not (
    old.label is distinct from new.label
    or old.description is distinct from new.description
    or old.target_value is distinct from new.target_value
    or old.unit is distinct from new.unit
    or old.currency is distinct from new.currency
    or old.measure_type is distinct from new.measure_type
    or old.deadline is distinct from new.deadline
    or old.quarter is distinct from new.quarter
    or old.org_goal_id is distinct from new.org_goal_id
    or old.meta is distinct from new.meta
  ) then
    return new;
  end if;

  v_subject := 'Goal updated: ' || coalesce(new.label, 'Goal');

  for v_employee in
    select distinct e.id, e.full_name, nullif(trim(coalesce(e.email::text, '')), '') as email
    from app.goal_assignments ga
    join app.employees e on e.id = ga.employee_id
    where ga.goal_id = new.id
      and e.organization_id = new.organization_id
      and nullif(trim(coalesce(e.email::text, '')), '') is not null
  loop
    v_body := concat_ws(
      E'\n\n',
      'Hi ' || coalesce(v_employee.full_name, 'there') || ',',
      'A goal assigned to you has been updated: ' || coalesce(new.label, 'Untitled goal'),
      case when new.description is not null and trim(new.description) <> ''
        then 'Description: ' || new.description
        else null
      end,
      case when new.quarter is not null
        then 'Period: ' || new.quarter
        else null
      end,
      case when new.deadline is not null
        then 'Deadline: ' || new.deadline::text
        else null
      end,
      'You can review the latest details in your Staff Goals page.'
    );

    insert into app.email_outbox (
      org_id,
      employee_id,
      to_email,
      subject,
      body,
      body_text,
      kind,
      status,
      attempt_count,
      attempts,
      queued_at,
      created_at,
      meta
    )
    values (
      new.organization_id,
      v_employee.id,
      v_employee.email,
      v_subject,
      v_body,
      v_body,
      'goal_updated',
      'queued',
      0,
      0,
      now(),
      now(),
      jsonb_build_object(
        'goal_id', new.id,
        'employee_id', v_employee.id,
        'updated_at', now()
      )
    )
    returning id into v_outbox_id;

    perform app.send_email_direct(v_employee.email, v_subject, v_body, v_outbox_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists goal_update_email_after_update on app.goals;

create trigger goal_update_email_after_update
after update on app.goals
for each row
execute function app.enqueue_goal_update_email();

notify pgrst, 'reload schema';
