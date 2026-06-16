-- Staff self-registration join codes.
-- Owners/admins can rotate a code for an organization. Staff redeem it after auth.

create extension if not exists pgcrypto with schema public;

create table if not exists app.org_join_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  code_hash text not null unique,
  created_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

alter table app.org_join_codes
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists organization_id uuid,
  add column if not exists code_hash text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz not null default (now() + interval '30 days'),
  add column if not exists revoked_at timestamptz;

create unique index if not exists org_join_codes_code_hash_key
  on app.org_join_codes (code_hash);

with ranked as (
  select
    ctid,
    row_number() over (
      partition by organization_id
      order by created_at desc nulls last
    ) as rn
  from app.org_join_codes
  where organization_id is not null
    and revoked_at is null
)
update app.org_join_codes jc
   set revoked_at = coalesce(jc.created_at, now())
  from ranked r
 where jc.ctid = r.ctid
   and r.rn > 1;

create unique index if not exists org_join_codes_one_active_per_org_idx
  on app.org_join_codes (organization_id)
  where revoked_at is null;

alter table app.org_join_codes enable row level security;

create or replace function app.join_code_hash(p_code text)
returns text
language sql
immutable
set search_path = app, public
as $$
  select encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');
$$;

create or replace function app.random_join_code(p_len integer default 8)
returns text
language plpgsql
volatile
set search_path = app, public
as $$
declare
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_len integer := greatest(6, least(coalesce(p_len, 8), 16));
  v_code text := '';
  i integer;
begin
  for i in 1..v_len loop
    v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
  end loop;
  return v_code;
end;
$$;

create or replace function app.rotate_join_code(
  p_org_id uuid,
  p_len integer default 8
)
returns text
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_code text;
begin
  if not app.is_org_admin(p_org_id) then
    raise exception 'Not allowed: admin access required';
  end if;

  update app.org_join_codes
     set revoked_at = now()
   where organization_id = p_org_id
     and revoked_at is null;

  loop
    v_code := app.random_join_code(p_len);
    begin
      insert into app.org_join_codes(organization_id, code_hash, created_by)
      values (p_org_id, app.join_code_hash(v_code), auth.uid());
      exit;
    exception when unique_violation then
      -- Extremely unlikely; retry on hash collision.
    end;
  end loop;

  return v_code;
end;
$$;

grant execute on function app.rotate_join_code(uuid, integer) to authenticated;

create or replace function public.rotate_join_code(
  p_org_id uuid,
  p_len integer default 8
)
returns text
language sql
security definer
set search_path = app, public
as $$
  select app.rotate_join_code(p_org_id, p_len);
$$;

grant execute on function public.rotate_join_code(uuid, integer) to authenticated;

drop function if exists public.join_org_with_code(text);
drop function if exists app.join_org_with_code(text);

create or replace function app.join_org_with_code(p_code text)
returns table(
  organization_id uuid,
  role text,
  employee_id uuid
)
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_org_id uuid;
  v_email text := lower(nullif(auth.jwt()->>'email', ''));
  v_employee_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before redeeming a join code';
  end if;

  if coalesce(trim(p_code), '') = '' then
    raise exception 'Join code is required';
  end if;

  select jc.organization_id into v_org_id
  from app.org_join_codes jc
  where jc.code_hash = app.join_code_hash(p_code)
    and jc.revoked_at is null
    and jc.expires_at > now()
  limit 1;

  if v_org_id is null then
    raise exception 'Invalid or expired join code';
  end if;

  select e.id into v_employee_id
  from app.employees e
  where e.organization_id = v_org_id
    and lower(e.email) = v_email
    and coalesce(e.is_active, true)
  order by e.created_at desc
  limit 1;

  if v_employee_id is null then
    raise exception 'No active employee record matches this email for the join code organization';
  end if;

  update app.employees e
     set user_id = coalesce(e.user_id, auth.uid()),
         auth_user_id = coalesce(e.auth_user_id, auth.uid())
   where e.id = v_employee_id
     and e.organization_id = v_org_id
     and (e.user_id is null or e.user_id = auth.uid())
     and (e.auth_user_id is null or e.auth_user_id = auth.uid());

  if exists (
    select 1
    from app.memberships m
    where m.organization_id = v_org_id
      and m.user_id = auth.uid()
  ) then
    update app.memberships m
       set is_active = true
     where m.organization_id = v_org_id
       and m.user_id = auth.uid();
  else
    insert into app.memberships(organization_id, user_id, role, is_active)
    values (v_org_id, auth.uid(), 'staff', true);
  end if;

  return query
  select v_org_id, 'staff'::text, v_employee_id;
end;
$$;

grant execute on function app.join_org_with_code(text) to authenticated;

create or replace function public.join_org_with_code(p_code text)
returns table(
  organization_id uuid,
  role text,
  employee_id uuid
)
language sql
security definer
set search_path = app, public
as $$
  select * from app.join_org_with_code(p_code);
$$;

grant execute on function public.join_org_with_code(text) to authenticated;

notify pgrst, 'reload schema';
