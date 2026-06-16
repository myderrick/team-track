-- Admin user management
-- Roles / access live on app.memberships (organization_id, user_id, role, is_active).
-- HR data lives on app.employees (id, organization_id, user_id/auth_user_id, manager_id, ...).
-- A membership is matched to an employee via coalesce(employees.user_id, employees.auth_user_id) = memberships.user_id.

-- ─────────────────────────────────────────────────────────────────────────────
-- Guard: is the calling user an owner/admin of this org?
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function app.is_org_admin(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = app, public
stable
as $$
  select exists (
    select 1
    from app.memberships m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and lower(m.role) in ('owner', 'admin')
  );
$$;

grant execute on function app.is_org_admin(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- List org members for the admin console (employees joined with their membership)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function app.admin_list_members(p_org_id uuid)
returns table(
  employee_id uuid,
  full_name text,
  email text,
  title text,
  department text,
  location text,
  manager_id uuid,
  manager_name text,
  user_id uuid,
  role text,
  is_active boolean,
  linked boolean
)
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if not app.is_org_admin(p_org_id) then
    raise exception 'Not allowed: admin access required';
  end if;

  return query
    select
      e.id                                    as employee_id,
      e.full_name,
      e.email,
      e.title,
      e.department,
      e.location,
      e.manager_employee_id                   as manager_id,
      mgr.full_name                           as manager_name,
      m.user_id,
      m.role,
      m.is_active,
      (m.user_id is not null)                 as linked
    from app.employees e
    left join app.employees mgr
      on mgr.id = e.manager_employee_id
    left join app.memberships m
      on m.organization_id = e.organization_id
     and m.user_id = coalesce(e.user_id, e.auth_user_id)
    where e.organization_id = p_org_id
    order by e.full_name nulls last;
end;
$$;

create or replace function public.admin_list_members(p_org_id uuid)
returns table(
  employee_id uuid,
  full_name text,
  email text,
  title text,
  department text,
  location text,
  manager_id uuid,
  manager_name text,
  user_id uuid,
  role text,
  is_active boolean,
  linked boolean
)
language sql
security definer
set search_path = app, public
as $$
  select * from app.admin_list_members(p_org_id);
$$;

grant execute on function public.admin_list_members(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Change a member's role
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function app.admin_set_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role text
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

  if lower(p_role) not in ('owner', 'admin', 'manager', 'staff', 'member') then
    raise exception 'Invalid role: %', p_role;
  end if;

  -- Don't allow demoting the last active owner.
  if exists (
        select 1 from app.memberships
        where organization_id = p_org_id and user_id = p_user_id and lower(role) = 'owner'
      )
     and lower(p_role) <> 'owner'
     and (
        select count(*) from app.memberships
        where organization_id = p_org_id and lower(role) = 'owner' and is_active = true
      ) <= 1
  then
    raise exception 'Cannot change the role of the last active owner';
  end if;

  update app.memberships
     set role = lower(p_role)
   where organization_id = p_org_id
     and user_id = p_user_id;

  if not found then
    raise exception 'Membership not found for this user in the organization';
  end if;
end;
$$;

create or replace function public.admin_set_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language sql
security definer
set search_path = app, public
as $$
  select app.admin_set_member_role(p_org_id, p_user_id, p_role);
$$;

grant execute on function public.admin_set_member_role(uuid, uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Activate / deactivate a member
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function app.admin_set_member_active(
  p_org_id uuid,
  p_user_id uuid,
  p_active boolean
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

  if p_active = false then
    if p_user_id = auth.uid() then
      raise exception 'You cannot deactivate your own account';
    end if;

    if exists (
          select 1 from app.memberships
          where organization_id = p_org_id and user_id = p_user_id and lower(role) = 'owner'
        )
       and (
          select count(*) from app.memberships
          where organization_id = p_org_id and lower(role) = 'owner' and is_active = true
        ) <= 1
    then
      raise exception 'Cannot deactivate the last active owner';
    end if;
  end if;

  update app.memberships
     set is_active = p_active
   where organization_id = p_org_id
     and user_id = p_user_id;

  if not found then
    raise exception 'Membership not found for this user in the organization';
  end if;
end;
$$;

create or replace function public.admin_set_member_active(
  p_org_id uuid,
  p_user_id uuid,
  p_active boolean
)
returns void
language sql
security definer
set search_path = app, public
as $$
  select app.admin_set_member_active(p_org_id, p_user_id, p_active);
$$;

grant execute on function public.admin_set_member_active(uuid, uuid, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Assign / clear an employee's manager
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function app.admin_set_employee_manager(
  p_org_id uuid,
  p_employee_id uuid,
  p_manager_id uuid
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

  if p_manager_id is not null then
    if p_manager_id = p_employee_id then
      raise exception 'An employee cannot be their own manager';
    end if;
    if not exists (
      select 1 from app.employees
      where id = p_manager_id and organization_id = p_org_id
    ) then
      raise exception 'Manager not found in this organization';
    end if;
  end if;

  update app.employees
     set manager_employee_id = p_manager_id
   where id = p_employee_id
     and organization_id = p_org_id;

  if not found then
    raise exception 'Employee not found in this organization';
  end if;
end;
$$;

create or replace function public.admin_set_employee_manager(
  p_org_id uuid,
  p_employee_id uuid,
  p_manager_id uuid
)
returns void
language sql
security definer
set search_path = app, public
as $$
  select app.admin_set_employee_manager(p_org_id, p_employee_id, p_manager_id);
$$;

grant execute on function public.admin_set_employee_manager(uuid, uuid, uuid) to authenticated;
