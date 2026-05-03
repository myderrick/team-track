create table if not exists app.goal_sub_goals (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references app.goals(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  assignee_employee_id uuid references app.employees(id) on delete set null,
  due_date date,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'blocked')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goal_sub_goals_goal_id_idx
  on app.goal_sub_goals(goal_id, sort_order);

alter table app.goal_sub_goals enable row level security;

grant select, insert, update, delete on app.goal_sub_goals to authenticated;

drop policy if exists "goal_sub_goals_select_org_goals" on app.goal_sub_goals;
create policy "goal_sub_goals_select_org_goals"
on app.goal_sub_goals
for select
to authenticated
using (
  exists (
    select 1
    from app.goals g
    where g.id = goal_sub_goals.goal_id
      and g.organization_id in (select organization_id from public.user_orgs())
  )
);

drop policy if exists "goal_sub_goals_manage_org_goals" on app.goal_sub_goals;
create policy "goal_sub_goals_manage_org_goals"
on app.goal_sub_goals
for all
to authenticated
using (
  exists (
    select 1
    from app.goals g
    where g.id = goal_sub_goals.goal_id
      and g.organization_id in (select organization_id from public.user_orgs())
  )
)
with check (
  exists (
    select 1
    from app.goals g
    where g.id = goal_sub_goals.goal_id
      and g.organization_id in (select organization_id from public.user_orgs())
  )
);
