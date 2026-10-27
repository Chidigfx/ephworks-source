-- Ephworks: jobs, moderation and safety reports.
-- Any signed-in member may submit a job; only moderators can publish it.
-- Roles are granted server-side only (SQL editor / service role), never from the client.

-- Profiles ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')
$$;

-- Fee / scam terms (UAE Labour Law: candidates must never be charged) --------
-- Keep in sync with FEE_TERMS in src/App.jsx, which gives instant feedback only.

create function public.fee_terms_in(content text) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(term), '{}') from unnest(array[
    'fee', 'fees', 'deposit', 'visa charge', 'visa charges', 'visa fee', 'visa cost',
    'payment required', 'processing fee', 'upfront', 'bank transfer', 'registration fee',
    'security deposit', 'pay before'
  ]) as term
  where lower(content) ~ ('\m' || term || '\M')
$$;

-- Jobs ----------------------------------------------------------------------

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 3 and 95),
  company text not null check (char_length(company) between 2 and 95),
  emirate text not null check (emirate in ('Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah')),
  type text not null check (type in ('Full-time', 'Part-time')),
  mode text not null default 'On-site' check (mode in ('On-site', 'Hybrid', 'Remote')),
  salary text not null check (char_length(salary) between 1 and 95),
  category text check (char_length(category) <= 60),
  hours text check (char_length(hours) <= 95),
  description text not null check (char_length(description) between 20 and 1600),
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  direct_email text not null check (direct_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  direct_portal text check (direct_portal ~* '^https://'),
  sponsorship text check (char_length(sponsorship) <= 400),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  verification_note text check (char_length(verification_note) <= 400),
  reviewed_by uuid references auth.users on delete set null,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_has_review check (
    status <> 'published' or (verification_note is not null and published_at is not null and expires_at is not null)
  )
);

create index jobs_live_idx on public.jobs (expires_at) where status = 'published';
create index jobs_employer_idx on public.jobs (employer_id);

create function public.guard_job() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  found text[] := public.fee_terms_in(concat_ws(' ',
    new.title, new.salary, new.description, new.sponsorship,
    array_to_string(new.responsibilities, ' '), array_to_string(new.requirements, ' ')));
begin
  if cardinality(found) > 0 then
    raise exception 'Prohibited fee terms: %', array_to_string(found, ', ') using errcode = 'check_violation';
  end if;

  new.updated_at := now();

  if not public.is_moderator() then
    -- Members cannot self-publish, reassign ownership or forge review fields.
    -- Any member edit sends the post back to the moderation queue.
    new.status := 'pending';
    new.verification_note := null;
    new.reviewed_by := null;
    new.published_at := null;
    new.expires_at := null;
    if tg_op = 'UPDATE' then new.employer_id := old.employer_id; end if;
    return new;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.reviewed_by := auth.uid();
    new.published_at := now();
    new.expires_at := now() + interval '30 days';
  elsif new.status <> 'published' and tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_by := auth.uid();
    new.published_at := null;
    new.expires_at := null;
  end if;
  return new;
end $$;

create trigger guard_job before insert or update on public.jobs
  for each row execute function public.guard_job();

alter table public.jobs enable row level security;

create policy "Anyone reads live jobs" on public.jobs
  for select to anon, authenticated using (status = 'published' and expires_at > now());

create policy "Employers read own jobs" on public.jobs
  for select to authenticated using (employer_id = auth.uid());

create policy "Moderators read all jobs" on public.jobs
  for select to authenticated using (public.is_moderator());

create policy "Members submit jobs" on public.jobs
  for insert to authenticated with check (employer_id = auth.uid());

create policy "Employers edit own jobs" on public.jobs
  for update to authenticated using (employer_id = auth.uid()) with check (employer_id = auth.uid());

create policy "Moderators review jobs" on public.jobs
  for update to authenticated using (public.is_moderator());

create policy "Employers delete own jobs" on public.jobs
  for delete to authenticated using (employer_id = auth.uid() or public.is_moderator());

-- Safety reports ------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users on delete cascade,
  reason text not null check (reason in (
    'Request for payment / fee',
    'Suspicious or unverified employer contact',
    'Misleading job terms or salary',
    'Potential discriminatory language',
    'Other trust & safety concern'
  )),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by uuid references auth.users on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, reporter_id)
);

create function public.guard_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_moderator() then
    if tg_op = 'UPDATE' then raise exception 'Only moderators can update reports' using errcode = 'insufficient_privilege'; end if;
    new.status := 'open';
    new.resolved_by := null;
    new.resolved_at := null;
  elsif tg_op = 'UPDATE' and new.status = 'resolved' and old.status <> 'resolved' then
    new.resolved_by := auth.uid();
    new.resolved_at := now();
  end if;
  return new;
end $$;

create trigger guard_report before insert or update on public.reports
  for each row execute function public.guard_report();

alter table public.reports enable row level security;

create policy "Members file reports" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

create policy "Reporters read own reports" on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_moderator());

create policy "Moderators resolve reports" on public.reports
  for update to authenticated using (public.is_moderator());

-- API access ----------------------------------------------------------------
-- Explicit so it works on projects where new tables are not auto-exposed; RLS above still decides which rows.

grant select on public.profiles to authenticated;
grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;
grant select, insert, update on public.reports to authenticated;
