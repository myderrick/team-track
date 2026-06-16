-- Dashboard recent activity should be read through an RPC, not direct table access.
-- This avoids browser-role permission errors on app.activity_log and keeps org access centralized.

create or replace function app.list_recent_activity(
  p_org_id uuid,
  p_limit integer default 20
)
returns table(
  id text,
  action text,
  entity_type text,
  entity_id text,
  details jsonb,
  occurred_at timestamptz,
  actor_user_id uuid,
  actor_name text,
  organization_id uuid
)
language plpgsql
stable
security definer
set search_path = app, public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
begin
  if p_org_id is null then
    return;
  end if;

  if not exists (
    select 1
    from app.memberships m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.is_active = true
  ) and not exists (
    select 1
    from app.employees e
    where e.organization_id = p_org_id
      and (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  ) then
    raise exception 'Not allowed to view activity for this organization';
  end if;

  if to_regclass('app.activity_log') is null then
    return;
  end if;

  return query execute $sql$
    select
      l.id::text,
      l.action::text,
      l.entity_type::text,
      l.entity_id::text,
      l.details::jsonb,
      l.occurred_at,
      l.actor_user_id,
      coalesce(emp.full_name::text, l.details->>'actor_name', 'Someone') as actor_name,
      l.organization_id
    from app.activity_log l
    left join app.employees emp
      on emp.organization_id = l.organization_id
     and (emp.user_id = l.actor_user_id or emp.auth_user_id = l.actor_user_id)
    where l.organization_id = $1
    order by l.occurred_at desc nulls last
    limit $2
  $sql$ using p_org_id, v_limit;
end;
$$;

grant execute on function app.list_recent_activity(uuid, integer) to authenticated;

create or replace function public.list_recent_activity(
  p_org_id uuid,
  p_limit integer default 20
)
returns table(
  id text,
  action text,
  entity_type text,
  entity_id text,
  details jsonb,
  occurred_at timestamptz,
  actor_user_id uuid,
  actor_name text,
  organization_id uuid
)
language sql
stable
security definer
set search_path = app, public
as $$
  select * from app.list_recent_activity(p_org_id, p_limit);
$$;

grant execute on function public.list_recent_activity(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
