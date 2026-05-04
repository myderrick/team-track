create or replace function app.enqueue_goal_assignment_email()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_goal app.goals%rowtype;
  v_employee app.employees%rowtype;
  v_to_email text;
  v_subject text;
  v_body text;
begin
  select *
    into v_goal
  from app.goals
  where id = new.goal_id;

  select *
    into v_employee
  from app.employees
  where id = new.employee_id;

  v_to_email := nullif(trim(coalesce(v_employee.email::text, '')), '');

  if v_goal.id is null or v_employee.id is null or v_to_email is null then
    return new;
  end if;

  v_subject := 'New goal assigned: ' || coalesce(v_goal.label, 'Goal');
  v_body := concat_ws(
    E'\n\n',
    'Hi ' || coalesce(v_employee.full_name, 'there') || ',',
    'A new goal has been assigned to you: ' || coalesce(v_goal.label, 'Untitled goal'),
    case when v_goal.description is not null and trim(v_goal.description) <> ''
      then 'Description: ' || v_goal.description
      else null
    end,
    case when v_goal.quarter is not null
      then 'Period: ' || v_goal.quarter
      else null
    end,
    case when v_goal.deadline is not null
      then 'Deadline: ' || v_goal.deadline::text
      else null
    end,
    'You can review it in your Staff Goals page.'
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
    v_goal.organization_id,
    v_employee.id,
    v_to_email,
    v_subject,
    v_body,
    v_body,
    'goal_assigned',
    'queued',
    0,
    0,
    now(),
    now(),
    jsonb_build_object(
      'goal_id', new.goal_id,
      'employee_id', new.employee_id,
      'assignment_at', coalesce(new.assigned_at, now())
    )
  );

  return new;
end;
$$;

drop trigger if exists goal_assignment_email_after_insert on app.goal_assignments;

create trigger goal_assignment_email_after_insert
after insert on app.goal_assignments
for each row
execute function app.enqueue_goal_assignment_email();

