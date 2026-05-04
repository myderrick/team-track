alter table app.goals
  add column if not exists period_type text,
  add column if not exists period_year integer,
  add column if not exists period_start_date date,
  add column if not exists period_end_date date;

alter table app.goals
  drop constraint if exists goals_period_type_chk;

alter table app.goals
  add constraint goals_period_type_chk
  check (period_type is null or period_type in ('quarter', 'annual', 'custom'));

update app.goals
set period_type = coalesce(period_type, 'quarter')
where period_type is null;

update app.goals
set period_year = coalesce(
  period_year,
  nullif(substring(quarter from '([0-9]{4})'), '')::integer,
  extract(year from deadline)::integer,
  extract(year from created_at)::integer
)
where period_year is null;

create index if not exists goals_org_period_idx
  on app.goals (organization_id, period_year, period_type);

