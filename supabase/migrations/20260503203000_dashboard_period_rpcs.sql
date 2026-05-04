create or replace function app.org_goals_progress_period(
  p_org_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_department text default null,
  p_location text default null
)
returns table(
  goal_id uuid,
  title text,
  department text,
  owner_department text,
  start_value numeric,
  current_value numeric,
  target_value numeric,
  type text,
  unit text,
  currency text
)
language sql
security definer
set search_path = app, public
as $$
with base_goals as (
  select
    g.id as goal_id,
    g.label as title,
    g.organization_id,
    g.department as goal_department,
    g.owner_employee_id,
    g.start_value,
    g.target_value,
    coalesce(
      g.type,
      case g.measure_type
        when 'monetary' then 'monetary'
        when 'numeric' then 'numeric'
        when 'qualitative' then 'qualitative'
        else 'numeric'
      end
    ) as type,
    g.unit,
    g.currency,
    g.deadline,
    g.quarter,
    g.period_type,
    g.period_year,
    g.period_start_date,
    g.period_end_date,
    case
      when g.period_start_date is not null then g.period_start_date
      when g.period_type = 'annual' and g.period_year is not null then make_date(g.period_year, 1, 1)
      when g.quarter ~ '^Q[1-4]\s+\d{4}$' then make_date(
        (regexp_match(g.quarter, '^Q([1-4])\s+(\d{4})$'))[2]::int,
        (((regexp_match(g.quarter, '^Q([1-4])\s+(\d{4})$'))[1]::int - 1) * 3) + 1,
        1
      )
      else null::date
    end as goal_start,
    case
      when g.period_end_date is not null then g.period_end_date
      when g.deadline is not null then g.deadline
      when g.period_type = 'annual' and g.period_year is not null then make_date(g.period_year, 12, 31)
      when g.quarter ~ '^Q[1-4]\s+\d{4}$' then (
        make_date(
          (regexp_match(g.quarter, '^Q([1-4])\s+(\d{4})$'))[2]::int,
          (((regexp_match(g.quarter, '^Q([1-4])\s+(\d{4})$'))[1]::int - 1) * 3) + 1,
          1
        ) + interval '3 months' - interval '1 day'
      )::date
      else null::date
    end as goal_end
  from app.goals g
  where g.organization_id = p_org_id
    and coalesce(g.is_active, true) = true
),
b_with_owner as (
  select
    b.*,
    e.department as owner_department,
    e.location as owner_location
  from base_goals b
  left join app.employees e on e.id = b.owner_employee_id
),
b_filtered as (
  select *
  from b_with_owner b
  where (
      p_department is null
      or (b.owner_department is not null and b.owner_department = p_department)
      or (b.owner_department is null and b.goal_department = p_department)
    )
    and (
      p_location is null
      or (b.owner_location is not null and b.owner_location = p_location)
    )
    and (
      (b.goal_start is null and b.goal_end is null)
      or (
        coalesce(b.goal_start, b.goal_end) <= p_end::date
        and coalesce(b.goal_end, b.goal_start) >= p_start::date
      )
    )
),
latest_meas as (
  select distinct on (gm.goal_id)
    gm.goal_id,
    gm.value,
    gm.measured_at
  from app.goal_measurements gm
  join b_filtered b on b.goal_id = gm.goal_id
  where gm.measured_at >= p_start
    and gm.measured_at <= p_end
  order by gm.goal_id, gm.measured_at desc
)
select
  b.goal_id,
  b.title,
  coalesce(b.owner_department, b.goal_department, 'Unassigned') as department,
  b.owner_department,
  coalesce(b.start_value, 0) as start_value,
  coalesce(l.value, b.start_value, 0) as current_value,
  coalesce(b.target_value, 0) as target_value,
  b.type,
  coalesce(b.unit, '') as unit,
  b.currency
from b_filtered b
left join latest_meas l on l.goal_id = b.goal_id;
$$;

create or replace function public.org_goals_progress_period(
  p_org_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_department text default null,
  p_location text default null
)
returns table(
  goal_id uuid,
  title text,
  department text,
  owner_department text,
  start_value numeric,
  current_value numeric,
  target_value numeric,
  type text,
  unit text,
  currency text
)
language sql
security definer
set search_path = app, public
as $$
  select *
  from app.org_goals_progress_period(
    p_org_id => p_org_id,
    p_start => p_start,
    p_end => p_end,
    p_department => p_department,
    p_location => p_location
  );
$$;

create or replace function app.manager_individual_metrics(
  p_org_id uuid,
  p_period text,
  p_employee_ids uuid[]
)
returns table(
  employee_id uuid,
  overall_score_pct numeric,
  trend_pct text,
  trend_dir text,
  lag_days integer,
  series jsonb,
  goals jsonb,
  latest_measurements jsonb,
  feedback jsonb,
  training jsonb
)
language sql
security definer
set search_path = app, public
as $$
with
raw_period as (
  select nullif(trim(p_period), '') as p
),
parsed as (
  select
    p,
    regexp_match(p, '^Q([1-4])\s+(\d{4})$') as qm,
    regexp_match(p, '^(\d{4})$') as ym
  from raw_period
),
bounds as (
  select
    case
      when p is null or upper(p) = 'ALL' then null::date
      when qm is not null then make_date(qm[2]::int, ((qm[1]::int - 1) * 3) + 1, 1)
      when p = 'This Year' then make_date(extract(year from current_date)::int, 1, 1)
      when p = 'Last Year' then make_date(extract(year from current_date)::int - 1, 1, 1)
      when ym is not null then make_date(ym[1]::int, 1, 1)
      else null::date
    end as s,
    case
      when p is null or upper(p) = 'ALL' then null::date
      when qm is not null then (make_date(qm[2]::int, ((qm[1]::int - 1) * 3) + 1, 1) + interval '3 months' - interval '1 day')::date
      when p = 'This Year' then make_date(extract(year from current_date)::int, 12, 31)
      when p = 'Last Year' then make_date(extract(year from current_date)::int - 1, 12, 31)
      when ym is not null then make_date(ym[1]::int, 12, 31)
      else null::date
    end as e
  from parsed
),
emps as (
  select e.id
  from app.employees e
  where e.organization_id = p_org_id
    and (p_employee_ids is null or e.id = any(p_employee_ids))
),
assigns_all as (
  select
    ga.employee_id,
    ga.goal_id,
    g.label,
    coalesce(g.unit, '') as unit,
    g.target_value,
    g.currency,
    g.measure_type,
    g.start_value,
    g.deadline,
    g.quarter,
    g.period_type,
    g.period_year,
    g.period_start_date,
    g.period_end_date,
    case
      when g.period_start_date is not null then g.period_start_date
      when g.period_type = 'annual' and g.period_year is not null then make_date(g.period_year, 1, 1)
      when g.quarter ~ '^Q[1-4]\s+\d{4}$' then make_date(
        (regexp_match(g.quarter, '^Q([1-4])\s+(\d{4})$'))[2]::int,
        (((regexp_match(g.quarter, '^Q([1-4])\s+(\d{4})$'))[1]::int - 1) * 3) + 1,
        1
      )
      else null::date
    end as goal_start,
    case
      when g.period_end_date is not null then g.period_end_date
      when g.deadline is not null then g.deadline
      when g.period_type = 'annual' and g.period_year is not null then make_date(g.period_year, 12, 31)
      when g.quarter ~ '^Q[1-4]\s+\d{4}$' then (
        make_date(
          (regexp_match(g.quarter, '^Q([1-4])\s+(\d{4})$'))[2]::int,
          (((regexp_match(g.quarter, '^Q([1-4])\s+(\d{4})$'))[1]::int - 1) * 3) + 1,
          1
        ) + interval '3 months' - interval '1 day'
      )::date
      else null::date
    end as goal_end
  from app.goal_assignments ga
  join app.goals g on g.id = ga.goal_id and g.organization_id = p_org_id
  join app.employees e on e.id = ga.employee_id and e.organization_id = p_org_id
),
assigns as (
  select a.*
  from assigns_all a
  left join bounds b on true
  where (b.s is null and b.e is null)
    or (a.goal_start is null and a.goal_end is null)
    or (
      coalesce(a.goal_start, a.goal_end) <= b.e
      and coalesce(a.goal_end, a.goal_start) >= b.s
    )
),
gm_in_period as (
  select distinct on (a.employee_id, gm.goal_id)
    a.employee_id,
    gm.goal_id,
    gm.value::numeric as value,
    gm.measured_at
  from app.goal_measurements gm
  join assigns a on a.goal_id = gm.goal_id
  left join bounds b on true
  where (b.s is null and b.e is null)
     or (gm.measured_at::date between b.s and b.e)
  order by a.employee_id, gm.goal_id, gm.measured_at desc
),
qp_in_period as (
  select distinct on (a.employee_id, gp.goal_id)
    a.employee_id,
    gp.goal_id,
    coalesce(gp.measured_at, gp.created_at) as measured_at,
    gp.qual_status
  from app.goal_progress gp
  join assigns a on a.goal_id = gp.goal_id and a.employee_id = gp.employee_id
  left join bounds b on true
  where coalesce(gp.qual_status, '') <> ''
    and ((b.s is null and b.e is null)
      or (coalesce(gp.measured_at, gp.created_at)::date between b.s and b.e))
  order by a.employee_id, gp.goal_id, measured_at desc
),
latest_measurements_full as (
  select
    a.employee_id,
    a.goal_id,
    coalesce(gmip.measured_at, qpip.measured_at) as sort_at,
    jsonb_build_object(
      'goal_id', a.goal_id,
      'label', a.label,
      'measure_type', a.measure_type,
      'unit', a.unit,
      'currency', a.currency,
      'target_value', a.target_value,
      'quarter', a.quarter,
      'deadline', a.deadline,
      'period_type', a.period_type,
      'period_year', a.period_year,
      'period_start_date', a.period_start_date,
      'period_end_date', a.period_end_date,
      'value_in_period', case when a.measure_type in ('numeric', 'monetary') then gmip.value end,
      'measured_at_in_period', case when a.measure_type in ('numeric', 'monetary') then gmip.measured_at end,
      'qual_status_in_period', case when a.measure_type = 'qualitative' then qpip.qual_status end,
      'qual_measured_at_in_period', case when a.measure_type = 'qualitative' then qpip.measured_at end
    ) as row
  from assigns a
  left join gm_in_period gmip on gmip.employee_id = a.employee_id and gmip.goal_id = a.goal_id and a.measure_type in ('numeric', 'monetary')
  left join qp_in_period qpip on qpip.employee_id = a.employee_id and qpip.goal_id = a.goal_id and a.measure_type = 'qualitative'
),
latest_json as (
  select employee_id, jsonb_agg(row order by sort_at desc nulls last) as latest_measurements
  from latest_measurements_full
  group by employee_id
),
goal_current as (
  select
    a.employee_id,
    a.goal_id,
    a.label,
    a.unit,
    a.currency,
    a.measure_type,
    a.target_value,
    a.start_value,
    a.deadline,
    a.quarter,
    a.period_type,
    a.period_year,
    a.period_start_date,
    a.period_end_date,
    case
      when a.measure_type in ('numeric', 'monetary') then coalesce(gmip.value, a.start_value, 0)::numeric
      else null::numeric
    end as current_value
  from assigns a
  left join gm_in_period gmip on gmip.employee_id = a.employee_id and gmip.goal_id = a.goal_id
),
goal_pct as (
  select
    employee_id,
    goal_id,
    label,
    unit,
    currency,
    measure_type,
    target_value,
    start_value,
    current_value,
    deadline,
    quarter,
    period_type,
    period_year,
    period_start_date,
    period_end_date,
    case
      when measure_type = 'qualitative' then 0
      when coalesce(nullif(target_value, 0), 0) = 0 then 0
      else greatest(0, least(100, round(100 * current_value / target_value)))
    end::numeric as percent
  from goal_current
),
series_src as (
  select
    a.employee_id,
    gm.measured_at::date as d,
    avg(
      case
        when coalesce(nullif(a.target_value, 0), 0) = 0 then 0
        else greatest(0, least(100, (gm.value / a.target_value) * 100))
      end
    ) as pct
  from app.goal_measurements gm
  join assigns a on a.goal_id = gm.goal_id
  left join bounds b on true
  where (b.s is null and b.e is null)
     or (gm.measured_at::date between b.s and b.e)
  group by a.employee_id, d
),
series_json as (
  select employee_id,
         jsonb_agg(jsonb_build_object('d', d, 'v', round(pct)) order by d) as series
  from series_src
  group by employee_id
),
overall as (
  select employee_id, coalesce(round(avg(percent)), 0)::numeric as overall_score_pct
  from goal_pct
  group by employee_id
),
gm_last_per_emp as (
  select a.employee_id, max(gm.measured_at) as ts
  from assigns_all a
  join app.goal_measurements gm on gm.goal_id = a.goal_id
  group by a.employee_id
),
gp_last_per_emp as (
  select a.employee_id, max(coalesce(gp.measured_at, gp.created_at)) as ts
  from assigns_all a
  join app.goal_progress gp on gp.goal_id = a.goal_id and gp.employee_id = a.employee_id
  group by a.employee_id
),
lag_union as (
  select employee_id, ts from gm_last_per_emp
  union all
  select employee_id, ts from gp_last_per_emp
),
lag as (
  select employee_id,
         case when max(ts) is null then null else (current_date - max(ts)::date)::int end as lag_days
  from lag_union
  group by employee_id
),
goals_json as (
  select
    employee_id,
    jsonb_agg(
      jsonb_build_object(
        'goal_id', goal_id,
        'title', label,
        'current', current_value,
        'target', target_value,
        'start_value', start_value,
        'unit', coalesce(unit, ''),
        'currency', currency,
        'measure_type', measure_type,
        'percent', percent,
        'deadline', deadline,
        'quarter', quarter,
        'period_type', period_type,
        'period_year', period_year,
        'period_start_date', period_start_date,
        'period_end_date', period_end_date
      )
      order by label
    ) as goals
  from goal_pct
  group by employee_id
),
series_bounds as (
  select
    employee_id,
    min(d) as min_d,
    max(d) as max_d,
    (min(d) + ((max(d) - min(d)) * interval '1 day') * 0.33)::date as early_cut,
    (min(d) + ((max(d) - min(d)) * interval '1 day') * 0.66)::date as late_cut
  from series_src
  group by employee_id
),
trend_calc as (
  select
    s.employee_id,
    round(coalesce(
      avg(case when s.d >= b.late_cut then s.pct end)
      -
      avg(case when s.d <= b.early_cut then s.pct end),
      0
    ))::numeric as delta
  from series_src s
  join series_bounds b on b.employee_id = s.employee_id
  group by s.employee_id
)
select
  e.id as employee_id,
  coalesce(o.overall_score_pct, 0) as overall_score_pct,
  case
    when tc.delta is null then '+0%'
    when tc.delta < 0 then (tc.delta::text || '%')
    else ('+' || tc.delta::text || '%')
  end as trend_pct,
  case when coalesce(tc.delta, 0) < 0 then 'down' else 'up' end as trend_dir,
  coalesce(l.lag_days, 0) as lag_days,
  coalesce(sj.series, '[]'::jsonb) as series,
  coalesce(gj.goals, '[]'::jsonb) as goals,
  coalesce(lj.latest_measurements, '[]'::jsonb) as latest_measurements,
  jsonb_build_object('note', '-', 'author', '-', 'date', '-') as feedback,
  '[]'::jsonb as training
from emps e
left join overall o on o.employee_id = e.id
left join trend_calc tc on tc.employee_id = e.id
left join lag l on l.employee_id = e.id
left join series_json sj on sj.employee_id = e.id
left join goals_json gj on gj.employee_id = e.id
left join latest_json lj on lj.employee_id = e.id
order by o.overall_score_pct desc nulls last, e.id;
$$;

create or replace function public.manager_individual_metrics(
  p_org_id uuid,
  p_period text,
  p_employee_ids uuid[]
)
returns table(
  employee_id uuid,
  overall_score_pct numeric,
  trend_pct text,
  trend_dir text,
  lag_days integer,
  series jsonb,
  goals jsonb,
  latest_measurements jsonb,
  feedback jsonb,
  training jsonb
)
language sql
security definer
set search_path = app, public
as $$
  select * from app.manager_individual_metrics(p_org_id, p_period, p_employee_ids);
$$;

grant execute on function public.manager_individual_metrics(uuid, text, uuid[]) to authenticated;
grant execute on function public.org_goals_progress_period(uuid, timestamptz, timestamptz, text, text) to authenticated;
