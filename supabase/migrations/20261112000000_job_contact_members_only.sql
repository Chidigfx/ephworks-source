-- Applying needs an approved account (team decision, 10 Nov). Jobs stay public to browse, but the
-- employer's email and careers link are only given to approved members, the job's poster and moderators,
-- so nobody can collect employers' emails without joining.
-- Written to be safe to run more than once.

-- Everyone can still read every other column. A column added to jobs later must be added here too,
-- or the app can't read it.
revoke select on public.jobs from anon, authenticated;
grant select (
  id, employer_id, title, company, emirate, type, mode, salary, category, hours, description,
  responsibilities, requirements, sponsorship, status, verification_note, reviewed_by,
  published_at, expires_at, created_at, updated_at, reject_reason, reject_note, filled_at
) on public.jobs to anon, authenticated;

-- Contact details for the given jobs, only where the caller may apply or needs them:
-- the poster for their own jobs, moderators for review, and approved members for live jobs.
create or replace function public.job_contacts(ids uuid[]) returns table (id uuid, direct_email text, direct_portal text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.direct_email, j.direct_portal
  from public.jobs j
  where j.id = any(ids) and (
    j.employer_id = auth.uid()
    or public.is_moderator()
    or (public.my_role() is not null and j.status = 'published' and j.expires_at > now()
        and not public.is_suspended(j.employer_id) and public.is_vouched(j.employer_id))
  )
$$;
revoke execute on function public.job_contacts(uuid[]) from public, anon;
grant execute on function public.job_contacts(uuid[]) to authenticated;
