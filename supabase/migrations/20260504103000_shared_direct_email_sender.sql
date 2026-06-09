create or replace function app.send_email_direct(
  p_to text,
  p_subject text,
  p_message text,
  p_outbox_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_url text := 'https://tsozuhhxezbtrtncgbpl.supabase.co/functions/v1/email-worker';
  v_secret text;
  v_anon_key text;
  v_resp jsonb;
  v_status text;
  v_status_code int;
  v_ok boolean;
  v_error text;
begin
  if coalesce(nullif(trim(p_to), ''), '') = '' then
    return jsonb_build_object('ok', false, 'status', 400, 'error', 'Missing recipient email');
  end if;

  begin
    v_secret := trim(both '"' from trim(both from coalesce(app.get_secret('nudge_secret'), '')));
    v_anon_key := trim(both '"' from trim(both from coalesce(app.get_secret('supabase_anon_key'), '')));
  exception when undefined_function then
    v_secret := trim(both '"' from trim(both from coalesce(current_setting('app.nudge_secret', true), '')));
    v_anon_key := trim(both '"' from trim(both from coalesce(current_setting('app.supabase_anon_key', true), '')));
  end;

  if v_secret = '' then
    v_secret := 'super-long-random-secret';
  end if;

  select net.http_post(
    v_url,
    jsonb_build_object(
      'to', trim(p_to),
      'subject', coalesce(nullif(trim(p_subject), ''), 'Team Track notification'),
      'message', coalesce(p_message, ''),
      'secret', v_secret
    ),
    '{}'::jsonb,
    jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || coalesce(v_anon_key, ''),
      'x-nudge-secret', v_secret
    ),
    15000
  ) into v_resp;

  v_status := coalesce(v_resp->>'status', '');
  v_status_code := nullif(v_resp->>'status_code', '')::int;
  v_ok := v_status = '200 OK' or coalesce(v_status_code, 0) between 200 and 299;
  v_error := case when v_ok then null else coalesce(v_resp::text, 'Email worker returned a non-success response') end;

  if p_outbox_id is not null then
    update app.email_outbox
    set
      status = case when v_ok then 'sent' else 'error' end,
      sent_at = case when v_ok then now() else sent_at end,
      error = v_error,
      last_error = v_error,
      provider_message_id = coalesce(
        v_resp->>'provider_message_id',
        v_resp->>'message_id',
        v_resp->>'id',
        provider_message_id
      )
    where id = p_outbox_id;
  end if;

  return jsonb_build_object(
    'ok', v_ok,
    'status', v_status,
    'status_code', v_status_code,
    'raw', v_resp,
    'error', v_error
  );
exception
  when others then
    if p_outbox_id is not null then
      update app.email_outbox
      set
        status = 'error',
        error = sqlerrm,
        last_error = sqlerrm
      where id = p_outbox_id;
    end if;

    return jsonb_build_object('ok', false, 'status', 500, 'error', sqlerrm);
end;
$$;

create or replace function public.send_nudge_email_direct(
  p_org_id uuid,
  p_employee_id uuid,
  p_message text default 'Reminder: your updates are overdue.'
)
returns jsonb
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_to text;
begin
  select e.email::text
    into v_to
  from app.employees e
  where e.id = p_employee_id
    and e.organization_id = p_org_id
  limit 1;

  if coalesce(nullif(trim(v_to), ''), '') = '' then
    return jsonb_build_object('ok', false, 'status', 404, 'error', 'No email address found for employee');
  end if;

  return app.send_email_direct(
    v_to,
    'Nudge: please update your goals',
    coalesce(p_message, 'Reminder: your updates are overdue.')
  );
end;
$$;

create or replace function public.send_nudge_email_now(
  p_org_id uuid,
  p_employee_id uuid,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = app, public
as $$
begin
  return public.send_nudge_email_direct(p_org_id, p_employee_id, p_message);
end;
$$;

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
  v_outbox_id bigint;
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
  )
  returning id into v_outbox_id;

  perform app.send_email_direct(v_to_email, v_subject, v_body, v_outbox_id);

  return new;
end;
$$;
