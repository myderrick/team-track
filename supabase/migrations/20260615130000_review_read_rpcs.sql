-- Review read RPCs for the staff "My Review" tab and the admin org-wide Performance Reviews page.
--
-- Data model (from live DB):
--   app.manager_reviews(cycle_id, employee_id, goal_id, reviewer_employee_id, rating, comment, submitted_at)
--   app.competency_ratings(organization_id, cycle_id, employee_id, org_competency_id, rating, comment)
--   app.org_competencies(id, organization_id, name, category, position, is_active)
--   app.self_reviews(employee_id, goal_id, quarter, rating, review, status)   -- keyed by quarter TEXT
--   app.cycles(id, organization_id, title)   -- cycle_id used by manager_reviews; title like 'Q4 2025'
--   app.current_cycle_id(p_org_id) -> uuid
--   app.employees(id, organization_id, user_id, auth_user_id, manager_employee_id, full_name, ...)
--
-- NOTE: manager review summaries were NOT persisted before (save_manager_review_summary was a stub).
-- This migration adds a summary table + acknowledgement table and rewrites that function to persist.

-- ─────────────────────────────────────────────────────────────────────────────
-- New tables
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists app.manager_review_summaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  employee_id uuid not null,
  cycle_id uuid not null,
  reviewer_employee_id uuid,
  strengths text,
  improvements text,
  summary text,
  recommendation text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, cycle_id)
);

create table if not exists app.review_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  employee_id uuid not null,
  cycle_id uuid not null,
  acknowledged_at timestamptz not null default now(),
  response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, cycle_id)
);

-- Access is only ever through the security-definer RPCs below; deny direct table access.
alter table app.manager_review_summaries enable row level security;
alter table app.review_acknowledgements enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Resolve a 'Q# YYYY' label (or null) to a cycle id, falling back to the current cycle.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function app.resolve_cycle_id(p_org_id uuid, p_quarter text)
returns uuid
language plpgsql
stable
security definer
set search_path = app, public
as $$
declare
  v_cycle uuid;
begin
  if p_quarter is null or p_quarter = '' then
    return app.current_cycle_id(p_org_id);
  end if;

  select c.id into v_cycle
  from app.cycles c
  where c.organization_id = p_org_id
    and c.title = p_quarter
  limit 1;

  return coalesce(v_cycle, app.current_cycle_id(p_org_id));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Build the full review detail JSON for one employee + cycle.
-- p_quarter (text) is used to match self_reviews, which are keyed by quarter label.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function app.review_detail_json(
  p_org_id uuid,
  p_employee_id uuid,
  p_cycle_id uuid,
  p_quarter text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = app, public
as $$
declare
  v_qtext text;
  v_goals jsonb;
  v_comp jsonb;
  v_summary app.manager_review_summaries%rowtype;
  v_ack app.review_acknowledgements%rowtype;
  v_score numeric;
  v_submitted timestamptz;
  v_status text;
begin
  v_qtext := coalesce(nullif(p_quarter, ''), (select c.title from app.cycles c where c.id = p_cycle_id));

  -- Goals: one row per goal (latest manager review), with the employee's self rating
  with mr_g as (
    select distinct on (mr.goal_id)
      mr.goal_id, mr.rating as manager_rating, mr.comment as manager_comment, mr.submitted_at
    from app.manager_reviews mr
    where mr.employee_id = p_employee_id
      and mr.cycle_id = p_cycle_id
    order by mr.goal_id, mr.submitted_at desc nulls last
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'goal_id', g.id,
      'title', coalesce(g.label, ''),
      'manager_rating', mg.manager_rating,
      'manager_comment', mg.manager_comment,
      'self_rating', sr.rating,
      'self_review', sr.review
    ) order by coalesce(g.label, '')), '[]'::jsonb),
    round(avg(mg.manager_rating) * 20)
  into v_goals, v_score
  from mr_g mg
  join app.goals g on g.id = mg.goal_id
  left join app.self_reviews sr
    on sr.goal_id = mg.goal_id
   and sr.employee_id = p_employee_id
   and sr.quarter = v_qtext;

  -- Competencies
  select coalesce(jsonb_agg(jsonb_build_object(
    'org_competency_id', oc.id,
    'name', oc.name,
    'manager_rating', cr.rating,
    'manager_comment', cr.comment
  ) order by oc.category, oc.position, oc.name), '[]'::jsonb)
  into v_comp
  from app.competency_ratings cr
  join app.org_competencies oc on oc.id = cr.org_competency_id
  where cr.employee_id = p_employee_id
    and cr.cycle_id = p_cycle_id
    and cr.organization_id = p_org_id;

  -- Summary (manager's narrative) + acknowledgement
  select * into v_summary
  from app.manager_review_summaries s
  where s.organization_id = p_org_id and s.employee_id = p_employee_id and s.cycle_id = p_cycle_id
  limit 1;

  select * into v_ack
  from app.review_acknowledgements a
  where a.organization_id = p_org_id and a.employee_id = p_employee_id and a.cycle_id = p_cycle_id
  limit 1;

  select max(mr.submitted_at) into v_submitted
  from app.manager_reviews mr
  where mr.employee_id = p_employee_id and mr.cycle_id = p_cycle_id;

  v_status := case
    when v_submitted is not null or v_summary.submitted_at is not null then 'finalized'
    when jsonb_array_length(v_goals) > 0 or jsonb_array_length(v_comp) > 0 then 'in_progress'
    else 'pending'
  end;

  return jsonb_build_object(
    'status', v_status,
    'score', v_score,
    'summary', v_summary.summary,
    'strengths', v_summary.strengths,
    'improvements', v_summary.improvements,
    'recommendation', v_summary.recommendation,
    'submitted_at', v_submitted,
    'acknowledged_at', v_ack.acknowledged_at,
    'acknowledgement_response', v_ack.response,
    'goals', v_goals,
    'competencies', v_comp
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Staff: read my own finalized review for a quarter (scoped to auth.uid()'s employee)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.staff_my_review(p_quarter text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = app, public
as $$
declare
  v_emp uuid;
  v_org uuid;
  v_cycle uuid;
begin
  select e.id, e.organization_id into v_emp, v_org
  from app.employees e
  where (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  order by e.created_at desc
  limit 1;

  if v_emp is null then
    raise exception 'No employee mapped to the current user';
  end if;

  v_cycle := app.resolve_cycle_id(v_org, p_quarter);
  return app.review_detail_json(v_org, v_emp, v_cycle, p_quarter);
end;
$$;

grant execute on function public.staff_my_review(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Staff: acknowledge / sign off my review
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.staff_acknowledge_review(
  p_quarter text default null,
  p_response text default null
)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_emp uuid;
  v_org uuid;
  v_cycle uuid;
begin
  select e.id, e.organization_id into v_emp, v_org
  from app.employees e
  where (e.user_id = auth.uid() or e.auth_user_id = auth.uid())
  order by e.created_at desc
  limit 1;

  if v_emp is null then
    raise exception 'No employee mapped to the current user';
  end if;

  v_cycle := app.resolve_cycle_id(v_org, p_quarter);

  insert into app.review_acknowledgements(organization_id, employee_id, cycle_id, acknowledged_at, response)
  values (v_org, v_emp, v_cycle, now(), p_response)
  on conflict (organization_id, employee_id, cycle_id)
  do update set acknowledged_at = now(), response = excluded.response, updated_at = now();
end;
$$;

grant execute on function public.staff_acknowledge_review(text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin/HR: org-wide list of review status for a cycle
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_org_reviews(
  p_org_id uuid,
  p_quarter text default null
)
returns table(
  employee_id uuid,
  full_name text,
  department text,
  title text,
  status text,
  score numeric,
  submitted_at timestamptz,
  manager_name text
)
language plpgsql
stable
security definer
set search_path = app, public
as $$
declare
  v_cycle uuid;
begin
  if not app.is_org_admin(p_org_id) then
    raise exception 'Not allowed: admin access required';
  end if;

  v_cycle := app.resolve_cycle_id(p_org_id, p_quarter);

  return query
  select
    e.id,
    e.full_name::text,
    e.department::text,
    e.title::text,
    (case
      when bool_or(mr.submitted_at is not null) then 'finalized'
      when count(mr.id) > 0 then 'in_progress'
      else 'pending'
    end)::text as status,
    round(avg(mr.rating) filter (where mr.rating is not null) * 20)::numeric as score,
    max(mr.submitted_at) as submitted_at,
    mgr.full_name::text as manager_name
  from app.employees e
  left join app.manager_reviews mr
    on mr.employee_id = e.id and mr.cycle_id = v_cycle
  left join app.employees mgr
    on mgr.id = e.manager_employee_id
  where e.organization_id = p_org_id
    and coalesce(e.is_active, true)
  group by e.id, e.full_name, e.department, e.title, mgr.full_name
  order by e.full_name;
end;
$$;

grant execute on function public.admin_list_org_reviews(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin/HR: full review detail for one employee in a cycle
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_org_review_detail(
  p_org_id uuid,
  p_employee_id uuid,
  p_quarter text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = app, public
as $$
declare
  v_cycle uuid;
begin
  if not app.is_org_admin(p_org_id) then
    raise exception 'Not allowed: admin access required';
  end if;

  v_cycle := app.resolve_cycle_id(p_org_id, p_quarter);
  return app.review_detail_json(p_org_id, p_employee_id, v_cycle, p_quarter);
end;
$$;

grant execute on function public.admin_org_review_detail(uuid, uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: persist manager review summaries (previously a no-op stub, silently losing data)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.save_manager_review_summary(
  p_org_id uuid,
  p_employee_id uuid,
  p_cycle_id text,
  p_strengths text,
  p_improvements text,
  p_summary text,
  p_recommendation text
)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_quarter text;
  v_cycle uuid;
  v_reviewer uuid;
begin
  -- normalize cycle id to 'Q# YYYY' or null
  if p_cycle_id is null or p_cycle_id = 'current' then
    v_quarter := null;
  elsif p_cycle_id ~* '^q[1-4]_[0-9]{4}$' then
    v_quarter := upper(replace(p_cycle_id, '_', ' '));
  elsif p_cycle_id ~* '^Q[1-4]\s+[0-9]{4}$' then
    v_quarter := p_cycle_id;
  else
    v_quarter := null;
  end if;

  v_cycle := app.resolve_cycle_id(p_org_id, v_quarter);

  select e.id into v_reviewer
  from app.employees e
  where e.organization_id = p_org_id
    and (e.auth_user_id = auth.uid() or e.user_id = auth.uid())
  limit 1;

  insert into app.manager_review_summaries(
    organization_id, employee_id, cycle_id, reviewer_employee_id,
    strengths, improvements, summary, recommendation
  )
  values (
    p_org_id, p_employee_id, v_cycle, v_reviewer,
    p_strengths, p_improvements, p_summary, p_recommendation
  )
  on conflict (organization_id, employee_id, cycle_id)
  do update set
    strengths = excluded.strengths,
    improvements = excluded.improvements,
    summary = excluded.summary,
    recommendation = excluded.recommendation,
    reviewer_employee_id = excluded.reviewer_employee_id,
    updated_at = now();
end;
$$;

grant execute on function public.save_manager_review_summary(uuid, uuid, text, text, text, text, text) to authenticated;
