-- From the Part 2 feedback:
--   1. Rejecting a job needs a reason (one of four categories) and an optional note. Every rejection is kept,
--      and moderators are warned when a poster or company has been rejected before.
--   2. A live job can be marked filled ("Hired") by its poster or a moderator. It leaves the board; nothing is deleted.
--      To repost, the poster edits the post and it goes back to the moderation queue like any edit.
--   3. A volunteer mentor can add a short comment when marking a support request done, for reports.

-- 1 + 2: jobs --------------------------------------------------------------------------------

alter table public.jobs drop constraint jobs_status_check;
alter table public.jobs add constraint jobs_status_check check (status in ('pending', 'published', 'rejected', 'filled'));
alter table public.jobs
  add column reject_reason text check (reject_reason in ('incomplete', 'misleading', 'suspected_scam', 'other')),
  add column reject_note text check (char_length(reject_note) <= 400),
  add column filled_at timestamptz;

-- Every rejection, kept even if the post is later edited or deleted. Read only through rejection_history().
create table public.job_rejections (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs on delete set null,
  employer_id uuid not null references auth.users on delete cascade,
  company text not null,
  reason text not null check (reason in ('incomplete', 'misleading', 'suspected_scam', 'other')),
  note text check (char_length(note) <= 400),
  rejected_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index job_rejections_employer_idx on public.job_rejections (employer_id);
create index job_rejections_company_idx on public.job_rejections (lower(btrim(company)));
alter table public.job_rejections enable row level security; -- no policies: nobody reads it directly

create or replace function public.guard_job() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  found text[] := public.fee_terms_in(concat_ws(' ',
    new.title, new.salary, new.description, new.sponsorship,
    array_to_string(new.responsibilities, ' '), array_to_string(new.requirements, ' ')));
begin
  -- The poster marks their own live job as filled; nothing else about the post changes
  if tg_op = 'UPDATE' and not public.is_moderator() and old.employer_id = auth.uid()
    and old.status = 'published' and new.status = 'filled' then
    new := old;
    new.status := 'filled';
    new.filled_at := now();
    new.updated_at := now();
    return new;
  end if;

  if cardinality(found) > 0 then
    raise exception 'Prohibited fee terms: %', array_to_string(found, ', ') using errcode = 'check_violation';
  end if;

  new.updated_at := now();

  if not public.is_moderator() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      raise exception 'Only moderators can publish or reject posts' using errcode = 'insufficient_privilege';
    end if;
    -- Members cannot self-publish, reassign ownership or forge review fields.
    -- Any member edit (including of a rejected or filled post) sends it back to the moderation queue.
    new.status := 'pending';
    new.verification_note := null;
    new.reviewed_by := null;
    new.published_at := null;
    new.expires_at := null;
    new.reject_reason := null;
    new.reject_note := null;
    new.filled_at := null;
    if tg_op = 'UPDATE' then new.employer_id := old.employer_id; end if;
    return new;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if not public.is_vouched(new.employer_id) then
      raise exception 'The poster''s church membership is not verified yet' using errcode = 'check_violation';
    end if;
    new.reviewed_by := auth.uid();
    new.published_at := now();
    new.expires_at := now() + interval '30 days';
    new.reject_reason := null;
    new.reject_note := null;
  elsif new.status = 'rejected' and (tg_op = 'INSERT' or old.status <> 'rejected') then
    if new.reject_reason is null then
      raise exception 'Choose a reason for rejecting this post' using errcode = 'check_violation';
    end if;
    new.reviewed_by := auth.uid();
    new.published_at := null;
    new.expires_at := null;
    insert into public.job_rejections (job_id, employer_id, company, reason, note, rejected_by)
      values (new.id, new.employer_id, new.company, new.reject_reason, new.reject_note, auth.uid());
  elsif new.status = 'filled' and tg_op = 'UPDATE' and old.status <> 'filled' then
    if old.status <> 'published' then
      raise exception 'Only a live post can be marked as filled' using errcode = 'check_violation';
    end if;
    new.filled_at := now();
  elsif new.status = 'pending' and tg_op = 'UPDATE' and old.status <> 'pending' then
    new.reviewed_by := auth.uid();
    new.published_at := null;
    new.expires_at := null;
  end if;
  return new;
end $$;

-- For the moderation queue: how often each waiting post's poster, or the same company name, was rejected before
create function public.rejection_history() returns table (job_id uuid, previous bigint, last_reason text, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select j.id, count(r.id), (array_agg(r.reason order by r.created_at desc))[1], max(r.created_at)
  from public.jobs j
  join public.job_rejections r on r.employer_id = j.employer_id or lower(btrim(r.company)) = lower(btrim(j.company))
  where public.is_moderator() and j.status = 'pending'
  group by j.id
$$;

-- 3: mentor comment when done ------------------------------------------------------------------

alter table public.support_requests
  add column outcome_note text check (char_length(outcome_note) <= 500),
  add column finished_at timestamptz;

drop function public.finish_support_request(uuid, boolean);
create function public.finish_support_request(request uuid, done boolean, comment text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.support_requests
    set status = case when done then 'done' else 'open' end,
        volunteer_id = case when done then volunteer_id end,
        taken_at = case when done then taken_at end,
        outcome_note = case when done then nullif(btrim(comment), '') end,
        finished_at = case when done then now() end
    where id = request and status = 'taken' and volunteer_id = auth.uid();
  if not found then
    raise exception 'Only the mentor who took this request can change it' using errcode = 'insufficient_privilege';
  end if;
end $$;

-- For reports: finished support sessions with the mentor's comment. Admins only.
create function public.support_outcomes() returns table (
  id uuid, service text, member_name text, mentor_name text, outcome_note text, finished_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.service, r.display_name, public.account_name(r.volunteer_id), r.outcome_note, r.finished_at
  from public.support_requests r
  where public.is_admin() and r.status = 'done'
  order by r.finished_at desc nulls last
$$;

-- API access ---------------------------------------------------------------------------------

revoke execute on function public.rejection_history(), public.support_outcomes(),
  public.finish_support_request(uuid, boolean, text) from public, anon;
grant execute on function public.rejection_history(), public.support_outcomes(),
  public.finish_support_request(uuid, boolean, text) to authenticated;
