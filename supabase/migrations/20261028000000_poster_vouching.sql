-- Church membership verification for job posters, and more payment-scam terms.
-- A post can only be published once its poster has been vouched for by their partner church.
-- Church admins are granted server-side only, like moderators (see README).

-- Partner churches -----------------------------------------------------------

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 95),
  created_at timestamptz not null default now()
);

alter table public.churches enable row level security;

create policy "Members read partner churches" on public.churches
  for select to authenticated using (true);

-- Fictional sample partners for the pilot; replace with real partners before launch
insert into public.churches (name) values
  ('St. Luke''s Dubai (sample)'),
  ('Grace Fellowship Abu Dhabi (sample)'),
  ('Hope Community Sharjah (sample)');

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('member', 'moderator', 'church_admin'));
alter table public.profiles add column church_id uuid references public.churches on delete set null;
alter table public.profiles add constraint church_admin_has_church check (role <> 'church_admin' or church_id is not null);

create function public.admin_church() returns uuid
language sql stable security definer set search_path = '' as $$
  select church_id from public.profiles where id = auth.uid() and role = 'church_admin'
$$;

-- Vouch requests ---------------------------------------------------------------
-- Stores only who asked, which church can answer, and a yes/no. No denomination or belief data.

create table public.vouches (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  church_id uuid not null references public.churches on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  note text check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'vouched', 'declined')),
  decided_by uuid references auth.users on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index vouches_church_idx on public.vouches (church_id, status);

create function public.is_vouched(member uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vouches where user_id = member and status = 'vouched')
$$;

create function public.guard_vouch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'A vouch request cannot change owner' using errcode = 'insufficient_privilege';
  end if;

  if new.user_id = auth.uid() then
    -- Members (re)request for themselves only; any change goes back to the church for a fresh decision
    if new.status <> 'pending' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
      raise exception 'Only your church admin can vouch for you' using errcode = 'insufficient_privilege';
    end if;
    new.status := 'pending';
    new.decided_by := null;
    new.decided_at := null;
  elsif tg_op = 'UPDATE' and old.church_id = public.admin_church() then
    if (new.church_id, new.display_name, new.note) is distinct from (old.church_id, old.display_name, old.note) then
      raise exception 'Church admins can only vouch or decline' using errcode = 'insufficient_privilege';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
  else
    raise exception 'Not allowed to change this vouch request' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

create trigger guard_vouch before insert or update on public.vouches
  for each row execute function public.guard_vouch();

alter table public.vouches enable row level security;

create policy "Members and their church admin read requests" on public.vouches
  for select to authenticated using (user_id = auth.uid() or church_id = public.admin_church());

create policy "Members request a vouch" on public.vouches
  for insert to authenticated with check (user_id = auth.uid());

create policy "Members update own request" on public.vouches
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Church admins decide requests" on public.vouches
  for update to authenticated using (church_id = public.admin_church());

-- Moderators only need a yes/no per poster in their queue, not which church vouched
create function public.pending_poster_vouches() returns table (user_id uuid, status text)
language sql stable security definer set search_path = '' as $$
  select distinct v.user_id, v.status from public.vouches v
  join public.jobs j on j.employer_id = v.user_id and j.status = 'pending'
  where public.is_moderator()
$$;

-- Scam terms -------------------------------------------------------------------
-- Keep in sync with BLOCKED_TERMS in src/scam.js, which gives instant feedback only.

create or replace function public.fee_terms_in(content text) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(term), '{}') from unnest(array[
    'fee', 'fees', 'deposit', 'visa charge', 'visa charges', 'visa fee', 'visa cost',
    'payment required', 'processing fee', 'upfront', 'bank transfer', 'registration fee',
    'security deposit', 'pay before', 'advance payment', 'send money', 'wire transfer',
    'western union', 'moneygram', 'pay to apply'
  ]) as term
  where lower(content) ~ ('\m' || term || '\M')
$$;

-- Publishing gate: same rules as before, plus the poster must be vouched ------------

create or replace function public.guard_job() returns trigger
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
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      raise exception 'Only moderators can publish or reject posts' using errcode = 'insufficient_privilege';
    end if;
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
    if not public.is_vouched(new.employer_id) then
      raise exception 'The poster''s church membership is not verified yet' using errcode = 'check_violation';
    end if;
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

-- API access ---------------------------------------------------------------------

grant select on public.churches to authenticated;
grant select, insert, update on public.vouches to authenticated;
grant execute on function public.pending_poster_vouches() to authenticated;
