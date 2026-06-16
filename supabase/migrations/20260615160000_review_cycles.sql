-- Review cycle management (admin/owner). Operates on app.cycles, which is the
-- authoritative cycle table used by manager_reviews.cycle_id and app.current_cycle_id().
-- Columns: id, organization_id, title, start_date, end_date, status (draft|open|closed).

create or replace function public.admin_list_cycles(p_org_id uuid)
returns table(
  id uuid,
  title text,
  start_date date,
  end_date date,
  status text,
  is_current boolean,
  reviewed_count integer
)
language plpgsql
stable
security definer
set search_path = app, public
as $$
begin
  if not app.is_org_admin(p_org_id) then
    raise exception 'Not allowed: admin access required';
  end if;

  return query
  select
    c.id,
    c.title::text,
    c.start_date,
    c.end_date,
    c.status::text,
    (c.status = 'open' and current_date between c.start_date and c.end_date) as is_current,
    (
      select count(distinct mr.employee_id)::int
      from app.manager_reviews mr
      where mr.cycle_id = c.id and mr.submitted_at is not null
    ) as reviewed_count
  from app.cycles c
  where c.organization_id = p_org_id
  order by c.start_date desc nulls last;
end;
$$;

grant execute on function public.admin_list_cycles(uuid) to authenticated;

create or replace function public.admin_upsert_cycle(
  p_id uuid,
  p_org_id uuid,
  p_title text,
  p_start_date date,
  p_end_date date,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_status text;
  v_id uuid;
begin
  if not app.is_org_admin(p_org_id) then
    raise exception 'Not allowed: admin access required';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Cycle title is required';
  end if;
  if p_start_date is null or p_end_date is null then
    raise exception 'Start and end dates are required';
  end if;
  if p_end_date < p_start_date then
    raise exception 'End date cannot be before start date';
  end if;

  v_status := coalesce(nullif(p_status, ''), 'draft');
  if v_status not in ('draft', 'open', 'closed') then
    raise exception 'Invalid status: %', p_status;
  end if;

  if p_id is null then
    insert into app.cycles(organization_id, title, start_date, end_date, status)
    values (p_org_id, trim(p_title), p_start_date, p_end_date, v_status)
    returning id into v_id;
  else
    update app.cycles
       set title = trim(p_title),
           start_date = p_start_date,
           end_date = p_end_date,
           status = v_status
     where id = p_id and organization_id = p_org_id
     returning id into v_id;

    if v_id is null then
      raise exception 'Cycle not found';
    end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.admin_upsert_cycle(uuid, uuid, text, date, date, text) to authenticated;

create or replace function public.admin_set_cycle_status(
  p_id uuid,
  p_org_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if not app.is_org_admin(p_org_id) then
    raise exception 'Not allowed: admin access required';
  end if;

  if p_status not in ('draft', 'open', 'closed') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update app.cycles
     set status = p_status
   where id = p_id and organization_id = p_org_id;

  if not found then
    raise exception 'Cycle not found';
  end if;
end;
$$;

grant execute on function public.admin_set_cycle_status(uuid, uuid, text) to authenticated;

create or replace function public.admin_delete_cycle(
  p_id uuid,
  p_org_id uuid
)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if not app.is_org_admin(p_org_id) then
    raise exception 'Not allowed: admin access required';
  end if;

  if exists (select 1 from app.manager_reviews mr where mr.cycle_id = p_id) then
    raise exception 'Cannot delete a cycle that already has reviews. Close it instead.';
  end if;

  delete from app.cycles where id = p_id and organization_id = p_org_id;

  if not found then
    raise exception 'Cycle not found';
  end if;
end;
$$;

grant execute on function public.admin_delete_cycle(uuid, uuid) to authenticated;
