-- Email an existing employee a freshly generated staff join code.

create or replace function app.send_staff_join_code_email(
  p_org_id uuid,
  p_employee_id uuid,
  p_code text,
  p_register_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_employee app.employees%rowtype;
  v_to text;
  v_subject text;
  v_body text;
  v_url text := coalesce(nullif(trim(p_register_url), ''), '/staff/register');
  v_result jsonb;
begin
  if not app.is_org_admin(p_org_id) then
    raise exception 'Not allowed: admin access required';
  end if;

  if coalesce(trim(p_code), '') = '' then
    raise exception 'Join code is required';
  end if;

  select *
    into v_employee
  from app.employees e
  where e.id = p_employee_id
    and e.organization_id = p_org_id
  limit 1;

  if v_employee.id is null then
    raise exception 'Employee not found in this organization';
  end if;

  v_to := nullif(trim(coalesce(v_employee.email::text, '')), '');
  if v_to is null then
    return jsonb_build_object('ok', false, 'status', 400, 'error', 'No email address found for employee');
  end if;

  v_subject := 'Your Team Track staff join code';
  v_body := concat_ws(
    E'\n\n',
    'Hi ' || coalesce(v_employee.full_name, 'there') || ',',
    'You have been invited to join your Team Track workspace.',
    'Your company join code is: ' || upper(trim(p_code)),
    'Register here: ' || v_url,
    'This code may expire or be replaced if your admin generates a new one.'
  );

  if to_regprocedure('app.send_email_direct(text,text,text,bigint)') is null then
    return jsonb_build_object('ok', false, 'status', 501, 'error', 'Email sender is not deployed');
  end if;

  execute 'select app.send_email_direct($1, $2, $3)' into v_result using v_to, v_subject, v_body;
  return v_result;
end;
$$;

grant execute on function app.send_staff_join_code_email(uuid, uuid, text, text) to authenticated;

create or replace function public.send_staff_join_code_email(
  p_org_id uuid,
  p_employee_id uuid,
  p_code text,
  p_register_url text default null
)
returns jsonb
language sql
security definer
set search_path = app, public
as $$
  select app.send_staff_join_code_email(p_org_id, p_employee_id, p_code, p_register_url);
$$;

grant execute on function public.send_staff_join_code_email(uuid, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
