-- Members can apply to be a pastoral carer for one partner church (team decision, 21 Nov 2026).
-- Two checks, because carers read private pastoral requests:
--   1. That church's admin confirms the person serves there (or declines).
--   2. An admin then approves, as for every other role.
-- If the church has no active church admin yet, an admin may approve without step 1.
-- Written to be safe to run more than once. Run it before deploying the app that offers this role.

alter table public.role_applications drop constraint if exists role_applications_role_check;
alter table public.role_applications add constraint role_applications_role_check
  check (role in ('volunteer', 'church_admin', 'pastoral_carer'));

-- A church admin may name a suggested church; a carer must pick a church that is already listed
alter table public.role_applications drop constraint if exists church_admin_names_church;
alter table public.role_applications add constraint church_admin_names_church
  check ((role in ('church_admin', 'pastoral_carer')) = (church_id is not null or church_suggestion_id is not null)
    and (role <> 'pastoral_carer' or (church_id is not null and church_suggestion_id is null)));

alter table public.role_applications
  add column if not exists church_confirmed_by uuid references auth.users on delete set null,
  add column if not exists church_confirmed_at timestamptz;

-- Applicants only ever create pending, unconfirmed requests
create or replace function public.guard_application() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.status := 'pending';
  new.decided_by := null;
  new.decided_at := null;
  new.church_confirmed_by := null;
  new.church_confirmed_at := null;
  return new;
end $$;

-- An active, approved church admin for this church, other than the applicant
create or replace function public.church_has_admin(church uuid, other_than uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where church_id = church and role = 'church_admin' and not suspended and status = 'approved' and id <> other_than)
$$;

-- Church admins see carer applications for their own church only
drop policy if exists "Church admins read carer applications" on public.role_applications;
create policy "Church admins read carer applications" on public.role_applications
  for select to authenticated
  using (role = 'pastoral_carer' and church_id is not null and church_id = public.admin_church());

-- Step 1: the church admin confirms or declines
create or replace function public.confirm_carer_application(application uuid, confirm boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  app public.role_applications := (select a from public.role_applications a where a.id = application);
begin
  if app.id is null or app.role <> 'pastoral_carer' or app.church_id is distinct from public.admin_church() then
    raise exception 'Only the admin of this church can confirm this application' using errcode = 'insufficient_privilege';
  end if;
  if app.user_id = auth.uid() then
    raise exception 'You cannot confirm your own application' using errcode = 'insufficient_privilege';
  end if;
  if app.status <> 'pending' or app.church_confirmed_at is not null then
    raise exception 'This application is no longer waiting for your church' using errcode = 'no_data_found';
  end if;
  if confirm then
    update public.role_applications set church_confirmed_by = auth.uid(), church_confirmed_at = now() where id = application;
  else
    update public.role_applications set status = 'declined', decided_by = auth.uid(), decided_at = now() where id = application;
  end if;
end $$;

-- Step 2: admins decide, as before; a carer needs the church's confirmation first when the church has an admin
create or replace function public.decide_application(application uuid, approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  app public.role_applications := (select a from public.role_applications a where a.id = application);
  church uuid;
begin
  if app.id is null or app.status <> 'pending' then
    raise exception 'This application is no longer waiting' using errcode = 'no_data_found';
  end if;
  church := coalesce(app.church_id, (select church_id from public.church_suggestions where id = app.church_suggestion_id));
  if approve then
    if public.is_suspended(app.user_id) then
      raise exception 'Restore this account before approving it' using errcode = 'check_violation';
    end if;
    if app.role = 'church_admin' and church is null then
      raise exception 'Add their church first (Your work, Churches)' using errcode = 'check_violation';
    end if;
    if app.role = 'pastoral_carer' and app.church_confirmed_at is null and public.church_has_admin(church, app.user_id) then
      raise exception 'Waiting for the church admin to confirm this person' using errcode = 'check_violation';
    end if;
    perform public.set_member_role(app.user_id, app.role, church);
  else
    perform public.check_can_manage(app.user_id, app.role);
  end if;
  update public.role_applications
    set status = case when approve then 'approved' else 'declined' end, church_id = church, decided_by = auth.uid(), decided_at = now()
    where id = application;
end $$;

-- church_has_admin is only used inside the functions above
revoke execute on function public.church_has_admin(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.confirm_carer_application(uuid, boolean) from public, anon;
grant execute on function public.confirm_carer_application(uuid, boolean) to authenticated;
