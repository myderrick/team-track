grant insert, update, delete on app.goal_sub_goals to authenticated;

drop policy if exists "goal_sub_goals_manage_org_goals" on app.goal_sub_goals;

create policy "goal_sub_goals_manage_by_privileged_org_roles"
on app.goal_sub_goals
for all
to authenticated
using (
  exists (
    select 1
    from app.goals g
    join app.memberships m
      on m.organization_id = g.organization_id
    where g.id = goal_sub_goals.goal_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and lower(m.role) in ('owner', 'admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from app.goals g
    join app.memberships m
      on m.organization_id = g.organization_id
    where g.id = goal_sub_goals.goal_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and lower(m.role) in ('owner', 'admin', 'manager')
  )
);

create or replace function public.update_goal_sub_goal_status(
  p_sub_goal_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_goal_id uuid;
  v_org_id uuid;
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
    where e.organization_id = v_org_id
      and (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
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
end;
$$;

grant execute on function public.update_goal_sub_goal_status(uuid, text) to authenticated;
