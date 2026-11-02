-- Joining by invitation: every new account gives the personal code of an approved member who
-- invited them, and waits until a moderator or admin approves it. Until then it can browse jobs only.
-- Pastoral care for approved members, kept completely apart from jobs and from every other staff role.

-- Approval and referral codes -------------------------------------------------------------

alter table public.profiles
  add column status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  add column referral_code text unique,
  add column referred_by uuid references auth.users on delete set null,
  add column decided_by uuid references auth.users on delete set null,
  add column decided_at timestamptz;

create function public.new_referral_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  code text;
begin
  loop
    code := 'EPH-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end $$;

-- Everyone already here joined before codes existed: they stay in and get a code to share
update public.profiles set status = 'approved', decided_at = created_at, referral_code = public.new_referral_code();
alter table public.profiles add constraint approved_has_code check (status <> 'approved' or referral_code is not null);

-- The approved, active member a code belongs to (null for a wrong or unusable code)
create function public.referrer_for(code text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.profiles
  where referral_code = upper(btrim(code)) and status = 'approved' and not suspended
$$;

create function public.account_name(member uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', split_part(email::text, '@', 1))
  from auth.users where id = member
$$;

-- Internal helpers: not callable from the app, so nobody can test codes or look up names by id
revoke execute on function public.new_referral_code(), public.referrer_for(text), public.account_name(uuid) from public, anon, authenticated;

-- Email sign-ups carry their code in the sign-up form; Google sign-ups enter it afterwards
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, referred_by) values (new.id, public.referrer_for(new.raw_user_meta_data ->> 'referral_code'));
  return new;
end $$;

create function public.use_referral_code(code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  referrer uuid := public.referrer_for(code);
begin
  if referrer is null then
    raise exception 'That code isn''t valid. Check it with the member who invited you.' using errcode = 'check_violation';
  end if;
  update public.profiles set referred_by = referrer where id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Your account is no longer waiting to join' using errcode = 'no_data_found';
  end if;
end $$;

-- Roles only count once an account is approved; until then my_role() is null and every staff check fails
create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and not suspended and status = 'approved'
$$;

create or replace function public.admin_church() returns uuid
language sql stable security definer set search_path = '' as $$
  select church_id from public.profiles where id = auth.uid() and role = 'church_admin' and not suspended and status = 'approved'
$$;

-- Every member action (posting, vouching, reporting, interest, applications, requests) also needs an approved account.
-- Changes made in the SQL editor have no auth.uid() and pass, as before.
create or replace function public.refuse_suspended() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_suspended(auth.uid()) then
    raise exception 'Your account is suspended' using errcode = 'insufficient_privilege';
  end if;
  if auth.uid() is not null and not exists (select 1 from public.profiles where id = auth.uid() and status = 'approved') then
    raise exception 'Your account is waiting for approval' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

-- Moderators and admins let people in. Approving needs the referral code; declining does not.
create function public.decide_member(target uuid, approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators and admins can approve new members' using errcode = 'insufficient_privilege';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot decide your own account' using errcode = 'insufficient_privilege';
  end if;
  update public.profiles
    set status = case when approve then 'approved' else 'declined' end,
        referral_code = case when approve then public.new_referral_code() end,
        decided_by = auth.uid(), decided_at = now()
    where id = target and status = 'pending' and (referred_by is not null or not approve);
  if not found then
    raise exception 'This person is no longer waiting, or has not entered a referral code yet' using errcode = 'no_data_found';
  end if;
end $$;

-- Who is waiting to join, and who invited them
create function public.pending_members() returns table (id uuid, name text, email text, invited_by text, invited_by_email text, joined timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, public.account_name(p.id), u.email::text, public.account_name(p.referred_by), r.email::text, p.created_at
  from public.profiles p join auth.users u on u.id = p.id left join auth.users r on r.id = p.referred_by
  where public.is_moderator() and p.status = 'pending'
  order by p.created_at
$$;

-- Admins: everyone who joined, who invited them and which moderator or admin decided. The owner stays hidden from other admins.
create function public.joined_members() returns table (
  id uuid, name text, email text, status text, invited_by text, decided_by text, decided_by_role text, joined timestamptz, decided_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, public.account_name(p.id), u.email::text, p.status,
    public.account_name(p.referred_by), public.account_name(p.decided_by), d.role, p.created_at, p.decided_at
  from public.profiles p join auth.users u on u.id = p.id left join public.profiles d on d.id = p.decided_by
  where public.is_admin() and (p.role <> 'super_admin' or p.id = auth.uid())
  order by p.created_at desc
$$;

-- Pastoral care ----------------------------------------------------------------------------
-- Pastoral carers are appointed by admins for one church and see only that church's requests.
-- Nobody else reads them: not admins, moderators, church admins, volunteers or employers.
-- Nothing here is linked to jobs, vouches or interest, so care can never affect access to work.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member', 'volunteer', 'moderator', 'church_admin', 'pastoral_carer', 'admin', 'super_admin'));
alter table public.profiles drop constraint church_admin_has_church;
alter table public.profiles add constraint church_role_has_church check (role not in ('church_admin', 'pastoral_carer') or church_id is not null);

create or replace function public.set_member_role(target uuid, new_role text, church uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_can_manage(target, new_role);
  if new_role in ('church_admin', 'pastoral_carer') and church is null then
    raise exception 'Choose the church this person serves' using errcode = 'check_violation';
  end if;
  update public.profiles
    set role = new_role, church_id = case when new_role in ('church_admin', 'pastoral_carer') then church end
    where id = target;
end $$;

create function public.pastoral_church() returns uuid
language sql stable security definer set search_path = '' as $$
  select church_id from public.profiles where id = auth.uid() and role = 'pastoral_carer' and not suspended and status = 'approved'
$$;

create table public.pastoral_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default auth.uid() references auth.users on delete cascade,
  church_id uuid not null references public.churches,
  display_name text not null check (char_length(display_name) between 2 and 80),
  kind text not null check (kind in ('prayer', 'talk', 'other')),
  note text check (char_length(note) <= 500),
  may_contact boolean not null check (may_contact),
  status text not null default 'open' check (status in ('open', 'taken', 'closed')),
  carer_id uuid references auth.users on delete set null,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index one_open_pastoral_request on public.pastoral_requests (member_id) where status in ('open', 'taken');

create function public.guard_pastoral_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.status := 'open';
  new.carer_id := null;
  new.taken_at := null;
  return new;
end $$;

create trigger guard_pastoral_request before insert on public.pastoral_requests
  for each row execute function public.guard_pastoral_request();
create trigger refuse_suspended before insert on public.pastoral_requests
  for each row execute function public.refuse_suspended();

alter table public.pastoral_requests enable row level security;

create policy "Members ask for pastoral care" on public.pastoral_requests
  for insert to authenticated with check (member_id = auth.uid());
create policy "Members read own pastoral requests" on public.pastoral_requests
  for select to authenticated using (member_id = auth.uid());
-- Members can withdraw and erase a request at any time, whatever its status
create policy "Members delete own pastoral requests" on public.pastoral_requests
  for delete to authenticated using (member_id = auth.uid());

-- Carers see their church's open requests and the ones they took; the email only for the ones they took
create function public.carer_requests() returns table (
  id uuid, kind text, display_name text, note text, status text, created_at timestamptz, mine boolean, email text
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.kind, r.display_name, r.note, r.status, r.created_at,
    coalesce(r.carer_id = auth.uid(), false),
    case when r.carer_id = auth.uid() then u.email::text end
  from public.pastoral_requests r join auth.users u on u.id = r.member_id
  where r.church_id = public.pastoral_church()
    and (r.status = 'open' or (r.status = 'taken' and r.carer_id = auth.uid()))
    and r.member_id <> auth.uid()
  order by r.created_at
$$;

create function public.take_pastoral_request(request uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.pastoral_requests set status = 'taken', carer_id = auth.uid(), taken_at = now()
    where id = request and status = 'open' and church_id = public.pastoral_church() and member_id <> auth.uid();
  if not found then
    raise exception 'This request is no longer open' using errcode = 'no_data_found';
  end if;
end $$;

-- The carer who took it closes it, or hands it back to the church's open list
create function public.finish_pastoral_request(request uuid, closed boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.pastoral_requests
    set status = case when closed then 'closed' else 'open' end,
        carer_id = case when closed then carer_id end,
        taken_at = case when closed then taken_at end
    where id = request and status = 'taken' and carer_id = auth.uid();
  if not found then
    raise exception 'Only the carer who took this request can change it' using errcode = 'insufficient_privilege';
  end if;
end $$;

-- A church with pastoral requests on it is in use, like one with vouches
create or replace function public.remove_church(church uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can remove churches' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.vouches where church_id = church)
    or exists (select 1 from public.profiles where church_id = church)
    or exists (select 1 from public.pastoral_requests where church_id = church)
    or exists (select 1 from public.role_applications where church_id = church and status = 'pending') then
    raise exception 'This church has members, a church admin or open applications, so it cannot be removed. You can still rename it.' using errcode = 'check_violation';
  end if;
  delete from public.churches where id = church;
end $$;

-- API access ---------------------------------------------------------------------------------

grant select, insert, delete on public.pastoral_requests to authenticated;
grant execute on function public.use_referral_code(text), public.decide_member(uuid, boolean), public.pending_members(),
  public.joined_members(), public.carer_requests(), public.take_pastoral_request(uuid),
  public.finish_pastoral_request(uuid, boolean) to authenticated;
