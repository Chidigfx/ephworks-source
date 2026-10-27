-- People management: one super admin (set once in the SQL editor), admins who approve role
-- applications and assign roles, volunteers, and suspension of bad accounts.
-- Every role change goes through the functions below; profiles still has no client write policy.

-- Roles ------------------------------------------------------------------------------

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member', 'volunteer', 'moderator', 'church_admin', 'admin', 'super_admin'));
alter table public.profiles add column suspended boolean not null default false;
create unique index one_super_admin on public.profiles (role) where role = 'super_admin';

create function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and not suspended
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('admin', 'super_admin'), false)
$$;

-- Admins also review posts; suspended accounts lose every power
create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('moderator', 'admin', 'super_admin'), false)
$$;

create or replace function public.admin_church() returns uuid
language sql stable security definer set search_path = '' as $$
  select church_id from public.profiles where id = auth.uid() and role = 'church_admin' and not suspended
$$;

create function public.is_suspended(member uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select suspended from public.profiles where id = member), false)
$$;

-- Suspended members cannot post, vouch, report or apply
create function public.refuse_suspended() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_suspended(auth.uid()) then
    raise exception 'Your account is suspended' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

create trigger refuse_suspended before insert or update on public.jobs
  for each row execute function public.refuse_suspended();
create trigger refuse_suspended before insert or update on public.vouches
  for each row execute function public.refuse_suspended();
create trigger refuse_suspended before insert or update on public.reports
  for each row execute function public.refuse_suspended();

-- A suspended poster's live posts disappear from the board until they are restored
drop policy "Anyone reads live jobs" on public.jobs;
create policy "Anyone reads live jobs" on public.jobs
  for select to anon, authenticated
  using (status = 'published' and expires_at > now() and not public.is_suspended(employer_id));

-- Assigning roles ------------------------------------------------------------------------
-- Admins assign member, volunteer, moderator and church admin. Only the super admin
-- appoints or removes admins. Nobody changes their own role or touches the super admin.

create function public.check_can_manage(target uuid, new_role text) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  current_role_of text := (select role from public.profiles where id = target);
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage people' using errcode = 'insufficient_privilege';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot change your own account' using errcode = 'insufficient_privilege';
  end if;
  if current_role_of is null then
    raise exception 'No such member' using errcode = 'no_data_found';
  end if;
  if current_role_of = 'super_admin' or new_role = 'super_admin' then
    raise exception 'The super admin can only be changed in the SQL editor' using errcode = 'insufficient_privilege';
  end if;
  if (current_role_of = 'admin' or new_role = 'admin') and public.my_role() <> 'super_admin' then
    raise exception 'Only the super admin can appoint or change admins' using errcode = 'insufficient_privilege';
  end if;
end $$;

create function public.set_member_role(target uuid, new_role text, church uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_can_manage(target, new_role);
  if new_role = 'church_admin' and church is null then
    raise exception 'Choose the church this admin vouches for' using errcode = 'check_violation';
  end if;
  update public.profiles
    set role = new_role, church_id = case when new_role = 'church_admin' then church end
    where id = target;
end $$;

create function public.set_member_suspended(target uuid, suspend boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_can_manage(target, (select role from public.profiles where id = target));
  update public.profiles set suspended = suspend where id = target;
end $$;

-- People dashboard: admins only; emails come from auth.users and never leave this function otherwise
create function public.admin_members() returns table (
  id uuid, email text, name text, role text, church_id uuid, suspended boolean, joined timestamptz, posts bigint
)
language sql stable security definer set search_path = '' as $$
  select p.id, u.email::text,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email::text, '@', 1)),
    p.role, p.church_id, p.suspended, p.created_at,
    (select count(*) from public.jobs j where j.employer_id = p.id)
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc
$$;

-- Role applications ---------------------------------------------------------------------
-- Moderators publish jobs, so that role is invite-only: admins assign it on the People page.

create table public.role_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  role text not null check (role in ('volunteer', 'church_admin')),
  church_id uuid references public.churches on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  note text not null check (char_length(note) between 10 and 600),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  decided_by uuid references auth.users on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint church_admin_names_church check ((role = 'church_admin') = (church_id is not null))
);

create unique index one_open_application on public.role_applications (user_id, role) where status = 'pending';

-- Applicants only ever create pending requests; decisions go through decide_application()
create function public.guard_application() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.status := 'pending';
  new.decided_by := null;
  new.decided_at := null;
  return new;
end $$;

create trigger guard_application before insert on public.role_applications
  for each row execute function public.guard_application();
create trigger refuse_suspended before insert on public.role_applications
  for each row execute function public.refuse_suspended();

alter table public.role_applications enable row level security;

create policy "Members apply for themselves" on public.role_applications
  for insert to authenticated with check (user_id = auth.uid());

create policy "Applicants and admins read applications" on public.role_applications
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create function public.decide_application(application uuid, approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  app public.role_applications := (select a from public.role_applications a where a.id = application);
begin
  if app.id is null or app.status <> 'pending' then
    raise exception 'This application is no longer waiting' using errcode = 'no_data_found';
  end if;
  if approve then
    if public.is_suspended(app.user_id) then
      raise exception 'Restore this account before approving it' using errcode = 'check_violation';
    end if;
    perform public.set_member_role(app.user_id, app.role, app.church_id);
  else
    perform public.check_can_manage(app.user_id, app.role);
  end if;
  update public.role_applications
    set status = case when approve then 'approved' else 'declined' end, decided_by = auth.uid(), decided_at = now()
    where id = application;
end $$;

-- API access ------------------------------------------------------------------------------

grant select, insert on public.role_applications to authenticated;
grant execute on function public.admin_members(), public.set_member_role(uuid, text, uuid),
  public.set_member_suspended(uuid, boolean), public.decide_application(uuid, boolean) to authenticated;
