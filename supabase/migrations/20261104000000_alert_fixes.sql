-- Job alerts, tightened: keywords match whole words (plurals included), and every alert email
-- can be stopped in one click without signing in.

-- A private token per member, used only in their unsubscribe link
alter table public.profiles add column alerts_token uuid not null default gen_random_uuid() unique;

-- Keep in sync with matchesJob() in src/App.jsx. "admin" no longer matches "administrative",
-- but "driver" still matches "drivers" and "coach" matches "coaches".
create or replace function public.job_matches(p public.profiles, j public.jobs) returns boolean
language sql stable set search_path = '' as $$
  select (p.emirates <> '{}' or p.work_types <> '{}' or p.work_settings <> '{}' or p.keywords is not null or p.min_pay is not null)
    and j.employer_id <> p.id
    and (p.emirates = '{}' or j.emirate = any(p.emirates))
    and (p.work_types = '{}' or j.type = any(p.work_types))
    and (p.work_settings = '{}' or j.mode = any(p.work_settings))
    and (p.keywords is null or exists (
      select 1 from unnest(string_to_array(p.keywords, ',')) as k
      where btrim(k) <> ''
        and (j.title || ' ' || j.company || ' ' || coalesce(j.category, '') || ' ' || j.description)
          ~* ('\m' || regexp_replace(btrim(k), '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '(e?s)?\M')))
    and (p.min_pay is null or coalesce((select max(replace(m[1], ',', '')::numeric) from regexp_matches(j.salary, '([0-9][0-9,]*)', 'g') as m), p.min_pay) >= p.min_pay)
$$;

-- The digest now also returns each member's unsubscribe token for the link in their email
drop function public.take_alert_digest();
create function public.take_alert_digest() returns table (email text, name text, jobs jsonb, token uuid)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (
    select p.*, coalesce(p.alerts_emailed_at, now() - interval '1 day') as since
    from public.profiles p where p.alerts_email and p.status = 'approved' and not p.suspended
  ), picked as (
    select d.id, d.alerts_token, jsonb_agg(jsonb_build_object('title', j.title, 'company', j.company, 'emirate', j.emirate, 'salary', j.salary) order by j.published_at) as found
    from due d join public.jobs j on j.status = 'published' and j.expires_at > now() and j.published_at > d.since
      and not public.is_suspended(j.employer_id)
      and public.job_matches((select pr from public.profiles pr where pr.id = d.id), j)
    group by d.id, d.alerts_token
  ), stamped as (
    update public.profiles set alerts_emailed_at = now() where id in (select d.id from due d) returning id
  )
  select u.email::text, public.account_name(pk.id), pk.found, pk.alerts_token from picked pk join auth.users u on u.id = pk.id;
end $$;

revoke execute on function public.take_alert_digest() from public, anon, authenticated;
grant execute on function public.take_alert_digest() to service_role;

-- One click from the email, no sign-in needed. Returns false for an unknown token and changes nothing.
create function public.unsubscribe_alerts(token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set alerts_email = false where alerts_token = token;
  return found;
end $$;

grant execute on function public.unsubscribe_alerts(uuid) to anon, authenticated;
