-- Job alert emails: a member's jobs only count as emailed once the email has actually gone out.
-- Before, take_alert_digest() stamped everyone the moment it was read, so an email that failed to send
-- (email service down, address refused) was lost for good. Now reading and stamping are two steps.

drop function public.take_alert_digest();

-- Read only: each opted-in, approved member's new matches since their last delivered digest (or the last day).
-- as_of is the moment this list was made; pass it back to alert_sent() once that member's email is sent.
create function public.alert_digest() returns table (email text, name text, jobs jsonb, token uuid, as_of timestamptz)
language sql stable security definer set search_path = '' as $$
  with due as (
    select p.id, p.alerts_token, coalesce(p.alerts_emailed_at, now() - interval '1 day') as since
    from public.profiles p where p.alerts_email and p.status = 'approved' and not p.suspended
  ), picked as (
    select d.id, d.alerts_token, jsonb_agg(jsonb_build_object('title', j.title, 'company', j.company, 'emirate', j.emirate, 'salary', j.salary) order by j.published_at) as found
    from due d join public.jobs j on j.status = 'published' and j.expires_at > now() and j.published_at > d.since and j.published_at <= now()
      and not public.is_suspended(j.employer_id) and public.is_vouched(j.employer_id)
      and public.job_matches((select pr from public.profiles pr where pr.id = d.id), j)
    group by d.id, d.alerts_token
  )
  select u.email::text, public.account_name(pk.id), pk.found, pk.alerts_token, now()
  from picked pk join auth.users u on u.id = pk.id
$$;

-- Called after a member's email is sent: the jobs in it are not emailed again. Never moves the stamp backwards.
create function public.alert_sent(token uuid, as_of timestamptz) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set alerts_emailed_at = as_of
    where alerts_token = token and as_of <= now() and (alerts_emailed_at is null or alerts_emailed_at < as_of);
  return found;
end $$;

revoke execute on function public.alert_digest(), public.alert_sent(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.alert_digest(), public.alert_sent(uuid, timestamptz) to service_role; -- the job-alerts function only
