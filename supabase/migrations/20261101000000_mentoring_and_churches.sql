-- Career support requests that volunteer mentors can pick up, and church management for admins.

-- Session requests ------------------------------------------------------------------------
-- A member asks for help; a volunteer mentor takes it and emails them. The member must agree
-- to that email, and their address is only revealed to the mentor who takes the request.

create function public.is_volunteer() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('volunteer', 'admin', 'super_admin'), false)
$$;

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default auth.uid() references auth.users on delete cascade,
  service text not null check (service in ('cv-review', 'mock-interview', 'linkedin-help')),
  display_name text not null check (char_length(display_name) between 2 and 80),
  preferred_time text not null check (char_length(preferred_time) between 2 and 60),
  note text check (char_length(note) <= 500),
  may_email boolean not null check (may_email),
  status text not null default 'open' check (status in ('open', 'taken', 'done', 'cancelled')),
  volunteer_id uuid references auth.users on delete set null,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index one_open_support_request on public.support_requests (member_id, service) where status in ('open', 'taken');

-- Members only ever create open requests; every change after that goes through the functions below
create function public.guard_support_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.status := 'open';
  new.volunteer_id := null;
  new.taken_at := null;
  return new;
end $$;

create trigger guard_support_request before insert on public.support_requests
  for each row execute function public.guard_support_request();
create trigger refuse_suspended before insert on public.support_requests
  for each row execute function public.refuse_suspended();

alter table public.support_requests enable row level security;

create policy "Members ask for support" on public.support_requests
  for insert to authenticated with check (member_id = auth.uid());

create policy "Members read own requests" on public.support_requests
  for select to authenticated using (member_id = auth.uid());

-- Mentors see open requests and the ones they took; the email only for the ones they took
create function public.volunteer_requests() returns table (
  id uuid, service text, display_name text, preferred_time text, note text, status text, created_at timestamptz, mine boolean, email text
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.service, r.display_name, r.preferred_time, r.note, r.status, r.created_at,
    coalesce(r.volunteer_id = auth.uid(), false),
    case when r.volunteer_id = auth.uid() then u.email::text end
  from public.support_requests r join auth.users u on u.id = r.member_id
  where public.is_volunteer() and not public.is_suspended(auth.uid())
    and (r.status = 'open' or r.volunteer_id = auth.uid())
    and r.member_id <> auth.uid()
  order by r.created_at
$$;

create function public.take_support_request(request uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_volunteer() then
    raise exception 'Only volunteer mentors can take requests' using errcode = 'insufficient_privilege';
  end if;
  update public.support_requests set status = 'taken', volunteer_id = auth.uid(), taken_at = now()
    where id = request and status = 'open' and member_id <> auth.uid();
  if not found then
    raise exception 'Someone else has already taken this request' using errcode = 'no_data_found';
  end if;
end $$;

-- The mentor who took it marks it done, or hands it back to the open list
create function public.finish_support_request(request uuid, done boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.support_requests
    set status = case when done then 'done' else 'open' end,
        volunteer_id = case when done then volunteer_id end,
        taken_at = case when done then taken_at end
    where id = request and status = 'taken' and volunteer_id = auth.uid();
  if not found then
    raise exception 'Only the mentor who took this request can change it' using errcode = 'insufficient_privilege';
  end if;
end $$;

create function public.cancel_support_request(request uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.support_requests set status = 'cancelled'
    where id = request and member_id = auth.uid() and status in ('open', 'taken');
  if not found then
    raise exception 'This request can no longer be cancelled' using errcode = 'no_data_found';
  end if;
end $$;

-- Church management -------------------------------------------------------------------------

create function public.add_church(church_name text, church_emirate text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  added uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can add churches' using errcode = 'insufficient_privilege';
  end if;
  insert into public.churches (name, emirate) values (btrim(church_name), church_emirate) returning id into added;
  return added;
end $$;

create function public.update_church(church uuid, church_name text, church_emirate text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can edit churches' using errcode = 'insufficient_privilege';
  end if;
  update public.churches set name = btrim(church_name), emirate = church_emirate where id = church;
end $$;

-- Removing a church would silently undo vouches and church admins, so it is refused while anyone depends on it
create function public.remove_church(church uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can remove churches' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.vouches where church_id = church)
    or exists (select 1 from public.profiles where church_id = church)
    or exists (select 1 from public.role_applications where church_id = church and status = 'pending') then
    raise exception 'This church has members, a church admin or open applications, so it cannot be removed. You can still rename it.' using errcode = 'check_violation';
  end if;
  delete from public.churches where id = church;
end $$;

create function public.church_overview() returns table (id uuid, name text, emirate text, admins bigint, vouched bigint, pending bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.emirate,
    (select count(*) from public.profiles p where p.church_id = c.id and p.role = 'church_admin'),
    (select count(*) from public.vouches v where v.church_id = c.id and v.status = 'vouched'),
    (select count(*) from public.vouches v where v.church_id = c.id and v.status = 'pending')
  from public.churches c
  where public.is_admin()
  order by c.name
$$;

-- People dashboard: the super admin is left out for other admins, so a compromised admin account
-- cannot look up the owner's email. The super admin still sees their own row.
create or replace function public.admin_members() returns table (
  id uuid, email text, name text, role text, church_id uuid, suspended boolean, joined timestamptz, posts bigint
)
language sql stable security definer set search_path = '' as $$
  select p.id, u.email::text,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email::text, '@', 1)),
    p.role, p.church_id, p.suspended, p.created_at,
    (select count(*) from public.jobs j where j.employer_id = p.id)
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin() and (p.role <> 'super_admin' or p.id = auth.uid())
  order by p.created_at desc
$$;

grant select, insert on public.support_requests to authenticated;
grant execute on function public.volunteer_requests(), public.take_support_request(uuid), public.finish_support_request(uuid, boolean),
  public.cancel_support_request(uuid), public.add_church(text, text), public.update_church(uuid, text, text),
  public.remove_church(uuid), public.church_overview() to authenticated;
