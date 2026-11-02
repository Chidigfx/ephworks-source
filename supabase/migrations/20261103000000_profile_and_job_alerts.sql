-- Members edit their own profile (name, phone and what work they want) and are told when a live job
-- matches it: a "new for you" count in the app, and an optional daily email digest once email is set up.
-- Preferences are private: only the member sees them. Employers never see who a job matched.

-- Profile fields -------------------------------------------------------------------------------

alter table public.profiles
  add column display_name text check (char_length(display_name) between 2 and 80),
  add column phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  add column emirates text[] not null default '{}'
    check (emirates <@ array['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah']),
  add column work_types text[] not null default '{}' check (work_types <@ array['Full-time', 'Part-time']),
  add column work_settings text[] not null default '{}' check (work_settings <@ array['On-site', 'Hybrid', 'Remote']),
  add column keywords text check (char_length(keywords) <= 200),
  add column min_pay integer check (min_pay between 1 and 999999),
  add column alerts_email boolean not null default false,
  add column alerts_seen_at timestamptz not null default now(),
  add column alerts_emailed_at timestamptz;

-- profiles still has no client write policy (roles live there), so members change only these columns, only on their own row
create function public.update_my_profile(
  new_name text, new_phone text, new_emirates text[], new_work_types text[], new_work_settings text[],
  new_keywords text, new_min_pay integer, new_alerts_email boolean
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set
    display_name = nullif(btrim(new_name), ''),
    phone = nullif(btrim(new_phone), ''),
    emirates = coalesce(new_emirates, '{}'),
    work_types = coalesce(new_work_types, '{}'),
    work_settings = coalesce(new_work_settings, '{}'),
    keywords = nullif(btrim(new_keywords), ''),
    min_pay = new_min_pay,
    alerts_email = coalesce(new_alerts_email, false)
  where id = auth.uid();
  if not found then
    raise exception 'Sign in to edit your profile' using errcode = 'insufficient_privilege';
  end if;
end $$;

-- The name a member chose wins over the one from sign-in, everywhere staff see names
create or replace function public.account_name(member uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(p.display_name, u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email::text, '@', 1))
  from auth.users u left join public.profiles p on p.id = u.id where u.id = member
$$;

-- Admins (People) and moderators (New members) can see a phone number, to check an account by calling
drop function public.admin_members();
create function public.admin_members() returns table (
  id uuid, email text, name text, role text, church_id uuid, suspended boolean, joined timestamptz, posts bigint, phone text
)
language sql stable security definer set search_path = '' as $$
  select p.id, u.email::text, public.account_name(p.id), p.role, p.church_id, p.suspended, p.created_at,
    (select count(*) from public.jobs j where j.employer_id = p.id), p.phone
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin() and (p.role <> 'super_admin' or p.id = auth.uid())
  order by p.created_at desc
$$;

drop function public.pending_members();
create function public.pending_members() returns table (id uuid, name text, email text, invited_by text, invited_by_email text, joined timestamptz, phone text)
language sql stable security definer set search_path = '' as $$
  select p.id, public.account_name(p.id), u.email::text, public.account_name(p.referred_by), r.email::text, p.created_at, p.phone
  from public.profiles p join auth.users u on u.id = p.id left join auth.users r on r.id = p.referred_by
  where public.is_moderator() and p.status = 'pending'
  order by p.created_at
$$;

-- Matching ---------------------------------------------------------------------------------------
-- Keep in sync with matchesJob() in src/App.jsx, which runs the same rules for the demo.
-- Every preference the member set must fit; an empty one fits anything; no preferences, no matches.

create function public.job_matches(p public.profiles, j public.jobs) returns boolean
language sql stable set search_path = '' as $$
  select (p.emirates <> '{}' or p.work_types <> '{}' or p.work_settings <> '{}' or p.keywords is not null or p.min_pay is not null)
    and j.employer_id <> p.id
    and (p.emirates = '{}' or j.emirate = any(p.emirates))
    and (p.work_types = '{}' or j.type = any(p.work_types))
    and (p.work_settings = '{}' or j.mode = any(p.work_settings))
    and (p.keywords is null or exists (
      select 1 from unnest(string_to_array(p.keywords, ',')) as k
      where btrim(k) <> '' and strpos(lower(j.title || ' ' || j.company || ' ' || coalesce(j.category, '') || ' ' || j.description), lower(btrim(k))) > 0))
    -- the top of the advertised pay range must reach the minimum; a salary with no number is not ruled out
    and (p.min_pay is null or coalesce((select max(replace(m[1], ',', '')::numeric) from regexp_matches(j.salary, '([0-9][0-9,]*)', 'g') as m), p.min_pay) >= p.min_pay)
$$;

-- Live jobs matching the signed-in member, and which went live since they last looked
create function public.my_job_matches() returns table (job_id uuid, is_new boolean)
language sql stable security definer set search_path = '' as $$
  select j.id, j.published_at > p.alerts_seen_at
  from public.profiles p join public.jobs j on public.job_matches(p, j)
  where p.id = auth.uid() and j.status = 'published' and j.expires_at > now() and not public.is_suspended(j.employer_id)
$$;

create function public.mark_matches_seen() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set alerts_seen_at = now() where id = auth.uid()
$$;

-- Daily digest for the job-alerts function: each opted-in, approved member's new matches since their last
-- digest (or the last day), stamping the time so nobody gets the same job twice. Server only.
create function public.take_alert_digest() returns table (email text, name text, jobs jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (
    select p.*, coalesce(p.alerts_emailed_at, now() - interval '1 day') as since
    from public.profiles p where p.alerts_email and p.status = 'approved' and not p.suspended
  ), picked as (
    select d.id, jsonb_agg(jsonb_build_object('title', j.title, 'company', j.company, 'emirate', j.emirate, 'salary', j.salary) order by j.published_at) as found
    from due d join public.jobs j on j.status = 'published' and j.expires_at > now() and j.published_at > d.since
      and not public.is_suspended(j.employer_id)
      and public.job_matches((select pr from public.profiles pr where pr.id = d.id), j)
    group by d.id
  ), stamped as (
    update public.profiles set alerts_emailed_at = now() where id in (select d.id from due d) returning id
  )
  select u.email::text, public.account_name(pk.id), pk.found from picked pk join auth.users u on u.id = pk.id;
end $$;

revoke execute on function public.take_alert_digest(), public.job_matches(public.profiles, public.jobs) from public, anon, authenticated;
grant execute on function public.take_alert_digest() to service_role; -- the job-alerts function only
grant execute on function public.update_my_profile(text, text, text[], text[], text[], text, integer, boolean),
  public.my_job_matches(), public.mark_matches_seen(), public.admin_members(), public.pending_members() to authenticated;
