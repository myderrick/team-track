-- Fix: submit_manager_goal_reviews_quarterly was a no-op stub, so finalizing a
-- review for a specific quarter never stamped submitted_at (the review stayed
-- "in progress" forever). This mirrors the working non-quarterly
-- submit_manager_goal_reviews, but resolves the cycle from the quarter label.

create or replace function public.submit_manager_goal_reviews_quarterly(
  p_org_id uuid,
  p_employee_id uuid,
  p_quarter text
)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_cycle uuid;
  v_reviewer uuid;
begin
  v_cycle := app.resolve_cycle_id(p_org_id, p_quarter);

  -- the signed-in reviewer (manager/admin) — only their own ratings are finalized
  select e.id into v_reviewer
  from app.employees e
  where e.organization_id = p_org_id
    and (e.auth_user_id = auth.uid() or e.user_id = auth.uid())
  limit 1;

  if v_reviewer is null then
    raise exception 'No reviewer employee mapped to the current user';
  end if;

  -- stamp the per-goal manager reviews for this employee + cycle by this reviewer
  update app.manager_reviews
     set submitted_at = now()
   where cycle_id = v_cycle
     and employee_id = p_employee_id
     and reviewer_employee_id = v_reviewer;

  -- also stamp the narrative summary (so a goal-less review still reads as finalized)
  update app.manager_review_summaries
     set submitted_at = now(),
         updated_at = now()
   where organization_id = p_org_id
     and employee_id = p_employee_id
     and cycle_id = v_cycle;
end;
$$;

grant execute on function public.submit_manager_goal_reviews_quarterly(uuid, uuid, text) to authenticated;
