-- Undoing a wrong vouch. A church admin could already change a vouch to declined, but the poster's
-- live jobs stayed on the board. Now a poster's jobs only show while they are vouched for and not
-- suspended. Nothing is deleted: vouch again (or lift the suspension) and the jobs come back until they expire.

drop policy "Anyone reads live jobs" on public.jobs;
create policy "Anyone reads live jobs" on public.jobs
  for select to anon, authenticated
  using (status = 'published' and expires_at > now() and not public.is_suspended(employer_id) and public.is_vouched(employer_id));

create or replace function public.my_job_matches() returns table (job_id uuid, is_new boolean)
language sql stable security definer set search_path = '' as $$
  select j.id, j.published_at > p.alerts_seen_at
  from public.profiles p join public.jobs j on public.job_matches(p, j)
  where p.id = auth.uid() and j.status = 'published' and j.expires_at > now()
    and not public.is_suspended(j.employer_id) and public.is_vouched(j.employer_id)
$$;
