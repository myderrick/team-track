create table if not exists app.goal_sub_goal_updates (
  id uuid primary key default gen_random_uuid(),
  sub_goal_id uuid not null references app.goal_sub_goals(id) on delete cascade,
  employee_id uuid references app.employees(id) on delete set null,
  status text not null check (status in ('not_started', 'in_progress', 'completed', 'blocked')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists goal_sub_goal_updates_sub_goal_created_idx
  on app.goal_sub_goal_updates(sub_goal_id, created_at desc);

alter table app.goal_sub_goal_updates enable row level security;

grant select on app.goal_sub_goal_updates to authenticated;

drop policy if exists "goal_sub_goal_updates_select_org_goals" on app.goal_sub_goal_updates;
create policy "goal_sub_goal_updates_select_org_goals"
on app.goal_sub_goal_updates
for select
to authenticated
using (
  exists (
    select 1
    from app.goal_sub_goals s
    join app.goals g on g.id = s.goal_id
    where s.id = goal_sub_goal_updates.sub_goal_id
      and g.organization_id in (select organization_id from public.user_orgs())
  )
);

create or replace function public.add_goal_sub_goal_update(
  p_sub_goal_id uuid,
  p_status text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_goal_id uuid;
  v_org_id uuid;
  v_employee_id uuid;
  v_update_id uuid;
begin
  if p_status not in ('not_started', 'in_progress', 'completed', 'blocked') then
    raise exception 'Invalid sub-goal status: %', p_status;
  end if;

  select s.goal_id, g.organization_id
    into v_goal_id, v_org_id
  from app.goal_sub_goals s
  join app.goals g on g.id = s.goal_id
  where s.id = p_sub_goal_id;

  if v_goal_id is null then
    raise exception 'Sub-goal not found';
  end if;

  select e.id
    into v_employee_id
  from app.employees e
  where e.organization_id = v_org_id
    and (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  limit 1;

  if not exists (
    select 1
    from app.memberships m
    where m.organization_id = v_org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and lower(m.role) in ('owner', 'admin', 'manager')
  )
  and not exists (
    select 1
    from app.employees e
    where e.id = v_employee_id
      and (
        exists (
          select 1
          from app.goal_sub_goals s
          where s.id = p_sub_goal_id
            and s.assignee_employee_id = e.id
        )
        or exists (
          select 1
          from app.goal_assignments ga
          where ga.goal_id = v_goal_id
            and ga.employee_id = e.id
        )
        or exists (
          select 1
          from app.goals g
          where g.id = v_goal_id
            and g.owner_employee_id = e.id
        )
      )
  ) then
    raise exception 'Not allowed to update this sub-goal';
  end if;

  update app.goal_sub_goals
  set status = p_status,
      updated_at = now()
  where id = p_sub_goal_id;

  insert into app.goal_sub_goal_updates (sub_goal_id, employee_id, status, note)
  values (p_sub_goal_id, v_employee_id, p_status, nullif(trim(p_note), ''))
  returning id into v_update_id;

  return v_update_id;
end;
$$;

grant execute on function public.add_goal_sub_goal_update(uuid, text, text) to authenticated;
